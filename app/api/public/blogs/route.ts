import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get("institutionId") ? Number(searchParams.get("institutionId")) : null;
    const search = searchParams.get("search")?.trim() || "";

    const whereConditions: string[] = ["COALESCE(n.is_deleted, FALSE) = FALSE", "COALESCE(n.is_active, TRUE) = TRUE"];
    const params: unknown[] = [];

    if (institutionId && Number.isInteger(institutionId) && institutionId > 0) {
      params.push(institutionId);
      whereConditions.push(`n.institution_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(n.title ILIKE $${params.length} OR n.content ILIKE $${params.length} OR ip.name ILIKE $${params.length})`);
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const blogsRes = await db.query(`
      SELECT
        n.id,
        n.institution_id,
        n.title,
        COALESCE(n.content, '') AS body,
        COALESCE(n.target_label, 'Campus Update') AS category,
        n.created_at,
        'Free' AS price,
        TRUE AS is_free,
        COALESCE(ip.name, ip.slug, 'EduBird News') AS institution_name,
        ip.slug AS institution_slug
      FROM institution_news n
      LEFT JOIN institution_profiles ip ON ip.id = n.institution_id
      ${whereClause}
      ORDER BY n.id DESC
      LIMIT 50
    `, params);

    return NextResponse.json({
      success: true,
      blogs: blogsRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/public/blogs error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch blogs" }, { status: 500 });
  }
}
