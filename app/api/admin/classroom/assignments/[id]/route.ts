import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureAssignmentTemplateSchema } from "@/lib/queries/assignment-templates";
import { ensureAssignmentQuestionsMaterialized } from "../utils";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";

type Context = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Unauthorized" || message === "User not found" ? 401 :
    message === "Forbidden: Admin access required" ||
    message === "Forbidden: Invalid child context" ? 403 :
    message === "Assignment not found" ? 404 :
    message === "Assignment is locked until questions are added" ? 423 :
    400;
  return NextResponse.json({ error: message }, { status });
}

async function assertStudentAssignmentAccess(assignmentId: number, studentId: number, enrollmentId: number) {
  const result = await db.query(
    `
      SELECT
        a.id,
        a.title,
        a.description,
        a.total_marks::float8 AS total_marks,
        a.issue_date,
        a.submission_date,
        ip.name AS institution_name,
        COALESCE(sa.status, 'pending') AS submission_status,
        sa.id AS student_assignment_id,
        sa.submitted_at,
        sa.obtained_marks::float8 AS obtained_marks
      FROM student_enrollments se
      INNER JOIN assignments a
        ON a.institution_id = se.institution_id
       AND a.status = 'active'
       AND COALESCE(a.is_deleted, FALSE) = FALSE
       AND a.academic_year_id = se.academic_year_id
      INNER JOIN institution_profiles ip
         ON ip.id = a.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      LEFT JOIN assignment_targets target ON target.assignment_id = a.id
      LEFT JOIN student_assignments sa
        ON sa.assignment_id = a.id
       AND sa.student_id = se.student_id
       AND sa.enrollment_id = $3
       AND COALESCE(sa.is_deleted, FALSE) = FALSE
      WHERE se.student_id = $1
        AND se.id = $3
        AND COALESCE(se.is_deleted, FALSE) = FALSE
        AND a.id = $2
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
    [studentId, assignmentId, enrollmentId]
  );
  return result.rows[0] ?? null;
}

export async function GET(req: Request, context: Context) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    await ensureAssignmentTemplateSchema();
    const canView =
      hasPermission(currentUser, "student.myclassroom.assignments.view") ||
      (
        currentUser.role_codes.includes("parent") &&
        hasPermission(currentUser, "parent.childclassroom.assignments.view")
      );
    if (!canView) {
      throw new Error("Forbidden: Admin access required");
    }

    const { id } = await context.params;
    const assignmentId = Number(id);
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      throw new Error("Invalid assignment id");
    }

    const enrollment = await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes);
    if (!enrollment) throw new Error("Assignment not found");

    const assignment = await assertStudentAssignmentAccess(assignmentId, enrollment.student_id, enrollment.id);
    if (!assignment) throw new Error("Assignment not found");
    await ensureAssignmentQuestionsMaterialized(db, assignmentId);

    const questions = await db.query(
      `
        SELECT
          q.id,
          q.question_text,
          q.question_type,
          q.marks::float8 AS marks,
          q.display_order,
          answer.selected_option_id,
          answer.answer_text,
          answer.answer_image_url,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', qo.id,
                  'text', qo.option_text
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
        LEFT JOIN student_assignment_answers answer
          ON answer.question_id = q.id
         AND answer.student_assignment_id = $2
        WHERE q.assignment_id = $1
        ORDER BY q.display_order, q.id
      `,
      [assignmentId, assignment.student_assignment_id]
    );
    if (questions.rows.length === 0) {
      throw new Error("Assignment is locked until questions are added");
    }

    return NextResponse.json({ data: { ...assignment, questions: questions.rows } });
  } catch (error) {
    return errorResponse(error);
  }
}
