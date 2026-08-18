import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensurePracticeExamSchema } from "@/lib/queries/practice-exams";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Unauthorized" || message === "User not found" ? 401 :
    message === "Forbidden: Admin access required" ||
    message === "Forbidden: Invalid child context" ? 403 :
    400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
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

    const enrollment = await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes);
    if (!enrollment) return NextResponse.json({ data: [], attempts: [] });

    const search = new URL(req.url).searchParams.get("search")?.trim() ?? "";
    const result = await db.query(
      `
        WITH eligible AS (
          SELECT DISTINCT
            a.id,
            a.template_id,
            a.title,
            a.description,
            a.total_marks::float8 AS total_marks,
            a.duration_minutes,
            a.version,
            a.status,
            ip.name AS institution_name,
            target.target_type,
            CASE
              WHEN target.target_type = 'INSTITUTION' THEN ip.name || ' > Whole institution'
              WHEN target.target_type = 'PROGRAM' THEN ip.name || ' > ' || target_program.title
              WHEN target.target_type = 'SECTION' THEN ip.name || ' > ' || COALESCE(target_scope_program.title, 'Class') || ' > ' || target_section.name
              WHEN target.target_type = 'STUDENT' THEN ip.name || COALESCE(' > ' || target_scope_program.title, '') || ' > ' || target_user.full_name
              ELSE 'Whole institution'
            END AS target_label
          FROM student_enrollments se
          INNER JOIN practice_exams a
            ON a.institution_id = se.institution_id
           AND a.status = 'active'
           AND COALESCE(a.exam_kind, 'practice') = 'practice'
           AND COALESCE(a.is_deleted, FALSE) = FALSE
           AND a.academic_year_id = se.academic_year_id
          INNER JOIN institution_profiles ip
             ON ip.id = a.institution_id
            AND ip.is_active = TRUE
            AND COALESCE(ip.is_deleted, FALSE) = FALSE
          LEFT JOIN practice_exam_targets target ON target.practice_exam_id = a.id
          LEFT JOIN institution_programs target_program
            ON target_program.id = target.target_id AND target.target_type = 'PROGRAM'
          LEFT JOIN institution_programs target_scope_program
            ON target_scope_program.id = target.program_id
          LEFT JOIN sections target_section
            ON target_section.id = target.target_id AND target.target_type = 'SECTION'
          LEFT JOIN student_profiles target_student
            ON target_student.id = target.target_id AND target.target_type = 'STUDENT'
          LEFT JOIN users target_user ON target_user.id = target_student.user_id
          WHERE se.student_id = $1
            AND se.id = $4
            AND COALESCE(se.is_deleted, FALSE) = FALSE
            AND (
              target.target_type IS NULL
              OR target.target_type = 'INSTITUTION'
              OR (
                target.target_type = 'PROGRAM'
                AND (
                  se.program_id = target.target_id
                  OR se.class_category_id IN (
                    SELECT category_id
                    FROM program_categories
                    WHERE program_id = target.target_id
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
            AND ($2 = '' OR a.title ILIKE $3 OR COALESCE(a.description, '') ILIKE $3)
        )
        SELECT
          eligible.*,
          CASE
            WHEN COUNT(DISTINCT aq.id) > 0 THEN COUNT(DISTINCT aq.id)::int
            ELSE COUNT(DISTINCT atq.id)::int
          END AS question_count,
          COALESCE(sa.status, 'pending') AS submission_status,
          sa.submitted_at,
          sa.obtained_marks::float8 AS obtained_marks,
          sa.percentage::float8 AS percentage,
          sa.correct_answers,
          sa.wrong_answers,
          sa.unanswered,
          COALESCE(attempt_count.total_attempts, 0)::int AS attempt_count
        FROM eligible
        LEFT JOIN practice_exam_questions aq ON aq.practice_exam_id = eligible.id
        LEFT JOIN practice_exam_template_questions atq ON atq.template_id = eligible.template_id
        LEFT JOIN LATERAL (
          SELECT *
          FROM student_practice_exam_attempts attempt
          WHERE attempt.practice_exam_id = eligible.id
            AND attempt.student_id = $1
            AND attempt.exam_version = eligible.version
            AND attempt.enrollment_id = $4
            AND COALESCE(attempt.is_deleted, FALSE) = FALSE
          ORDER BY attempt.submitted_at DESC NULLS LAST, attempt.started_at DESC, attempt.id DESC
          LIMIT 1
        ) sa ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS total_attempts
          FROM student_practice_exam_attempts attempt
          WHERE attempt.practice_exam_id = eligible.id
            AND attempt.student_id = $1
            AND attempt.enrollment_id = $4
            AND attempt.status = 'completed'
            AND COALESCE(attempt.is_deleted, FALSE) = FALSE
        ) attempt_count ON TRUE
        GROUP BY
          eligible.id,
          eligible.template_id,
          eligible.title,
          eligible.description,
          eligible.total_marks,
          eligible.duration_minutes,
          eligible.version,
          eligible.status,
          eligible.institution_name,
          eligible.target_type,
          eligible.target_label,
          sa.status,
          sa.submitted_at,
          sa.obtained_marks,
          sa.percentage,
          sa.correct_answers,
          sa.wrong_answers,
          sa.unanswered,
          attempt_count.total_attempts
        ORDER BY
          CASE WHEN COALESCE(sa.status, 'pending') = 'completed' THEN 1 ELSE 0 END,
          eligible.id DESC
      `,
      [enrollment.student_id, search, `%${search}%`, enrollment.id]
    );

    const attempts = await db.query(
      `
        WITH eligible AS (
          SELECT DISTINCT
            a.id,
            a.title,
            a.total_marks::float8 AS total_marks,
            ip.name AS institution_name,
            target.target_type,
            CASE
              WHEN target.target_type = 'INSTITUTION' THEN ip.name || ' > Whole institution'
              WHEN target.target_type = 'PROGRAM' THEN ip.name || ' > ' || target_program.title
              WHEN target.target_type = 'SECTION' THEN ip.name || ' > ' || COALESCE(target_scope_program.title, 'Class') || ' > ' || target_section.name
              WHEN target.target_type = 'STUDENT' THEN ip.name || COALESCE(' > ' || target_scope_program.title, '') || ' > ' || target_user.full_name
              ELSE 'Whole institution'
            END AS target_label
          FROM student_enrollments se
          INNER JOIN practice_exams a
            ON a.institution_id = se.institution_id
           AND a.status = 'active'
           AND COALESCE(a.exam_kind, 'practice') = 'practice'
           AND COALESCE(a.is_deleted, FALSE) = FALSE
          INNER JOIN institution_profiles ip
             ON ip.id = a.institution_id
            AND ip.is_active = TRUE
            AND COALESCE(ip.is_deleted, FALSE) = FALSE
          LEFT JOIN practice_exam_targets target ON target.practice_exam_id = a.id
          LEFT JOIN institution_programs target_program
            ON target_program.id = target.target_id AND target.target_type = 'PROGRAM'
          LEFT JOIN institution_programs target_scope_program
            ON target_scope_program.id = target.program_id
          LEFT JOIN sections target_section
            ON target_section.id = target.target_id AND target.target_type = 'SECTION'
          LEFT JOIN student_profiles target_student
            ON target_student.id = target.target_id AND target.target_type = 'STUDENT'
          LEFT JOIN users target_user ON target_user.id = target_student.user_id
          WHERE se.student_id = $1
            AND se.id = $4
            AND COALESCE(se.is_deleted, FALSE) = FALSE
            AND (
              target.target_type IS NULL
              OR target.target_type = 'INSTITUTION'
              OR (
                target.target_type = 'PROGRAM'
                AND (
                  se.program_id = target.target_id
                  OR se.class_category_id IN (
                    SELECT category_id
                    FROM program_categories
                    WHERE program_id = target.target_id
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
            AND ($2 = '' OR a.title ILIKE $3 OR COALESCE(a.description, '') ILIKE $3)
        )
        SELECT
          attempt.id,
          attempt.practice_exam_id,
          attempt.attempt_no,
          attempt.exam_version,
          attempt.status,
          attempt.submitted_at,
          attempt.obtained_marks::float8 AS obtained_marks,
          attempt.percentage::float8 AS percentage,
          attempt.correct_answers,
          attempt.wrong_answers,
          attempt.unanswered,
          eligible.title,
          eligible.total_marks,
          eligible.institution_name,
          eligible.target_label
        FROM eligible
        INNER JOIN student_practice_exam_attempts attempt
          ON attempt.practice_exam_id = eligible.id
         AND attempt.student_id = $1
         AND attempt.enrollment_id = $4
         AND attempt.status = 'completed'
         AND COALESCE(attempt.is_deleted, FALSE) = FALSE
        ORDER BY attempt.submitted_at DESC NULLS LAST, attempt.id DESC
      `,
      [enrollment.student_id, search, `%${search}%`, enrollment.id]
    );

    return NextResponse.json({ data: result.rows, attempts: attempts.rows });
  } catch (error) {
    return errorResponse(error);
  }
}


