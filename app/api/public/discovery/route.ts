import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getFrontendConfig } from "@/lib/config/frontend-config";

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
    let categoryId = searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : null;
    const categoryParam = (searchParams.get("category") || searchParams.get("category_slug") || searchParams.get("categoryName") || "").trim();
    const subcategoryParam = (searchParams.get("subcategory") || searchParams.get("subcategory_slug") || "").trim();

    if (!categoryId && (subcategoryParam || categoryParam)) {
      try {
        const targetStr = subcategoryParam || categoryParam;
        const cleanSlug = targetStr.toLowerCase().trim();
        const catLookup = await db.query(
          `SELECT id, name, slug, parent_id, category_type, business_category_id 
           FROM categories 
           WHERE (slug = $1 
              OR slug LIKE $2
              OR name ILIKE $1 
              OR name ILIKE $3)
              ${type && type !== "all" ? `AND (category_type = '${type.replace(/'/g, "''")}' OR category_type IS NULL OR business_category_id IS NOT NULL)` : ""}
           ORDER BY 
              CASE 
                WHEN slug = $1 THEN 0 
                WHEN ${type && type !== "all" ? `category_type = '${type.replace(/'/g, "''")}'` : "false"} AND slug LIKE $2 THEN 1
                WHEN ${type && type !== "all" ? `category_type = '${type.replace(/'/g, "''")}'` : "false"} THEN 2
                WHEN slug LIKE $2 THEN 3
                WHEN parent_id IS NULL THEN 4 
                ELSE 5 
              END, id ASC
           LIMIT 1`,
          [cleanSlug, `${cleanSlug}%`, `%${targetStr.replace(/-/g, " ")}%`]
        );
        if (catLookup.rows.length > 0) {
          categoryId = Number(catLookup.rows[0].id);
        }
      } catch (err) {
        console.error("Error resolving string category in discovery:", err);
      }
    }
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;

    // Resolve Business and Institution Scoping
    const config = getFrontendConfig();
    const rawBizParam = searchParams.get("businessId") || searchParams.get("business_id");
    const requestedBizId = rawBizParam && /^\d+$/.test(rawBizParam) ? Number(rawBizParam) : null;

    let scopedBusinessId: number | null = null;
    if (requestedBizId) {
      scopedBusinessId = requestedBizId;
    } else if (config.isValid && config.mode === "business" && config.businessId) {
      scopedBusinessId = config.businessId;
    }

    let scopedInstitutionId: number | null = null;
    if (scopedBusinessId) {
      try {
        const ipLookup = await db.query(
          "SELECT id FROM institution_profiles WHERE id = $1 OR id IN (SELECT institution_profile_id FROM business_profiles WHERE id = $1) LIMIT 1",
          [scopedBusinessId]
        );
        if (ipLookup.rows.length > 0) {
          scopedInstitutionId = ipLookup.rows[0].id;
        }
      } catch (err) {
        console.warn("Could not resolve institution for business:", err);
      }
    }

    const likeQ = q ? `%${q}%` : null;

    let businesses: any[] = [];
    let professionals: any[] = [];
    let products: any[] = [];
    let services: any[] = [];
    let courses: any[] = [];
    let jobs: any[] = [];
    let properties: any[] = [];
    let vehicles: any[] = [];
    let events: any[] = [];

    // Resolve Category Family & Linked Businesses if categoryId is provided
    let categoryIds: number[] = categoryId ? [categoryId] : [];
    let matchingBusinessIds: number[] = [];

    if (categoryId) {
      try {
        const catRes = await db.query(
          "SELECT id, name, parent_id, slug, category_type, business_category_id FROM categories WHERE id = $1",
          [categoryId]
        );
        if (catRes.rows.length > 0) {
          const cat = catRes.rows[0];
          const parentId = cat.parent_id;
          const bizCatId = cat.business_category_id;
          const words = (cat.name || "").split(/[\s,&-]+/).filter((w: string) => w.length >= 3);
          const firstWord = words[0];

          const relatedCats = await db.query(
            `SELECT id FROM categories
             WHERE id = $1
               OR parent_id = $1
               ${parentId ? "OR id = $2 OR parent_id = $2" : ""}
               ${bizCatId ? `OR id = ${Number(bizCatId)} OR business_category_id = ${Number(bizCatId)}` : `OR business_category_id = $1`}
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

    // Multi-token location resolution (supporting "Pandeypur Chauraha, Varanasi" -> matches "Pandeypur" and "Varanasi")
    const cityTokens: string[] = [];
    if (city && city.toLowerCase() !== "all locations" && city.toLowerCase() !== "all") {
      cityTokens.push(`%${city.trim()}%`);
      const commaParts = city.split(",").map((p) => p.trim()).filter(Boolean);
      for (const p of commaParts) {
        if (p.length >= 2) cityTokens.push(`%${p}%`);
        const subWords = p.split(/\s+/).filter((w) => w.length >= 3);
        for (const w of subWords) {
          cityTokens.push(`%${w}%`);
        }
      }
    }
    const uniqueCityTokens = Array.from(new Set(cityTokens));

    // 1. Search Businesses
    if (type === "all" || type === "business") {
      const bConditions: string[] = ["COALESCE(bp.is_active, true) = true"];
      const bParams: any[] = [];

      // Business mode scope: only show the business that matches business_id
      if (scopedBusinessId) {
        bParams.push(scopedBusinessId);
        bConditions.push(`(bp.id = $${bParams.length} OR bp.institution_profile_id = $${bParams.length})`);
      }

      if (likeQ) {
        bParams.push(likeQ);
        bConditions.push(`(bp.name ILIKE $${bParams.length} OR bp.business_type ILIKE $${bParams.length} OR bp.about ILIKE $${bParams.length} OR bp.city ILIKE $${bParams.length} OR array_to_string(bp.synonyms, ' ') ILIKE $${bParams.length})`);
      }
      if (country && country.toUpperCase() !== "ALL") {
        bParams.push(country.toUpperCase());
        bConditions.push(`(bp.country_code = $${bParams.length} OR ($${bParams.length} = 'IN' AND bp.country_code IS NULL))`);
      }
      if (uniqueCityTokens.length > 0) {
        bParams.push(uniqueCityTokens);
        bConditions.push(`(bp.city ILIKE ANY($${bParams.length}::text[]) OR bp.locality ILIKE ANY($${bParams.length}::text[]) OR bp.address ILIKE ANY($${bParams.length}::text[]) OR bp.state ILIKE ANY($${bParams.length}::text[]))`);
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

      // Business mode scope: only show professionals associated with this business/institution
      if (scopedBusinessId) {
        if (scopedInstitutionId) {
          pParams.push(scopedBusinessId, scopedInstitutionId);
          pConditions.push(`(pp.business_profile_id = $${pParams.length - 1} OR pp.institution_profile_id = $${pParams.length})`);
        } else {
          pParams.push(scopedBusinessId);
          pConditions.push(`pp.business_profile_id = $${pParams.length}`);
        }
      }

      if (likeQ) {
        pParams.push(likeQ);
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
      if (uniqueCityTokens.length > 0) {
        pParams.push(uniqueCityTokens);
        pConditions.push(`(pp.city ILIKE ANY($${pParams.length}::text[]) OR pp.locality ILIKE ANY($${pParams.length}::text[]) OR pp.address ILIKE ANY($${pParams.length}::text[]) OR pp.state ILIKE ANY($${pParams.length}::text[]))`);
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

      let institutionStaffRows: any[] = [];
      if (scopedBusinessId || scopedInstitutionId) {
        const instTargetId = scopedInstitutionId || scopedBusinessId;
        const bizTargetId = scopedBusinessId || scopedInstitutionId;
        const staffParams: any[] = [instTargetId, bizTargetId];
        let staffFilterSql = "";

        if (likeQ) {
          staffParams.push(likeQ);
          staffFilterSql += ` AND (
            u.full_name ILIKE $${staffParams.length}
            OR u.email ILIKE $${staffParams.length}
            OR r.name ILIKE $${staffParams.length}
            OR COALESCE(d.name, '') ILIKE $${staffParams.length}
            OR COALESCE(up.designation, '') ILIKE $${staffParams.length}
          )`;
        }

        const staffQuery = `
          SELECT
            u.id,
            COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS name,
            COALESCE(u.id::text, '') AS slug,
            COALESCE(d.name, up.designation, r.name, 'Staff Member') AS profession_type,
            u.phone,
            u.phone AS whatsapp,
            u.email,
            '' AS website,
            COALESCE(loc.city, '') AS city,
            COALESCE(loc.state, '') AS state,
            '' AS locality,
            COALESCE(loc.address, '') AS address,
            COALESCE(loc.pincode, '') AS postal_code,
            'IN' AS country_code,
            COALESCE(up.bio, up.about, '') AS about,
            COALESCE(up.experience_years, 0) AS experience_years,
            COALESCE(up.avatar_url, u.avatar_url) AS avatar_url,
            NULL AS banner_url,
            NULL AS latitude,
            NULL AS longitude,
            u.is_verified,
            false AS is_featured,
            COALESCE(r.name, 'Staff Member') AS category_name,
            5.0::numeric(2,1) AS avg_rating,
            0::int AS review_count
          FROM users u
          JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
          JOIN roles r ON r.id = im.role_id
          LEFT JOIN user_profiles up ON up.user_id = u.id
          LEFT JOIN designations d ON d.id = up.designation_id
          LEFT JOIN institution_profiles ip ON ip.id = im.institution_id
          LEFT JOIN locations loc ON loc.id = ip.location_id
          WHERE (im.institution_id = $1 OR im.institution_id = $2)
            AND COALESCE(u.is_deleted, FALSE) = FALSE
            AND r.code NOT IN ('student', 'guardian', 'parent')
            ${staffFilterSql}
          ORDER BY u.id ASC
        `;
        try {
          const sRes = await db.query(staffQuery, staffParams);
          institutionStaffRows = sRes.rows;
        } catch (sErr) {
          console.error("Error querying institution staff in discovery:", sErr);
        }
      }

      const combined = [...pRes.rows, ...institutionStaffRows];
      const seenIds = new Set<string>();
      const dedupedProfessionals: any[] = [];
      for (const p of combined) {
        const key = `${p.id}-${p.name}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          dedupedProfessionals.push({ ...p, resultType: "professional" });
        }
      }
      professionals = dedupedProfessionals;
    }

    // 3. Search Products
    if (type === "all" || type === "product") {
      const prodConditions: string[] = ["COALESCE(mp.is_active, true) = true"];
      const prodParams: any[] = [];

      // Business mode scope: only show products added by / assigned to this business
      if (scopedBusinessId) {
        if (scopedInstitutionId) {
          prodParams.push(scopedBusinessId, scopedInstitutionId);
          prodConditions.push(`(
            mp.business_profile_id = $${prodParams.length - 1}
            OR mp.institution_id = $${prodParams.length}
            OR mp.id IN (
              SELECT bprod.master_product_id FROM business_products bprod
              WHERE (bprod.business_profile_id = $${prodParams.length - 1} OR bprod.business_id = $${prodParams.length - 1})
                AND COALESCE(bprod.is_available, true) = true
            )
          )`);
        } else {
          prodParams.push(scopedBusinessId);
          prodConditions.push(`(
            mp.business_profile_id = $${prodParams.length}
            OR mp.id IN (
              SELECT bprod.master_product_id FROM business_products bprod
              WHERE (bprod.business_profile_id = $${prodParams.length} OR bprod.business_id = $${prodParams.length})
                AND COALESCE(bprod.is_available, true) = true
            )
          )`);
        }
      }

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

      if (uniqueCityTokens.length > 0) {
        prodParams.push(uniqueCityTokens);
        prodConditions.push(`(
          mp.id IN (
            SELECT bprod.master_product_id FROM business_products bprod
            JOIN business_profiles bp ON (bp.id = bprod.business_profile_id OR bp.id = bprod.business_id)
            WHERE (bp.city ILIKE ANY($${prodParams.length}::text[]) OR bp.locality ILIKE ANY($${prodParams.length}::text[]) OR bp.address ILIKE ANY($${prodParams.length}::text[]) OR bp.state ILIKE ANY($${prodParams.length}::text[]))
              AND COALESCE(bprod.is_available, true) = true
          )
          OR mp.business_profile_id IN (
            SELECT bp2.id FROM business_profiles bp2
            WHERE (bp2.city ILIKE ANY($${prodParams.length}::text[]) OR bp2.locality ILIKE ANY($${prodParams.length}::text[]) OR bp2.address ILIKE ANY($${prodParams.length}::text[]) OR bp2.state ILIKE ANY($${prodParams.length}::text[]))
          )
        )`);
      }

      const sellerScopeClause = scopedBusinessId
        ? `AND (bp.id = ${scopedBusinessId})`
        : "";

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
            ${sellerScopeClause}
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

      // Business mode scope: only show services added by / assigned to this business
      if (scopedBusinessId) {
        if (scopedInstitutionId) {
          sParams.push(scopedBusinessId, scopedInstitutionId);
          sConditions.push(`(
            ms.business_profile_id = $${sParams.length - 1}
            OR ms.institution_id = $${sParams.length}
            OR ms.id IN (
              SELECT bserv.master_service_id FROM business_services bserv
              WHERE (bserv.business_id = $${sParams.length - 1} OR bserv.business_id = $${sParams.length})
                AND COALESCE(bserv.is_active, true) = true
            )
            OR ms.id IN (
              SELECT ps.master_service_id FROM professional_services ps
              JOIN professional_profiles pp ON pp.id = ps.professional_id
              WHERE (pp.business_profile_id = $${sParams.length - 1} OR pp.institution_profile_id = $${sParams.length})
                AND COALESCE(ps.is_active, true) = true
            )
          )`);
        } else {
          sParams.push(scopedBusinessId);
          sConditions.push(`(
            ms.business_profile_id = $${sParams.length}
            OR ms.id IN (
              SELECT bserv.master_service_id FROM business_services bserv
              WHERE bserv.business_id = $${sParams.length}
                AND COALESCE(bserv.is_active, true) = true
            )
            OR ms.id IN (
              SELECT ps.master_service_id FROM professional_services ps
              JOIN professional_profiles pp ON pp.id = ps.professional_id
              WHERE pp.business_profile_id = $${sParams.length}
                AND COALESCE(ps.is_active, true) = true
            )
          )`);
        }
      }

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

      if (uniqueCityTokens.length > 0) {
        sParams.push(uniqueCityTokens);
        sConditions.push(`(
          ms.id IN (
            SELECT bserv.master_service_id FROM business_services bserv
            JOIN business_profiles bp ON bp.id = bserv.business_id
            WHERE (bp.city ILIKE ANY($${sParams.length}::text[]) OR bp.locality ILIKE ANY($${sParams.length}::text[]) OR bp.address ILIKE ANY($${sParams.length}::text[]) OR bp.state ILIKE ANY($${sParams.length}::text[]))
              AND COALESCE(bserv.is_active, true) = true
          )
          OR ms.id IN (
            SELECT ps.master_service_id FROM professional_services ps
            JOIN professional_profiles pp ON pp.id = ps.professional_id
            WHERE (pp.city ILIKE ANY($${sParams.length}::text[]) OR pp.locality ILIKE ANY($${sParams.length}::text[]) OR pp.address ILIKE ANY($${sParams.length}::text[]) OR pp.state ILIKE ANY($${sParams.length}::text[]))
              AND COALESCE(ps.is_active, true) = true
          )
          OR ms.business_profile_id IN (
            SELECT bp2.id FROM business_profiles bp2
            WHERE (bp2.city ILIKE ANY($${sParams.length}::text[]) OR bp2.locality ILIKE ANY($${sParams.length}::text[]) OR bp2.address ILIKE ANY($${sParams.length}::text[]) OR bp2.state ILIKE ANY($${sParams.length}::text[]))
          )
        )`);
      }

      const providerScopeClause = scopedBusinessId
        ? `AND (pp.business_profile_id = ${scopedBusinessId} ${scopedInstitutionId ? `OR pp.institution_profile_id = ${scopedInstitutionId}` : ""})`
        : "";

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
            ${providerScopeClause}
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

    // 5. Search Courses
    if (type === "all" || type === "course" || type === "courses") {
      if (scopedBusinessId) {
        // Business mode scope: only show courses offered by this business / institution
        if (scopedInstitutionId) {
          try {
            const cParams: any[] = [scopedInstitutionId];
            let cWhere = "iprog.institution_id = $1 AND COALESCE(iprog.is_active, true) = true AND COALESCE(iprog.is_deleted, false) = false";
            if (likeQ) {
              cParams.push(likeQ);
              cWhere += ` AND (iprog.title ILIKE $${cParams.length} OR COALESCE(iprog.about, '') ILIKE $${cParams.length})`;
            }

            const cQuery = `
              SELECT
                iprog.id,
                iprog.title AS name,
                iprog.slug,
                NULL AS code,
                iprog.about AS description,
                iprog.duration_value,
                iprog.duration_unit,
                NULL AS thumbnail_url,
                NULL AS icon_url,
                COALESCE(u.name, b.name, 'Institution') AS university_name,
                'institution' AS authority_type,
                COALESCE(pt.name, 'Program') AS category_name,
                COALESCE(iprog.seats_available, 60) AS seats_available
              FROM institution_programs iprog
              LEFT JOIN program_types pt ON pt.id = iprog.program_type_id
              LEFT JOIN universities u ON u.id = iprog.university_id
              LEFT JOIN boards b ON b.id = iprog.board_id
              WHERE ${cWhere}
              ORDER BY iprog.id DESC
              LIMIT $${cParams.length + 1} OFFSET $${cParams.length + 2}
            `;
            const cRes = await db.query(cQuery, [...cParams, limit, offset]);
            courses = cRes.rows.map((r) => ({ ...r, resultType: "course" }));
          } catch (cErr) {
            console.warn("Could not query institution courses:", cErr);
            courses = [];
          }
        } else {
          courses = [];
        }
      } else {
        // Platform Admin / Global discovery
        const cConditions: string[] = ["COALESCE(mc.is_active, true) = true", "COALESCE(mc.is_deleted, false) = false"];
        const cParams: any[] = [];

        if (likeQ) {
          cParams.push(likeQ);
          cConditions.push(`(
            mc.name ILIKE $${cParams.length}
            OR COALESCE(mc.description, '') ILIKE $${cParams.length}
            OR COALESCE(mc.code, '') ILIKE $${cParams.length}
            OR COALESCE(mc.university_name, '') ILIKE $${cParams.length}
          )`);
        }

        if (categoryIds.length > 0) {
          cParams.push(categoryIds);
          cConditions.push(`(mc.category_id = ANY($${cParams.length}::int[]) OR mc.category_id IN (SELECT id FROM categories WHERE parent_id = ANY($${cParams.length}::int[])))`);
        }

        const cQuery = `
          SELECT
            mc.id,
            mc.name,
            mc.slug,
            mc.code,
            mc.description,
            mc.duration_value,
            mc.duration_unit,
            mc.thumbnail_url,
            mc.icon_url,
            mc.university_name,
            mc.authority_type,
            c.name AS category_name,
            COALESCE(mc.seats_available, 60) AS seats_available
          FROM master_courses mc
          LEFT JOIN categories c ON c.id = mc.category_id
          WHERE ${cConditions.join(" AND ")}
          ORDER BY mc.id DESC
          LIMIT $${cParams.length + 1} OFFSET $${cParams.length + 2}
        `;

        let masterCoursesRows: any[] = [];
        try {
          const cRes = await db.query(cQuery, [...cParams, limit, offset]);
          masterCoursesRows = cRes.rows.map((r) => ({ ...r, resultType: "course" }));
        } catch (mcErr) {
          console.warn("Could not query master_courses:", mcErr);
        }

        let instCoursesRows: any[] = [];
        try {
          const ipConditions: string[] = [
            "COALESCE(iprog.is_active, true) = true",
            "COALESCE(iprog.is_deleted, false) = false",
          ];
          const ipParams: any[] = [];

          if (likeQ) {
            ipParams.push(likeQ);
            ipConditions.push(`(
              iprog.title ILIKE $${ipParams.length}
              OR COALESCE(iprog.about, '') ILIKE $${ipParams.length}
            )`);
          }

          if (uniqueCityTokens.length > 0) {
            ipParams.push(uniqueCityTokens);
            ipConditions.push(`(
              loc.city ILIKE ANY($${ipParams.length}::text[])
              OR ip.city ILIKE ANY($${ipParams.length}::text[])
              OR ip.address ILIKE ANY($${ipParams.length}::text[])
              OR loc.address ILIKE ANY($${ipParams.length}::text[])
            )`);
          }

          if (categoryIds.length > 0) {
            ipParams.push(categoryIds);
            ipConditions.push(`(
              iprog.institution_id IN (
                SELECT COALESCE(institution_profile_id, id)
                FROM business_profiles
                WHERE category_id = ANY($${ipParams.length}::int[])
                   OR subcategory_id = ANY($${ipParams.length}::int[])
              )
              OR EXISTS (
                SELECT 1 FROM categories c
                WHERE c.id = ANY($${ipParams.length}::int[])
                  AND (
                    iprog.title ILIKE '%' || c.name || '%'
                    OR COALESCE(iprog.about, '') ILIKE '%' || c.name || '%'
                  )
              )
            )`);
          }

          const ipQuery = `
            SELECT
              iprog.id,
              iprog.title AS name,
              iprog.slug,
              NULL AS code,
              iprog.about AS description,
              iprog.duration_value,
              iprog.duration_unit,
              NULL AS thumbnail_url,
              NULL AS icon_url,
              COALESCE(u.name, b.name, ip.name, 'Institution') AS university_name,
              'institution' AS authority_type,
              COALESCE(pt.name, 'Academic & Competitive Program') AS category_name,
              COALESCE(iprog.seats_available, 60) AS seats_available
            FROM institution_programs iprog
            LEFT JOIN program_types pt ON pt.id = iprog.program_type_id
            LEFT JOIN universities u ON u.id = iprog.university_id
            LEFT JOIN boards b ON b.id = iprog.board_id
            LEFT JOIN institution_profiles ip ON ip.id = iprog.institution_id
            LEFT JOIN locations loc ON loc.id = ip.location_id
            WHERE ${ipConditions.join(" AND ")}
            ORDER BY iprog.id DESC
            LIMIT $${ipParams.length + 1} OFFSET $${ipParams.length + 2}
          `;
          const ipRes = await db.query(ipQuery, [...ipParams, limit, offset]);
          instCoursesRows = ipRes.rows.map((r) => ({ ...r, resultType: "course" }));
        } catch (ipErr) {
          console.warn("Could not query institution_programs in discovery:", ipErr);
        }

        let bizCoursesRows: any[] = [];
        try {
          const bcConditions: string[] = ["COALESCE(bc.is_active, true) = true"];
          const bcParams: any[] = [];
          if (likeQ) {
            bcParams.push(likeQ);
            bcConditions.push(`(
              bc.course_name ILIKE $${bcParams.length}
              OR COALESCE(bc.stream, '') ILIKE $${bcParams.length}
              OR COALESCE(bc.description, '') ILIKE $${bcParams.length}
            )`);
          }
          if (uniqueCityTokens.length > 0) {
            bcParams.push(uniqueCityTokens);
            bcConditions.push(`(
              bp.city ILIKE ANY($${bcParams.length}::text[])
              OR bp.address ILIKE ANY($${bcParams.length}::text[])
            )`);
          }
          const bcRes = await db.query(`
            SELECT
              bc.id,
              bc.course_name AS name,
              NULL AS slug,
              NULL AS code,
              bc.description,
              bc.duration AS duration_value,
              NULL AS duration_unit,
              NULL AS thumbnail_url,
              NULL AS icon_url,
              COALESCE(bp.name, ip.name, 'Institution') AS university_name,
              'institution' AS authority_type,
              COALESCE(bc.stream, 'Academic & Competitive Program') AS category_name,
              COALESCE(bc.seats_available, 60) AS seats_available
            FROM business_courses bc
            LEFT JOIN institution_profiles ip ON ip.id = bc.institution_id
            LEFT JOIN business_profiles bp ON bp.institution_profile_id = bc.institution_id
            WHERE ${bcConditions.join(" AND ")}
            ORDER BY bc.id DESC
            LIMIT $${bcParams.length + 1} OFFSET $${bcParams.length + 2}
          `, [...bcParams, limit, offset]);
          bizCoursesRows = bcRes.rows.map((r) => ({ ...r, resultType: "course" }));
        } catch (bcErr) {
          console.warn("Could not query business_courses in discovery:", bcErr);
        }

        courses = [...masterCoursesRows, ...instCoursesRows, ...bizCoursesRows];
      }
    }

    // 6. Search Jobs
    if (type === "all" || type === "job" || type === "jobs") {
      if (scopedBusinessId) {
        // Business mode scope: only show jobs posted by this business / institution
        if (scopedInstitutionId) {
          try {
            const jParams: any[] = [scopedInstitutionId];
            let jWhere = "sjp.institution_id = $1 AND LOWER(COALESCE(sjp.status, 'active')) IN ('active', 'open')";
            if (likeQ) {
              jParams.push(likeQ);
              jWhere += ` AND (sjp.title ILIKE $${jParams.length} OR COALESCE(sjp.description, '') ILIKE $${jParams.length})`;
            }

            const jQuery = `
              SELECT
                sjp.id,
                sjp.title AS name,
                sjp.title,
                sjp.slug,
                sjp.department,
                sjp.employment_type,
                sjp.experience_level,
                sjp.work_mode,
                sjp.location,
                sjp.salary_range,
                sjp.openings_count,
                sjp.description,
                sjp.status,
                sjp.created_at,
                ip.name AS company_name,
                ip.logo_url AS company_logo
              FROM staff_job_postings sjp
              LEFT JOIN institution_profiles ip ON ip.id = sjp.institution_id
              WHERE ${jWhere}
              ORDER BY sjp.id DESC
              LIMIT $${jParams.length + 1} OFFSET $${jParams.length + 2}
            `;
            const jRes = await db.query(jQuery, [...jParams, limit, offset]);
            jobs = jRes.rows.map((r) => ({ ...r, resultType: "job" }));
          } catch (jErr) {
            console.warn("Could not query institution jobs:", jErr);
            jobs = [];
          }
        } else {
          jobs = [];
        }
      } else {
        // Platform Admin / Global discovery
        let masterJobsRows: any[] = [];
        try {
          const mjConditions: string[] = ["COALESCE(mj.is_active, true) = true", "COALESCE(mj.is_deleted, false) = false"];
          const mjParams: any[] = [];
          if (likeQ) {
            mjParams.push(likeQ);
            mjConditions.push(`(
              mj.title ILIKE $${mjParams.length}
              OR COALESCE(mj.department, '') ILIKE $${mjParams.length}
              OR COALESCE(mj.role_title, '') ILIKE $${mjParams.length}
              OR COALESCE(mj.location, '') ILIKE $${mjParams.length}
              OR COALESCE(mj.description, '') ILIKE $${mjParams.length}
            )`);
          }
          if (city && city.toLowerCase() !== "all locations" && city.toLowerCase() !== "all") {
            mjParams.push(`%${city}%`);
            mjConditions.push(`mj.location ILIKE $${mjParams.length}`);
          }
          if (categoryIds.length > 0) {
            mjParams.push(categoryIds);
            mjConditions.push(`(
              mj.business_category_id = ANY($${mjParams.length}::int[])
              OR mj.professional_category_id = ANY($${mjParams.length}::int[])
            )`);
          }
          const mjRes = await db.query(`
            SELECT
              mj.id,
              mj.title AS name,
              mj.title,
              mj.slug,
              mj.department,
              mj.employment_type,
              mj.experience_level,
              mj.work_mode,
              mj.location,
              mj.salary_range,
              mj.openings_count,
              mj.description,
              'Active' AS status,
              mj.created_at,
              bc.name AS company_name,
              NULL AS company_logo
            FROM master_jobs mj
            LEFT JOIN categories bc ON bc.id = mj.business_category_id
            WHERE ${mjConditions.join(" AND ")}
            ORDER BY mj.id DESC
            LIMIT 20
          `, mjParams);
          masterJobsRows = mjRes.rows;
        } catch (mjErr) {
          console.warn("Could not query master_jobs:", mjErr);
        }

        const jConditions: string[] = ["LOWER(COALESCE(sjp.status, 'active')) IN ('active', 'open')"];
        const jParams: any[] = [];

        if (likeQ) {
          jParams.push(likeQ);
          jConditions.push(`(
            sjp.title ILIKE $${jParams.length}
            OR COALESCE(sjp.description, '') ILIKE $${jParams.length}
            OR COALESCE(sjp.department, '') ILIKE $${jParams.length}
            OR COALESCE(sjp.location, '') ILIKE $${jParams.length}
          )`);
        }

        if (uniqueCityTokens.length > 0) {
          jParams.push(uniqueCityTokens);
          jConditions.push(`(
            sjp.location ILIKE ANY($${jParams.length}::text[])
            OR COALESCE(sjp.description, '') ILIKE ANY($${jParams.length}::text[])
          )`);
        }

        if (categoryIds.length > 0) {
          jParams.push(categoryIds);
          jConditions.push(`EXISTS (
            SELECT 1 FROM categories c WHERE c.id = ANY($${jParams.length}::int[])
            AND (
              sjp.department ILIKE '%' || c.name || '%'
              OR sjp.title ILIKE '%' || c.name || '%'
              OR c.name ILIKE '%' || COALESCE(sjp.department, '') || '%'
            )
          )`);
        }

        const jQuery = `
          SELECT
            sjp.id,
            sjp.title AS name,
            sjp.title,
            sjp.slug,
            sjp.department,
            sjp.employment_type,
            sjp.experience_level,
            sjp.work_mode,
            sjp.location,
            sjp.salary_range,
            sjp.openings_count,
            sjp.description,
            sjp.status,
            sjp.created_at,
            ip.name AS company_name,
            ip.logo_url AS company_logo
          FROM staff_job_postings sjp
          LEFT JOIN institution_profiles ip ON ip.id = sjp.institution_id
          WHERE ${jConditions.join(" AND ")}
          ORDER BY sjp.id DESC
          LIMIT $${jParams.length + 1} OFFSET $${jParams.length + 2}
        `;

        const jRes = await db.query(jQuery, [...jParams, limit, offset]);
        jobs = [...masterJobsRows, ...jRes.rows].map((r) => ({ ...r, resultType: "job" }));
      }
    }

    // 7. Search Properties
    if (type === "all" || type === "property" || type === "properties") {
      try {
        const pConditions: string[] = [
          "br.vertical_code = 'properties'",
          "(br.is_deleted IS NULL OR br.is_deleted = FALSE)",
          "(br.is_active = TRUE OR br.is_active IS NULL)"
        ];
        const pParams: any[] = [];

        if (scopedBusinessId) {
          pParams.push(scopedBusinessId);
          pConditions.push(`br.business_id = $${pParams.length}`);
        }

        if (likeQ) {
          pParams.push(likeQ);
          pConditions.push(`(
            br.title ILIKE $${pParams.length}
            OR COALESCE(br.description, '') ILIKE $${pParams.length}
            OR COALESCE(pd.street_address, '') ILIKE $${pParams.length}
            OR COALESCE(pd.city, '') ILIKE $${pParams.length}
            OR COALESCE(bp.name, '') ILIKE $${pParams.length}
          )`);
        }

        if (uniqueCityTokens.length > 0) {
          pParams.push(uniqueCityTokens);
          pConditions.push(`(
            pd.city ILIKE ANY($${pParams.length}::text[])
            OR bp.city ILIKE ANY($${pParams.length}::text[])
            OR COALESCE(pd.street_address, '') ILIKE ANY($${pParams.length}::text[])
          )`);
        }

        const pQuery = `
          SELECT
            br.id,
            br.title AS name,
            br.title,
            br.slug,
            br.description,
            COALESCE(pd.rental_amount, br.price) AS price,
            br.currency,
            br.featured_image AS default_image_url,
            br.featured_image AS image_url,
            br.is_active,
            br.is_featured,
            br.created_at,
            bp.id AS business_id,
            bp.name AS business_name,
            COALESCE(pd.city, bp.city, 'Varanasi') AS city,
            COALESCE(pd.state, bp.state, 'Uttar Pradesh') AS state,
            COALESCE(pd.street_address, bp.address) AS address,
            COALESCE(bp.phone, '+91 94152 20303') AS phone,
            bp.whatsapp,
            bp.email,
            c.name AS category_name,
            subc.name AS subcategory_name,
            pd.bedrooms,
            pd.bathrooms,
            pd.built_up_area,
            pd.area_unit,
            pd.rental_amount,
            pd.availability_status
          FROM business_records br
          LEFT JOIN property_details pd ON pd.record_id = br.id
          LEFT JOIN business_profiles bp ON bp.id = br.business_id
          LEFT JOIN categories c ON c.id = br.category_id
          LEFT JOIN categories subc ON subc.id = br.subcategory_id
          WHERE ${pConditions.join(" AND ")}
          ORDER BY br.id DESC
          LIMIT $${pParams.length + 1} OFFSET $${pParams.length + 2}
        `;
        const pRes = await db.query(pQuery, [...pParams, limit, offset]);
        properties = pRes.rows.map((r) => ({ ...r, resultType: "property" }));
      } catch (pErr) {
        console.warn("Could not query properties in discovery:", pErr);
      }
    }

    // 8. Search Vehicles
    if (type === "all" || type === "vehicle" || type === "vehicles") {
      try {
        const vConditions: string[] = [
          "br.vertical_code = 'vehicles'",
          "(br.is_deleted IS NULL OR br.is_deleted = FALSE)",
          "(br.is_active = TRUE OR br.is_active IS NULL)"
        ];
        const vParams: any[] = [];

        if (scopedBusinessId) {
          pParams.push(scopedBusinessId);
          vConditions.push(`br.business_id = $${vParams.length}`);
        }

        if (likeQ) {
          vParams.push(likeQ);
          vConditions.push(`(
            br.title ILIKE $${vParams.length}
            OR COALESCE(br.description, '') ILIKE $${vParams.length}
            OR COALESCE(vd.location, '') ILIKE $${vParams.length}
            OR COALESCE(bp.name, '') ILIKE $${vParams.length}
          )`);
        }

        if (uniqueCityTokens.length > 0) {
          vParams.push(uniqueCityTokens);
          vConditions.push(`(
            bp.city ILIKE ANY($${vParams.length}::text[])
            OR COALESCE(vd.location, '') ILIKE ANY($${vParams.length}::text[])
          )`);
        }

        const vQuery = `
          SELECT
            br.id,
            br.title AS name,
            br.title,
            br.slug,
            br.description,
            br.price,
            br.currency,
            br.featured_image AS default_image_url,
            br.featured_image AS image_url,
            br.is_active,
            br.is_featured,
            br.created_at,
            bp.id AS business_id,
            bp.name AS business_name,
            COALESCE(bp.city, vd.location, 'Varanasi') AS city,
            COALESCE(bp.state, 'Uttar Pradesh') AS state,
            COALESCE(vd.location, bp.address) AS address,
            COALESCE(vd.contact_info, bp.phone, '+91 94152 20302') AS phone,
            bp.whatsapp,
            bp.email,
            c.name AS category_name,
            subc.name AS subcategory_name,
            vd.manufacturing_year,
            vd.color,
            vd.mileage,
            vd.kilometers_driven,
            vd.engine_capacity,
            vd.registration_number
          FROM business_records br
          LEFT JOIN vehicle_details vd ON vd.record_id = br.id
          LEFT JOIN business_profiles bp ON bp.id = br.business_id
          LEFT JOIN categories c ON c.id = br.category_id
          LEFT JOIN categories subc ON subc.id = br.subcategory_id
          WHERE ${vConditions.join(" AND ")}
          ORDER BY br.id DESC
          LIMIT $${vParams.length + 1} OFFSET $${vParams.length + 2}
        `;
        const vRes = await db.query(vQuery, [...vParams, limit, offset]);
        vehicles = vRes.rows.map((r) => ({ ...r, resultType: "vehicle" }));
      } catch (vErr) {
        console.warn("Could not query vehicles in discovery:", vErr);
      }
    }

    // 9. Search Events
    if (type === "all" || type === "event" || type === "events") {
      try {
        const eConditions: string[] = [
          "br.vertical_code = 'events'",
          "(br.is_deleted IS NULL OR br.is_deleted = FALSE)",
          "(br.is_active = TRUE OR br.is_active IS NULL)"
        ];
        const eParams: any[] = [];

        if (scopedBusinessId) {
          eParams.push(scopedBusinessId);
          eConditions.push(`br.business_id = $${eParams.length}`);
        }

        if (likeQ) {
          eParams.push(likeQ);
          eConditions.push(`(
            br.title ILIKE $${eParams.length}
            OR COALESCE(br.description, '') ILIKE $${eParams.length}
            OR COALESCE(e.venue_name, '') ILIKE $${eParams.length}
            OR COALESCE(e.city, '') ILIKE $${eParams.length}
            OR COALESCE(bp.name, '') ILIKE $${eParams.length}
          )`);
        }

        if (uniqueCityTokens.length > 0) {
          eParams.push(uniqueCityTokens);
          eConditions.push(`(
            e.city ILIKE ANY($${eParams.length}::text[])
            OR bp.city ILIKE ANY($${eParams.length}::text[])
            OR COALESCE(e.complete_address, '') ILIKE ANY($${eParams.length}::text[])
          )`);
        }

        const eQuery = `
          SELECT
            br.id,
            br.title AS name,
            br.title,
            br.slug,
            br.description,
            br.price,
            br.currency,
            br.featured_image AS default_image_url,
            br.featured_image AS image_url,
            br.is_active,
            br.is_featured,
            br.created_at,
            bp.id AS business_id,
            bp.name AS business_name,
            COALESCE(e.city, bp.city, 'Varanasi') AS city,
            COALESCE(e.state, bp.state, 'Uttar Pradesh') AS state,
            COALESCE(e.venue_name, e.complete_address, bp.address) AS address,
            COALESCE(bp.phone, '+91 94152 20304') AS phone,
            bp.whatsapp,
            bp.email,
            c.name AS category_name,
            subc.name AS subcategory_name,
            e.venue_name,
            e.start_date,
            e.end_date,
            e.start_time,
            e.end_time,
            e.is_free,
            e.organizer_name
          FROM business_records br
          LEFT JOIN events e ON e.record_id = br.id
          LEFT JOIN business_profiles bp ON bp.id = br.business_id
          LEFT JOIN categories c ON c.id = br.category_id
          LEFT JOIN categories subc ON subc.id = br.subcategory_id
          WHERE ${eConditions.join(" AND ")}
          ORDER BY br.id DESC
          LIMIT $${eParams.length + 1} OFFSET $${eParams.length + 2}
        `;
        const eRes = await db.query(eQuery, [...eParams, limit, offset]);
        events = eRes.rows.map((r) => ({ ...r, resultType: "event" }));
      } catch (eErr) {
        console.warn("Could not query events in discovery:", eErr);
      }
    }

    const total = businesses.length + professionals.length + products.length + services.length + courses.length + jobs.length + properties.length + vehicles.length + events.length;

    return NextResponse.json({
      success: true,
      data: {
        businesses,
        professionals,
        products,
        services,
        courses,
        jobs,
        properties,
        vehicles,
        events,
        meta: {
          total,
          page,
          limit,
          query: q,
          type,
          businessId: scopedBusinessId,
          institutionId: scopedInstitutionId,
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
