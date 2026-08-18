import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { canAccessInstitution } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";

function positive(value: string | null) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

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
    const url = new URL(req.url);
    const institutionId = positive(url.searchParams.get("institutionId"));
    const programId = positive(url.searchParams.get("programId"));
    const sectionId = positive(url.searchParams.get("sectionId"));
    const search = url.searchParams.get("search")?.trim() ?? "";
    const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 15, 1), 50);
    const offset = (page - 1) * limit;

    if (!institutionId) return NextResponse.json({ data: [], hasMore: false });
    if (!canAccessInstitution(currentUser, institutionId)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const params: unknown[] = [institutionId, search, `%${search}%`];
    const filters = [
      "se.institution_id = $1",
      "se.status = 'active'",
      "COALESCE(se.is_deleted, FALSE) = FALSE",
      "ip.is_active = TRUE",
      "COALESCE(ip.is_deleted, FALSE) = FALSE",
      "($2 = '' OR u.full_name ILIKE $3 OR COALESCE(sp.admission_number, '') ILIKE $3 OR COALESCE(se.roll_number, '') ILIKE $3)",
    ];
    if (programId) {
      params.push(programId);
      filters.push(`(se.program_id = $${params.length} OR se.class_category_id IN (SELECT category_id FROM program_categories WHERE program_id = $${params.length}))`);
    }
    if (sectionId) {
      params.push(sectionId);
      filters.push(`se.section_id = $${params.length}`);
    }

    const result = await db.query(
      `
        SELECT
          sp.id,
          u.full_name,
          sp.admission_number,
          se.roll_number
        FROM student_enrollments se
        INNER JOIN institution_profiles ip ON ip.id = se.institution_id
        INNER JOIN student_profiles sp ON sp.id = se.student_id
        INNER JOIN users u ON u.id = sp.user_id
        WHERE ${filters.join(" AND ")}
        ORDER BY
          CASE WHEN se.roll_number ~ '^[0-9]+$' THEN se.roll_number::int END NULLS LAST,
          se.roll_number ASC NULLS LAST,
          u.full_name ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limit + 1, offset]
    );

    return NextResponse.json({
      data: result.rows.slice(0, limit),
      hasMore: result.rows.length > limit,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
