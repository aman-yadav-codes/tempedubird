import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const { limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";
    const institutionIdParam = url.searchParams.get("institutionId")?.trim() || "";

    const whereClauses: string[] = ["COALESCE(se.is_deleted, FALSE) = FALSE"];
    const params: unknown[] = [];

    // Filter by search query
    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(
        `(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR p.title ILIKE $${params.length} OR inst.name ILIKE $${params.length})`
      );
    }

    // Filter by status
    if (status && status !== "all") {
      params.push(status);
      whereClauses.push(`se.status = $${params.length}`);
    }

    // Scope institution ID if restricted
    if (institutionIdParam) {
      params.push(Number(institutionIdParam));
      whereClauses.push(`se.institution_id = $${params.length}`);
    }

    const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

    const [countRes, dataRes] = await Promise.all([
      db.query<{ count: number }>(
        `
        SELECT COUNT(*)::int AS count
        FROM student_enrollments se
        INNER JOIN student_profiles sp ON sp.id = se.student_id
        INNER JOIN users u ON u.id = sp.user_id
        INNER JOIN institution_profiles inst ON inst.id = se.institution_id
        INNER JOIN institution_programs p ON p.id = se.program_id
        ${whereSql}
        `,
        params
      ),
      db.query(
        `
        SELECT
          se.id AS enrollment_id,
          se.student_id,
          u.full_name AS student_name,
          u.email AS student_email,
          u.phone AS student_phone,
          sp.avatar_url AS student_avatar,
          se.institution_id,
          inst.name AS institution_name,
          inst.logo_url AS institution_logo,
          se.program_id,
          p.title AS program_title,
          p.fee_amount AS program_fee,
          p.duration_value,
          p.duration_unit,
          ay.name AS academic_year_name,
          se.status,
          se.admission_date,
          se.created_at
        FROM student_enrollments se
        INNER JOIN student_profiles sp ON sp.id = se.student_id
        INNER JOIN users u ON u.id = sp.user_id
        INNER JOIN institution_profiles inst ON inst.id = se.institution_id
        INNER JOIN institution_programs p ON p.id = se.program_id
        LEFT JOIN academic_years ay ON ay.id = se.academic_year_id
        ${whereSql}
        ORDER BY se.created_at DESC, se.id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        [...params, limit, offset]
      ),
    ]);

    const total = countRes.rows[0]?.count || 0;
    return NextResponse.json({
      data: dataRes.rows,
      total,
      pageCount: getPageCount(total, limit),
    });
  } catch (err: any) {
    const status = err.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: err.message || "Failed to load enrollments" }, { status });
  }
}
