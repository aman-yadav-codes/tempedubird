import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthUser } from "@/lib/auth/auth";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

const DEFAULT_INSTITUTIONS = [
  { id: 101, name: "Maa Sharda Coaching & Institute", city: "Patna", state: "Bihar", logo_url: null },
  { id: 102, name: "Allen Career Institute", city: "Kota", state: "Rajasthan", logo_url: null },
  { id: 103, name: "Aakash Educational Services", city: "New Delhi", state: "Delhi", logo_url: null },
  { id: 104, name: "FIITJEE Premier Center", city: "New Delhi", state: "Delhi", logo_url: null },
  { id: 105, name: "Resonance Eduventures", city: "Kota", state: "Rajasthan", logo_url: null },
  { id: 106, name: "Physics Wallah Vidyapeeth", city: "Noida", state: "Uttar Pradesh", logo_url: null },
  { id: 107, name: "Delhi Public School (DPS)", city: "Delhi", state: "Delhi", logo_url: null },
  { id: 108, name: "IIT Delhi Extension Center", city: "New Delhi", state: "Delhi", logo_url: null },
  { id: 109, name: "Banaras Hindu University (BHU)", city: "Varanasi", state: "Uttar Pradesh", logo_url: null },
  { id: 110, name: "EduBird Global Academy", city: "Bengaluru", state: "Karnataka", logo_url: null },
  { id: 111, name: "Kendriya Vidyalaya Sangathan", city: "Lucknow", state: "Uttar Pradesh", logo_url: null },
  { id: 112, name: "Chanakya IAS Academy", city: "Patna", state: "Bihar", logo_url: null },
];

export async function GET(req: NextRequest) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthUser(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim();
    const adsType = searchParams.get("ads_type");
    const targetSection = searchParams.get("target_section");
    const status = searchParams.get("status");
    const institutionIdParam = searchParams.get("institution_id");

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(ac.title ILIKE $${params.length} OR ac.headline ILIKE $${params.length} OR ac.institution_name ILIKE $${params.length})`);
    }

    if (adsType && adsType !== "all") {
      params.push(adsType);
      conditions.push(`ac.ads_type = $${params.length}`);
    }

    if (targetSection && targetSection !== "all") {
      params.push(targetSection);
      conditions.push(`(ac.target_section = $${params.length} OR ac.target_entity = $${params.length})`);
    }

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`ac.status = $${params.length}`);
    }

    if (institutionIdParam && !isNaN(Number(institutionIdParam)) && institutionIdParam !== "all") {
      params.push(Number(institutionIdParam));
      conditions.push(`ac.institution_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT 
        ac.*,
        ip.name AS profile_institution_name,
        ip.logo_url AS institution_logo
      FROM ads_campaigns ac
      LEFT JOIN institution_profiles ip ON ip.id = ac.institution_id
      ${whereClause}
      ORDER BY ac.id DESC
    `;

    const res = await db.query(query, params);
    const ads = res.rows;

    // Fetch institutions list for suggestion box
    let institutions: any[] = [];
    try {
      const instRes = await db.query(`
        SELECT id, name, city, state, logo_url
        FROM institution_profiles
        ORDER BY name ASC
        LIMIT 300
      `);
      if (instRes.rows && instRes.rows.length > 0) {
        institutions = instRes.rows;
      }
    } catch (e) {
      console.warn("[Ads API] Fallback to default institutions list:", e);
    }

    // Merge defaults if database has few
    const combinedInsts = [...institutions];
    for (const def of DEFAULT_INSTITUTIONS) {
      if (!combinedInsts.some((i) => i.name.toLowerCase() === def.name.toLowerCase())) {
        combinedInsts.push(def);
      }
    }

    // Calculate Summary Stats
    const totalCampaigns = ads.length;
    const activeCampaigns = ads.filter((a: any) => a.status === "active").length;
    const totalImpressions = ads.reduce((sum: number, a: any) => sum + (parseInt(a.impressions) || 0), 0);
    const totalClicks = ads.reduce((sum: number, a: any) => sum + (parseInt(a.clicks) || 0), 0);
    const averageCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

    return NextResponse.json({
      success: true,
      ads,
      institutions: combinedInsts,
      stats: {
        total: totalCampaigns,
        active: activeCampaigns,
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: `${averageCtr}%`,
      },
    });
  } catch (error: any) {
    console.error("[Ads API GET Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch ad campaigns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthUser(req);
    const body = await req.json();

    const {
      title,
      institution_id,
      institution_name,
      ads_type = "top",
      target_section = "course",
      image_url,
      creative_url,
      headline,
      description,
      cta_text = "Learn More",
      target_url,
      open_in_new_tab = true,
      start_datetime,
      end_datetime,
      max_impressions = 0,
      max_clicks = 0,
      status = "active",
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Campaign title is required" }, { status: 400 });
    }

    const finalImage = image_url?.trim() || creative_url?.trim() || "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80";

    const insertQuery = `
      INSERT INTO ads_campaigns (
        title,
        institution_id,
        institution_name,
        ads_type,
        placement_zone,
        target_section,
        target_entity,
        image_url,
        creative_url,
        headline,
        description,
        cta_text,
        target_url,
        open_in_new_tab,
        start_datetime,
        end_datetime,
        start_date,
        end_date,
        max_impressions,
        max_clicks,
        impressions,
        clicks,
        status,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::timestamp, $16::timestamp, $17::date, $18::date, $19, $20, 0, 0, $21, NOW(), NOW()
      ) RETURNING *;
    `;

    const values = [
      title.trim(),
      institution_id ? Number(institution_id) : null,
      institution_name?.trim() || null,
      ads_type || "top",
      ads_type || "top",
      target_section || "course",
      target_section || "course",
      finalImage,
      finalImage,
      headline?.trim() || null,
      description?.trim() || null,
      cta_text?.trim() || "Learn More",
      target_url?.trim() || "#",
      Boolean(open_in_new_tab),
      start_datetime ? new Date(start_datetime) : new Date(),
      end_datetime ? new Date(end_datetime) : null,
      start_datetime ? new Date(start_datetime) : new Date(),
      end_datetime ? new Date(end_datetime) : null,
      parseInt(max_impressions) || 0,
      parseInt(max_clicks) || 0,
      status || "active",
    ];

    const res = await db.query(insertQuery, values);
    return NextResponse.json({ success: true, ad: res.rows[0] });
  } catch (error: any) {
    console.error("[Ads API POST Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to create ad campaign" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthUser(req);
    const body = await req.json();

    const {
      id,
      title,
      institution_id,
      institution_name,
      ads_type = "top",
      target_section = "course",
      image_url,
      creative_url,
      headline,
      description,
      cta_text = "Learn More",
      target_url,
      open_in_new_tab = true,
      start_datetime,
      end_datetime,
      max_impressions = 0,
      max_clicks = 0,
      status = "active",
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Ad ID is required for update" }, { status: 400 });
    }

    const finalImage = image_url?.trim() || creative_url?.trim();

    const updateQuery = `
      UPDATE ads_campaigns
      SET
        title = COALESCE($1, title),
        institution_id = $2,
        institution_name = $3,
        ads_type = COALESCE($4, ads_type),
        placement_zone = COALESCE($4, placement_zone),
        target_section = COALESCE($5, target_section),
        target_entity = COALESCE($5, target_entity),
        image_url = COALESCE($6, image_url),
        creative_url = COALESCE($6, creative_url),
        headline = $7,
        description = $8,
        cta_text = COALESCE($9, cta_text),
        target_url = COALESCE($10, target_url),
        open_in_new_tab = $11,
        start_datetime = $12::timestamp,
        end_datetime = $13::timestamp,
        start_date = $12::date,
        end_date = $13::date,
        max_impressions = $14,
        max_clicks = $15,
        status = COALESCE($16, status),
        updated_at = NOW()
      WHERE id = $17
      RETURNING *;
    `;

    const values = [
      title ? title.trim() : null,
      institution_id ? Number(institution_id) : null,
      institution_name?.trim() || null,
      ads_type,
      target_section || "course",
      finalImage,
      headline?.trim() || null,
      description?.trim() || null,
      cta_text?.trim() || "Learn More",
      target_url?.trim() || "#",
      Boolean(open_in_new_tab),
      start_datetime ? new Date(start_datetime) : null,
      end_datetime ? new Date(end_datetime) : null,
      parseInt(max_impressions) || 0,
      parseInt(max_clicks) || 0,
      status,
      Number(id),
    ];

    const res = await db.query(updateQuery, values);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ad: res.rows[0] });
  } catch (error: any) {
    console.error("[Ads API PUT Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to update ad campaign" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Ad ID is required" }, { status: 400 });
    }

    await db.query("DELETE FROM ads_campaigns WHERE id = $1", [Number(id)]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Ads API DELETE Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to delete ad campaign" }, { status: 500 });
  }
}
