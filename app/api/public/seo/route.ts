import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensurePageSeoTable, DEFAULT_PLATFORM_SEO_PAGES, type PageSeoRecord } from "@/lib/seo/metadata";

export async function GET(req: Request) {
  try {
    await ensurePageSeoTable();

    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/";
    const instIdParam = url.searchParams.get("institution_id");
    const institutionId = instIdParam && !isNaN(Number(instIdParam)) ? Number(instIdParam) : null;

    const cleanPath = path.split("?")[0].replace(/\/+$/, "") || "/";

    let res = await db.query<PageSeoRecord>(
      `
      SELECT * FROM page_seo_metadata
      WHERE page_path = $1 AND is_active = TRUE
      ORDER BY (CASE WHEN institution_id = $2 THEN 0 WHEN institution_id IS NULL THEN 1 ELSE 2 END) ASC, id ASC
      LIMIT 1
      `,
      [cleanPath, institutionId]
    );

    let record = res.rows[0];

    if (!record && cleanPath.includes("/")) {
      const topSegment = "/" + cleanPath.split("/").filter(Boolean)[0];
      const fallbackRes = await db.query<PageSeoRecord>(
        `
        SELECT * FROM page_seo_metadata
        WHERE page_path = $1 AND is_active = TRUE
        ORDER BY (CASE WHEN institution_id = $2 THEN 0 WHEN institution_id IS NULL THEN 1 ELSE 2 END) ASC, id ASC
        LIMIT 1
        `,
        [topSegment, institutionId]
      );
      record = fallbackRes.rows[0];
    }

    if (!record) {
      // Return default home page seo as fallback
      const defaultRecord = DEFAULT_PLATFORM_SEO_PAGES[0];
      return NextResponse.json({
        data: {
          meta_title: defaultRecord.meta_title,
          meta_description: defaultRecord.meta_description,
          meta_keywords: defaultRecord.meta_keywords,
          canonical_url: defaultRecord.canonical_url,
          og_title: defaultRecord.og_title,
          og_description: defaultRecord.og_description,
          og_image: defaultRecord.og_image,
          twitter_card: defaultRecord.twitter_card,
          favicon_url: defaultRecord.favicon_url,
          robots: defaultRecord.robots,
        },
      });
    }

    return NextResponse.json({
      data: record,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch SEO metadata" }, { status: 500 });
  }
}
