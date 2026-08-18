import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { getAllowedInstitutionIds } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { ensureAssignmentTemplateSchema } from "@/lib/queries/assignment-templates";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureAssignmentTemplateSchema();
    const allowedInstitutionIds = getAllowedInstitutionIds(currentUser);
    const url = new URL(req.url);
    const { page, limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const institutionId = Number(url.searchParams.get("institutionId"));
    const programId = Number(url.searchParams.get("programId"));
    const sectionId = Number(url.searchParams.get("sectionId"));
    const studentId = Number(url.searchParams.get("studentId"));
    const search = url.searchParams.get("search")?.trim() ?? "";

    if (!Number.isInteger(institutionId) || institutionId <= 0) {
      return NextResponse.json({ data: [], page, pageCount: 0, total: 0 });
    }
    if (allowedInstitutionIds !== null && !allowedInstitutionIds.includes(institutionId)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const filters = [
      "($1 = '' OR a.title ILIKE $2 OR COALESCE(a.description, '') ILIKE $2)",
      "a.status <> 'deleted'",
      "COALESCE(a.is_deleted, FALSE) = FALSE",
      "ip.is_active = TRUE",
      "COALESCE(ip.is_deleted, FALSE) = FALSE",
    ];
    const params: unknown[] = [search, `%${search}%`];

    params.push(institutionId);
    filters.push(`a.institution_id = $${params.length}`);
    let programFilterIndex: number | null = null;
    let sectionFilterIndex: number | null = null;
    let studentFilterIndex: number | null = null;
    if (Number.isInteger(programId) && programId > 0) {
      params.push(programId);
      programFilterIndex = params.length;
      filters.push(`
        (
          target.target_type = 'INSTITUTION'
          OR (target.target_type = 'PROGRAM' AND target.target_id = $${params.length})
          OR (
            target.target_type = 'SECTION'
            AND target.program_id = $${params.length}
          )
          OR (
            target.target_type = 'STUDENT'
            AND EXISTS (
              SELECT 1
              FROM student_enrollments se
              WHERE se.student_id = target.target_id
                AND se.program_id = $${params.length}
                AND se.status = 'active'
                AND COALESCE(se.is_deleted, FALSE) = FALSE
            )
          )
        )
      `);
    }
    if (Number.isInteger(sectionId) && sectionId > 0) {
      params.push(sectionId);
      sectionFilterIndex = params.length;
      filters.push(`
        (
          target.target_type = 'INSTITUTION'
          OR target.target_type = 'PROGRAM'
          OR (
            target.target_type = 'SECTION'
            AND target.target_id = $${params.length}
            ${programFilterIndex ? `AND target.program_id = $${programFilterIndex}` : ""}
          )
          OR (
            target.target_type = 'STUDENT'
            AND EXISTS (
              SELECT 1
              FROM student_enrollments se
              WHERE se.student_id = target.target_id
                AND se.section_id = $${params.length}
                AND se.status = 'active'
                AND COALESCE(se.is_deleted, FALSE) = FALSE
            )
          )
        )
      `);
    }
    if (Number.isInteger(studentId) && studentId > 0) {
      params.push(studentId);
      studentFilterIndex = params.length;
      filters.push(`
        (
          target.target_type = 'STUDENT'
          AND target.target_id = $${params.length}
        )
      `);
    }

    const pagedParams = [...params, limit, offset];
    const limitIndex = pagedParams.length - 1;
    const offsetIndex = pagedParams.length;
    const whereSql = filters.join(" AND ");
    const programFilterSql = programFilterIndex ? `$${programFilterIndex}::int` : "NULL::int";
    const sectionFilterSql = sectionFilterIndex ? `$${sectionFilterIndex}::int` : "NULL::int";
    const studentFilterSql = studentFilterIndex ? `$${studentFilterIndex}::int` : "NULL::int";
    const [rows, count] = await Promise.all([
      db.query(
        `
          SELECT
            a.id,
            a.title,
            a.description,
            a.total_marks::float8 AS total_marks,
            a.issue_date,
            a.submission_date,
            a.status,
            a.created_at,
            ip.name AS institution_name,
            target.target_type,
            target.target_id,
            target.program_id AS target_program_id,
            CASE
              WHEN target.target_type = 'INSTITUTION' THEN ip.name || ' > Whole institution'
              WHEN target.target_type = 'PROGRAM' THEN ip.name || ' > ' || target_program.title
              WHEN target.target_type = 'SECTION' THEN ip.name || ' > ' || COALESCE(target_scope_program.title, 'Class') || ' > ' || target_section.name
              WHEN target.target_type = 'STUDENT' THEN ip.name || COALESCE(' > ' || target_scope_program.title, '') || ' > ' || target_user.full_name
              ELSE NULL
            END AS target_label,
            COUNT(DISTINCT aq.id)::int AS question_count,
            COUNT(DISTINCT roster.student_id)::int AS student_count,
            COUNT(DISTINCT roster.student_id) FILTER (WHERE sa.status IN ('submitted', 'checked'))::int AS submitted_count
          FROM assignments a
          INNER JOIN institution_profiles ip ON ip.id = a.institution_id
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
          LEFT JOIN assignment_questions aq ON aq.assignment_id = a.id
          LEFT JOIN LATERAL (
            SELECT DISTINCT scoped.student_id
            FROM (
              SELECT sp.id AS student_id
              FROM student_profiles sp
              LEFT JOIN student_enrollments se
                ON se.student_id = sp.id
               AND se.institution_id = a.institution_id
               AND se.status = 'active'
               AND COALESCE(se.is_deleted, FALSE) = FALSE
              WHERE target.target_type = 'STUDENT'
                AND sp.id = target.target_id
                AND (
                  ${programFilterSql} IS NULL
                  OR se.program_id = ${programFilterSql}
                  OR se.class_category_id IN (
                    SELECT category_id FROM program_categories WHERE program_id = ${programFilterSql}
                  )
                )
                AND (${sectionFilterSql} IS NULL OR se.section_id = ${sectionFilterSql})
                AND (${studentFilterSql} IS NULL OR sp.id = ${studentFilterSql})

              UNION

              SELECT sp.id AS student_id
              FROM student_enrollments se
              INNER JOIN student_profiles sp ON sp.id = se.student_id
              WHERE se.institution_id = a.institution_id
                AND se.status = 'active'
                AND COALESCE(se.is_deleted, FALSE) = FALSE
                AND COALESCE(target.target_type, 'INSTITUTION') <> 'STUDENT'
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
                )
                AND (
                  ${programFilterSql} IS NULL
                  OR se.program_id = ${programFilterSql}
                  OR se.class_category_id IN (
                    SELECT category_id FROM program_categories WHERE program_id = ${programFilterSql}
                  )
                )
                AND (${sectionFilterSql} IS NULL OR se.section_id = ${sectionFilterSql})
                AND (${studentFilterSql} IS NULL OR sp.id = ${studentFilterSql})
            ) scoped
          ) roster ON TRUE
          LEFT JOIN student_assignments sa
            ON sa.assignment_id = a.id
           AND sa.student_id = roster.student_id
           AND COALESCE(sa.is_deleted, FALSE) = FALSE
          WHERE ${whereSql}
          GROUP BY a.id, ip.id, target.id, target_program.id, target_scope_program.id, target_section.id, target_user.id
          ORDER BY a.submission_date ASC, a.id DESC
          LIMIT $${limitIndex} OFFSET $${offsetIndex}
        `,
        pagedParams
      ),
      db.query<{ count: string }>(
        `
          SELECT COUNT(DISTINCT a.id) AS count
          FROM assignments a
          INNER JOIN institution_profiles ip ON ip.id = a.institution_id
          LEFT JOIN assignment_targets target ON target.assignment_id = a.id
          WHERE ${whereSql}
        `,
        params
      ),
    ]);
    const total = Number(count.rows[0]?.count ?? 0);
    return NextResponse.json({
      data: rows.rows,
      page,
      pageCount: getPageCount(total, limit),
      total,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
