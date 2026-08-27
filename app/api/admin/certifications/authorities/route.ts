import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";

    let query = `
      SELECT DISTINCT authority_name, designation, is_platform
      FROM (
        SELECT authority_name, designation, is_platform FROM cert_issuing_authorities
        UNION
        SELECT DISTINCT provider_name AS authority_name, 'Accreditation Board' AS designation, true AS is_platform FROM certification_providers WHERE provider_name IS NOT NULL AND provider_name != ''
      ) combined
    `;

    const params: string[] = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` WHERE authority_name ILIKE $1`;
    }

    query += ` ORDER BY authority_name ASC LIMIT 50`;

    const res = await db.query(query, params);
    return NextResponse.json({ authorities: res.rows });
  } catch (error: any) {
    console.error("[Cert Authorities GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch authorities" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const body = await req.json();
    const { authority_name, designation, institution_id, is_platform = false } = body;

    if (!authority_name || !authority_name.trim()) {
      return NextResponse.json({ error: "Authority name is required" }, { status: 400 });
    }

    const res = await db.query(
      `
      INSERT INTO cert_issuing_authorities (authority_name, designation, institution_id, is_platform)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
      RETURNING *
      `,
      [authority_name.trim(), designation?.trim() || "Issuing Body", institution_id || null, is_platform]
    );

    return NextResponse.json({
      success: true,
      authority: res.rows[0] || { authority_name },
      message: "Authority saved",
    });
  } catch (error: any) {
    console.error("[Cert Authorities POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create authority" }, { status: 500 });
  }
}
