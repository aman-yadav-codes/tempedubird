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
      whereConditions.push(`e.institution_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(e.exam_name ILIKE $${params.length} OR e.category ILIKE $${params.length} OR e.eligibility ILIKE $${params.length})`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const examsRes = await db.query(`
      SELECT
        e.id,
        e.institution_id,
        e.exam_name,
        e.category,
        e.exam_date,
        e.eligibility,
        e.application_fee,
        e.website_url,
        e.description,
        e.created_at,
        COALESCE(ip.name, ip.slug, 'Institution') AS institution_name
      FROM entrance_exams e
      LEFT JOIN institution_profiles ip ON ip.id = e.institution_id
      ${whereClause}
      ORDER BY e.id DESC
    `, params);

    return NextResponse.json({
      success: true,
      exams: examsRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/public/exams error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch exams" }, { status: 500 });
  }
}
