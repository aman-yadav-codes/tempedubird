import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

const PLATFORM_EDITORIAL_BLOGS = [
  {
    id: 1001,
    institution_id: null,
    title: "National Education Policy Guidelines & Academic Modernization",
    body: "Comprehensive analysis of NEP standards, modern curriculum frameworks, and skill-based academic pathways across Indian educational institutions.",
    category: "Education Policy",
    created_at: new Date().toISOString(),
    price: "Free",
    is_free: true,
    institution_name: "EduBird Editorial Board",
    institution_slug: "edubird",
  },
  {
    id: 1002,
    institution_id: null,
    title: "Smart Learning Technologies & Digital Classrooms in 2026",
    body: "How hybrid pedagogical models and intelligent assessment tools are elevating student performance and institute operational efficiency nationwide.",
    category: "EdTech Trends",
    created_at: new Date().toISOString(),
    price: "Free",
    is_free: true,
    institution_name: "EduBird Editorial Board",
    institution_slug: "edubird",
  },
  {
    id: 1003,
    institution_id: null,
    title: "Career Navigation: Choosing the Right Specialization After 12th",
    body: "In-depth guide for learners and guardians on competitive exam preparation, university selection, and emerging technology careers.",
    category: "Career Guidance",
    created_at: new Date().toISOString(),
    price: "Free",
    is_free: true,
    institution_name: "EduBird Editorial Board",
    institution_slug: "edubird",
  },
];

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
    } else {
      // Platform Marketplace mode: strictly show only platform admin added blogs (where institution_id IS NULL)
      whereConditions.push(`n.institution_id IS NULL`);
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

    let rows = blogsRes.rows;

    // For marketplace mode, if no platform blogs added yet in DB, show EduBird editorial blogs
    if (!institutionId && rows.length === 0 && !search) {
      rows = PLATFORM_EDITORIAL_BLOGS;
    }

    return NextResponse.json({
      success: true,
      blogs: rows,
    });
  } catch (err: any) {
    console.error("GET /api/public/blogs error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch blogs" }, { status: 500 });
  }
}
