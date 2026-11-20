import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { getUserCatalogScope } from "@/lib/auth/institution-scope";

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
    const subcategoryId = searchParams.get("subcategory_id");
    const businessCategoryId = searchParams.get("business_category_id") || searchParams.get("businessCategoryId");
    const brand = searchParams.get("brand");
    const sortBy = searchParams.get("sort_by") || "newest";
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

    // Tenant & Professional isolation
    if (user && !isPlatformAdmin) {
      const catalogScope = await getUserCatalogScope(db, user);
      if (catalogScope.isPureProfessional) {
        if (catalogScope.professionalProfileIds.length === 0) {
          return NextResponse.json({
            products: [],
            stats: { total: 0, active: 0, outOfStock: 0, totalInventoryValue: 0 },
          });
        }
        params.push(catalogScope.professionalProfileIds);
        conditions.push(`p.professional_profile_id = ANY($${params.length})`);
      } else if (
        catalogScope.businessProfileIds.length > 0 ||
        catalogScope.institutionIds.length > 0 ||
        catalogScope.professionalProfileIds.length > 0
      ) {
        params.push(
          catalogScope.businessProfileIds.length ? catalogScope.businessProfileIds : null,
          catalogScope.institutionIds.length ? catalogScope.institutionIds : null,
          catalogScope.professionalProfileIds.length ? catalogScope.professionalProfileIds : null,
          user.id
        );
        conditions.push(`(
          ($${params.length - 3}::int[] IS NOT NULL AND p.business_profile_id = ANY($${params.length - 3}))
          OR ($${params.length - 2}::int[] IS NOT NULL AND p.institution_id = ANY($${params.length - 2}))
          OR ($${params.length - 1}::int[] IS NOT NULL AND p.professional_profile_id = ANY($${params.length - 1}))
          OR (p.created_by = $${params.length})
        )`);
      }
    } else if (institutionId) {
      params.push(institutionId);
      conditions.push(`p.institution_id = $${params.length}`);
    } else if (isPlatformAdmin) {
      // Platform admin without institutionId filter sees all or platform level
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.title ILIKE $${params.length} OR p.description ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }

    if (subcategoryId && subcategoryId !== "all") {
      params.push(Number(subcategoryId));
      conditions.push(`(p.subcategory_id = $${params.length} OR p.category_id = $${params.length})`);
    } else if (categoryId && categoryId !== "all") {
      params.push(Number(categoryId));
      conditions.push(`(
        p.category_id = $${params.length} 
        OR p.main_category_id = $${params.length} 
        OR p.subcategory_id IN (SELECT id FROM categories WHERE parent_id = $${params.length})
        OR p.category = (SELECT name FROM categories WHERE id = $${params.length} LIMIT 1)
        OR p.category = (SELECT name FROM product_categories WHERE id = $${params.length} LIMIT 1)
      )`);
    } else if (category && category !== "all") {
      params.push(category);
      conditions.push(`(
        p.category ILIKE $${params.length} 
        OR p.category_id = (SELECT id FROM categories WHERE name ILIKE $${params.length} LIMIT 1)
        OR p.category_id = (SELECT id FROM product_categories WHERE name ILIKE $${params.length} LIMIT 1)
      )`);
    }

    if (businessCategoryId && businessCategoryId !== "all" && /^\d+$/.test(businessCategoryId)) {
      params.push(Number(businessCategoryId));
      conditions.push(`(
        c.business_category_id = $${params.length}
        OR subc.business_category_id = $${params.length}
        OR p.category_id IN (SELECT id FROM categories WHERE business_category_id = $${params.length})
        OR p.main_category_id IN (SELECT id FROM categories WHERE business_category_id = $${params.length})
        OR p.subcategory_id IN (SELECT id FROM categories WHERE business_category_id = $${params.length})
      )`);
    }

    if (brand && brand !== "all") {
      params.push(brand);
      conditions.push(`p.brand ILIKE $${params.length}`);
    }

    if (status && status !== "all") {
      if (status === "out_of_stock") {
        conditions.push(`(p.stock_quantity IS NULL OR p.stock_quantity <= 0)`);
      } else {
        params.push(status);
        conditions.push(`p.status = $${params.length}`);
      }
    }

    let orderClause = "ORDER BY p.id DESC";
    if (sortBy === "price_asc") orderClause = "ORDER BY p.price ASC NULLS LAST";
    else if (sortBy === "price_desc") orderClause = "ORDER BY p.price DESC NULLS LAST";
    else if (sortBy === "name_asc") orderClause = "ORDER BY p.title ASC";
    else if (sortBy === "name_desc") orderClause = "ORDER BY p.title DESC";
    else if (sortBy === "stock_asc") orderClause = "ORDER BY p.stock_quantity ASC NULLS LAST";
    else if (sortBy === "stock_desc") orderClause = "ORDER BY p.stock_quantity DESC NULLS LAST";

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT 
        p.*,
        COALESCE(c.name, pc.name, p.category) AS category_name,
        COALESCE(c.slug, pc.slug) AS category_slug,
        subc.name AS subcategory_name,
        (
          SELECT json_agg(json_build_object('id', prog.id, 'title', prog.title))
          FROM institution_programs prog
          WHERE prog.id IN (
            SELECT jsonb_array_elements_text(COALESCE(p.program_ids, '[]'::jsonb))::int
          )
        ) AS associated_programs
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories subc ON subc.id = p.subcategory_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      ${whereClause} 
      ${orderClause}
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
      main_category_id,
      subcategory_id,
      brand,
      model,
      synonyms = [],
      attributes = {},
      variants = [],
      program_ids = [],
      image_url,
      gallery = [],
      stock_quantity = 100,
      sku,
      badge_text,
      features = [],
      status = "active",
      is_featured = false,
      unit = "piece",
      unit_quantity = 1,
      institution_id: providedInstId,
      institution_name: providedInstName,
      business_profile_id: providedBizId,
      professional_profile_id: providedProfId,
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

    let businessProfileId: number | null = providedBizId ? Number(providedBizId) : null;
    let professionalProfileId: number | null = providedProfId ? Number(providedProfId) : null;

    if (user) {
      const catalogScope = await getUserCatalogScope(db, user);
      if (!businessProfileId) businessProfileId = catalogScope.primaryBusinessId;
      if (!professionalProfileId) professionalProfileId = catalogScope.primaryProfessionalId;
      if (!institutionId && catalogScope.primaryInstitutionId) {
        institutionId = catalogScope.primaryInstitutionId;
      }
    }

    if (!institutionId && user?.memberships?.length) {
      const instMem = user.memberships.find((m: any) => m.institution_id);
      if (instMem) {
        institutionId = Number(instMem.institution_id);
        institutionName = instMem.institution_name || "Institute Store";
      }
    }

    if (businessProfileId && !providedInstName) {
      const bizRes = await db.query<{ name: string }>("SELECT name FROM business_profiles WHERE id = $1", [businessProfileId]);
      if (bizRes.rows[0]?.name) {
        institutionName = bizRes.rows[0].name;
      }
    }

    const res = await db.query(
      `INSERT INTO products (
        title, slug, description, price, sale_price, category, category_id,
        main_category_id, subcategory_id, brand, model,
        program_ids, image_url, gallery,
        institution_id, institution_name, business_profile_id, professional_profile_id,
        stock_quantity, sku, badge_text, features, status, is_featured,
        unit, unit_quantity, synonyms, attributes, variants,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28, $29,
        $30, NOW(), NOW()
      )
      RETURNING *`,
      [
        title.trim(),
        slug,
        description?.trim() || null,
        parseFloat(String(price)) || 0,
        sale_price !== undefined && sale_price !== null && sale_price !== "" ? parseFloat(String(sale_price)) : null,
        category || "General",
        category_id ? Number(category_id) : null,
        main_category_id ? Number(main_category_id) : (category_id ? Number(category_id) : null),
        subcategory_id ? Number(subcategory_id) : null,
        brand?.trim() || null,
        model?.trim() || null,
        JSON.stringify(Array.isArray(program_ids) ? program_ids.map(Number).filter((id: number) => !isNaN(id) && id > 0) : []),
        image_url?.trim() || null,
        JSON.stringify(gallery || []),
        institutionId,
        institutionName,
        businessProfileId,
        professionalProfileId,
        parseInt(String(stock_quantity)) || 0,
        sku?.trim() || null,
        badge_text?.trim() || null,
        JSON.stringify(features || []),
        status || "active",
        Boolean(is_featured),
        unit || "piece",
        Number(unit_quantity) || 1,
        Array.isArray(synonyms) ? synonyms : [],
        JSON.stringify(typeof attributes === "object" ? attributes : {}),
        JSON.stringify(Array.isArray(variants) ? variants : []),
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
      main_category_id,
      subcategory_id,
      brand,
      model,
      synonyms,
      attributes,
      variants,
      program_ids,
      image_url,
      gallery,
      stock_quantity,
      sku,
      badge_text,
      features,
      status,
      is_featured,
      unit,
      unit_quantity,
      business_profile_id,
      professional_profile_id,
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
        main_category_id = COALESCE($7, main_category_id),
        subcategory_id = $8,
        brand = COALESCE($9, brand),
        model = COALESCE($10, model),
        program_ids = $11,
        image_url = $12,
        gallery = $13,
        stock_quantity = $14,
        sku = $15,
        badge_text = $16,
        features = $17,
        status = $18,
        is_featured = $19,
        unit = COALESCE($20, unit),
        unit_quantity = COALESCE($21, unit_quantity),
        synonyms = COALESCE($22, synonyms),
        attributes = COALESCE($23, attributes),
        variants = COALESCE($24, variants),
        business_profile_id = COALESCE($25, business_profile_id),
        professional_profile_id = COALESCE($26, professional_profile_id),
        updated_at = NOW()
      WHERE id = $27
      RETURNING *`,
      [
        title?.trim(),
        description?.trim() || null,
        parseFloat(String(price)) || 0,
        sale_price !== undefined && sale_price !== null && sale_price !== "" ? parseFloat(String(sale_price)) : null,
        category || "General",
        category_id ? Number(category_id) : null,
        main_category_id ? Number(main_category_id) : (category_id ? Number(category_id) : null),
        subcategory_id ? Number(subcategory_id) : null,
        brand?.trim() || null,
        model?.trim() || null,
        program_ids ? JSON.stringify(Array.isArray(program_ids) ? program_ids.map(Number).filter((pId: number) => !isNaN(pId) && pId > 0) : []) : JSON.stringify([]),
        image_url?.trim() || null,
        JSON.stringify(gallery || []),
        parseInt(String(stock_quantity)) || 0,
        sku?.trim() || null,
        badge_text?.trim() || null,
        JSON.stringify(features || []),
        status || "active",
        Boolean(is_featured),
        unit?.trim() || null,
        unit_quantity ? Number(unit_quantity) : null,
        Array.isArray(synonyms) ? synonyms : null,
        attributes ? JSON.stringify(attributes) : null,
        variants ? JSON.stringify(variants) : null,
        business_profile_id ? Number(business_profile_id) : null,
        professional_profile_id ? Number(professional_profile_id) : null,
        id,
      ]
    );

    return NextResponse.json({ product: res.rows[0] });
  } catch (error: any) {
    console.error("[Products PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update product" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureFeatureSchema();
    const body = await req.json();
    const { id, stock_quantity, unit, add_stock } = body;

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    let query = "";
    let params: any[] = [];

    if (add_stock !== undefined && !isNaN(Number(add_stock))) {
      // Incremental stock addition
      if (unit) {
        query = `UPDATE products SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) + $1), unit = $2, updated_at = NOW() WHERE id = $3 RETURNING *`;
        params = [parseInt(String(add_stock)), String(unit).trim(), Number(id)];
      } else {
        query = `UPDATE products SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) + $1), updated_at = NOW() WHERE id = $2 RETURNING *`;
        params = [parseInt(String(add_stock)), Number(id)];
      }
    } else {
      // Set absolute stock
      const newStock = parseInt(String(stock_quantity)) || 0;
      if (unit) {
        query = `UPDATE products SET stock_quantity = $1, unit = $2, updated_at = NOW() WHERE id = $3 RETURNING *`;
        params = [newStock, String(unit).trim(), Number(id)];
      } else {
        query = `UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
        params = [newStock, Number(id)];
      }
    }

    const res = await db.query(query, params);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: res.rows[0] });
  } catch (error: any) {
    console.error("[Products PATCH] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update product stock" }, { status: 500 });
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
