import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
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
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("categoryId");

    const catalogScope = await getUserCatalogScope(db, user);

    // Find which master products this seller has already inherited
    const inheritedRes = await db.query<{ master_product_id: number }>(
      `SELECT DISTINCT master_product_id 
       FROM products 
       WHERE master_product_id IS NOT NULL 
       AND (
         ($1::int[] IS NOT NULL AND business_profile_id = ANY($1))
         OR ($2::int[] IS NOT NULL AND professional_profile_id = ANY($2))
         OR ($3::int[] IS NOT NULL AND institution_id = ANY($3))
         OR (created_by = $4)
       )`,
      [
        catalogScope.businessProfileIds.length ? catalogScope.businessProfileIds : null,
        catalogScope.professionalProfileIds.length ? catalogScope.professionalProfileIds : null,
        catalogScope.institutionIds.length ? catalogScope.institutionIds : null,
        user.id,
      ]
    );

    const inheritedIds = new Set(inheritedRes.rows.map((r) => r.master_product_id));

    let query = `
      SELECT 
        mp.id,
        mp.name,
        mp.slug,
        mp.category_id,
        COALESCE(mp.main_category_id, mp.category_id) AS main_category_id,
        mp.subcategory_id,
        COALESCE(c_main.name, c.name, 'General') AS category_name,
        mp.description,
        mp.default_image_url,
        mp.brand,
        mp.model,
        COALESCE(mp.sku, mp.sku_prefix, '') AS sku,
        COALESCE(mp.unit_of_measurement, mp.unit, 'Piece') AS unit_of_measurement,
        COALESCE(mp.unit, mp.unit_of_measurement, 'Piece') AS unit,
        COALESCE(mp.unit_quantity, 1) AS unit_quantity,
        COALESCE(NULLIF(mp.suggested_price, 0), NULLIF(mp.suggested_price_inr, 0), NULLIF(mp.regular_price, 0), 0) AS suggested_price,
        COALESCE(mp.stock_quantity, 100) AS stock_quantity,
        mp.is_active,
        mp.created_at
      FROM master_products mp
      LEFT JOIN categories c_main ON c_main.id = COALESCE(mp.main_category_id, mp.category_id)
      LEFT JOIN categories c ON c.id = mp.category_id
      WHERE COALESCE(mp.is_active, TRUE) = TRUE
    `;

    const params: any[] = [];
    let pIdx = 1;

    if (search) {
      query += ` AND (
        mp.name ILIKE $${pIdx} 
        OR mp.description ILIKE $${pIdx} 
        OR mp.brand ILIKE $${pIdx}
        OR mp.sku ILIKE $${pIdx}
        OR array_to_string(mp.synonyms, ' ') ILIKE $${pIdx}
      )`;
      params.push(`%${search}%`);
      pIdx++;
    }

    if (categoryId && !isNaN(Number(categoryId)) && Number(categoryId) > 0) {
      query += ` AND (mp.category_id = $${pIdx} OR mp.main_category_id = $${pIdx} OR mp.subcategory_id = $${pIdx})`;
      params.push(Number(categoryId));
      pIdx++;
    }

    query += ` ORDER BY mp.name ASC LIMIT 200`;

    const { rows } = await db.query(query, params);

    const products = rows.map((row: any) => ({
      ...row,
      already_inherited: inheritedIds.has(row.id),
    }));

    return NextResponse.json({
      success: true,
      products,
      total: products.length,
    });
  } catch (error: any) {
    console.error("[Products Inherit GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch master products for inheritance" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { master_product_ids = [], custom_prices = {} } = body;

    if (!Array.isArray(master_product_ids) || master_product_ids.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one master product to inherit" },
        { status: 400 }
      );
    }

    const catalogScope = await getUserCatalogScope(db, user);

    const businessProfileId = catalogScope.primaryBusinessId;
    const professionalProfileId = catalogScope.primaryProfessionalId;
    const institutionId = catalogScope.primaryInstitutionId;

    let institutionName = "Seller Store";
    if (institutionId) {
      const instRes = await db.query<{ name: string }>(
        `SELECT name FROM institution_profiles WHERE id = $1`,
        [institutionId]
      );
      if (instRes.rows[0]?.name) {
        institutionName = instRes.rows[0].name;
      }
    } else if (businessProfileId) {
      const bizRes = await db.query<{ name: string }>(
        `SELECT name FROM business_profiles WHERE id = $1`,
        [businessProfileId]
      );
      if (bizRes.rows[0]?.name) {
        institutionName = bizRes.rows[0].name;
      }
    }

    // Fetch the target master products
    const masterProdsRes = await db.query(
      `SELECT 
        mp.*,
        COALESCE(c_main.name, c.name, 'General') AS category_name
       FROM master_products mp
       LEFT JOIN categories c_main ON c_main.id = COALESCE(mp.main_category_id, mp.category_id)
       LEFT JOIN categories c ON c.id = mp.category_id
       WHERE mp.id = ANY($1)`,
      [master_product_ids]
    );

    const masterProducts = masterProdsRes.rows;
    if (masterProducts.length === 0) {
      return NextResponse.json({ error: "No matching master products found" }, { status: 404 });
    }

    let insertedCount = 0;

    for (const mp of masterProducts) {
      // Check if already inherited by this seller
      const existingCheck = await db.query(
        `SELECT id FROM products 
         WHERE master_product_id = $1 
         AND (
           ($2::int IS NOT NULL AND business_profile_id = $2)
           OR ($3::int IS NOT NULL AND professional_profile_id = $3)
           OR ($4::int IS NOT NULL AND institution_id = $4)
           OR (created_by = $5)
         ) LIMIT 1`,
        [mp.id, businessProfileId, professionalProfileId, institutionId, user.id]
      );

      const price =
        custom_prices[mp.id] !== undefined && custom_prices[mp.id] !== null && Number(custom_prices[mp.id]) > 0
          ? Number(custom_prices[mp.id])
          : Number(mp.suggested_price || mp.suggested_price_inr || mp.regular_price || 0);

      const unit = mp.unit || mp.unit_of_measurement || "Piece";
      const unitQuantity = Number(mp.unit_quantity) || 1;
      const stockQuantity = Number(mp.stock_quantity) || 100;
      const sku = mp.sku || `SKU-${mp.id}-${Date.now().toString().slice(-4)}`;

      let baseSlug = slugify(mp.name || `product-${mp.id}`);
      let productSlug = `${baseSlug}-${businessProfileId || user.id || Date.now()}`;

      // Check slug uniqueness
      const slugCheck = await db.query(`SELECT id FROM products WHERE slug = $1`, [productSlug]);
      if (slugCheck.rows.length > 0) {
        productSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
      }

      if (existingCheck.rows.length === 0) {
        // Insert into products
        await db.query(
          `INSERT INTO products (
            title, slug, description, price, category, category_id,
            main_category_id, subcategory_id, brand, model,
            image_url, stock_quantity, sku, status, is_featured,
            unit, unit_quantity, synonyms, attributes, variants,
            business_profile_id, professional_profile_id, institution_id, institution_name,
            master_product_id, created_by, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13, 'active', FALSE,
            $14, $15, $16, $17, $18,
            $19, $20, $21, $22,
            $23, $24, NOW(), NOW()
          )`,
          [
            mp.name,
            productSlug,
            mp.description || null,
            price,
            mp.category_name || "General",
            mp.category_id || null,
            mp.main_category_id || mp.category_id || null,
            mp.subcategory_id || null,
            mp.brand || null,
            mp.model || null,
            mp.default_image_url || null,
            stockQuantity,
            sku,
            unit,
            unitQuantity,
            mp.synonyms || [],
            JSON.stringify(mp.attributes || {}),
            JSON.stringify(mp.variants || []),
            businessProfileId,
            professionalProfileId,
            institutionId,
            institutionName,
            mp.id,
            user.id,
          ]
        );
        insertedCount++;
      }

      // Also ensure business_products record exists if businessProfileId is available
      if (businessProfileId) {
        const bpCheck = await db.query(
          `SELECT id FROM business_products WHERE business_profile_id = $1 AND master_product_id = $2`,
          [businessProfileId, mp.id]
        );

        if (bpCheck.rows.length === 0) {
          await db.query(
            `INSERT INTO business_products (
              business_id, business_profile_id, master_product_id,
              custom_name, custom_description, custom_image_url,
              price, unit, unit_quantity, inventory_count, in_stock, is_available, sku,
              created_at, updated_at
            ) VALUES (
              $1, $1, $2,
              $3, $4, $5,
              $6, $7, $8, $9, TRUE, TRUE, $10,
              NOW(), NOW()
            )`,
            [
              businessProfileId,
              mp.id,
              mp.name,
              mp.description || null,
              mp.default_image_url || null,
              price,
              unit,
              unitQuantity,
              stockQuantity,
              sku,
            ]
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: insertedCount,
      message: `Successfully inherited ${insertedCount} product${insertedCount === 1 ? "" : "s"} into your store catalog.`,
    });
  } catch (error: any) {
    console.error("[Products Inherit POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to inherit master products" },
      { status: 500 }
    );
  }
}
