import type { Pool, PoolClient } from "pg";

type Queryable = Pool | PoolClient;

type LifecycleMode = "delete" | "archive" | "restore" | "suspend" | "activate";

type LifecycleUpdate = {
  table: string;
  requiredTables?: string[];
  sql: (hasUpdatedAt: boolean) => string;
};

const DIRECT_INSTITUTION_TABLES = [
  "institution_programs",
  "institution_facilities",
  "institution_news",
  "institution_cutoffs",
  "institution_scholarships",
  "academic_years",
  "institution_academic_classes",
  "assignments",
  "practice_exams",
  "student_enrollments",
  "student_achievements",
  "support_tickets",
  "institution_media",
  "institution_calendar_events",
  "institution_placements",
  "institution_generated_documents",
  "attendance_sessions",
] as const;

function quoteIdent(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function tableExists(db: Queryable, table: string) {
  const result = await db.query<{ exists: boolean }>(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`public.${table}`]
  );
  return Boolean(result.rows[0]?.exists);
}

async function tableHasColumns(db: Queryable, table: string, columns: string[]) {
  const result = await db.query<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = ANY($2::text[])
    `,
    [table, columns]
  );
  const found = new Set(result.rows.map((row) => row.column_name));
  return columns.every((column) => found.has(column));
}

async function tableHasAnyColumn(db: Queryable, table: string, columns: string[]) {
  const result = await db.query<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = ANY($2::text[])
      LIMIT 1
    `,
    [table, columns]
  );
  return result.rows.length > 0;
}

async function runLifecycleUpdate(
  client: PoolClient,
  update: LifecycleUpdate,
  institutionIds: number[],
  markDeleted: boolean
) {
  const requiredTables = [update.table, ...(update.requiredTables ?? [])];
  for (const table of requiredTables) {
    if (!(await tableExists(client, table))) return;
  }
  if (!(await tableHasColumns(client, update.table, ["is_deleted", "deleted_at"]))) return;

  const hasUpdatedAt = await tableHasAnyColumn(client, update.table, ["updated_at"]);
  await client.query(update.sql(hasUpdatedAt), [institutionIds, markDeleted]);
}

function directInstitutionUpdate(table: string): LifecycleUpdate {
  const quoted = quoteIdent(table);
  return {
    table,
    sql: (hasUpdatedAt) => `
      UPDATE ${quoted}
      SET
        is_deleted = $2,
        deleted_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        ${hasUpdatedAt ? ", updated_at = NOW()" : ""}
      WHERE institution_id = ANY($1::int[])
    `,
  };
}

const INDIRECT_UPDATES: LifecycleUpdate[] = [
  {
    table: "assignment_templates",
    sql: (hasUpdatedAt) => `
      UPDATE assignment_templates
      SET
        is_deleted = $2,
        deleted_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        ${hasUpdatedAt ? ", updated_at = NOW()" : ""}
      WHERE source_institution_id = ANY($1::int[])
    `,
  },
  {
    table: "practice_exam_templates",
    sql: (hasUpdatedAt) => `
      UPDATE practice_exam_templates
      SET
        is_deleted = $2,
        deleted_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        ${hasUpdatedAt ? ", updated_at = NOW()" : ""}
      WHERE source_institution_id = ANY($1::int[])
    `,
  },
  {
    table: "institution_class_sections",
    requiredTables: ["institution_academic_classes"],
    sql: (hasUpdatedAt) => `
      UPDATE institution_class_sections section
      SET
        is_deleted = $2,
        deleted_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        ${hasUpdatedAt ? ", updated_at = NOW()" : ""}
      FROM institution_academic_classes class
      WHERE section.institution_class_id = class.id
        AND class.institution_id = ANY($1::int[])
    `,
  },
  {
    table: "student_assignments",
    requiredTables: ["assignments"],
    sql: (hasUpdatedAt) => `
      UPDATE student_assignments student_assignment
      SET
        is_deleted = $2,
        deleted_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        ${hasUpdatedAt ? ", updated_at = NOW()" : ""}
      FROM assignments assignment
      WHERE student_assignment.assignment_id = assignment.id
        AND assignment.institution_id = ANY($1::int[])
    `,
  },
  {
    table: "student_documents",
    requiredTables: ["student_enrollments"],
    sql: (hasUpdatedAt) => `
      UPDATE student_documents document
      SET
        is_deleted = $2,
        deleted_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        ${hasUpdatedAt ? ", updated_at = NOW()" : ""}
      WHERE EXISTS (
        SELECT 1
        FROM student_enrollments enrollment
        WHERE enrollment.student_id = document.student_id
          AND enrollment.institution_id = ANY($1::int[])
      )
    `,
  },
  {
    table: "student_guardians",
    requiredTables: ["student_enrollments"],
    sql: (hasUpdatedAt) => `
      UPDATE student_guardians guardian
      SET
        is_deleted = $2,
        deleted_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        ${hasUpdatedAt ? ", updated_at = NOW()" : ""}
      WHERE EXISTS (
        SELECT 1
        FROM student_enrollments enrollment
        WHERE enrollment.student_id = guardian.student_id
          AND enrollment.institution_id = ANY($1::int[])
      )
    `,
  },
  {
    table: "student_practice_exam_attempts",
    requiredTables: ["practice_exams"],
    sql: (hasUpdatedAt) => `
      UPDATE student_practice_exam_attempts attempt
      SET
        is_deleted = $2,
        deleted_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        ${hasUpdatedAt ? ", updated_at = NOW()" : ""}
      FROM practice_exams exam
      WHERE attempt.practice_exam_id = exam.id
        AND exam.institution_id = ANY($1::int[])
    `,
  },
  {
    table: "student_practice_exam_results",
    requiredTables: ["practice_exams"],
    sql: (hasUpdatedAt) => `
      UPDATE student_practice_exam_results result
      SET
        is_deleted = $2,
        deleted_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        ${hasUpdatedAt ? ", updated_at = NOW()" : ""}
      FROM practice_exams exam
      WHERE result.practice_exam_id = exam.id
        AND exam.institution_id = ANY($1::int[])
    `,
  },
  {
    table: "student_attendance",
    requiredTables: ["attendance_sessions"],
    sql: (hasUpdatedAt) => `
      UPDATE student_attendance attendance
      SET
        is_deleted = $2,
        deleted_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        ${hasUpdatedAt ? ", updated_at = NOW()" : ""}
      FROM attendance_sessions session
      WHERE attendance.attendance_session_id = session.id
        AND session.institution_id = ANY($1::int[])
    `,
  },
  {
    table: "student_period_attendance",
    requiredTables: ["attendance_sessions"],
    sql: (hasUpdatedAt) => `
      UPDATE student_period_attendance attendance
      SET
        is_deleted = $2,
        deleted_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        ${hasUpdatedAt ? ", updated_at = NOW()" : ""}
      FROM attendance_sessions session
      WHERE attendance.attendance_session_id = session.id
        AND session.institution_id = ANY($1::int[])
    `,
  },
  {
    table: "support_ticket_messages",
    requiredTables: ["support_tickets"],
    sql: (hasUpdatedAt) => `
      UPDATE support_ticket_messages message
      SET
        is_deleted = $2,
        deleted_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        ${hasUpdatedAt ? ", updated_at = NOW()" : ""}
      FROM support_tickets ticket
      WHERE message.ticket_id = ticket.id
        AND ticket.institution_id = ANY($1::int[])
    `,
  },
  {
    table: "support_ticket_history",
    requiredTables: ["support_tickets"],
    sql: (hasUpdatedAt) => `
      UPDATE support_ticket_history history
      SET
        is_deleted = $2,
        deleted_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        ${hasUpdatedAt ? ", updated_at = NOW()" : ""}
      FROM support_tickets ticket
      WHERE history.ticket_id = ticket.id
        AND ticket.institution_id = ANY($1::int[])
    `,
  },
];

function normalizeInstitutionIds(institutionIds: number[]) {
  return Array.from(
    new Set(institutionIds.filter((id) => Number.isInteger(id) && id > 0))
  );
}

async function updateInstitutionProfileLifecycle(
  client: PoolClient,
  institutionIds: number[],
  mode: LifecycleMode
) {
  const markDeleted = mode === "delete" || mode === "archive";
  const status =
    mode === "restore" || mode === "activate"
      ? "active"
      : mode === "suspend"
        ? "suspended"
        : mode === "archive"
          ? "archived"
          : "deleted";
  const isActive = status === "active";

  await client.query(
    `
      UPDATE institution_profiles
      SET
        is_deleted = $2,
        deleted_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
        status = $3,
        is_active = $4,
        updated_at = NOW()
      WHERE id = ANY($1::int[])
    `,
    [institutionIds, markDeleted, status, isActive]
  );

  return markDeleted;
}

export async function applyInstitutionLifecycle(
  db: Pool,
  institutionIds: number[],
  mode: LifecycleMode
) {
  const normalizedIds = normalizeInstitutionIds(institutionIds);
  if (!normalizedIds.length) return;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const markDeleted = await updateInstitutionProfileLifecycle(client, normalizedIds, mode);
    if (mode === "delete" || mode === "archive" || mode === "restore") {
      const updates = [
        ...DIRECT_INSTITUTION_TABLES.map((table) => directInstitutionUpdate(table)),
        ...INDIRECT_UPDATES,
      ];

      for (const update of updates) {
        await runLifecycleUpdate(client, update, normalizedIds, markDeleted);
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function softDeleteInstitutionLifecycle(db: Pool, institutionIds: number[]) {
  await applyInstitutionLifecycle(db, institutionIds, "delete");
}

export async function archiveInstitutionLifecycle(db: Pool, institutionIds: number[]) {
  await applyInstitutionLifecycle(db, institutionIds, "archive");
}

export async function restoreInstitutionLifecycle(db: Pool, institutionIds: number[]) {
  await applyInstitutionLifecycle(db, institutionIds, "restore");
}

export async function suspendInstitutionLifecycle(db: Pool, institutionIds: number[]) {
  await applyInstitutionLifecycle(db, institutionIds, "suspend");
}
