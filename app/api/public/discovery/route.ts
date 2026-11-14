import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || searchParams.get("query") || "").trim();
    const type = searchParams.get("type") || "all"; // 'all' | 'business' | 'professional' | 'product' | 'service'
    const country = searchParams.get("country") || "";
    const state = searchParams.get("state") || "";
    const city = searchParams.get("city") || "";
    const locality = searchParams.get("locality") || "";
    const postalCode = searchParams.get("postalCode") || searchParams.get("zip") || searchParams.get("pincode") || "";
    const categoryId = searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : null;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;

    const likeQ = q ? `%${q}%` : null;

    let businesses: any[] = [];
    let professionals: any[] = [];
    let products: any[] = [];
    let services: any[] = [];

    // Resolve Category Family & Linked Businesses if categoryId is provided
    let categoryIds: number[] = categoryId ? [categoryId] : [];
    let matchingBusinessIds: number[] = [];

    if (categoryId) {
      try {
        const catRes = await db.query(
          "SELECT id, name, parent_id, slug, category_type FROM categories WHERE id = $1",
          [categoryId]
        );
        if (catRes.rows.length > 0) {
          const cat = catRes.rows[0];
          const parentId = cat.parent_id;
          const words = (cat.name || "").split(/[\s,&-]+/).filter((w: string) => w.length >= 3);
          const firstWord = words[0];

          const relatedCats = await db.query(
            `SELECT id FROM categories
             WHERE id = $1
               OR parent_id = $1
               ${parentId ? "OR id = $2 OR parent_id = $2" : ""}
               ${firstWord ? `OR name ILIKE $${parentId ? 3 : 2}` : ""}
            `,
            parentId
              ? (firstWord ? [categoryId, parentId, `%${firstWord}%`] : [categoryId, parentId])
              : (firstWord ? [categoryId, `%${firstWord}%`] : [categoryId])
          );

          categoryIds = Array.from(new Set(relatedCats.rows.map((r: any) => Number(r.id))));
        }

        const bizLinkRes = await db.query(
          "SELECT id FROM business_profiles WHERE category_id = ANY($1::int[]) OR subcategory_id = ANY($1::int[])",
          [categoryIds]
        );
        matchingBusinessIds = bizLinkRes.rows.map((r: any) => Number(r.id));
      } catch (catErr) {
        console.error("Error resolving category family:", catErr);
      }
    }

    // 1. Search Businesses
    if (type === "all" || type === "business") {
      const bConditions: string[] = ["COALESCE(bp.is_active, true) = true"];
      const bParams: any[] = [];

      if (likeQ) {
        bParams.push(likeQ);
        bConditions.push(`(bp.name ILIKE $${bParams.length} OR bp.business_type ILIKE $${bParams.length} OR bp.about ILIKE $${bParams.length} OR bp.city ILIKE $${bParams.length} OR array_to_string(bp.synonyms, ' ') ILIKE $${bParams.length})`);
      }
      if (country && country.toUpperCase() !== "ALL") {
        bParams.push(country.toUpperCase());
        bConditions.push(`(bp.country_code = $${bParams.length} OR ($${bParams.length} = 'IN' AND bp.country_code IS NULL))`);
      }
      if (city && city.toLowerCase() !== "all locations" && city.toLowerCase() !== "all") {
        bParams.push(`%${city}%`);
        bConditions.push(`bp.city ILIKE $${bParams.length}`);
      }
      if (state) {
        bParams.push(`%${state}%`);
        bConditions.push(`bp.state ILIKE $${bParams.length}`);
      }
      if (locality) {
        bParams.push(`%${locality}%`);
        bConditions.push(`bp.locality ILIKE $${bParams.length}`);
      }
      if (postalCode) {
        bParams.push(`%${postalCode}%`);
        bConditions.push(`bp.postal_code ILIKE $${bParams.length}`);
      }
      if (categoryIds.length > 0) {
        bParams.push(categoryIds);
        if (matchingBusinessIds.length > 0) {
          bParams.push(matchingBusinessIds);
          bConditions.push(`(bp.category_id = ANY($${bParams.length - 1}::int[]) OR bp.subcategory_id = ANY($${bParams.length - 1}::int[]) OR bp.id = ANY($${bParams.length}::int[]))`);
        } else {
          bConditions.push(`(bp.category_id = ANY($${bParams.length}::int[]) OR bp.subcategory_id = ANY($${bParams.length}::int[]))`);
        }
      }

      const bQuery = `
        SELECT
          bp.id,
          bp.name,
          bp.slug,
          bp.business_type,
          bp.phone,
          bp.whatsapp,
          bp.email,
          bp.website,
          bp.city,
          bp.state,
          bp.locality,
          bp.address,
          bp.postal_code,
          COALESCE(bp.country_code, 'IN') AS country_code,
          bp.about,
          bp.established_year,
          bp.logo_url,
          bp.banner_url,
          bp.latitude,
          bp.longitude,
          bp.is_verified,
          bp.is_featured,
          c.name AS category_name,
          COALESCE(rev.avg_rating, 0)::numeric(2,1) AS avg_rating,
          COALESCE(rev.review_count, 0)::int AS review_count
        FROM business_profiles bp
        LEFT JOIN categories c ON c.id = bp.category_id
        LEFT JOIN LATERAL (
          SELECT AVG(rating) AS avg_rating, COUNT(*) AS review_count
          FROM platform_reviews r
          WHERE r.business_id = bp.id AND COALESCE(r.status, 'approved') = 'approved'
        ) rev ON TRUE
        WHERE ${bConditions.join(" AND ")}
        ORDER BY bp.is_featured DESC, rev.avg_rating DESC, bp.id DESC
        LIMIT $${bParams.length + 1} OFFSET $${bParams.length + 2}
      `;

      const bRes = await db.query(bQuery, [...bParams, limit, offset]);
      businesses = bRes.rows.map((r) => ({ ...r, resultType: "business" }));
    }

    // 2. Search Professionals
    if (type === "all" || type === "professional") {
      const pConditions: string[] = ["COALESCE(pp.is_active, true) = true"];
      const pParams: any[] = [];

      if (likeQ) {
        pParams.push(likeQ);
        bParamsLength:
        pConditions.push(`(
          pp.name ILIKE $${pParams.length} 
          OR pp.profession_type ILIKE $${pParams.length} 
          OR COALESCE(pp.designation, '') ILIKE $${pParams.length}
          OR COALESCE(pp.about, '') ILIKE $${pParams.length} 
          OR COALESCE(pp.city, '') ILIKE $${pParams.length}
          OR array_to_string(pp.skills, ' ') ILIKE $${pParams.length}
          OR array_to_string(pp.synonyms, ' ') ILIKE $${pParams.length}
        )`);
      }
      if (country && country.toUpperCase() !== "ALL") {
        pParams.push(country.toUpperCase());
        pConditions.push(`(pp.country_code = $${pParams.length} OR ($${pParams.length} = 'IN' AND pp.country_code IS NULL))`);
      }
      if (city && city.toLowerCase() !== "all locations" && city.toLowerCase() !== "all") {
        pParams.push(`%${city}%`);
        pConditions.push(`pp.city ILIKE $${pParams.length}`);
      }
      if (state) {
        pParams.push(`%${state}%`);
        pConditions.push(`pp.state ILIKE $${pParams.length}`);
      }
      if (locality) {
        pParams.push(`%${locality}%`);
        pConditions.push(`pp.locality ILIKE $${pParams.length}`);
      }
      if (postalCode) {
        pParams.push(`%${postalCode}%`);
        pConditions.push(`pp.postal_code ILIKE $${pParams.length}`);
      }
      if (categoryIds.length > 0) {
        pParams.push(categoryIds);
        if (matchingBusinessIds.length > 0) {
          pParams.push(matchingBusinessIds);
          pConditions.push(`(pp.category_id = ANY($${pParams.length - 1}::int[]) OR pp.subcategory_id = ANY($${pParams.length - 1}::int[]) OR pp.business_profile_id = ANY($${pParams.length}::int[]))`);
        } else {
          pConditions.push(`(pp.category_id = ANY($${pParams.length}::int[]) OR pp.subcategory_id = ANY($${pParams.length}::int[]))`);
        }
      }

      const pQuery = `
        SELECT
          pp.id,
          pp.name,
          pp.slug,
          pp.profession_type,
          pp.phone,
          pp.whatsapp,
          pp.email,
          pp.website,
          pp.city,
          pp.state,
          pp.locality,
          pp.address,
          pp.postal_code,
          COALESCE(pp.country_code, 'IN') AS country_code,
          pp.about,
          pp.experience_years,
          pp.avatar_url,
          pp.banner_url,
          pp.latitude,
          pp.longitude,
          pp.is_verified,
          pp.is_featured,
          c.name AS category_name,
          COALESCE(rev.avg_rating, 0)::numeric(2,1) AS avg_rating,
          COALESCE(rev.review_count, 0)::int AS review_count
        FROM professional_profiles pp
        LEFT JOIN categories c ON c.id = pp.category_id
        LEFT JOIN LATERAL (
          SELECT AVG(rating) AS avg_rating, COUNT(*) AS review_count
          FROM platform_reviews r
          WHERE r.professional_id = pp.id AND COALESCE(r.status, 'approved') = 'approved'
        ) rev ON TRUE
        WHERE ${pConditions.join(" AND ")}
        ORDER BY pp.is_featured DESC, rev.avg_rating DESC, pp.id DESC
        LIMIT $${pParams.length + 1} OFFSET $${pParams.length + 2}
      `;

      const pRes = await db.query(pQuery, [...pParams, limit, offset]);
      professionals = pRes.rows.map((r) => ({ ...r, resultType: "professional" }));
    }

    // 3. Search Products
    if (type === "all" || type === "product") {
      const prodConditions: string[] = ["COALESCE(mp.is_active, true) = true"];
      const prodParams: any[] = [];

      if (likeQ) {
        prodParams.push(likeQ);
        prodConditions.push(`(
          mp.name ILIKE $${prodParams.length} 
          OR COALESCE(mp.description, '') ILIKE $${prodParams.length} 
          OR COALESCE(mp.brand, '') ILIKE $${prodParams.length}
          OR COALESCE(mp.model, '') ILIKE $${prodParams.length}
          OR array_to_string(mp.synonyms, ' ') ILIKE $${prodParams.length}
        )`);
      }
      if (country && country.toUpperCase() !== "ALL") {
        prodParams.push(country.toUpperCase());
        prodConditions.push(`($${prodParams.length} = ANY(COALESCE(mp.countries, '{"IN", "US"}')))`);
      }
      if (categoryIds.length > 0) {
        prodParams.push(categoryIds);
        if (matchingBusinessIds.length > 0) {
          prodParams.push(matchingBusinessIds);
          prodConditions.push(`(mp.category_id = ANY($${prodParams.length - 1}::int[]) OR mp.subcategory_id = ANY($${prodParams.length - 1}::int[]) OR mp.business_profile_id = ANY($${prodParams.length}::int[]))`);
        } else {
          prodConditions.push(`(mp.category_id = ANY($${prodParams.length}::int[]) OR mp.subcategory_id = ANY($${prodParams.length}::int[]))`);
        }
      }

      const prodQuery = `
        SELECT
          mp.id,
          mp.name,
          mp.slug,
          mp.description,
          NULL AS sku,
          mp.brand,
          mp.model,
          mp.default_image_url,
          COALESCE(mp.suggested_price, mp.suggested_price_inr, 0) AS suggested_price_inr,
          0::numeric AS suggested_price_usd,
          mp.is_active,
          c.name AS category_name,
          (
            SELECT json_build_object(
              'business_name', bp.name,
              'price', bprod.price,
              'currency', bprod.currency,
              'in_stock', bprod.in_stock,
              'city', bp.city,
              'phone', bp.phone
            )
            FROM business_products bprod
            JOIN business_profiles bp ON (bp.id = bprod.business_profile_id OR bp.id = bprod.business_id)
            WHERE bprod.master_product_id = mp.id AND COALESCE(bprod.is_available, true) = true
            ${city && city.toLowerCase() !== "all locations" && city.toLowerCase() !== "all" ? `AND bp.city ILIKE '%${city.replace(/'/g, "''")}%'` : ""}
            LIMIT 1
          ) AS seller_info
        FROM master_products mp
        LEFT JOIN categories c ON c.id = mp.category_id
        WHERE ${prodConditions.join(" AND ")}
        ORDER BY mp.id DESC
        LIMIT $${prodParams.length + 1} OFFSET $${prodParams.length + 2}
      `;

      const prodRes = await db.query(prodQuery, [...prodParams, limit, offset]);
      products = prodRes.rows.map((r) => ({ ...r, resultType: "product" }));
    }

    // 4. Search Services
    if (type === "all" || type === "service") {
      const sConditions: string[] = ["COALESCE(ms.is_active, true) = true"];
      const sParams: any[] = [];

      if (likeQ) {
        sParams.push(likeQ);
        sConditions.push(`(
          ms.name ILIKE $${sParams.length} 
          OR COALESCE(ms.description, '') ILIKE $${sParams.length} 
          OR array_to_string(ms.synonyms, ' ') ILIKE $${sParams.length}
          OR COALESCE(ms.pricing_model, '') ILIKE $${sParams.length}
        )`);
      }
      if (country && country.toUpperCase() !== "ALL") {
        sParams.push(country.toUpperCase());
        sConditions.push(`($${sParams.length} = ANY(COALESCE(ms.countries, '{"IN", "US"}')))`);
      }
      if (categoryIds.length > 0) {
        sParams.push(categoryIds);
        if (matchingBusinessIds.length > 0) {
          sParams.push(matchingBusinessIds);
          sConditions.push(`(ms.category_id = ANY($${sParams.length - 1}::int[]) OR ms.subcategory_id = ANY($${sParams.length - 1}::int[]) OR ms.business_profile_id = ANY($${sParams.length}::int[]))`);
        } else {
          sConditions.push(`(ms.category_id = ANY($${sParams.length}::int[]) OR ms.subcategory_id = ANY($${sParams.length}::int[]))`);
        }
      }

      const sQuery = `
        SELECT
          ms.id,
          ms.name,
          ms.slug,
          ms.description,
          COALESCE(ms.estimated_duration, 'Flexible') AS estimated_duration,
          NULL::int AS duration_minutes,
          ms.pricing_model,
          ms.default_image_url,
          COALESCE(ms.suggested_price, ms.suggested_price_inr, 0) AS suggested_price_inr,
          0::numeric AS suggested_price_usd,
          ms.is_active,
          c.name AS category_name,
          (
            SELECT json_build_object(
              'provider_name', pp.name,
              'price', ps.price,
              'pricing_model', ps.pricing_model,
              'currency', ps.currency,
              'city', pp.city,
              'phone', pp.phone
            )
            FROM professional_services ps
            JOIN professional_profiles pp ON pp.id = ps.professional_id
            WHERE ps.master_service_id = ms.id AND COALESCE(ps.is_active, true) = true
            ${city && city.toLowerCase() !== "all locations" && city.toLowerCase() !== "all" ? `AND pp.city ILIKE '%${city.replace(/'/g, "''")}%'` : ""}
            LIMIT 1
          ) AS provider_info
        FROM master_services ms
        LEFT JOIN categories c ON c.id = ms.category_id
        WHERE ${sConditions.join(" AND ")}
        ORDER BY ms.id DESC
        LIMIT $${sParams.length + 1} OFFSET $${sParams.length + 2}
      `;

      const sRes = await db.query(sQuery, [...sParams, limit, offset]);
      services = sRes.rows.map((r) => ({ ...r, resultType: "service" }));
    }

    const total = businesses.length + professionals.length + products.length + services.length;

    return NextResponse.json({
      success: true,
      data: {
        businesses,
        professionals,
        products,
        services,
        meta: {
          total,
          page,
          limit,
          query: q,
          type,
          filters: { country, state, city, locality, postalCode, categoryId },
        },
      },
    });
  } catch (err: unknown) {
    console.error("[discovery GET] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Discovery search failed" },
      { status: 500 }
    );
  }
}

