import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { getInstitutionTenantByHost } from "@/lib/tenancy/institution-domain";

export async function GET(req: NextRequest) {
  try {
    await ensureFeatureSchema();
    const { searchParams } = new URL(req.url);

    const institutionIdParam = searchParams.get("institutionId") || searchParams.get("institution_id");
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim();
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50;

    // Resolve tenant by host/subdomain
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
    let tenant = null;
    try {
      tenant = await getInstitutionTenantByHost(db, host);
    } catch {}

    // Check environment variable for default / configured institution ID
    const envDefaultInstId = (
      process.env.DEFAULT_INSTITUTION_ID ||
      process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID ||
      process.env.INSTITUTION_ID ||
      process.env.NEXT_PUBLIC_INSTITUTION_ID ||
      ""
    ).trim();

    let targetInstitutionId: number | null = null;
    if (institutionIdParam && !isNaN(Number(institutionIdParam)) && Number(institutionIdParam) > 0) {
      targetInstitutionId = Number(institutionIdParam);
    } else if (tenant?.institution_id) {
      targetInstitutionId = Number(tenant.institution_id);
    } else if (envDefaultInstId && /^\d+$/.test(envDefaultInstId) && Number(envDefaultInstId) > 0) {
      targetInstitutionId = Number(envDefaultInstId);
    }

    const conditions: string[] = ["products.status = 'active'"];
    const params: any[] = [];

    // Filter rule:
    // If institute id in env/tenant/params is given: show ONLY products added by that institute
    // If no id is mentioned: show ALL products added by platform admin (institution_id IS NULL)
    if (targetInstitutionId) {
      params.push(targetInstitutionId);
      conditions.push(`products.institution_id = $${params.length}`);
    } else {
      conditions.push(`products.institution_id IS NULL`);
    }

    if (category && category !== "all") {
      params.push(category);
      conditions.push(`products.category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(products.title ILIKE $${params.length} OR products.description ILIKE $${params.length})`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    params.push(limit);
    const limitClause = `LIMIT $${params.length}`;

    const query = `
      SELECT id, title, slug, description, price, sale_price, category, image_url,
             gallery, institution_id, institution_name, stock_quantity, sku,
             badge_text, features, status, is_featured, created_at,
             program_ids,
             (
               SELECT json_agg(json_build_object('id', prog.id, 'title', prog.title))
               FROM institution_programs prog
               WHERE prog.id IN (
                 SELECT jsonb_array_elements_text(COALESCE(products.program_ids, '[]'::jsonb))::int
               )
             ) AS associated_programs
      FROM products
      ${whereClause}
      ORDER BY is_featured DESC, id DESC
      ${limitClause}
    `;

    const res = await db.query(query, params);

    // Fetch distinct categories for the scoped products
    const catParams: any[] = [];
    let catWhere = "WHERE status = 'active' AND category IS NOT NULL AND category != ''";
    if (targetInstitutionId) {
      catParams.push(targetInstitutionId);
      catWhere += ` AND institution_id = $1`;
    } else {
      catWhere += ` AND institution_id IS NULL`;
    }

    const catRes = await db.query(`
      SELECT DISTINCT category 
      FROM products 
      ${catWhere}
      ORDER BY category ASC
    `, catParams);

    // Fetch available academic programs for the institution
    let programs: any[] = [];
    try {
      const progParams: any[] = [];
      let progWhere = "WHERE COALESCE(is_deleted, false) = false";
      if (targetInstitutionId) {
        progParams.push(targetInstitutionId);
        progWhere += ` AND institution_id = $1`;
      }
      const progRes = await db.query(`
        SELECT id, title, slug 
        FROM institution_programs 
        ${progWhere}
        ORDER BY title ASC
        LIMIT 150
      `, progParams);
      programs = progRes.rows;
    } catch {
      programs = [];
    }

    // Fetch institution details if targetInstitutionId is set
    let institutionInfo = null;
    if (targetInstitutionId) {
      try {
        const instRes = await db.query(
          `SELECT id, name, slug, logo_url FROM institution_profiles WHERE id = $1`,
          [targetInstitutionId]
        );
        if (instRes.rows.length > 0) {
          institutionInfo = instRes.rows[0];
        }
      } catch {}
    }

    return NextResponse.json({
      products: res.rows,
      categories: catRes.rows.map(r => r.category),
      programs,
      institution: institutionInfo,
      target_institution_id: targetInstitutionId,
      is_platform_store: !targetInstitutionId,
      total: res.rows.length,
    });
  } catch (error: any) {
    console.error("[Public Products API] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch products" }, { status: 500 });
  }
}
