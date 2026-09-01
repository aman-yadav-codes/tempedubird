import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category");
    const categoryId = searchParams.get("category_id");
    const status = searchParams.get("status");
    const institutionIdParam = searchParams.get("institution_id");

    const isPlatformAdmin = Boolean(
      user?.role_codes?.some((r: string) => r.includes("super") || r.includes("platform")) ||
      (user as any)?.role === "platform_admin" ||
      (user as any)?.is_super_admin
    );

    let institutionId: number | null = null;
    if (institutionIdParam && !isNaN(Number(institutionIdParam)) && institutionIdParam !== "all") {
      institutionId = Number(institutionIdParam);
    } else if (!isPlatformAdmin && user?.memberships?.length) {
      const instMem = user.memberships.find((m: any) => m.institution_id);
      if (instMem) institutionId = Number(instMem.institution_id);
    }

    const conditions: string[] = [];
    const params: any[] = [];

    if (institutionId) {
      params.push(institutionId);
      conditions.push(`p.institution_id = $${params.length}`);
    } else if (isPlatformAdmin) {
      conditions.push(`p.institution_id IS NULL`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.title ILIKE $${params.length} OR p.description ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }

    if (categoryId && categoryId !== "all") {
      params.push(Number(categoryId));
      conditions.push(`p.category_id = $${params.length}`);
    } else if (category && category !== "all") {
      params.push(category);
      conditions.push(`p.category = $${params.length}`);
    }

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT 
        p.*,
        pc.name AS category_name,
        pc.slug AS category_slug,
        (
          SELECT json_agg(json_build_object('id', prog.id, 'title', prog.title))
          FROM institution_programs prog
          WHERE prog.id IN (
            SELECT jsonb_array_elements_text(COALESCE(p.program_ids, '[]'::jsonb))::int
          )
        ) AS associated_programs
      FROM products p
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      ${whereClause} 
      ORDER BY p.id DESC
    `;

    const res = await db.query(query, params);
    let products = res.rows;

    const totalProducts = products.length;
    const activeProducts = products.filter((p: any) => p.status === "active").length;
    const outOfStock = products.filter((p: any) => Number(p.stock_quantity) <= 0).length;
    const totalInventoryValue = products.reduce((sum: number, p: any) => sum + (parseFloat(p.price) * (parseInt(p.stock_quantity) || 0)), 0);

    return NextResponse.json({
      products,
      stats: {
        total: totalProducts,
        active: activeProducts,
        outOfStock,
        totalInventoryValue,
      },
    });
  } catch (error: any) {
    console.error("[Products GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const {
      title,
      description,
      price = 0,
      sale_price,
      category = "General",
      category_id,
      program_ids = [],
      image_url,
      gallery = [],
      stock_quantity = 100,
      sku,
      badge_text,
      features = [],
      status = "active",
      is_featured = false,
      institution_id: providedInstId,
      institution_name: providedInstName,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Product title is required" }, { status: 400 });
    }

    let slug = slugify(title);
    if (!slug) slug = `product-${Date.now()}`;

    const slugCheck = await db.query(`SELECT id FROM products WHERE slug = $1`, [slug]);
    if (slugCheck.rows.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    let institutionId = providedInstId ? Number(providedInstId) : null;
    let institutionName = providedInstName || (institutionId ? "Institute Store" : "EduBird Store");

    if (!institutionId && user?.memberships?.length) {
      const instMem = user.memberships.find((m: any) => m.institution_id);
      if (instMem) {
        institutionId = Number(instMem.institution_id);
        institutionName = instMem.institution_name || "Institute Store";
      }
    }

    const res = await db.query(
      `INSERT INTO products (
        title, slug, description, price, sale_price, category, category_id, program_ids, image_url,
        gallery, institution_id, institution_name, stock_quantity, sku,
        badge_text, features, status, is_featured, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
      RETURNING *`,
      [
        title.trim(),
        slug,
        description?.trim() || null,
        parseFloat(String(price)) || 0,
        sale_price !== undefined && sale_price !== null && sale_price !== "" ? parseFloat(String(sale_price)) : null,
        category || "General",
        category_id ? Number(category_id) : null,
        JSON.stringify(Array.isArray(program_ids) ? program_ids.map(Number).filter((id: number) => !isNaN(id) && id > 0) : []),
        image_url?.trim() || null,
        JSON.stringify(gallery || []),
        institutionId,
        institutionName,
        parseInt(String(stock_quantity)) || 0,
        sku?.trim() || null,
        badge_text?.trim() || null,
        JSON.stringify(features || []),
        status || "active",
        Boolean(is_featured),
        user?.id || null,
      ]
    );

    return NextResponse.json({ product: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error("[Products POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create product" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const body = await req.json();

    const {
      id,
      title,
      description,
      price,
      sale_price,
      category,
      category_id,
      program_ids,
      image_url,
      gallery,
      stock_quantity,
      sku,
      badge_text,
      features,
      status,
      is_featured,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const res = await db.query(
      `UPDATE products SET
        title = $1,
        description = $2,
        price = $3,
        sale_price = $4,
        category = $5,
        category_id = $6,
        program_ids = $7,
        image_url = $8,
        gallery = $9,
        stock_quantity = $10,
        sku = $11,
        badge_text = $12,
        features = $13,
        status = $14,
        is_featured = $15,
        updated_at = NOW()
      WHERE id = $16
      RETURNING *`,
      [
        title?.trim(),
        description?.trim() || null,
        parseFloat(String(price)) || 0,
        sale_price !== undefined && sale_price !== null && sale_price !== "" ? parseFloat(String(sale_price)) : null,
        category || "General",
        category_id ? Number(category_id) : null,
        program_ids ? JSON.stringify(Array.isArray(program_ids) ? program_ids.map(Number).filter((pId: number) => !isNaN(pId) && pId > 0) : []) : JSON.stringify([]),
        image_url?.trim() || null,
        JSON.stringify(gallery || []),
        parseInt(String(stock_quantity)) || 0,
        sku?.trim() || null,
        badge_text?.trim() || null,
        JSON.stringify(features || []),
        status || "active",
        Boolean(is_featured),
        id,
      ]
    );

    return NextResponse.json({ product: res.rows[0] });
  } catch (error: any) {
    console.error("[Products PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM products WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Products DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete product" }, { status: 500 });
  }
}
