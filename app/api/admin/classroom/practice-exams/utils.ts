import type { PoolClient } from "pg";

import { replacePracticeExamQuestionsFromTemplate } from "@/lib/queries/practice-exams";

type Queryable = Pick<PoolClient, "query">;

export async function ensurePracticeExamQuestionsMaterialized(
  db: Queryable,
  practiceExamId: number
) {
  const result = await db.query(
    `
      SELECT
        exam.template_id,
        COUNT(question.id)::int AS question_count
      FROM practice_exams exam
      LEFT JOIN practice_exam_questions question ON question.practice_exam_id = exam.id
      INNER JOIN institution_profiles ip
         ON ip.id = exam.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      WHERE exam.id = $1
        AND COALESCE(exam.is_deleted, FALSE) = FALSE
      GROUP BY exam.id, exam.template_id
      LIMIT 1
    `,
    [practiceExamId]
  );
  const row = result.rows[0];
  const templateId = Number(row?.template_id);
  const questionCount = Number(row?.question_count ?? 0);

  if (!Number.isInteger(templateId) || templateId <= 0 || questionCount > 0) {
    return;
  }

  await replacePracticeExamQuestionsFromTemplate(db, practiceExamId, templateId);
}
