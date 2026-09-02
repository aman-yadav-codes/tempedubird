import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureBlogPostsTable } from "@/lib/db/ensure-blog-schema";

export async function GET(req: Request) {
  try {
    await ensureBlogPostsTable();
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim();
    const category = url.searchParams.get("category")?.trim();
    const tag = url.searchParams.get("tag")?.trim();
    const featured = url.searchParams.get("featured");
    const institutionId = url.searchParams.get("institutionId");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "12", 10)));
    const offset = (page - 1) * limit;

    const where: string[] = ["bp.status = 'published'"];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(
        bp.title ILIKE $${params.length} 
        OR bp.summary ILIKE $${params.length} 
        OR bp.tags ILIKE $${params.length}
        OR COALESCE(ip.name, '') ILIKE $${params.length}
      )`);
    }

    if (category && category !== "all" && category !== "All Categories") {
      params.push(category);
      where.push(`bp.category = $${params.length}`);
    }

    if (tag) {
      params.push(`%${tag}%`);
      where.push(`bp.tags ILIKE $${params.length}`);
    }

    if (featured === "true") {
      where.push(`bp.is_featured = true`);
    }

    if (institutionId && !isNaN(Number(institutionId))) {
      params.push(Number(institutionId));
      where.push(`(bp.institution_id = $${params.length} OR bp.institution_id IS NULL)`);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const [countResult, listResult] = await Promise.all([
      db.query<{ count: string }>(
        `
          SELECT COUNT(*)::text as count
          FROM blog_posts bp
          LEFT JOIN institution_profiles ip ON ip.id = bp.institution_id
          ${whereSql}
        `,
        params
      ),
      db.query(
        `
          SELECT 
            bp.id,
            bp.slug,
            bp.title,
            bp.category,
            bp.sub_category,
            bp.summary,
            bp.cover_image,
            bp.video_url,
            bp.tags,
            bp.is_featured,
            bp.read_time_mins,
            bp.views_count,
            bp.author_name,
            bp.author_role,
            bp.author_avatar,
            bp.published_at,
            bp.created_at,
            bp.institution_id,
            ip.name AS institution_name,
            ip.slug AS institution_slug,
            (
              SELECT media.url
              FROM institution_media media
              WHERE media.institution_id = ip.id
                AND COALESCE(media.is_deleted, FALSE) = FALSE
                AND media.url IS NOT NULL AND media.url <> ''
                AND (lower(COALESCE(media.media_type, '')) = 'logo' OR lower(COALESCE(media.title, '')) LIKE '%logo%')
              ORDER BY media.sort_order ASC, media.id ASC
              LIMIT 1
            ) AS institution_logo
          FROM blog_posts bp
          LEFT JOIN institution_profiles ip ON ip.id = bp.institution_id
          ${whereSql}
          ORDER BY bp.is_featured DESC, bp.published_at DESC, bp.id DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        [...params, limit, offset]
      ),
    ]);

    const total = parseInt(countResult.rows[0]?.count || "0", 10);

    return NextResponse.json({
      blogs: listResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("[public/blogs/route] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load articles" }, { status: 500 });
  }
}
