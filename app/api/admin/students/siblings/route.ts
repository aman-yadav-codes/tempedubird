import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { canAccessInstitution, getRequestedInstitutionId } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const url = new URL(req.url);
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const institutionId = getRequestedInstitutionId(url.searchParams);
    if (!institutionId) {
      return NextResponse.json({ error: "Institution is required" }, { status: 400 });
    }
    if (!canAccessInstitution(currentUser, institutionId)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const search = (url.searchParams.get("search") ?? "").trim();
    const searchPattern = `%${search}%`;
    const currentStudentUserId = Number(url.searchParams.get("excludeUserId"));
    const excludeUserId = Number.isInteger(currentStudentUserId) && currentStudentUserId > 0
      ? currentStudentUserId
      : null;

    const listParams: unknown[] = [institutionId, limit, offset, searchPattern, search || null, excludeUserId];
    const countParams: unknown[] = [institutionId, searchPattern, search || null, excludeUserId];

    const listWhereSql = `
      se.institution_id = $1
      AND se.status = 'active'
      AND COALESCE(se.is_deleted, FALSE) = FALSE
      AND student.is_active = TRUE
      AND COALESCE(student.is_deleted, FALSE) = FALSE
      AND ($6::int IS NULL OR student.id <> $6)
      AND (
        $5::text IS NULL
        OR student.full_name ILIKE $4
        OR student.email ILIKE $4
        OR sp.admission_number ILIKE $4
        OR CAST(sp.id AS text) ILIKE $4
        OR CAST(student.id AS text) ILIKE $4
      )
      AND EXISTS (
        SELECT 1
        FROM student_guardians sg
        WHERE sg.student_id = sp.id
          AND COALESCE(sg.is_deleted, FALSE) = FALSE
      )
    `;
    const countWhereSql = listWhereSql
      .replace(/\$6/g, "__EXCLUDE_USER__")
      .replace(/\$5/g, "__SEARCH_VALUE__")
      .replace(/\$4/g, "__SEARCH_PATTERN__")
      .replace(/__SEARCH_PATTERN__/g, "$2")
      .replace(/__SEARCH_VALUE__/g, "$3")
      .replace(/__EXCLUDE_USER__/g, "$4");

    const [studentsResult, countResult] = await Promise.all([
      db.query(
        `
          SELECT
            sp.id AS student_id,
            student.id AS user_id,
            student.full_name AS student_name,
            sp.admission_number,
            se.roll_number,
            section.name AS section_name,
            COALESCE(
              jsonb_agg(
                DISTINCT jsonb_build_object(
                  'guardian_user_id', guardian.id,
                  'guardian_name', guardian.full_name,
                  'guardian_email', guardian.email,
                  'guardian_phone', guardian.phone,
                  'relationship', sg.relationship,
                  'is_primary', sg.is_primary
                )
              ) FILTER (WHERE sg.id IS NOT NULL),
              '[]'::jsonb
            ) AS guardians
          FROM student_profiles sp
          INNER JOIN users student ON student.id = sp.user_id
          INNER JOIN student_enrollments se ON se.student_id = sp.id
          LEFT JOIN sections section ON section.id = se.section_id
          LEFT JOIN student_guardians sg
            ON sg.student_id = sp.id
           AND COALESCE(sg.is_deleted, FALSE) = FALSE
          LEFT JOIN users guardian ON guardian.id = sg.guardian_user_id
          WHERE ${listWhereSql}
          GROUP BY sp.id, student.id, student.full_name, sp.admission_number, se.roll_number, section.name, se.updated_at
          ORDER BY se.updated_at DESC, sp.id DESC
          LIMIT $2 OFFSET $3
        `,
        listParams
      ),
      db.query<{ count: string }>(
        `
          SELECT COUNT(DISTINCT sp.id)
          FROM student_profiles sp
          INNER JOIN users student ON student.id = sp.user_id
          INNER JOIN student_enrollments se ON se.student_id = sp.id
          WHERE ${countWhereSql}
        `,
        countParams
      ),
    ]);

    return NextResponse.json({
      data: studentsResult.rows,
      pageCount: getPageCount(Number(countResult.rows[0]?.count ?? 0), limit),
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    if (message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "Unauthorized" || message === "User not found") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
