import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { getUserCatalogScope } from "@/lib/auth/institution-scope";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    const search = searchParams.get("search")?.trim() || "";

    if (!businessId) {
      return NextResponse.json({ error: "businessId parameter is required" }, { status: 400 });
    }

    // Verify ownership and get business country context
    const catalogScope = await getUserCatalogScope(db, user);
    const hasAccess =
      catalogScope.isSuperAdmin ||
      catalogScope.businessProfileIds.includes(Number(businessId));

    if (!hasAccess) {
      return NextResponse.json({ error: "Business not found or unauthorized" }, { status: 403 });
    }

    const bpCheck = await db.query(
      `SELECT id, country_code FROM business_profiles WHERE id = $1 LIMIT 1`,
      [Number(businessId)]
    );
    if (!bpCheck.rows[0]) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    const businessRecord = bpCheck.rows[0];
    const countryCode = businessRecord.country_code || "IN";
    const defaultCurrency = countryCode === "US" ? "USD" : "INR";

    // Products of this business with master catalog fallback
    const bpRes = await db.query(
      `SELECT 
         bp.*,
         COALESCE(bp.custom_name, mp.name) AS display_name,
         mp.name AS master_name,
         mp.name AS master_title,
         mp.brand AS master_brand,
         mp.model AS master_model,
         COALESCE(bp.sku, mp.sku) AS effective_sku,
         mp.unit_of_measurement AS master_uom,
         mp.default_image_url AS master_image_url,
         COALESCE(mp.additional_images, '{}') AS master_additional_images,
         COALESCE(bp.custom_image_url, mp.default_image_url) AS effective_image_url,
         COALESCE(bp.custom_description, mp.description) AS effective_description,
         COALESCE(bp.attributes, mp.attributes, '{}'::jsonb) AS effective_attributes,
         COALESCE(mp.attributes, '{}'::jsonb) AS master_attributes,
         mp.suggested_price_inr,
         mp.suggested_price_usd,
         mp.suggested_price,
         c_main.name AS main_category_name,
         c_sub.name AS subcategory_name,
         COALESCE(c_main.name, c.name, 'General') AS category_name
       FROM business_products bp
       LEFT JOIN master_products mp ON mp.id = bp.master_product_id
       LEFT JOIN categories c ON c.id = mp.category_id
       LEFT JOIN categories c_main ON c_main.id = COALESCE(mp.main_category_id, mp.category_id)
       LEFT JOIN categories c_sub ON c_sub.id = mp.subcategory_id
       WHERE (bp.business_id = $1 OR bp.business_profile_id = $1)
       ORDER BY bp.id DESC`,
      [Number(businessId)]
    );

    // Available Master Products for adding (with optional search)
    let mpQuery = `
      SELECT 
        mp.id,
        mp.name,
        mp.name AS title,
        mp.slug,
        mp.brand,
        mp.model,
        mp.sku,
        mp.unit_of_measurement,
        mp.default_image_url,
        COALESCE(mp.additional_images, '{}') AS additional_images,
        COALESCE(mp.attributes, '{}'::jsonb) AS attributes,
        COALESCE(mp.synonyms, '{}') AS synonyms,
        COALESCE(mp.suggested_price_inr, mp.suggested_price, 0) AS suggested_price_inr,
        COALESCE(mp.suggested_price_usd, 0) AS suggested_price_usd,
        COALESCE(mp.suggested_price, 0) AS suggested_price,
        mp.description,
        mp.main_category_id,
        mp.subcategory_id,
        c_main.name AS main_category_name,
        c_sub.name AS subcategory_name,
        COALESCE(c_main.name, c.name, 'General') AS category_name
      FROM master_products mp
      LEFT JOIN categories c ON c.id = mp.category_id
      LEFT JOIN categories c_main ON c_main.id = COALESCE(mp.main_category_id, mp.category_id)
      LEFT JOIN categories c_sub ON c_sub.id = mp.subcategory_id
      WHERE mp.is_active = true
        AND (
          mp.business_profile_id IS NULL
          OR mp.business_profile_id = $1
        )
    `;
    const mpParams: any[] = [Number(businessId)];

    if (search) {
      mpQuery += ` AND (
        mp.name ILIKE $2 
        OR mp.description ILIKE $2 
        OR mp.brand ILIKE $2 
        OR mp.model ILIKE $2 
        OR mp.sku ILIKE $2 
        OR array_to_string(mp.synonyms, ' ') ILIKE $2
      )`;
      mpParams.push(`%${search}%`);
    }

    mpQuery += ` ORDER BY mp.name ASC LIMIT 250`;
    const mpRes = await db.query(mpQuery, mpParams);

    return NextResponse.json({
      success: true,
      products: bpRes.rows,
      masterCatalog: mpRes.rows,
      businessCountry: countryCode,
      businessCurrency: defaultCurrency,
    });
  } catch (err: unknown) {
    console.error("[GET /api/business/products] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load business products" },
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
    const businessId = Number(body.businessId);
    const id = body.id ? Number(body.id) : null;
    const masterProductId = body.masterProductId ? Number(body.masterProductId) : null;
    const customName = body.customName?.trim();
    const customDescription = body.customDescription?.trim() || null;
    const customImageUrl = body.customImageUrl?.trim() || null;
    const additionalImages = Array.isArray(body.additionalImages)
      ? body.additionalImages.map((s: string) => String(s).trim()).filter(Boolean)
      : typeof body.additionalImages === "string"
      ? body.additionalImages.split("\n").map((s: string) => s.trim()).filter(Boolean)
      : [];
    const price = Number(body.price || 0);
    const currency = body.currency || "INR";
    const inventoryCount = parseInt(body.inventoryCount || body.quantity || "0", 10);
    const sku = body.sku?.trim() || null;
    const isAvailable = body.isAvailable !== false;
    const attributes = body.attributes && typeof body.attributes === "object" ? body.attributes : {};

    if (!businessId) {
      return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
    }

    // Verify ownership
    const catalogScope = await getUserCatalogScope(db, user);
    const hasAccess =
      catalogScope.isSuperAdmin ||
      catalogScope.businessProfileIds.includes(businessId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Business not found or unauthorized" }, { status: 403 });
    }

    const inStock = inventoryCount > 0;

    if (id) {
      // Update
      await db.query(
        `UPDATE business_products
         SET 
           business_profile_id = COALESCE(business_profile_id, $12),
           custom_name = $1,
           custom_description = $2,
           custom_image_url = $3,
           additional_images = $4,
           price = $5,
           currency = $6,
           inventory_count = $7,
           in_stock = $8,
           sku = $9,
           is_available = $10,
           attributes = $11,
           updated_at = NOW()
         WHERE id = $13 AND (business_id = $12 OR business_profile_id = $12)`,
        [customName, customDescription, customImageUrl, additionalImages, price, currency, inventoryCount, inStock, sku, isAvailable, JSON.stringify(attributes), businessId, id]
      );

      return NextResponse.json({ success: true, message: "Product updated successfully" });
    } else {
      // Insert
      const res = await db.query(
        `INSERT INTO business_products (
           business_id, business_profile_id, master_product_id, custom_name, custom_description,
           custom_image_url, additional_images, price, currency, inventory_count, in_stock, sku, is_available,
           attributes, created_at, updated_at
         ) VALUES (
           $1, $1, $2, $3, $4,
           $5, $6, $7, $8, $9, $10, $11, $12,
           $13, NOW(), NOW()
         ) RETURNING id`,
        [businessId, masterProductId, customName || "Product", customDescription, customImageUrl, additionalImages, price, currency, inventoryCount, inStock, sku, isAvailable, JSON.stringify(attributes)]
      );

      return NextResponse.json({ success: true, message: "Product added successfully", id: res.rows[0].id });
    }
  } catch (err: unknown) {
    console.error("[POST /api/business/products] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save product" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const businessId = searchParams.get("businessId");

    if (!id || !businessId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Verify ownership
    const catalogScope = await getUserCatalogScope(db, user);
    const hasAccess =
      catalogScope.isSuperAdmin ||
      catalogScope.businessProfileIds.includes(Number(businessId));
    if (!hasAccess) {
      return NextResponse.json({ error: "Business not found or unauthorized" }, { status: 403 });
    }

    await db.query(
      `DELETE FROM business_products WHERE id = $1 AND (business_id = $2 OR business_profile_id = $2)`,
      [Number(id), Number(businessId)]
    );

    return NextResponse.json({ success: true, message: "Product removed from business inventory" });
  } catch (err: unknown) {
    console.error("[DELETE /api/business/products] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to remove product" },
      { status: 500 }
    );
  }
}
