import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug")?.trim();
    const institutionId = url.searchParams.get("institutionId");

    let query = `
      SELECT io.*, ip.name AS institution_name, ip.slug AS institution_slug
      FROM institution_offers io
      LEFT JOIN institution_profiles ip ON ip.id = io.institution_id
      WHERE io.is_active = true
        AND (io.start_date IS NULL OR io.start_date <= CURRENT_DATE)
        AND (io.end_date IS NULL OR io.end_date >= CURRENT_DATE)
    `;
    const params: any[] = [];

    if (slug) {
      params.push(slug);
      query += ` AND (ip.slug = $${params.length} OR io.institution_id IS NULL)`;
    } else if (institutionId && !isNaN(Number(institutionId))) {
      params.push(Number(institutionId));
      query += ` AND (io.institution_id = $${params.length} OR io.institution_id IS NULL)`;
    }

    query += ` ORDER BY io.id DESC LIMIT 10`;

    const res = await db.query(query, params);
    return NextResponse.json({ offers: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load offers" }, { status: 500 });
  }
}
