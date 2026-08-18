import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const institutionId = Number(url.searchParams.get("institutionId"));
    if (!Number.isInteger(institutionId) || institutionId <= 0) {
      return NextResponse.json({ error: "institutionId is required" }, { status: 400 });
    }

    const currentUser = await requirePermission(req, "content.timetable_setup.view", institutionId);
    assertCanAccessInstitution(currentUser, institutionId);

    const { limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
    const search = url.searchParams.get("search")?.trim() || "";
    const params: unknown[] = [institutionId];
    const filters = [
      "u.is_active = TRUE",
      "COALESCE(u.is_deleted, FALSE) = FALSE",
      "institution.is_active = TRUE",
      "COALESCE(institution.is_deleted, FALSE) = FALSE",
      `(up.under_institution_id = $1 OR im.institution_id = $1)`,
      `(COALESCE(up.is_teacher, FALSE) = TRUE OR platform_role.code = 'teacher' OR membership_role.code = 'teacher')`,
    ];

    if (search) {
      params.push(`%${search}%`);
      filters.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const where = `WHERE ${filters.join(" AND ")}`;
    const dataParams = [...params, limit, offset];
    const [dataResult, countResult] = await Promise.all([
      db.query(
        `
          SELECT DISTINCT
            u.id,
            u.full_name,
            u.email,
            ARRAY(
              SELECT DISTINCT assigned_subjects.id
              FROM (
                SELECT s.id
                FROM user_teaching_subjects uts
                INNER JOIN subjects s ON s.id = uts.subject_id
                WHERE uts.user_id = u.id
                  AND COALESCE(s.is_deleted, FALSE) = FALSE

                UNION

                SELECT s.id
                FROM program_subject_teachers pst
                INNER JOIN institution_programs program ON program.id = pst.program_id
                INNER JOIN subjects s ON s.id = pst.subject_id
                WHERE pst.teacher_id = u.id
                  AND program.institution_id = $1
                  AND program.is_active = TRUE
                  AND COALESCE(program.is_deleted, FALSE) = FALSE
                  AND COALESCE(s.is_deleted, FALSE) = FALSE
              ) assigned_subjects
              ORDER BY assigned_subjects.id
            ) AS teaching_subject_ids,
            ARRAY(
              SELECT DISTINCT assigned_subjects.name
              FROM (
                SELECT s.name
                FROM user_teaching_subjects uts
                INNER JOIN subjects s ON s.id = uts.subject_id
                WHERE uts.user_id = u.id
                  AND COALESCE(s.is_deleted, FALSE) = FALSE

                UNION

                SELECT s.name
                FROM program_subject_teachers pst
                INNER JOIN institution_programs program ON program.id = pst.program_id
                INNER JOIN subjects s ON s.id = pst.subject_id
                WHERE pst.teacher_id = u.id
                  AND program.institution_id = $1
                  AND program.is_active = TRUE
                  AND COALESCE(program.is_deleted, FALSE) = FALSE
                  AND COALESCE(s.is_deleted, FALSE) = FALSE
              ) assigned_subjects
              ORDER BY assigned_subjects.name
            ) AS teaching_subjects
          FROM users u
          INNER JOIN institution_profiles institution ON institution.id = $1
          LEFT JOIN user_profiles up ON up.user_id = u.id
          LEFT JOIN institution_memberships im
            ON im.user_id = u.id
           AND im.is_active = TRUE
          LEFT JOIN roles membership_role ON membership_role.id = im.role_id
          LEFT JOIN user_roles ur ON ur.user_id = u.id
          LEFT JOIN roles platform_role ON platform_role.id = ur.role_id
          ${where}
          ORDER BY u.full_name ASC, u.id ASC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        dataParams
      ),
      db.query<{ count: string }>(
        `
          SELECT COUNT(DISTINCT u.id)::text AS count
          FROM users u
          INNER JOIN institution_profiles institution ON institution.id = $1
          LEFT JOIN user_profiles up ON up.user_id = u.id
          LEFT JOIN institution_memberships im
            ON im.user_id = u.id
           AND im.is_active = TRUE
          LEFT JOIN roles membership_role ON membership_role.id = im.role_id
          LEFT JOIN user_roles ur ON ur.user_id = u.id
          LEFT JOIN roles platform_role ON platform_role.id = ur.role_id
          ${where}
        `,
        params
      ),
    ]);

    const total = Number(countResult.rows[0]?.count ?? 0);
    return NextResponse.json({ data: dataResult.rows, total, pageCount: getPageCount(total, limit) });
  } catch (err: unknown) {
    const message = errorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
