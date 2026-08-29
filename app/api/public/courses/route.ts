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
      WITH reviews_rollup AS (
        SELECT
          entity_id,
          ROUND(AVG(rating), 1)::numeric(3,1) AS course_avg_rating,
          COUNT(*)::int AS course_reviews_count
        FROM entity_reviews
        WHERE entity_type IN ('course', 'program')
        GROUP BY entity_id
      )
      SELECT
        p.id,
        COALESCE(p.title, p.name) AS title,
        COALESCE(p.title, p.name) AS name,
        COALESCE(p.about, p.description, '') AS description,
        COALESCE(p.duration_value::text || ' ' || COALESCE(p.duration_unit, 'Years'), p.duration, '1 Year') AS duration,
        COALESCE(p.teaching_method, 'Academic') AS degree_level,
        COALESCE(p.fee_amount, p.annual_fee) AS annual_fee,
        COALESCE(p.seats_available, p.seats) AS seats,
        p.category,
        p.institution_id,
        ip.name AS institution_name,
        COALESCE(reviews_rollup.course_avg_rating, 4.8) AS rating,
        COALESCE(reviews_rollup.course_reviews_count, 0) AS reviews_count,
        COALESCE(reviews_rollup.course_reviews_count, 0) AS reviews
      FROM institution_programs p
      LEFT JOIN institution_profiles ip ON ip.id = p.institution_id
      LEFT JOIN reviews_rollup ON reviews_rollup.entity_id = p.id
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
