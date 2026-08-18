import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { canAccessInstitution } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { ensureAssignmentQuestionsMaterialized } from "@/app/api/admin/classroom/assignments/utils";

type Context = { params: Promise<{ id: string; studentId: string }> };

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    message === "Submission not found" ? 404 :
    400;
  return NextResponse.json({ error: message }, { status });
}

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid id");
  return id;
}

async function getSubmission(assignmentId: number, studentId: number) {
  const result = await db.query(
    `
      SELECT
        sa.id,
        sa.assignment_id,
        sa.student_id,
        sa.status,
        sa.submitted_at,
        sa.obtained_marks::float8 AS obtained_marks,
        sa.checked_at,
        a.title AS assignment_title,
        a.total_marks::float8 AS total_marks,
        a.institution_id,
        u.full_name,
        sp.admission_number,
        se.roll_number
      FROM student_assignments sa
      INNER JOIN assignments a ON a.id = sa.assignment_id
      INNER JOIN student_profiles sp ON sp.id = sa.student_id
      INNER JOIN users u ON u.id = sp.user_id
      LEFT JOIN student_enrollments se
        ON se.student_id = sp.id
       AND se.institution_id = a.institution_id
       AND se.status = 'active'
      WHERE sa.assignment_id = $1
        AND sa.student_id = $2
        AND sa.status IN ('submitted', 'checked')
      LIMIT 1
    `,
    [assignmentId, studentId]
  );
  return result.rows[0] ?? null;
}

export async function GET(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    const { id, studentId: studentValue } = await context.params;
    const assignmentId = parseId(id);
    const studentId = parseId(studentValue);
    await ensureAssignmentQuestionsMaterialized(db, assignmentId);

    const submission = await getSubmission(assignmentId, studentId);
    if (!submission) throw new Error("Submission not found");
    if (!canAccessInstitution(currentUser, Number(submission.institution_id))) {
      throw new Error("Forbidden: Admin access required");
    }

    const answers = await db.query(
      `
        SELECT
          saa.id AS answer_id,
          q.id AS question_id,
          q.question_text,
          q.question_type,
          q.marks::float8 AS marks,
          q.display_order,
          saa.selected_option_id,
          saa.answer_text,
          saa.marks_awarded::float8 AS marks_awarded,
          saa.checked_at,
          selected.option_text AS selected_option_text,
          selected.is_correct AS selected_option_is_correct,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', qo.id,
                  'text', qo.option_text,
                  'is_correct', qo.is_correct
                )
                ORDER BY qo.display_order, qo.id
              )
              FROM assignment_question_options qo
              WHERE qo.question_id = q.id
            ),
            '[]'::json
          ) AS options,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', qf.id,
                  'url', qf.file_url
                )
                ORDER BY qf.sort_order, qf.id
              )
              FROM assignment_question_files qf
              WHERE qf.question_id = q.id
            ),
            '[]'::json
          ) AS files
        FROM assignment_questions q
        LEFT JOIN student_assignment_answers saa
          ON saa.question_id = q.id
         AND saa.student_assignment_id = $2
        LEFT JOIN assignment_question_options selected ON selected.id = saa.selected_option_id
        WHERE q.assignment_id = $1
        ORDER BY q.display_order, q.id
      `,
      [assignmentId, submission.id]
    );

    return NextResponse.json({ data: { submission, answers: answers.rows } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    const { id, studentId: studentValue } = await context.params;
    const assignmentId = parseId(id);
    const studentId = parseId(studentValue);
    const body = await req.json();
    const checks = Array.isArray(body.answers) ? body.answers : [];
    if (checks.length === 0) throw new Error("Check at least one answer");

    const submission = await getSubmission(assignmentId, studentId);
    if (!submission) throw new Error("Submission not found");
    if (!canAccessInstitution(currentUser, Number(submission.institution_id))) {
      throw new Error("Forbidden: Admin access required");
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      for (const item of checks) {
        const answerId = Number(item.answer_id);
        if (!Number.isInteger(answerId) || answerId <= 0) continue;
        const isCorrect = item.correct === true;
        await client.query(
          `
            UPDATE student_assignment_answers saa
            SET
              marks_awarded = CASE WHEN $3::boolean THEN q.marks ELSE 0 END,
              checked_by = $4,
              checked_at = NOW()
            FROM assignment_questions q
            WHERE saa.question_id = q.id
              AND saa.id = $1
              AND saa.student_assignment_id = $2
          `,
          [answerId, submission.id, isCorrect, currentUser.id]
        );
      }

      const total = await client.query<{ total: string }>(
        `
          SELECT COALESCE(SUM(marks_awarded), 0)::text AS total
          FROM student_assignment_answers
          WHERE student_assignment_id = $1
        `,
        [submission.id]
      );
      await client.query(
        `
          UPDATE student_assignments
          SET
            status = 'checked',
            obtained_marks = $2,
            checked_by = $3,
            checked_at = NOW()
          WHERE id = $1
        `,
        [submission.id, Number(total.rows[0]?.total ?? 0), currentUser.id]
      );
      await client.query("COMMIT");
      return NextResponse.json({ success: true, obtained_marks: Number(total.rows[0]?.total ?? 0) });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return errorResponse(error);
  }
}
