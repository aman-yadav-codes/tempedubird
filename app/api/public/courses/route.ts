import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionIdParam = searchParams.get("institutionId") || searchParams.get("institution_id") || searchParams.get("inst");
    const institutionId = institutionIdParam && /^\d+$/.test(institutionIdParam) ? Number(institutionIdParam) : null;
    const limit = Number(searchParams.get("limit")) || 20;

    const where: string[] = [
      "COALESCE(p.is_deleted, FALSE) = FALSE",
      "COALESCE(p.is_active, TRUE) = TRUE",
    ];
    const params: unknown[] = [];

    if (institutionId) {
      params.push(institutionId);
      where.push(`p.institution_id = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const query = `
      SELECT
        p.id,
        p.name AS title,
        p.name,
        COALESCE(p.description, '') AS description,
        COALESCE(p.duration, '1 Year') AS duration,
        COALESCE(p.degree_level, 'Academic') AS degree_level,
        p.annual_fee,
        p.seats,
        p.badge,
        p.category,
        p.institution_id,
        ip.name AS institution_name
      FROM institution_programs p
      LEFT JOIN institution_profiles ip ON ip.id = p.institution_id
      ${whereSql}
      ORDER BY p.id ASC
      LIMIT $${params.length + 1}
    `;

    const res = await db.query(query, [...params, limit]);

    return NextResponse.json({
      success: true,
      data: res.rows,
      total: res.rows.length,
    });
  } catch (err: any) {
    console.error("Error in GET /api/public/courses:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch courses" }, { status: 500 });
  }
}
