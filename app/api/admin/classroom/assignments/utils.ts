import type { PoolClient } from "pg";

import { replaceAssignmentQuestionsFromTemplate } from "@/lib/queries/assignment-templates";

type Queryable = Pick<PoolClient, "query">;

export async function ensureAssignmentQuestionsMaterialized(
  db: Queryable,
  assignmentId: number
) {
  const result = await db.query(
    `
      SELECT
        a.template_id,
        COUNT(aq.id)::int AS question_count
      FROM assignments a
      LEFT JOIN assignment_questions aq ON aq.assignment_id = a.id
      INNER JOIN institution_profiles ip
         ON ip.id = a.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      WHERE a.id = $1
        AND COALESCE(a.is_deleted, FALSE) = FALSE
      GROUP BY a.id, a.template_id
      LIMIT 1
    `,
    [assignmentId]
  );
  const row = result.rows[0];
  const templateId = Number(row?.template_id);
  const questionCount = Number(row?.question_count ?? 0);

  if (!Number.isInteger(templateId) || templateId <= 0 || questionCount > 0) {
    return;
  }

  await replaceAssignmentQuestionsFromTemplate(db, assignmentId, templateId);
}
