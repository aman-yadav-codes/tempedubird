import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensurePracticeExamSchema } from "@/lib/queries/practice-exams";
import { ensurePracticeExamQuestionsMaterialized } from "../utils";
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

async function getAccessiblePracticeExam(practiceExamId: number, studentId: number, enrollmentId: number) {
  const result = await db.query(
    `
      SELECT
        exam.id,
        exam.title,
        exam.description,
        exam.total_marks::float8 AS total_marks,
        exam.duration_minutes,
        exam.version,
        ip.name AS institution_name,
        'pending'::text AS submission_status,
        NULL::integer AS attempt_id,
        NULL::timestamp AS submitted_at,
        NULL::float8 AS obtained_marks,
        NULL::float8 AS percentage,
        NULL::integer AS correct_answers,
        NULL::integer AS wrong_answers,
        NULL::integer AS unanswered,
        NULL::integer AS time_taken_seconds
      FROM student_enrollments se
      INNER JOIN practice_exams exam
        ON exam.institution_id = se.institution_id
       AND exam.status = 'active'
       AND COALESCE(exam.exam_kind, 'practice') = 'practice'
       AND COALESCE(exam.is_deleted, FALSE) = FALSE
       AND exam.academic_year_id = se.academic_year_id
      INNER JOIN institution_profiles ip
         ON ip.id = exam.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      LEFT JOIN practice_exam_targets target ON target.practice_exam_id = exam.id
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
    [studentId, practiceExamId, enrollmentId]
  );
  return result.rows[0] ?? null;
}

export async function GET(req: Request, context: Context) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    await ensurePracticeExamSchema();
    const canView =
      hasPermission(currentUser, "student.myclassroom.practice_exams.view") ||
      (
        currentUser.role_codes.includes("parent") &&
        hasPermission(currentUser, "parent.childclassroom.practice_exams.view")
      );
    if (!canView) {
      throw new Error("Forbidden: Admin access required");
    }

    const { id } = await context.params;
    const practiceExamId = Number(id);
    if (!Number.isInteger(practiceExamId) || practiceExamId <= 0) {
      throw new Error("Invalid practice exam id");
    }

    const enrollment = await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes);
    if (!enrollment) throw new Error("Practice Exam not found");

    const practiceExam = await getAccessiblePracticeExam(practiceExamId, enrollment.student_id, enrollment.id);
    if (!practiceExam) throw new Error("Practice Exam not found");
    await ensurePracticeExamQuestionsMaterialized(db, practiceExamId);

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
          ON FALSE
        WHERE q.practice_exam_id = $1
        ORDER BY q.display_order, q.id
      `,
      [practiceExamId]
    );

    return NextResponse.json({ data: { ...practiceExam, questions: questions.rows } });
  } catch (error) {
    return errorResponse(error);
  }
}
