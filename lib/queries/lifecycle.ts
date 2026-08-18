import type { QueryResultRow } from "pg";

type Queryable = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[]
  ) => Promise<{ rows: T[] }>;
};

export type LifecycleStatus =
  | "ACTIVE"
  | "LEFT"
  | "TRANSFERRED"
  | "SUSPENDED"
  | "TERMINATED"
  | "RETIRED"
  | "ARCHIVED"
  | "DROPPED"
  | "GRADUATED"
  | "REPEATED"
  | string;

export type LifecycleEntityType =
  | "INSTITUTION"
  | "USER"
  | "STUDENT"
  | "TEACHER"
  | "STAFF"
  | "ADMIN"
  | "ENROLLMENT"
  | "MEMBERSHIP"
  | string;

export type RecordLifecycleInput = {
  entityType: LifecycleEntityType;
  entityId: number;
  institutionId?: number | null;
  parentEntityId?: number | null;
  status?: LifecycleStatus;
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
  actorId?: number | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

export async function closeCurrentLifecycle(
  db: Queryable,
  input: {
    entityType: LifecycleEntityType;
    entityId: number;
    institutionId?: number | null;
    effectiveTo?: Date | string | null;
    actorId?: number | null;
  }
) {
  await db.query(
    `
      UPDATE entity_lifecycle
      SET is_current = FALSE,
          effective_to = GREATEST(effective_from, COALESCE($4::timestamp, CURRENT_TIMESTAMP)),
          updated_by = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE entity_type = $1
        AND entity_id = $2
        AND COALESCE(institution_id, -1) = COALESCE($3::int, -1)
        AND is_current = TRUE
    `,
    [
      input.entityType,
      input.entityId,
      input.institutionId ?? null,
      input.effectiveTo ?? null,
      input.actorId ?? null,
    ]
  );
}

export async function recordLifecycle(db: Queryable, input: RecordLifecycleInput) {
  await closeCurrentLifecycle(db, {
    entityType: input.entityType,
    entityId: input.entityId,
    institutionId: input.institutionId ?? null,
    effectiveTo: input.effectiveFrom ?? null,
    actorId: input.actorId ?? null,
  });

  const result = await db.query<{ id: number }>(
    `
      INSERT INTO entity_lifecycle (
        entity_type,
        entity_id,
        institution_id,
        parent_entity_id,
        status,
        effective_from,
        effective_to,
        created_by,
        updated_by,
        is_current,
        notes,
        metadata
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        COALESCE($6::timestamp, CURRENT_TIMESTAMP),
        CASE
          WHEN $7::timestamp IS NULL THEN NULL
          ELSE GREATEST($7::timestamp, COALESCE($6::timestamp, CURRENT_TIMESTAMP))
        END,
        $8,
        $8,
        $7::timestamp IS NULL,
        $9,
        COALESCE($10::jsonb, '{}'::jsonb)
      )
      RETURNING id
    `,
    [
      input.entityType,
      input.entityId,
      input.institutionId ?? null,
      input.parentEntityId ?? null,
      input.status ?? "ACTIVE",
      input.effectiveFrom ?? null,
      input.effectiveTo ?? null,
      input.actorId ?? null,
      input.notes ?? null,
      JSON.stringify(input.metadata ?? {}),
    ]
  );

  return result.rows[0]?.id ?? null;
}

export async function recordMembershipLifecycle(
  db: Queryable,
  input: {
    membershipId: number;
    userId: number;
    institutionId: number;
    roleId: number;
    status?: LifecycleStatus;
    isCurrent?: boolean;
    joinDate?: Date | string | null;
    leaveDate?: Date | string | null;
    previousMembershipHistoryId?: number | null;
    actorId?: number | null;
    remarks?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const status = input.status ?? (input.isCurrent === false ? "SUSPENDED" : "ACTIVE");
  const isCurrent = input.isCurrent ?? !input.leaveDate;

  if (isCurrent) {
    await db.query(
      `
        UPDATE institution_membership_history
        SET is_current = FALSE,
            leave_date = COALESCE($3::timestamp, CURRENT_TIMESTAMP),
            updated_by = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
          AND institution_id = $2
          AND is_current = TRUE
      `,
      [input.userId, input.institutionId, input.joinDate ?? null, input.actorId ?? null]
    );
  }

  const history = await db.query<{ id: number }>(
    `
      INSERT INTO institution_membership_history (
        membership_id,
        user_id,
        institution_id,
        role_id,
        status,
        join_date,
        leave_date,
        previous_membership_history_id,
        is_current,
        created_by,
        updated_by,
        remarks,
        metadata
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        COALESCE($6::timestamp, CURRENT_TIMESTAMP),
        $7::timestamp,
        $8,
        $9,
        $10,
        $10,
        $11,
        COALESCE($12::jsonb, '{}'::jsonb)
      )
      RETURNING id
    `,
    [
      input.membershipId,
      input.userId,
      input.institutionId,
      input.roleId,
      status,
      input.joinDate ?? null,
      input.leaveDate ?? null,
      input.previousMembershipHistoryId ?? null,
      isCurrent,
      input.actorId ?? null,
      input.remarks ?? null,
      JSON.stringify(input.metadata ?? {}),
    ]
  );

  await recordLifecycle(db, {
    entityType: "MEMBERSHIP",
    entityId: input.membershipId,
    institutionId: input.institutionId,
    parentEntityId: input.userId,
    status,
    effectiveFrom: input.joinDate ?? null,
    effectiveTo: input.leaveDate ?? null,
    actorId: input.actorId ?? null,
    notes: input.remarks ?? null,
    metadata: {
      user_id: input.userId,
      role_id: input.roleId,
      membership_history_id: history.rows[0]?.id ?? null,
      ...(input.metadata ?? {}),
    },
  });

  return history.rows[0]?.id ?? null;
}

export async function closeMembershipLifecycle(
  db: Queryable,
  input: {
    membershipIds?: number[];
    userId?: number;
    institutionId?: number;
    status?: LifecycleStatus;
    actorId?: number | null;
    remarks?: string | null;
  }
) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (input.membershipIds?.length) {
    params.push(input.membershipIds);
    conditions.push(`membership_id = ANY($${params.length}::bigint[])`);
  }
  if (input.userId) {
    params.push(input.userId);
    conditions.push(`user_id = $${params.length}`);
  }
  if (input.institutionId) {
    params.push(input.institutionId);
    conditions.push(`institution_id = $${params.length}`);
  }

  if (!conditions.length) return;

  params.push(input.status ?? "LEFT");
  const statusParam = params.length;
  params.push(input.actorId ?? null);
  const actorParam = params.length;
  params.push(input.remarks ?? null);
  const remarksParam = params.length;

  await db.query(
    `
      UPDATE institution_membership_history
      SET status = $${statusParam},
          is_current = FALSE,
          leave_date = COALESCE(leave_date, CURRENT_TIMESTAMP),
          updated_by = $${actorParam},
          updated_at = CURRENT_TIMESTAMP,
          remarks = COALESCE($${remarksParam}, remarks)
      WHERE ${conditions.join(" AND ")}
        AND is_current = TRUE
    `,
    params
  );

  if (input.membershipIds?.length) {
    await db.query(
      `
        UPDATE entity_lifecycle
        SET status = $2,
            is_current = FALSE,
            effective_to = GREATEST(effective_from, COALESCE(effective_to, CURRENT_TIMESTAMP)),
            updated_by = $3,
            updated_at = CURRENT_TIMESTAMP,
            notes = COALESCE($4, notes)
        WHERE entity_type = 'MEMBERSHIP'
          AND entity_id = ANY($1::bigint[])
          AND is_current = TRUE
      `,
      [input.membershipIds, input.status ?? "LEFT", input.actorId ?? null, input.remarks ?? null]
    );
  }
}

export async function recordEnrollmentLifecycle(
  db: Queryable,
  input: {
    enrollmentId: number;
    studentId: number;
    institutionId: number;
    academicYearId?: number | null;
    status?: LifecycleStatus;
    effectiveFrom?: Date | string | null;
    effectiveTo?: Date | string | null;
    actorId?: number | null;
    notes?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const lifecycleId = await recordLifecycle(db, {
    entityType: "ENROLLMENT",
    entityId: input.enrollmentId,
    institutionId: input.institutionId,
    parentEntityId: input.studentId,
    status: input.status ?? "ACTIVE",
    effectiveFrom: input.effectiveFrom ?? null,
    effectiveTo: input.effectiveTo ?? null,
    actorId: input.actorId ?? null,
    notes: input.notes ?? null,
    metadata: {
      student_id: input.studentId,
      academic_year_id: input.academicYearId ?? null,
      ...(input.metadata ?? {}),
    },
  });

  if (lifecycleId) {
    await db.query(
      `
        UPDATE student_enrollments
        SET lifecycle_id = $1,
            is_current = $2,
            effective_from = COALESCE($3::timestamp, effective_from),
            effective_to = $4::timestamp,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `,
      [
        lifecycleId,
        !input.effectiveTo,
        input.effectiveFrom ?? null,
        input.effectiveTo ?? null,
        input.enrollmentId,
      ]
    );
  }

  return lifecycleId;
}
