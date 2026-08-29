import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureBlogPostsTable } from "@/lib/db/ensure-blog-schema";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await ensureBlogPostsTable();
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: "Slug parameter is required" }, { status: 400 });
    }

    const isNumericId = /^\d+$/.test(slug);

    const articleQuery = `
      SELECT 
        bp.*,
        ip.name AS institution_name,
        ip.slug AS institution_slug,
        ip.location_id,
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
      WHERE (bp.slug = $1 ${isNumericId ? "OR bp.id = $2" : ""})
        AND bp.status = 'published'
      LIMIT 1
    `;

    const queryParams = isNumericId ? [slug, Number(slug)] : [slug];
    const result = await db.query(articleQuery, queryParams);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const article = result.rows[0];

    // Asynchronously increment views counter
    db.query(`UPDATE blog_posts SET views_count = COALESCE(views_count, 0) + 1 WHERE id = $1`, [article.id]).catch(() => {});

    // Fetch related articles from same category or same institution
    const relatedResult = await db.query(
      `
        SELECT 
          bp.id,
          bp.slug,
          bp.title,
          bp.category,
          bp.summary,
          bp.cover_image,
          bp.read_time_mins,
          bp.author_name,
          bp.published_at,
          ip.name AS institution_name
        FROM blog_posts bp
        LEFT JOIN institution_profiles ip ON ip.id = bp.institution_id
        WHERE bp.id <> $1
          AND bp.status = 'published'
          AND (bp.category = $2 OR bp.institution_id = $3)
        ORDER BY bp.published_at DESC
        LIMIT 3
      `,
      [article.id, article.category, article.institution_id]
    );

    return NextResponse.json({
      article,
      related: relatedResult.rows,
    });
  } catch (error: any) {
    console.error("[public/blogs/[slug]/route] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load article" }, { status: 500 });
  }
}
