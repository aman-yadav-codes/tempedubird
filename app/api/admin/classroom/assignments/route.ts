import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureAssignmentTemplateSchema } from "@/lib/queries/assignment-templates";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";
import { GET as getAssignmentDetail } from "./[id]/route";
import { POST as submitAssignment } from "./[id]/submit/route";

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
  const assignmentId = new URL(req.url).searchParams.get("assignmentId");
  if (assignmentId) {
    return getAssignmentDetail(req, {
      params: Promise.resolve({ id: assignmentId }),
    });
  }

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

    const enrollment = await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes);
    if (!enrollment) return NextResponse.json({ data: [], stats: { total: 0, pending: 0, submitted: 0, overdue: 0 } });

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
            a.issue_date,
            a.submission_date,
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
          sa.obtained_marks::float8 AS obtained_marks
        FROM eligible
        LEFT JOIN assignment_questions aq ON aq.assignment_id = eligible.id
        LEFT JOIN assignment_template_questions atq ON atq.template_id = eligible.template_id
        LEFT JOIN student_assignments sa
          ON sa.assignment_id = eligible.id
         AND sa.student_id = $1
         AND sa.enrollment_id = $4
         AND COALESCE(sa.is_deleted, FALSE) = FALSE
        GROUP BY
          eligible.id,
          eligible.template_id,
          eligible.title,
          eligible.description,
          eligible.total_marks,
          eligible.issue_date,
          eligible.submission_date,
          eligible.status,
          eligible.institution_name,
          eligible.target_type,
          eligible.target_label,
          sa.status,
          sa.submitted_at,
          sa.obtained_marks
        ORDER BY
          CASE WHEN COALESCE(sa.status, 'pending') IN ('submitted', 'checked') THEN 1 ELSE 0 END,
          eligible.submission_date ASC,
          eligible.id DESC
      `,
      [enrollment.student_id, search, `%${search}%`, enrollment.id]
    );

    const rows = result.rows;
    const stats = {
      total: rows.length,
      pending: rows.filter((row) => !["submitted", "checked"].includes(String(row.submission_status).toLowerCase())).length,
      submitted: rows.filter((row) => ["submitted", "checked"].includes(String(row.submission_status).toLowerCase())).length,
      overdue: rows.filter((row) => !["submitted", "checked"].includes(String(row.submission_status).toLowerCase()) && new Date(row.submission_date) < new Date()).length,
    };

    return NextResponse.json({ data: rows, stats });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  const assignmentId = new URL(req.url).searchParams.get("assignmentId");
  if (!assignmentId) {
    return NextResponse.json({ error: "Invalid assignment id" }, { status: 400 });
  }

  return submitAssignment(req, {
    params: Promise.resolve({ id: assignmentId }),
  });
}
