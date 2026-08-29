import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: NextRequest) {
  try {
    await ensureFeatureSchema();
    const { searchParams } = new URL(req.url);

    const section = searchParams.get("section")?.trim().toLowerCase() || "course";
    const placement = searchParams.get("placement")?.trim().toLowerCase() || "all";

    const conditions: string[] = [
      `status = 'active'`,
      `(start_datetime IS NULL OR start_datetime <= NOW())`,
      `(end_datetime IS NULL OR end_datetime >= NOW())`,
      `(max_impressions = 0 OR impressions < max_impressions)`,
      `(max_clicks = 0 OR clicks < max_clicks)`,
    ];
    const params: any[] = [];

    // Target Section Match: specific section or general
    params.push(section);
    conditions.push(
      `(LOWER(COALESCE(target_section, target_entity, 'course')) = $${params.length} OR LOWER(COALESCE(target_section, target_entity, '')) = 'general')`
    );

    // Placement Zone Match: top, middle, right_sidebar
    if (placement !== "all") {
      params.push(placement);
      conditions.push(
        `(LOWER(COALESCE(ads_type, placement_zone, 'top')) = $${params.length})`
      );
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const query = `
      SELECT 
        id,
        title,
        institution_id,
        institution_name,
        ads_type,
        placement_zone,
        target_section,
        target_entity,
        COALESCE(image_url, creative_url) AS image_url,
        headline,
        description,
        COALESCE(cta_text, 'Learn More') AS cta_text,
        COALESCE(target_url, '#') AS target_url,
        COALESCE(open_in_new_tab, true) AS open_in_new_tab,
        start_datetime,
        end_datetime,
        impressions,
        clicks
      FROM ads_campaigns
      ${whereClause}
      ORDER BY 
        (CASE WHEN LOWER(COALESCE(target_section, target_entity, '')) = $1 THEN 0 ELSE 1 END) ASC,
        id DESC
      LIMIT 10
    `;

    const res = await db.query(query, params);
    const ads = res.rows;

    // Increment impressions asynchronously for served ads
    if (ads.length > 0) {
      const adIds = ads.map((a: any) => a.id);
      db.query(`UPDATE ads_campaigns SET impressions = impressions + 1 WHERE id = ANY($1::int[])`, [adIds]).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      ads,
      primaryAd: ads[0] || null,
    });
  } catch (error: any) {
    console.error("[Public Ads API GET Error]:", error);
    return NextResponse.json({ success: false, ads: [], primaryAd: null }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureFeatureSchema();
    const body = await req.json();
    const { id, event } = body;

    if (!id) {
      return NextResponse.json({ error: "Ad ID required" }, { status: 400 });
    }

    if (event === "click") {
      await db.query(`UPDATE ads_campaigns SET clicks = clicks + 1 WHERE id = $1`, [Number(id)]);
    } else {
      await db.query(`UPDATE ads_campaigns SET impressions = impressions + 1 WHERE id = $1`, [Number(id)]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Public Ads Track Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
