import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get("institutionId") ? Number(searchParams.get("institutionId")) : null;
    const search = searchParams.get("search")?.trim() || "";

    const whereConditions: string[] = [];
    const params: unknown[] = [];

    if (institutionId && Number.isInteger(institutionId) && institutionId > 0) {
      params.push(institutionId);
      whereConditions.push(`t.institution_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(t.title ILIKE $${params.length} OR t.subject ILIKE $${params.length} OR t.category ILIKE $${params.length})`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const testsRes = await db.query(`
      SELECT
        t.id,
        t.institution_id,
        t.title,
        t.category,
        t.subject,
        t.questions_count,
        t.time_limit_mins,
        t.difficulty,
        t.attempts_count,
        t.created_by_name,
        t.description,
        t.created_at,
        'Free' AS price,
        TRUE AS is_free,
        COALESCE(ip.name, ip.slug, 'Institution') AS institution_name
      FROM practice_tests t
      LEFT JOIN institution_profiles ip ON ip.id = t.institution_id
      ${whereClause}
      ORDER BY t.id DESC
    `, params);

    return NextResponse.json({
      success: true,
      practiceTests: testsRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/public/practice error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch practice tests" }, { status: 500 });
  }
}
