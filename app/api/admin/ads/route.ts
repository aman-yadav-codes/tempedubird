import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const url = new URL(req.url);
    const placement = url.searchParams.get("placement")?.trim();

    let query = `SELECT * FROM ads_campaigns WHERE 1=1`;
    const params: string[] = [];

    if (placement && placement !== "all") {
      params.push(placement);
      query += ` AND placement_slot = $${params.length}`;
    }

    query += ` ORDER BY id DESC`;

    const res = await db.query(query, params);
    return NextResponse.json({ ads: res.rows });
  } catch (error: any) {
    console.error("[Ads GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch ads" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Platform Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      placement_slot = "home_hero_banner",
      banner_image_url,
      target_url,
      call_to_action = "Learn More",
      sponsor_name,
      start_date,
      end_date,
      status = "active",
    } = body;

    if (!title || !banner_image_url || !target_url) {
      return NextResponse.json({ error: "Title, Banner Image URL, and Target URL are required" }, { status: 400 });
    }

    const res = await db.query(
      `
      INSERT INTO ads_campaigns (
        title, placement_slot, banner_image_url, target_url, call_to_action, sponsor_name, start_date, end_date, status, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
      `,
      [
        title.trim(),
        placement_slot,
        banner_image_url.trim(),
        target_url.trim(),
        call_to_action.trim(),
        sponsor_name?.trim() || null,
        start_date || null,
        end_date || null,
        status,
      ]
    );

    return NextResponse.json({ ad: res.rows[0], message: "Ad campaign created successfully" });
  } catch (error: any) {
    console.error("[Ads POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create ad" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Platform Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      title,
      placement_slot,
      banner_image_url,
      target_url,
      call_to_action,
      sponsor_name,
      start_date,
      end_date,
      status,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Ad ID is required" }, { status: 400 });
    }

    const res = await db.query(
      `
      UPDATE ads_campaigns
      SET title = COALESCE($1, title),
          placement_slot = COALESCE($2, placement_slot),
          banner_image_url = COALESCE($3, banner_image_url),
          target_url = COALESCE($4, target_url),
          call_to_action = COALESCE($5, call_to_action),
          sponsor_name = COALESCE($6, sponsor_name),
          start_date = COALESCE($7, start_date),
          end_date = COALESCE($8, end_date),
          status = COALESCE($9, status),
          updated_at = NOW()
      WHERE id = $10
      RETURNING *
      `,
      [
        title,
        placement_slot,
        banner_image_url,
        target_url,
        call_to_action,
        sponsor_name,
        start_date,
        end_date,
        status,
        id,
      ]
    );

    return NextResponse.json({ ad: res.rows[0], message: "Ad updated successfully" });
  } catch (error: any) {
    console.error("[Ads PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update ad" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Platform Admin access required." }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Ad ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM ads_campaigns WHERE id = $1`, [id]);
    return NextResponse.json({ message: "Ad deleted successfully" });
  } catch (error: any) {
    console.error("[Ads DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete ad" }, { status: 500 });
  }
}
