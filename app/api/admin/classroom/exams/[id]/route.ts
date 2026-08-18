import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureExamSchema } from "@/lib/queries/exams";
import { ensureExamQuestionsMaterialized } from "../utils";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";

type Context = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Unauthorized" || message === "User not found" ? 401 :
    message === "Forbidden: Admin access required" ||
    message === "Forbidden: Invalid child context" ? 403 :
    message === "Practice Exam not found" ? 404 :
    400;
  return NextResponse.json({ error: message }, { status });
}

async function getAccessibleExam(examId: number, studentId: number, enrollmentId: number) {
  const result = await db.query(
    `
      SELECT
        exam.id,
        exam.title,
        exam.description,
        exam.total_marks::float8 AS total_marks,
        exam.duration_minutes,
        exam.exam_date,
        exam.exam_time,
        exam.exam_place,
        exam.exam_mode,
        exam.result_date,
        exam.instant_result,
        exam.version,
        COALESCE(
          NULLIF((SELECT COUNT(*) FROM practice_exam_questions q WHERE q.practice_exam_id = exam.id), 0),
          (SELECT COUNT(*) FROM practice_exam_template_questions tq WHERE tq.template_id = exam.template_id),
          0
        )::int AS question_count,
        ip.name AS institution_name,
        COALESCE(attempt.status, 'pending') AS submission_status,
        attempt.id AS attempt_id,
        attempt.submitted_at,
        CASE WHEN exam.instant_result OR exam.result_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date THEN attempt.obtained_marks::float8 END AS obtained_marks,
        CASE WHEN exam.instant_result OR exam.result_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date THEN attempt.percentage::float8 END AS percentage,
        CASE WHEN exam.instant_result OR exam.result_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date THEN attempt.correct_answers END AS correct_answers,
        CASE WHEN exam.instant_result OR exam.result_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date THEN attempt.wrong_answers END AS wrong_answers,
        CASE WHEN exam.instant_result OR exam.result_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date THEN attempt.unanswered END AS unanswered,
        attempt.time_taken_seconds,
        (exam.instant_result OR exam.result_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date) AS result_available
        ,((exam.exam_date + exam.exam_time) <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')) AS is_released
      FROM student_enrollments se
      INNER JOIN practice_exams exam
        ON exam.institution_id = se.institution_id
       AND exam.status = 'active'
       AND COALESCE(exam.exam_kind, 'practice') = 'exam'
       AND COALESCE(exam.is_deleted, FALSE) = FALSE
       AND exam.academic_year_id = se.academic_year_id
      INNER JOIN institution_profiles ip
         ON ip.id = exam.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      LEFT JOIN practice_exam_targets target ON target.practice_exam_id = exam.id
      LEFT JOIN LATERAL (
        SELECT * FROM student_practice_exam_attempts candidate
        WHERE candidate.practice_exam_id = exam.id
          AND candidate.student_id = $1
          AND candidate.enrollment_id = $3
          AND candidate.status = 'completed'
          AND COALESCE(candidate.is_deleted, FALSE) = FALSE
        ORDER BY candidate.submitted_at DESC, candidate.id DESC
        LIMIT 1
      ) attempt ON TRUE
      WHERE se.student_id = $1
        AND se.id = $3
        AND COALESCE(se.is_deleted, FALSE) = FALSE
        AND exam.id = $2
        AND (
          target.target_type IS NULL
          OR target.target_type = 'INSTITUTION'
          OR (
            target.target_type = 'PROGRAM'
            AND (
              se.program_id = target.target_id
              OR se.class_category_id IN (
                SELECT category_id FROM program_categories WHERE program_id = target.target_id
              )
            )
          )
          OR (
            target.target_type = 'SECTION'
            AND target.program_id IS NOT NULL
            AND se.program_id = target.program_id
            AND se.section_id = target.target_id
          )
          OR (target.target_type = 'STUDENT' AND target.target_id = se.student_id)
        )
      LIMIT 1
    `,
    [studentId, examId, enrollmentId]
  );
  return result.rows[0] ?? null;
}

export async function GET(req: Request, context: Context) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    await ensureExamSchema();
    const canView =
      hasPermission(currentUser, "student.myclassroom.exams.view") ||
      (
        currentUser.role_codes.includes("parent") &&
        hasPermission(currentUser, "parent.childclassroom.exams.view")
      );
    if (!canView) {
      throw new Error("Forbidden: Admin access required");
    }

    const { id } = await context.params;
    const examId = Number(id);
    if (!Number.isInteger(examId) || examId <= 0) {
      throw new Error("Invalid exam id");
    }

    const enrollment = await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes);
    if (!enrollment) throw new Error("Practice Exam not found");

    const exam = await getAccessibleExam(examId, enrollment.student_id, enrollment.id);
    if (!exam) throw new Error("Practice Exam not found");
    if (!exam.is_released) {
      return NextResponse.json({ data: { ...exam, questions: [] } });
    }
    await ensureExamQuestionsMaterialized(db, examId);

    const resultAvailable = Boolean(exam.result_available);
    const questions = await db.query(
      `
        SELECT
          q.id,
          q.question_text,
          q.question_type,
          q.explanation,
          q.marks::float8 AS marks,
          q.display_order,
          answer.selected_option_id,
          answer.answer_text,
          answer.answer_image_url,
          answer.is_correct,
          answer.marks_awarded::float8 AS marks_awarded,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', option.id,
                  'text', option.option_text,
                  'is_correct', CASE WHEN $3::boolean THEN option.is_correct ELSE NULL END
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
         AND answer.attempt_id = $2
        WHERE q.practice_exam_id = $1
        ORDER BY q.display_order, q.id
      `,
      [examId, exam.attempt_id, resultAvailable]
    );

    return NextResponse.json({ data: { ...exam, questions: questions.rows } });
  } catch (error) {
    return errorResponse(error);
  }
}
