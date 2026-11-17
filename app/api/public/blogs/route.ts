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
    const paramInstId =
      url.searchParams.get("institutionId") ||
      url.searchParams.get("institution_id") ||
      url.searchParams.get("businessId") ||
      url.searchParams.get("business_id");
    const envInstId = (
      process.env.BUSINESS_ID ||
      process.env.NEXT_PUBLIC_BUSINESS_ID ||
      process.env.INSTITUTION_ID ||
      process.env.NEXT_PUBLIC_INSTITUTION_ID ||
      ""
    ).trim();
    const effectiveInstId =
      paramInstId && /^\d+$/.test(paramInstId)
        ? Number(paramInstId)
        : envInstId && /^\d+$/.test(envInstId)
        ? Number(envInstId)
        : null;

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

    if (effectiveInstId && Number.isInteger(effectiveInstId) && effectiveInstId > 0) {
      params.push(effectiveInstId);
      where.push(`(bp.institution_id = $${params.length})`);
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

    let finalBlogs = listResult.rows;
    let finalTotal = parseInt(countResult.rows[0]?.count || "0", 10);

    if (finalBlogs.length === 0 && effectiveInstId) {
      try {
        const newsRes = await db.query(
          `SELECT
             n.id,
             n.slug,
             n.title,
             n.content,
             n.published_at,
             n.created_at,
             n.image_urls,
             n.target_label,
             n.target_role_code,
             ip.name AS institution_name,
             ip.slug AS institution_slug
           FROM institution_news n
           LEFT JOIN institution_profiles ip ON ip.id = n.institution_id
           WHERE n.institution_id = $1 AND COALESCE(n.is_deleted, FALSE) = FALSE AND COALESCE(n.is_active, TRUE) = TRUE
           ORDER BY n.published_at DESC, n.id DESC
           LIMIT $2 OFFSET $3`,
          [effectiveInstId, limit, offset]
        );
        const countNews = await db.query(
          `SELECT COUNT(*)::text as count FROM institution_news WHERE institution_id = $1 AND COALESCE(n.is_deleted, FALSE) = FALSE AND COALESCE(n.is_active, TRUE) = TRUE`,
          [effectiveInstId]
        ).catch(async () => {
          return db.query(`SELECT COUNT(*)::text as count FROM institution_news WHERE institution_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE`, [effectiveInstId]);
        });
        finalTotal = parseInt(countNews.rows[0]?.count || "0", 10);
        finalBlogs = newsRes.rows.map((n: any) => ({
          id: n.id,
          slug: n.slug || `news-${n.id}`,
          title: n.title,
          category: "Campus News & Announcements",
          sub_category: n.target_role_code || "General",
          summary: n.content ? n.content.replace(/<[^>]*>?/gm, "").slice(0, 180) : n.title,
          content_html: n.content,
          cover_image: (Array.isArray(n.image_urls) && n.image_urls[0]) || "/images/placeholders/campus.jpg",
          video_url: null,
          tags: n.target_label || "Campus News",
          is_featured: true,
          read_time_mins: 3,
          views_count: 120,
          author_name: "Administration Desk",
          author_role: "Campus Notice Board",
          author_avatar: null,
          institution_name: n.institution_name || "Campus",
          institution_slug: n.institution_slug || null,
          published_at: n.published_at || n.created_at,
          created_at: n.created_at,
        }));
      } catch (newsErr) {
        console.warn("Failed to query institution_news fallback:", newsErr);
      }
    }

    return NextResponse.json({
      blogs: finalBlogs,
      total: finalTotal,
      page,
      limit,
      totalPages: Math.ceil(finalTotal / limit),
    });
  } catch (error: any) {
    console.error("[public/blogs/route] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load articles" }, { status: 500 });
  }
}
