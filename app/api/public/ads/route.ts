import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const url = new URL(req.url);
    const slot = url.searchParams.get("slot") || "home_hero_banner";

    const res = await db.query(
      `
      SELECT * FROM ads_campaigns
      WHERE placement_slot = $1
        AND status = 'active'
        AND (start_date IS NULL OR start_date <= CURRENT_DATE)
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      ORDER BY id DESC
      LIMIT 1
      `,
      [slot]
    );

    if (res.rows.length) {
      // Auto increment impressions asynchronously
      db.query(`UPDATE ads_campaigns SET impressions_count = impressions_count + 1 WHERE id = $1`, [res.rows[0].id]).catch(() => {});
    }

    return NextResponse.json({ ad: res.rows[0] || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load ads" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const body = await req.json();
    const { id } = body;
    if (id) {
      await db.query(`UPDATE ads_campaigns SET clicks_count = clicks_count + 1 WHERE id = $1`, [id]);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to track ad click" }, { status: 500 });
  }
}
