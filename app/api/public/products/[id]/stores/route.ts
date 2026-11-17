import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { buildBusinessSeoUrl } from "@/lib/utils/seo-slug";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const rawIdOrSlug = resolvedParams.id;
    const isNumeric = /^\d+$/.test(String(rawIdOrSlug).trim());
    const numId = isNumeric ? parseInt(rawIdOrSlug, 10) : -1;

    // Optional name query param passed from UI
    const url = new URL(req.url);
    const nameParam = (url.searchParams.get("name") || "").trim();

    // 1. Fetch targeted product info from products first, then fallback to master_products
    let targetMasterId: number | null = null;
    let targetProductName: string = "";
    let targetCategoryName: string = "General";
    let targetUnit: string = "piece";
    let targetImageUrl: string | null = null;
    let targetDescription: string | null = null;
    let targetBrand: string | null = null;
    let targetSynonyms: string[] = [];
    let canonicalId: number | string = rawIdOrSlug;
    let canonicalSlug: string = rawIdOrSlug;

    // Check products table
    const prodRes = await db.query(
      `SELECT 
        p.id,
        p.title,
        p.slug,
        p.brand,
        COALESCE(p.unit, 'piece') as display_unit,
        p.image_url,
        p.description,
        p.master_product_id,
        COALESCE(c.name, p.category, 'General') as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE (p.id = $1 OR p.slug = $2 OR ($3 != '' AND LOWER(TRIM(p.title)) = LOWER(TRIM($3))))
      LIMIT 1`,
      [numId, rawIdOrSlug, nameParam]
    );

    if (prodRes.rows.length > 0) {
      const p = prodRes.rows[0];
      targetMasterId = p.master_product_id || null;
      targetProductName = p.title;
      targetCategoryName = p.category_name;
      targetUnit = p.display_unit;
      targetImageUrl = p.image_url;
      targetDescription = p.description;
      targetBrand = p.brand;
      canonicalId = p.id;
      canonicalSlug = p.slug;
    }

    // Also check master_products for canonical details or if not found in products
    const searchName = targetProductName || nameParam || rawIdOrSlug.replace(/-/g, " ");
    const mpRes = await db.query(
      `SELECT 
        mp.id,
        mp.name,
        mp.slug,
        mp.brand,
        COALESCE(mp.unit, mp.unit_of_measurement, 'piece') as display_unit,
        mp.default_image_url,
        mp.description,
        mp.synonyms,
        c.name as category_name
      FROM master_products mp
      LEFT JOIN categories c ON c.id = mp.category_id
      WHERE ${
        targetMasterId
          ? "mp.id = $1"
          : "(mp.id = $1 OR mp.slug = $2 OR LOWER(TRIM(mp.name)) = LOWER(TRIM($3)) OR mp.name ILIKE '%' || $3 || '%')"
      }
      ${
        targetMasterId
          ? "ORDER BY mp.id ASC"
          : "ORDER BY (CASE WHEN mp.id = $1 THEN 0 WHEN mp.slug = $2 THEN 1 WHEN LOWER(TRIM(mp.name)) = LOWER(TRIM($3)) THEN 2 ELSE 3 END) ASC"
      }
      LIMIT 1`,
      targetMasterId ? [targetMasterId] : [numId, rawIdOrSlug, searchName]
    );

    if (mpRes.rows.length > 0) {
      const mp = mpRes.rows[0];
      targetMasterId = mp.id;
      if (!targetProductName) targetProductName = mp.name;
      if (!targetCategoryName || targetCategoryName === "General") targetCategoryName = mp.category_name || "General";
      if (!targetImageUrl) targetImageUrl = mp.default_image_url;
      if (!targetDescription) targetDescription = mp.description;
      if (!targetBrand) targetBrand = mp.brand;
      targetSynonyms = Array.isArray(mp.synonyms) ? mp.synonyms : [];
      if (!prodRes.rows.length) {
        canonicalId = mp.id;
        canonicalSlug = mp.slug;
      }
    }

    // Fallback: If still not found, search products table by fuzzy title
    if (!targetProductName && searchName) {
      const fuzzyProd = await db.query(
        `SELECT p.id, p.title, p.master_product_id, p.image_url, p.unit, c.name as category_name
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.title ILIKE '%' || $1 || '%'
         LIMIT 1`,
        [searchName]
      );
      if (fuzzyProd.rows.length > 0) {
        const fp = fuzzyProd.rows[0];
        targetProductName = fp.title;
        targetMasterId = fp.master_product_id;
        targetCategoryName = fp.category_name || "General";
        targetImageUrl = fp.image_url;
        targetUnit = fp.unit || "piece";
        canonicalId = fp.id;
      }
    }

    if (!targetProductName) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // 2. Fetch all stores selling this product across products, business_products, and master_products
    const storesRes = await db.query(
      `WITH all_sellers AS (
        -- 1. Listings in products table
        SELECT 
          p2.id as product_id,
          p2.title as product_title,
          p2.price::numeric as price,
          COALESCE(p2.sale_price, p2.price)::numeric as regular_price,
          COALESCE(p2.unit, $3) as unit,
          COALESCE(p2.image_url, $4) as product_image,
          COALESCE(p2.variants, '[]'::jsonb) as variants,
          bp.id as business_id,
          bp.name as store_name,
          bp.slug as store_slug,
          bp.logo_url as store_logo,
          bp.city,
          bp.locality,
          bp.state,
          bp.phone,
          bp.whatsapp,
          bp.is_verified,
          c.name as category_name,
          sc.name as subcategory_name
        FROM products p2
        JOIN business_profiles bp ON bp.id = p2.business_profile_id
        LEFT JOIN categories c ON c.id = bp.category_id
        LEFT JOIN categories sc ON sc.id = bp.subcategory_id
        WHERE COALESCE(bp.is_active, TRUE) = TRUE
          AND (
            ($1::int IS NOT NULL AND p2.master_product_id = $1)
            OR LOWER(TRIM(p2.title)) = LOWER(TRIM($2))
          )

        UNION

        -- 2. Additional stores from business_products linking to this master product
        SELECT 
          bprod.id as product_id,
          COALESCE(bprod.custom_name, $2) as product_title,
          bprod.price::numeric as price,
          bprod.price::numeric as regular_price,
          COALESCE(bprod.unit, $3) as unit,
          COALESCE(bprod.custom_image_url, $4) as product_image,
          '[]'::jsonb as variants,
          bp2.id as business_id,
          bp2.name as store_name,
          bp2.slug as store_slug,
          bp2.logo_url as store_logo,
          bp2.city,
          bp2.locality,
          bp2.state,
          bp2.phone,
          bp2.whatsapp,
          bp2.is_verified,
          c2.name as category_name,
          sc2.name as subcategory_name
        FROM business_products bprod
        JOIN business_profiles bp2 ON (bp2.id = bprod.business_profile_id OR bp2.id = bprod.business_id)
        LEFT JOIN categories c2 ON c2.id = bp2.category_id
        LEFT JOIN categories sc2 ON sc2.id = bp2.subcategory_id
        WHERE COALESCE(bp2.is_active, TRUE) = TRUE
          AND (
            ($1::int IS NOT NULL AND bprod.master_product_id = $1)
            OR LOWER(TRIM(bprod.custom_name)) = LOWER(TRIM($2))
          )

        UNION

        -- 3. Direct listings in master_products
        SELECT 
          mp2.id as product_id,
          mp2.name as product_title,
          COALESCE(
            NULLIF(mp2.discounted_price, 0),
            NULLIF(mp2.suggested_price_inr, 0),
            NULLIF(mp2.suggested_price, 0),
            NULLIF(mp2.regular_price, 0),
            30
          )::numeric as price,
          COALESCE(mp2.regular_price, 0)::numeric as regular_price,
          COALESCE(mp2.unit, mp2.unit_of_measurement, $3) as unit,
          COALESCE(mp2.default_image_url, $4) as product_image,
          COALESCE(mp2.variants, '[]'::jsonb) as variants,
          bp3.id as business_id,
          bp3.name as store_name,
          bp3.slug as store_slug,
          bp3.logo_url as store_logo,
          bp3.city,
          bp3.locality,
          bp3.state,
          bp3.phone,
          bp3.whatsapp,
          bp3.is_verified,
          c3.name as category_name,
          sc3.name as subcategory_name
        FROM master_products mp2
        JOIN business_profiles bp3 ON bp3.id = mp2.business_profile_id
        LEFT JOIN categories c3 ON c3.id = bp3.category_id
        LEFT JOIN categories sc3 ON sc3.id = bp3.subcategory_id
        WHERE COALESCE(mp2.is_active, TRUE) = TRUE
          AND COALESCE(bp3.is_active, TRUE) = TRUE
          AND (
            ($1::int IS NOT NULL AND mp2.id = $1)
            OR LOWER(TRIM(mp2.name)) = LOWER(TRIM($2))
            OR ($5::text[] && mp2.synonyms)
          )
      )
      SELECT DISTINCT ON (business_id)
        *
      FROM all_sellers
      ORDER BY business_id, price ASC`,
      [
        targetMasterId,
        targetProductName,
        targetUnit,
        targetImageUrl,
        targetSynonyms,
      ]
    );

    const stores = storesRes.rows
      .sort((a, b) => Number(a.price) - Number(b.price))
      .map((s: any) => {
        const canonicalUrl = buildBusinessSeoUrl({
          id: s.business_id,
          name: s.store_name,
          slug: s.store_slug,
          category_name: s.category_name,
          subcategory_name: s.subcategory_name,
          locality: s.locality,
          city: s.city,
          state: s.state,
        });

        return {
          productId: s.product_id,
          product_id: s.product_id,
          storeId: s.business_id,
          business_id: s.business_id,
          storeName: s.store_name,
          store_name: s.store_name,
          storeSlug: s.store_slug,
          store_slug: s.store_slug,
          storeUrl: `${canonicalUrl}?tab=products&highlight=${s.product_id}`,
          store_url: `${canonicalUrl}?tab=products&highlight=${s.product_id}`,
          fallbackStoreUrl: `/business/${s.store_slug || s.business_id}?tab=products&highlight=${s.product_id}`,
          storeLogo: s.store_logo,
          store_logo: s.store_logo,
          city: s.city,
          locality: s.locality,
          state: s.state,
          fullLocation: [s.locality, s.city, s.state].filter(Boolean).join(", "),
          phone: s.phone,
          whatsapp: s.whatsapp,
          isVerified: Boolean(s.is_verified),
          is_verified: Boolean(s.is_verified),
          price: Number(s.price),
          regularPrice: Number(s.regular_price) > Number(s.price) ? Number(s.regular_price) : null,
          regular_price: Number(s.regular_price) > Number(s.price) ? Number(s.regular_price) : null,
          unit: s.unit || targetUnit,
          variants: (() => {
            if (Array.isArray(s.variants) && s.variants.length > 0) {
              return s.variants;
            }
            const rawUnit = (s.unit || targetUnit || "").toLowerCase();
            const baseP = Number(s.price);
            if (rawUnit === "kg" || rawUnit.includes("kilo")) {
              return [
                { id: "100g", name: "100 g", price: Number((baseP * 0.1).toFixed(1)) || 3, unit: "100g" },
                { id: "250g", name: "250 g", price: Number((baseP * 0.25).toFixed(1)) || 8, unit: "250g" },
                { id: "500g", name: "500 g", price: Number((baseP * 0.5).toFixed(1)) || 15, unit: "500g" },
                { id: "1kg", name: "1 kg", price: baseP || 30, unit: "1kg" },
                { id: "2kg", name: "2 kg", price: baseP * 2 || 60, unit: "2kg" },
                { id: "5kg", name: "5 kg", price: baseP * 5 || 150, unit: "5kg" },
              ];
            }
            return [];
          })(),
          productImage: s.product_image,
          product_image: s.product_image,
          productTitle: s.product_title,
          product_title: s.product_title,
        };
      });

    return NextResponse.json({
      success: true,
      product: {
        id: canonicalId,
        name: targetProductName,
        slug: canonicalSlug,
        brand: targetBrand,
        unit: targetUnit,
        display_unit: targetUnit,
        imageUrl: targetImageUrl,
        default_image_url: targetImageUrl,
        description: targetDescription,
        categoryName: targetCategoryName,
        category_name: targetCategoryName,
        synonyms: targetSynonyms,
        storesCount: stores.length,
        total_sellers: stores.length,
        minPrice: stores.length > 0 ? stores[0].price : null,
        min_price: stores.length > 0 ? stores[0].price : null,
        maxPrice: stores.length > 0 ? stores[stores.length - 1].price : null,
        max_price: stores.length > 0 ? stores[stores.length - 1].price : null,
      },
      stores,
    });
  } catch (err: any) {
    console.error("GET /api/public/products/[id]/stores error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load product stores" },
      { status: 500 }
    );
  }
}

