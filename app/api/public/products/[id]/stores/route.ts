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
    const numId = parseInt(rawIdOrSlug, 10);

    // 1. Fetch targeted product info
    const targetProdRes = await db.query(
      `SELECT 
        mp.id,
        mp.name,
        mp.slug,
        mp.brand,
        mp.unit,
        mp.unit_of_measurement,
        COALESCE(mp.unit, mp.unit_of_measurement, 'piece') as display_unit,
        mp.default_image_url,
        mp.description,
        mp.synonyms,
        c.name as category_name
      FROM master_products mp
      LEFT JOIN categories c ON c.id = mp.category_id
      WHERE (mp.id = $1 OR mp.slug = $2)
      LIMIT 1`,
      [isNaN(numId) ? -1 : numId, rawIdOrSlug]
    );

    if (targetProdRes.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const targetProduct = targetProdRes.rows[0];

    // 2. Fetch all stores selling this product (matching by master_product_id, direct business_profile_id, or name / synonyms match)
    const storesRes = await db.query(
      `WITH all_sellers AS (
        -- 1. Direct listings in master_products for this or matching products
        SELECT 
          mp2.id as product_id,
          mp2.name as product_title,
          COALESCE(mp2.discounted_price, mp2.regular_price, mp2.suggested_price, 0)::numeric as price,
          COALESCE(mp2.regular_price, 0)::numeric as regular_price,
          COALESCE(mp2.unit, mp2.unit_of_measurement, 'piece') as unit,
          COALESCE(mp2.default_image_url, $3) as product_image,
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
        FROM master_products mp2
        JOIN business_profiles bp ON bp.id = mp2.business_profile_id
        LEFT JOIN categories c ON c.id = bp.category_id
        LEFT JOIN categories sc ON sc.id = bp.subcategory_id
        WHERE COALESCE(mp2.is_active, TRUE) = TRUE
          AND COALESCE(bp.is_active, TRUE) = TRUE
          AND (
            mp2.id = $1
            OR LOWER(TRIM(mp2.name)) = LOWER(TRIM($2))
            OR ($4::text[] && mp2.synonyms)
          )

        UNION

        -- 2. Additional stores from business_products linking to this master product
        SELECT 
          bprod.id as product_id,
          COALESCE(bprod.custom_name, $2) as product_title,
          bprod.price::numeric as price,
          bprod.price::numeric as regular_price,
          COALESCE(bprod.unit, 'piece') as unit,
          COALESCE(bprod.custom_image_url, $3) as product_image,
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
          AND (bprod.master_product_id = $1)
      )
      SELECT DISTINCT ON (business_id)
        *
      FROM all_sellers
      ORDER BY business_id, price ASC`,
      [
        targetProduct.id,
        targetProduct.name,
        targetProduct.default_image_url,
        Array.isArray(targetProduct.synonyms) ? targetProduct.synonyms : [],
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
          unit: s.unit || targetProduct.display_unit,
          productImage: s.product_image,
          product_image: s.product_image,
          productTitle: s.product_title,
          product_title: s.product_title,
        };
      });

    return NextResponse.json({
      success: true,
      product: {
        id: targetProduct.id,
        name: targetProduct.name,
        slug: targetProduct.slug,
        brand: targetProduct.brand,
        unit: targetProduct.display_unit,
        display_unit: targetProduct.display_unit,
        imageUrl: targetProduct.default_image_url,
        default_image_url: targetProduct.default_image_url,
        description: targetProduct.description,
        categoryName: targetProduct.category_name,
        category_name: targetProduct.category_name,
        synonyms: targetProduct.synonyms || [],
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

