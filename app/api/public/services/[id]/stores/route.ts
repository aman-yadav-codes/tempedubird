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

    // 1. Fetch targeted service info from services first, then fallback to master_services
    let targetMasterId: number | null = null;
    let targetServiceName: string = "";
    let targetCategoryName: string = "General";
    let targetUnit: string = "session";
    let targetImageUrl: string | null = null;
    let targetDescription: string | null = null;
    let targetPricingModel: string = "fixed_price";
    let canonicalId: number | string = rawIdOrSlug;
    let canonicalSlug: string = rawIdOrSlug;

    // Check services table
    const srvRes = await db.query(
      `SELECT 
        s.id,
        s.title,
        s.slug,
        COALESCE(s.duration_unit, 'session') as display_unit,
        s.image_url,
        s.description,
        s.master_service_id,
        s.pricing_model,
        COALESCE(c.name, s.category, 'General') as category_name
      FROM services s
      LEFT JOIN categories c ON c.id = s.category_id
      WHERE (s.id = $1 OR s.slug = $2)
      LIMIT 1`,
      [isNaN(numId) ? -1 : numId, rawIdOrSlug]
    );

    if (srvRes.rows.length > 0) {
      const s = srvRes.rows[0];
      targetMasterId = s.master_service_id || null;
      targetServiceName = s.title;
      targetCategoryName = s.category_name;
      targetUnit = s.display_unit;
      targetImageUrl = s.image_url;
      targetDescription = s.description;
      targetPricingModel = s.pricing_model || "fixed_price";
      canonicalId = s.id;
      canonicalSlug = s.slug;
    }

    // Also check master_services for canonical details or if not found in services
    const msRes = await db.query(
      `SELECT 
        ms.id,
        ms.name,
        ms.slug,
        COALESCE(ms.duration_unit, 'session') as display_unit,
        ms.default_image_url,
        ms.description,
        ms.pricing_model,
        c.name as category_name
      FROM master_services ms
      LEFT JOIN categories c ON c.id = ms.category_id
      WHERE ${targetMasterId ? "ms.id = $1" : "(ms.id = $1 OR ms.slug = $2 OR LOWER(TRIM(ms.name)) = LOWER(TRIM($3)))"}
      LIMIT 1`,
      targetMasterId ? [targetMasterId] : [isNaN(numId) ? -1 : numId, rawIdOrSlug, targetServiceName || ""]
    );

    if (msRes.rows.length > 0) {
      const ms = msRes.rows[0];
      targetMasterId = ms.id;
      if (!targetServiceName) targetServiceName = ms.name;
      if (!targetCategoryName || targetCategoryName === "General") targetCategoryName = ms.category_name || "General";
      if (!targetImageUrl) targetImageUrl = ms.default_image_url;
      if (!targetDescription) targetDescription = ms.description;
      if (!targetPricingModel) targetPricingModel = ms.pricing_model || "fixed_price";
      if (!srvRes.rows.length) {
        canonicalId = ms.id;
        canonicalSlug = ms.slug;
      }
    }

    if (!targetServiceName) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // 2. Fetch all stores/businesses offering this service across services, business_services, and master_services
    const storesRes = await db.query(
      `WITH all_sellers AS (
        -- 1. Listings in services table
        SELECT 
          s2.id as service_id,
          s2.title as service_title,
          s2.price::numeric as price,
          s2.price::numeric as regular_price,
          COALESCE(s2.duration_unit, $3) as unit,
          COALESCE(s2.image_url, $4) as service_image,
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
        FROM services s2
        JOIN business_profiles bp ON bp.id = s2.business_profile_id
        LEFT JOIN categories c ON c.id = bp.category_id
        LEFT JOIN categories sc ON sc.id = bp.subcategory_id
        WHERE COALESCE(bp.is_active, TRUE) = TRUE
          AND (
            ($1::int IS NOT NULL AND s2.master_service_id = $1)
            OR LOWER(TRIM(s2.title)) = LOWER(TRIM($2))
          )

        UNION

        -- 2. Additional stores from business_services linking to this master service
        SELECT 
          bs.id as service_id,
          COALESCE(bs.custom_title, $2) as service_title,
          bs.price::numeric as price,
          bs.price::numeric as regular_price,
          $3 as unit,
          COALESCE(bs.custom_image_url, $4) as service_image,
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
        FROM business_services bs
        JOIN business_profiles bp2 ON bp2.id = bs.business_id
        LEFT JOIN categories c2 ON c2.id = bp2.category_id
        LEFT JOIN categories sc2 ON sc2.id = bp2.subcategory_id
        WHERE COALESCE(bp2.is_active, TRUE) = TRUE
          AND (
            ($1::int IS NOT NULL AND bs.master_service_id = $1)
            OR LOWER(TRIM(bs.custom_title)) = LOWER(TRIM($2))
          )

        UNION

        -- 3. Direct listings in master_services
        SELECT 
          ms2.id as service_id,
          ms2.name as service_title,
          COALESCE(
            NULLIF(ms2.discounted_price, 0),
            NULLIF(ms2.suggested_price_inr, 0),
            NULLIF(ms2.suggested_price, 0),
            NULLIF(ms2.regular_price, 0),
            150
          )::numeric as price,
          COALESCE(ms2.regular_price, 0)::numeric as regular_price,
          COALESCE(ms2.duration_unit, $3) as unit,
          COALESCE(ms2.default_image_url, $4) as service_image,
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
        FROM master_services ms2
        JOIN business_profiles bp3 ON bp3.id = ms2.business_profile_id
        LEFT JOIN categories c3 ON c3.id = bp3.category_id
        LEFT JOIN categories sc3 ON sc3.id = bp3.subcategory_id
        WHERE COALESCE(ms2.is_active, TRUE) = TRUE
          AND COALESCE(bp3.is_active, TRUE) = TRUE
          AND (
            ($1::int IS NOT NULL AND ms2.id = $1)
            OR LOWER(TRIM(ms2.name)) = LOWER(TRIM($2))
          )
      )
      SELECT DISTINCT ON (business_id)
        *
      FROM all_sellers
      ORDER BY business_id, price ASC`,
      [
        targetMasterId,
        targetServiceName,
        targetUnit,
        targetImageUrl,
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
          serviceId: s.service_id,
          service_id: s.service_id,
          storeId: s.business_id,
          business_id: s.business_id,
          storeName: s.store_name,
          store_name: s.store_name,
          storeSlug: s.store_slug,
          store_slug: s.store_slug,
          storeUrl: `${canonicalUrl}?tab=services&highlight=${s.service_id}`,
          store_url: `${canonicalUrl}?tab=services&highlight=${s.service_id}`,
          fallbackStoreUrl: `/business/${s.store_slug || s.business_id}?tab=services&highlight=${s.service_id}`,
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
          serviceImage: s.service_image,
          service_image: s.service_image,
          serviceTitle: s.service_title,
          service_title: s.service_title,
        };
      });

    return NextResponse.json({
      success: true,
      service: {
        id: canonicalId,
        name: targetServiceName,
        slug: canonicalSlug,
        unit: targetUnit,
        display_unit: targetUnit,
        imageUrl: targetImageUrl,
        default_image_url: targetImageUrl,
        description: targetDescription,
        categoryName: targetCategoryName,
        category_name: targetCategoryName,
        pricingModel: targetPricingModel,
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
    console.error("GET /api/public/services/[id]/stores error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load service stores" },
      { status: 500 }
    );
  }
}
