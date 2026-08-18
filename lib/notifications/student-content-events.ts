import type { Pool, PoolClient } from "pg";

import { ensureSystemNotificationTemplates } from "@/lib/queries/notifications";
import { NotificationService } from "@/services/notificationService";

type Queryable = Pool | PoolClient;

type StudentTarget = {
  institutionId: number;
  targetType: string;
  targetId: number;
  targetProgramId?: number | null;
};

export async function resolveStudentUserIdsForTarget(
  db: Queryable,
  target: StudentTarget
) {
  const result = await db.query<{ user_id: number }>(
    `
      SELECT DISTINCT sp.user_id
      FROM student_enrollments se
      INNER JOIN student_profiles sp
        ON sp.id = se.student_id
       AND sp.user_id IS NOT NULL
       AND COALESCE(sp.is_deleted, FALSE) = FALSE
      INNER JOIN users u
        ON u.id = sp.user_id
       AND u.is_active = TRUE
       AND COALESCE(u.is_deleted, FALSE) = FALSE
      WHERE se.institution_id = $1
        AND se.status = 'active'
        AND COALESCE(se.is_deleted, FALSE) = FALSE
        AND (
          $2::text = 'INSTITUTION'
          OR (
            $2::text = 'PROGRAM'
            AND (
              se.program_id = $3
              OR se.class_category_id IN (
                SELECT category_id
                FROM program_categories
                WHERE program_id = $3
              )
            )
          )
          OR (
            $2::text = 'SECTION'
            AND $4::int IS NOT NULL
            AND se.program_id = $4
            AND se.section_id = $3
          )
          OR (
            $2::text = 'STUDENT'
            AND se.student_id = $3
          )
        )
    `,
    [
      target.institutionId,
      target.targetType.toUpperCase(),
      target.targetId,
      target.targetProgramId ?? null,
    ]
  );

  return result.rows.map((row) => row.user_id);
}

export async function notifyStudentsForContentTarget(
  db: Pool,
  input: StudentTarget & {
    type:
      | "content.assignments.created"
      | "content.practice_exams.created"
      | "content.exams.created";
    entityType: string;
    entityId: number;
    createdBy: number;
    payload: Record<string, unknown>;
    priority?: "low" | "normal" | "high" | "critical";
  }
) {
  const recipients = await resolveStudentUserIdsForTarget(db, input);
  if (!recipients.length) return;

  await ensureSystemNotificationTemplates(db);
  await new NotificationService(db).create({
    type: input.type,
    recipients,
    institutionId: input.institutionId,
    entityType: input.entityType,
    entityId: input.entityId,
    createdBy: input.createdBy,
    priority: input.priority ?? "normal",
    payload: input.payload,
  });
}
