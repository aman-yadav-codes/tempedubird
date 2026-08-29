import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: NextRequest) {
  try {
    await ensureFeatureSchema();
    const { searchParams } = new URL(req.url);

    const institutionIdParam = searchParams.get("institutionId") || searchParams.get("institution_id");
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim();
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50;

    const conditions: string[] = ["status = 'active'"];
    const params: any[] = [];

    if (institutionIdParam && !isNaN(Number(institutionIdParam))) {
      params.push(Number(institutionIdParam));
      conditions.push(`(institution_id = $${params.length} OR institution_id IS NULL)`);
    }

    if (category && category !== "all") {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
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

    // Fetch distinct categories
    const catRes = await db.query(`
      SELECT DISTINCT category 
      FROM products 
      WHERE status = 'active' AND category IS NOT NULL AND category != ''
      ORDER BY category ASC
    `);

    // Fetch available academic programs
    let programs: any[] = [];
    try {
      const progRes = await db.query(`
        SELECT id, title, slug 
        FROM institution_programs 
        WHERE COALESCE(is_deleted, false) = false
        ORDER BY title ASC
        LIMIT 150
      `);
      programs = progRes.rows;
    } catch {
      programs = [];
    }

    return NextResponse.json({
      products: res.rows,
      categories: catRes.rows.map(r => r.category),
      programs,
      total: res.rows.length,
    });
  } catch (error: any) {
    console.error("[Public Products API] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch products" }, { status: 500 });
  }
}
