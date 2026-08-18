import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { getAllowedInstitutionIds } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { ensureAssignmentTemplateSchema } from "@/lib/queries/assignment-templates";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required"
      ? 403
      : message === "Unauthorized" || message === "User not found"
        ? 401
        : 400;
  return NextResponse.json({ error: message }, { status });
}

function positive(value: string | null) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureAssignmentTemplateSchema();
    const allowedInstitutionIds = getAllowedInstitutionIds(currentUser);
    const { id } = await context.params;
    const assignmentId = Number(id);
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return NextResponse.json({ error: "Invalid assignment id" }, { status: 400 });
    }

    const url = new URL(req.url);
    const programId = positive(url.searchParams.get("programId"));
    const sectionId = positive(url.searchParams.get("sectionId"));
    const studentId = positive(url.searchParams.get("studentId"));

    const params: unknown[] = [assignmentId, programId, sectionId, studentId];
    const accessSql =
      allowedInstitutionIds === null
        ? ""
        : `AND a.institution_id = ANY($${params.push(allowedInstitutionIds)}::int[])`;

    const result = await db.query(
      `
        WITH assignment_scope AS (
          SELECT
            a.id,
            a.title,
            a.institution_id,
            target.target_type,
            target.target_id,
            target.program_id
          FROM assignments a
          INNER JOIN institution_profiles ip
             ON ip.id = a.institution_id
            AND ip.is_active = TRUE
            AND COALESCE(ip.is_deleted, FALSE) = FALSE
          LEFT JOIN assignment_targets target ON target.assignment_id = a.id
          WHERE a.id = $1
            AND a.status <> 'deleted'
            AND COALESCE(a.is_deleted, FALSE) = FALSE
            ${accessSql}
          LIMIT 1
        ),
        roster AS (
          SELECT DISTINCT
            sp.id AS student_id,
            u.id AS user_id,
            u.full_name,
            u.email,
            u.avatar_url,
            sp.admission_number,
            se.roll_number
          FROM assignment_scope scope
          INNER JOIN student_profiles sp
            ON (
              scope.target_type = 'STUDENT'
              AND sp.id = scope.target_id
            )
          INNER JOIN users u ON u.id = sp.user_id
          LEFT JOIN student_enrollments se
            ON se.student_id = sp.id
           AND se.institution_id = scope.institution_id
           AND se.status = 'active'
           AND COALESCE(se.is_deleted, FALSE) = FALSE
          WHERE $4::int IS NULL OR sp.id = $4::int

          UNION

          SELECT DISTINCT
            sp.id AS student_id,
            u.id AS user_id,
            u.full_name,
            u.email,
            u.avatar_url,
            sp.admission_number,
            se.roll_number
          FROM assignment_scope scope
          INNER JOIN student_enrollments se
            ON se.institution_id = scope.institution_id
           AND se.status = 'active'
           AND COALESCE(se.is_deleted, FALSE) = FALSE
          INNER JOIN student_profiles sp ON sp.id = se.student_id
          INNER JOIN users u ON u.id = sp.user_id
          WHERE COALESCE(scope.target_type, 'INSTITUTION') <> 'STUDENT'
            AND (
              scope.target_type IS NULL
              OR scope.target_type = 'INSTITUTION'
              OR (
                scope.target_type = 'PROGRAM'
                AND (
                  se.program_id = scope.target_id
                  OR se.class_category_id IN (
                    SELECT category_id
                    FROM program_categories
                    WHERE program_id = scope.target_id
                  )
                )
              )
              OR (
                scope.target_type = 'SECTION'
                AND scope.program_id IS NOT NULL
                AND se.program_id = scope.program_id
                AND se.section_id = scope.target_id
              )
            )
            AND (
              $2::int IS NULL
              OR se.program_id = $2::int
              OR se.class_category_id IN (
                SELECT category_id
                FROM program_categories
                WHERE program_id = $2::int
              )
            )
            AND ($3::int IS NULL OR se.section_id = $3::int)
            AND ($4::int IS NULL OR sp.id = $4::int)
        )
        SELECT
          roster.student_id,
          roster.user_id,
          roster.full_name,
          roster.email,
          roster.avatar_url,
          roster.admission_number,
          roster.roll_number,
          COALESCE(sa.status, 'pending') AS status,
          sa.submitted_at,
          sa.obtained_marks::float8 AS obtained_marks,
          sa.checked_at
        FROM roster
        LEFT JOIN student_assignments sa
          ON sa.assignment_id = $1
         AND sa.student_id = roster.student_id
         AND COALESCE(sa.is_deleted, FALSE) = FALSE
        ORDER BY
          CASE WHEN roster.roll_number ~ '^[0-9]+$' THEN roster.roll_number::int END NULLS LAST,
          roster.roll_number ASC NULLS LAST,
          roster.full_name ASC
      `,
      params
    );

    return NextResponse.json({ data: result.rows });
  } catch (error) {
    return errorResponse(error);
  }
}
