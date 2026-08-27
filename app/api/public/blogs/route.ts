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
      SELECT ib.*, ip.name AS institution_name, ip.slug AS institution_slug, ip.logo_url AS institution_logo
      FROM institution_blogs ib
      LEFT JOIN institution_profiles ip ON ip.id = ib.institution_id
      WHERE ib.is_published = true
    `;
    const params: any[] = [];

    if (slug) {
      params.push(slug);
      query += ` AND (ip.slug = $${params.length} OR ib.institution_id IS NULL)`;
    } else if (institutionId && !isNaN(Number(institutionId))) {
      params.push(Number(institutionId));
      query += ` AND (ib.institution_id = $${params.length} OR ib.institution_id IS NULL)`;
    }

    query += ` ORDER BY ib.published_at DESC LIMIT 20`;

    const res = await db.query(query, params);
    return NextResponse.json({ blogs: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load blogs" }, { status: 500 });
  }
}
