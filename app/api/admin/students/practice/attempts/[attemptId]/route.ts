import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensurePracticeExamSchema } from "@/lib/queries/practice-exams";

type Context = { params: Promise<{ attemptId: string }> };

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Unauthorized" || message === "User not found" ? 401 :
    message === "Forbidden: Admin access required" ? 403 :
    message === "Practice attempt not found" ? 404 :
    400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request, context: Context) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    await ensurePracticeExamSchema();
    const url = new URL(req.url);
    const scopedInstitutionId = Number(url.searchParams.get("institutionId"));

    const { attemptId: rawAttemptId } = await context.params;
    const attemptId = Number(rawAttemptId);
    if (!Number.isInteger(attemptId) || attemptId <= 0) {
      throw new Error("Invalid attempt id");
    }

    const header = await db.query(
      `
        SELECT
          attempt.id,
          attempt.practice_exam_id,
          attempt.student_id,
          attempt.attempt_no,
          attempt.exam_version,
          attempt.status,
          attempt.started_at,
          attempt.submitted_at,
          attempt.obtained_marks::float8 AS obtained_marks,
          attempt.percentage::float8 AS percentage,
          attempt.correct_answers,
          attempt.wrong_answers,
          attempt.unanswered,
          exam.title,
          exam.total_marks::float8 AS total_marks,
          exam.duration_minutes,
          exam.institution_id,
          COALESCE(exam.exam_kind, 'practice') AS exam_kind,
          ip.name AS institution_name,
          student_user.full_name AS student_name,
          student_user.email AS student_email,
          student_user.avatar_url AS student_avatar_url,
          student.admission_number,
          enrollment.roll_number,
          scoped_enrollment.institution_id AS scoped_institution_id
        FROM student_practice_exam_attempts attempt
        INNER JOIN practice_exams exam ON exam.id = attempt.practice_exam_id
        INNER JOIN institution_profiles ip ON ip.id = exam.institution_id
        INNER JOIN student_profiles student ON student.id = attempt.student_id
        INNER JOIN users student_user ON student_user.id = student.user_id
        LEFT JOIN LATERAL (
          SELECT se.institution_id
          FROM student_enrollments se
          WHERE se.student_id = attempt.student_id
            AND se.institution_id = $2
            AND se.status = 'active'
            AND COALESCE(se.is_deleted, FALSE) = FALSE
          ORDER BY se.is_current DESC NULLS LAST, se.updated_at DESC NULLS LAST, se.id DESC
          LIMIT 1
        ) scoped_enrollment ON TRUE
        LEFT JOIN LATERAL (
          SELECT se.roll_number
          FROM student_enrollments se
          WHERE se.student_id = attempt.student_id
            AND se.institution_id = COALESCE(scoped_enrollment.institution_id, exam.institution_id)
            AND se.status = 'active'
            AND COALESCE(se.is_deleted, FALSE) = FALSE
          ORDER BY se.is_current DESC NULLS LAST, se.updated_at DESC NULLS LAST, se.id DESC
          LIMIT 1
        ) enrollment ON TRUE
        WHERE attempt.id = $1
          AND COALESCE(attempt.is_deleted, FALSE) = FALSE
        LIMIT 1
      `,
      [
        attemptId,
        Number.isInteger(scopedInstitutionId) && scopedInstitutionId > 0
          ? scopedInstitutionId
          : null,
      ],
    );
    const attempt = header.rows[0];
    if (!attempt) throw new Error("Practice attempt not found");

    const institutionId = Number(attempt.scoped_institution_id ?? attempt.institution_id);
    assertCanAccessInstitution(currentUser, institutionId);
    const permissionKey =
      attempt.exam_kind === "exam"
        ? "managestudents.exams.view"
        : "managestudents.practice.view";

    if (!hasPermission(currentUser, permissionKey, { institutionId })) {
      throw new Error("Forbidden: Admin access required");
    }

    const answers = await db.query(
      `
        SELECT
          q.id AS question_id,
          q.question_text,
          q.question_type,
          q.marks::float8 AS marks,
          q.display_order,
          q.explanation,
          answer.id AS answer_id,
          answer.selected_option_id,
          selected.option_text AS selected_option_text,
          selected.is_correct AS selected_option_is_correct,
          answer.answer_text,
          answer.is_correct,
          answer.marks_awarded::float8 AS marks_awarded,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', option.id,
                  'text', option.option_text,
                  'is_correct', option.is_correct
                )
                ORDER BY option.display_order, option.id
              )
              FROM practice_exam_question_options option
              WHERE option.question_id = q.id
            ),
            '[]'::json
          ) AS options,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', file.id,
                  'url', file.file_url
                )
                ORDER BY file.sort_order, file.id
              )
              FROM practice_exam_question_files file
              WHERE file.question_id = q.id
            ),
            '[]'::json
          ) AS files
        FROM practice_exam_questions q
        LEFT JOIN student_practice_exam_answers answer
          ON answer.question_id = q.id
         AND answer.attempt_id = $1
        LEFT JOIN practice_exam_question_options selected
          ON selected.id = answer.selected_option_id
        WHERE q.practice_exam_id = $2
        ORDER BY q.display_order, q.id
      `,
      [attemptId, Number(attempt.practice_exam_id)],
    );

    return NextResponse.json({
      data: {
        attempt,
        answers: answers.rows,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
