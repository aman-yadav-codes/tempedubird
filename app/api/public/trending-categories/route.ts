import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

function parseLocationTokens(locationStr: string | null | undefined): string[] {
  if (!locationStr || typeof locationStr !== "string") return [];
  const lower = locationStr.toLowerCase().trim();
  if (["all locations", "all", "india", "in", "global"].includes(lower)) return [];

  return locationStr
    .split(/[,/|-]+/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length >= 2 &&
        !["india", "in", "all", "locations", "city", "state"].includes(s.toLowerCase())
    );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawLocation = (searchParams.get("location") || searchParams.get("city") || "").trim();
    const limit = Math.max(4, Math.min(24, Number(searchParams.get("limit")) || 8));

    const tokens = parseLocationTokens(rawLocation);
    const hasLocation = tokens.length > 0;
    const locValues = tokens.map((t) => `%${t}%`);

    // Helper to generate dynamic location OR conditions for a table alias
    const buildLocClause = (alias: string, cols: string[], baseParamIdx: number) => {
      if (!hasLocation) return "TRUE";
      const clauses: string[] = [];
      tokens.forEach((_, tIdx) => {
        const paramNum = baseParamIdx + tIdx;
        const sub = cols.map((c) => `${alias}.${c} ILIKE $${paramNum}`).join(" OR ");
        clauses.push(`(${sub})`);
      });
      return `(${clauses.join(" OR ")})`;
    };

    // ==========================================
    // 1. PRODUCT CATEGORIES
    // ==========================================
    const prodLocSql = buildLocClause("bp", ["city", "locality", "address", "state"], 1);
    const prodParams = hasLocation ? [...locValues] : [];

    let prodRes = await db.query(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        'product' AS category_type,
        COUNT(DISTINCT p.id)::int AS item_count,
        COUNT(DISTINCT bp.id)::int AS store_count,
        (
          SELECT ARRAY_AGG(sub.title)
          FROM (
            SELECT DISTINCT p2.title
            FROM products p2
            JOIN business_profiles bp2 ON bp2.id = p2.business_profile_id
            WHERE p2.category_id = c.id
              AND ${hasLocation ? buildLocClause("bp2", ["city", "locality", "address", "state"], 1) : "TRUE"}
            LIMIT 3
          ) sub
        ) AS sample_items
      FROM categories c
      JOIN products p ON p.category_id = c.id
      JOIN business_profiles bp ON bp.id = p.business_profile_id
      WHERE COALESCE(bp.is_active, TRUE) = TRUE
        AND ${prodLocSql}
      GROUP BY c.id, c.name, c.slug
      ORDER BY item_count DESC, store_count DESC
      LIMIT $${prodParams.length + 1}
      `,
      [...prodParams, limit]
    );

    // Fallback if specific city had zero products
    if (prodRes.rows.length === 0 && hasLocation) {
      prodRes = await db.query(
        `
        SELECT
          c.id,
          c.name,
          c.slug,
          'product' AS category_type,
          COUNT(DISTINCT p.id)::int AS item_count,
          COUNT(DISTINCT bp.id)::int AS store_count,
          (
            SELECT ARRAY_AGG(sub.title)
            FROM (
              SELECT DISTINCT p2.title
              FROM products p2
              JOIN business_profiles bp2 ON bp2.id = p2.business_profile_id
              WHERE p2.category_id = c.id
              LIMIT 3
            ) sub
          ) AS sample_items
        FROM categories c
        JOIN products p ON p.category_id = c.id
        JOIN business_profiles bp ON bp.id = p.business_profile_id
        WHERE COALESCE(bp.is_active, TRUE) = TRUE
        GROUP BY c.id, c.name, c.slug
        ORDER BY item_count DESC, store_count DESC
        LIMIT $1
        `,
        [limit]
      );
    }

    // ==========================================
    // 2. SERVICE CATEGORIES
    // ==========================================
    const servBpLoc = buildLocClause("bp", ["city", "locality", "address", "state"], 1);
    const servPpLoc = buildLocClause("pp", ["city", "locality", "address", "state"], 1);
    const servLocSql = hasLocation ? `((${servBpLoc}) OR (${servPpLoc}))` : "TRUE";
    const servParams = hasLocation ? [...locValues] : [];

    let servRes = await db.query(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        'service' AS category_type,
        COUNT(DISTINCT s.id)::int AS item_count,
        COUNT(DISTINCT COALESCE(bp.id, pp.id))::int AS provider_count,
        (
          SELECT ARRAY_AGG(sub.title)
          FROM (
            SELECT DISTINCT s2.title
            FROM services s2
            LEFT JOIN business_profiles bp2 ON bp2.id = s2.business_profile_id
            LEFT JOIN professional_profiles pp2 ON pp2.id = s2.professional_profile_id
            WHERE s2.category_id = c.id
              AND ${
                hasLocation
                  ? `((${buildLocClause("bp2", ["city", "locality", "address", "state"], 1)}) OR (${buildLocClause("pp2", ["city", "locality", "address", "state"], 1)}))`
                  : "TRUE"
              }
            LIMIT 3
          ) sub
        ) AS sample_items
      FROM categories c
      JOIN services s ON s.category_id = c.id
      LEFT JOIN business_profiles bp ON bp.id = s.business_profile_id
      LEFT JOIN professional_profiles pp ON pp.id = s.professional_profile_id
      WHERE (bp.id IS NOT NULL OR pp.id IS NOT NULL)
        AND ${servLocSql}
      GROUP BY c.id, c.name, c.slug
      ORDER BY item_count DESC, provider_count DESC
      LIMIT $${servParams.length + 1}
      `,
      [...servParams, limit]
    );

    if (servRes.rows.length === 0 && hasLocation) {
      servRes = await db.query(
        `
        SELECT
          c.id,
          c.name,
          c.slug,
          'service' AS category_type,
          COUNT(DISTINCT s.id)::int AS item_count,
          COUNT(DISTINCT COALESCE(bp.id, pp.id))::int AS provider_count,
          (
            SELECT ARRAY_AGG(sub.title)
            FROM (
              SELECT DISTINCT s2.title
              FROM services s2
              WHERE s2.category_id = c.id
              LIMIT 3
            ) sub
          ) AS sample_items
        FROM categories c
        JOIN services s ON s.category_id = c.id
        LEFT JOIN business_profiles bp ON bp.id = s.business_profile_id
        LEFT JOIN professional_profiles pp ON pp.id = s.professional_profile_id
        WHERE (bp.id IS NOT NULL OR pp.id IS NOT NULL)
        GROUP BY c.id, c.name, c.slug
        ORDER BY item_count DESC, provider_count DESC
        LIMIT $1
        `,
        [limit]
      );
    }

    // ==========================================
    // 3. PROFESSIONAL CATEGORIES
    // ==========================================
    const profLocSql = buildLocClause("pp", ["city", "locality", "address", "state"], 1);
    const profParams = hasLocation ? [...locValues] : [];

    let profRes = await db.query(
      `
      SELECT
        COALESCE(c.id, 0) AS id,
        COALESCE(c.name, pp.profession_type, 'Professional Services') AS name,
        COALESCE(c.slug, 'professional-services') AS slug,
        'professional' AS category_type,
        COUNT(DISTINCT pp.id)::int AS item_count,
        (
          SELECT ARRAY_AGG(sub.pname)
          FROM (
            SELECT DISTINCT pp2.name AS pname
            FROM professional_profiles pp2
            WHERE COALESCE(pp2.category_id, 0) = COALESCE(c.id, 0)
              AND ${hasLocation ? buildLocClause("pp2", ["city", "locality", "address", "state"], 1) : "TRUE"}
            LIMIT 3
          ) sub
        ) AS sample_items
      FROM professional_profiles pp
      LEFT JOIN categories c ON c.id = pp.category_id
      WHERE COALESCE(pp.is_active, TRUE) = TRUE
        AND ${profLocSql}
      GROUP BY c.id, c.name, c.slug, pp.profession_type
      ORDER BY item_count DESC
      LIMIT $${profParams.length + 1}
      `,
      [...profParams, limit]
    );

    if (profRes.rows.length === 0 && hasLocation) {
      profRes = await db.query(
        `
        SELECT
          COALESCE(c.id, 0) AS id,
          COALESCE(c.name, pp.profession_type, 'Professional Services') AS name,
          COALESCE(c.slug, 'professional-services') AS slug,
          'professional' AS category_type,
          COUNT(DISTINCT pp.id)::int AS item_count,
          (
            SELECT ARRAY_AGG(sub.pname)
            FROM (
              SELECT DISTINCT pp2.name AS pname
              FROM professional_profiles pp2
              WHERE COALESCE(pp2.category_id, 0) = COALESCE(c.id, 0)
              LIMIT 3
            ) sub
          ) AS sample_items
        FROM professional_profiles pp
        LEFT JOIN categories c ON c.id = pp.category_id
        WHERE COALESCE(pp.is_active, TRUE) = TRUE
        GROUP BY c.id, c.name, c.slug, pp.profession_type
        ORDER BY item_count DESC
        LIMIT $1
        `,
        [limit]
      );
    }

    // ==========================================
    // 4. COURSE CATEGORIES
    // ==========================================
    const courseLocSql = hasLocation
      ? `(${buildLocClause("loc", ["city", "name", "state"], 1)} OR ${buildLocClause("inst", ["name"], 1)})`
      : "TRUE";
    const courseParams = hasLocation ? [...locValues] : [];

    let courseRes = await db.query(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        'academic' AS category_type,
        COUNT(DISTINCT ip.id)::int AS item_count,
        (
          SELECT ARRAY_AGG(sub.title)
          FROM (
            SELECT DISTINCT ip2.title
            FROM institution_programs ip2
            JOIN program_categories pc2 ON pc2.program_id = ip2.id
            LEFT JOIN institution_profiles inst2 ON inst2.id = ip2.institution_id
            LEFT JOIN locations loc2 ON loc2.id = inst2.location_id
            WHERE pc2.category_id = c.id
              AND ${
                hasLocation
                  ? `(${buildLocClause("loc2", ["city", "name", "state"], 1)} OR ${buildLocClause("inst2", ["name"], 1)})`
                  : "TRUE"
              }
            LIMIT 3
          ) sub
        ) AS sample_items
      FROM categories c
      JOIN program_categories pc ON pc.category_id = c.id
      JOIN institution_programs ip ON ip.id = pc.program_id
      LEFT JOIN institution_profiles inst ON inst.id = ip.institution_id
      LEFT JOIN locations loc ON loc.id = inst.location_id
      WHERE COALESCE(ip.is_active, TRUE) = TRUE AND COALESCE(ip.is_deleted, FALSE) = FALSE
        AND ${courseLocSql}
      GROUP BY c.id, c.name, c.slug
      ORDER BY item_count DESC
      LIMIT $${courseParams.length + 1}
      `,
      [...courseParams, limit]
    );

    if (courseRes.rows.length === 0 && hasLocation) {
      courseRes = await db.query(
        `
        SELECT
          c.id,
          c.name,
          c.slug,
          'academic' AS category_type,
          COUNT(DISTINCT ip.id)::int AS item_count,
          (
            SELECT ARRAY_AGG(sub.title)
            FROM (
              SELECT DISTINCT ip2.title
              FROM institution_programs ip2
              JOIN program_categories pc2 ON pc2.program_id = ip2.id
              WHERE pc2.category_id = c.id
              LIMIT 3
            ) sub
          ) AS sample_items
        FROM categories c
        JOIN program_categories pc ON pc.category_id = c.id
        JOIN institution_programs ip ON ip.id = pc.program_id
        WHERE COALESCE(ip.is_active, TRUE) = TRUE AND COALESCE(ip.is_deleted, FALSE) = FALSE
        GROUP BY c.id, c.name, c.slug
        ORDER BY item_count DESC
        LIMIT $1
        `,
        [limit]
      );
    }

    // ==========================================
    // 5. JOB CATEGORIES
    // ==========================================
    const jobLocSql = buildLocClause("sjp", ["location"], 1);
    const jobParams = hasLocation ? [...locValues] : [];

    let jobRes = await db.query(
      `
      SELECT
        COALESCE(c.id, 0) AS id,
        COALESCE(c.name, sjp.department, 'Academic & Teaching') AS name,
        COALESCE(c.slug, LOWER(REPLACE(COALESCE(sjp.department, 'academics'), ' ', '-'))) AS slug,
        'job' AS category_type,
        COUNT(DISTINCT sjp.id)::int AS item_count,
        (
          SELECT ARRAY_AGG(sub.title)
          FROM (
            SELECT DISTINCT sjp2.title
            FROM staff_job_postings sjp2
            WHERE sjp2.department = sjp.department
              AND ${hasLocation ? buildLocClause("sjp2", ["location"], 1) : "TRUE"}
            LIMIT 3
          ) sub
        ) AS sample_items
      FROM staff_job_postings sjp
      LEFT JOIN categories c ON (c.name ILIKE '%' || sjp.department || '%' AND c.category_type = 'job')
      WHERE ${jobLocSql}
      GROUP BY c.id, c.name, c.slug, sjp.department
      ORDER BY item_count DESC
      LIMIT $${jobParams.length + 1}
      `,
      [...jobParams, limit]
    );

    if (jobRes.rows.length === 0 && hasLocation) {
      jobRes = await db.query(
        `
        SELECT
          COALESCE(c.id, 0) AS id,
          COALESCE(c.name, sjp.department, 'Academic & Teaching') AS name,
          COALESCE(c.slug, LOWER(REPLACE(COALESCE(sjp.department, 'academics'), ' ', '-'))) AS slug,
          'job' AS category_type,
          COUNT(DISTINCT sjp.id)::int AS item_count,
          (
            SELECT ARRAY_AGG(sub.title)
            FROM (
              SELECT DISTINCT sjp2.title
              FROM staff_job_postings sjp2
              WHERE sjp2.department = sjp.department
              LIMIT 3
            ) sub
          ) AS sample_items
        FROM staff_job_postings sjp
        LEFT JOIN categories c ON (c.name ILIKE '%' || sjp.department || '%' AND c.category_type = 'job')
        GROUP BY c.id, c.name, c.slug, sjp.department
        ORDER BY item_count DESC
        LIMIT $1
        `,
        [limit]
      );
    }

    // ==========================================
    // 6. BUSINESS CATEGORIES
    // ==========================================
    const bizLocSql = buildLocClause("bp", ["city", "locality", "address", "state"], 1);
    const bizParams = hasLocation ? [...locValues] : [];

    let bizRes = await db.query(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        'business' AS category_type,
        COUNT(DISTINCT bp.id)::int AS item_count,
        (
          SELECT ARRAY_AGG(sub.bname)
          FROM (
            SELECT DISTINCT bp2.name AS bname
            FROM business_profiles bp2
            WHERE bp2.category_id = c.id
              AND ${hasLocation ? buildLocClause("bp2", ["city", "locality", "address", "state"], 1) : "TRUE"}
            LIMIT 3
          ) sub
        ) AS sample_items
      FROM categories c
      JOIN business_profiles bp ON bp.category_id = c.id
      WHERE COALESCE(bp.is_active, TRUE) = TRUE
        AND ${bizLocSql}
      GROUP BY c.id, c.name, c.slug
      ORDER BY item_count DESC
      LIMIT $${bizParams.length + 1}
      `,
      [...bizParams, limit]
    );

    if (bizRes.rows.length === 0) {
      bizRes = await db.query(
        `
        SELECT
          c.id,
          c.name,
          c.slug,
          'business' AS category_type,
          COUNT(DISTINCT bp.id)::int AS item_count,
          (
            SELECT ARRAY_AGG(sub.bname)
            FROM (
              SELECT DISTINCT bp2.name AS bname
              FROM business_profiles bp2
              WHERE bp2.category_id = c.id
              LIMIT 3
            ) sub
          ) AS sample_items
        FROM categories c
        LEFT JOIN business_profiles bp ON bp.category_id = c.id
        WHERE c.category_type = 'business'
        GROUP BY c.id, c.name, c.slug
        ORDER BY item_count DESC, c.name ASC
        LIMIT $1
        `,
        [limit]
      );
    }

    // ==========================================
    // 7. PROPERTY CATEGORIES
    // ==========================================
    const propLocSql = buildLocClause("bp", ["city", "locality", "address", "state"], 1);
    const propParams = hasLocation ? [...locValues] : [];

    let propRes = await db.query(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        'property' AS category_type,
        COALESCE(
          NULLIF(COUNT(DISTINCT br.id), 0),
          (
            SELECT COUNT(*)::int
            FROM business_records br_loc
            JOIN business_profiles bp_loc ON bp_loc.id = br_loc.business_id
            WHERE br_loc.vertical_code = 'properties'
              AND COALESCE(br_loc.is_active, FALSE) = TRUE
              AND br_loc.status = 'published'
              AND ${hasLocation ? buildLocClause("bp_loc", ["city", "locality", "address", "state"], 1) : "TRUE"}
          ),
          1
        )::int AS item_count,
        (
          SELECT ARRAY_AGG(sub.title)
          FROM (
            SELECT DISTINCT br2.title
            FROM business_records br2
            JOIN business_profiles bp2 ON bp2.id = br2.business_id
            WHERE br2.vertical_code = 'properties'
              AND COALESCE(br2.is_active, FALSE) = TRUE
              AND br2.status = 'published'
              AND ${hasLocation ? buildLocClause("bp2", ["city", "locality", "address", "state"], 1) : "TRUE"}
            LIMIT 3
          ) sub
        ) AS sample_items
      FROM categories c
      LEFT JOIN business_records br ON (br.category_id = c.id OR br.subcategory_id = c.id) AND br.vertical_code = 'properties' AND COALESCE(br.is_active, FALSE) = TRUE AND br.status = 'published'
      LEFT JOIN business_profiles bp ON bp.id = br.business_id AND ${propLocSql}
      WHERE c.category_type = 'property'
      GROUP BY c.id, c.name, c.slug
      ORDER BY item_count DESC, c.name ASC
      LIMIT $${propParams.length + 1}
      `,
      [...propParams, limit]
    );

    // ==========================================
    // 8. EVENT CATEGORIES
    // ==========================================
    const evtLocSql = buildLocClause("bp", ["city", "locality", "address", "state"], 1);
    const evtParams = hasLocation ? [...locValues] : [];

    let eventRes = await db.query(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        'event' AS category_type,
        COALESCE(
          NULLIF(COUNT(DISTINCT br.id), 0),
          (
            SELECT COUNT(*)::int
            FROM business_records br_loc
            JOIN business_profiles bp_loc ON bp_loc.id = br_loc.business_id
            WHERE br_loc.vertical_code = 'events'
              AND COALESCE(br_loc.is_active, FALSE) = TRUE
              AND br_loc.status = 'published'
              AND ${hasLocation ? buildLocClause("bp_loc", ["city", "locality", "address", "state"], 1) : "TRUE"}
          ),
          1
        )::int AS item_count,
        (
          SELECT ARRAY_AGG(sub.title)
          FROM (
            SELECT DISTINCT br2.title
            FROM business_records br2
            JOIN business_profiles bp2 ON bp2.id = br2.business_id
            WHERE br2.vertical_code = 'events'
              AND COALESCE(br2.is_active, FALSE) = TRUE
              AND br2.status = 'published'
              AND ${hasLocation ? buildLocClause("bp2", ["city", "locality", "address", "state"], 1) : "TRUE"}
            LIMIT 3
          ) sub
        ) AS sample_items
      FROM categories c
      LEFT JOIN business_records br ON (br.category_id = c.id OR br.subcategory_id = c.id) AND br.vertical_code = 'events' AND COALESCE(br.is_active, FALSE) = TRUE AND br.status = 'published'
      LEFT JOIN business_profiles bp ON bp.id = br.business_id AND ${evtLocSql}
      WHERE c.category_type = 'event'
      GROUP BY c.id, c.name, c.slug
      ORDER BY item_count DESC, c.name ASC
      LIMIT $${evtParams.length + 1}
      `,
      [...evtParams, limit]
    );

    // ==========================================
    // 9. VEHICLE CATEGORIES
    // ==========================================
    const vehLocSql = buildLocClause("bp", ["city", "locality", "address", "state"], 1);
    const vehParams = hasLocation ? [...locValues] : [];

    let vehicleRes = await db.query(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        'vehicle' AS category_type,
        COALESCE(
          NULLIF(COUNT(DISTINCT br.id), 0),
          (
            SELECT COUNT(*)::int
            FROM business_records br_loc
            JOIN business_profiles bp_loc ON bp_loc.id = br_loc.business_id
            WHERE br_loc.vertical_code = 'vehicles'
              AND COALESCE(br_loc.is_active, FALSE) = TRUE
              AND br_loc.status = 'published'
              AND ${hasLocation ? buildLocClause("bp_loc", ["city", "locality", "address", "state"], 1) : "TRUE"}
          ),
          1
        )::int AS item_count,
        (
          SELECT ARRAY_AGG(sub.title)
          FROM (
            SELECT DISTINCT br2.title
            FROM business_records br2
            JOIN business_profiles bp2 ON bp2.id = br2.business_id
            WHERE br2.vertical_code = 'vehicles'
              AND COALESCE(br2.is_active, FALSE) = TRUE
              AND br2.status = 'published'
              AND ${hasLocation ? buildLocClause("bp2", ["city", "locality", "address", "state"], 1) : "TRUE"}
            LIMIT 3
          ) sub
        ) AS sample_items
      FROM categories c
      LEFT JOIN business_records br ON (br.category_id = c.id OR br.subcategory_id = c.id) AND br.vertical_code = 'vehicles' AND COALESCE(br.is_active, FALSE) = TRUE AND br.status = 'published'
      LEFT JOIN business_profiles bp ON bp.id = br.business_id AND ${vehLocSql}
      WHERE c.category_type = 'vehicle'
      GROUP BY c.id, c.name, c.slug, c.parent_id
      ORDER BY (c.parent_id IS NULL) DESC, item_count DESC, c.name ASC
      LIMIT $${vehParams.length + 1}
      `,
      [...vehParams, limit]
    );

    // Format output with navigation links
    const formatCategories = (rows: any[], verticalType: string) => {
      return rows.map((r) => {
        let href = `/explore?type=${verticalType}&categoryId=${r.id}&categoryName=${encodeURIComponent(r.name)}`;
        if (verticalType === "course") {
          href = `/courses?category=${encodeURIComponent(r.name)}`;
        } else if (verticalType === "job") {
          href = `/jobs?department=${encodeURIComponent(r.name)}`;
        } else if (verticalType === "business") {
          href = `/businesses?category=${encodeURIComponent(r.name)}`;
        } else if (verticalType === "property") {
          href = `/explore?type=property&categoryId=${r.id}&categoryName=${encodeURIComponent(r.name)}`;
        } else if (verticalType === "event") {
          href = `/explore?type=all&category=events&categoryName=${encodeURIComponent(r.name)}`;
        } else if (verticalType === "vehicle") {
          href = `/explore?type=vehicle&category=${r.slug}&categoryId=${r.id}&categoryName=${encodeURIComponent(r.name)}`;
        }

        return {
          id: r.id,
          name: r.name,
          slug: r.slug,
          vertical: verticalType,
          itemCount: Number(r.item_count) || 0,
          storeCount: r.store_count ? Number(r.store_count) : null,
          providerCount: r.provider_count ? Number(r.provider_count) : null,
          sampleItems: Array.isArray(r.sample_items) ? r.sample_items.filter(Boolean) : [],
          href,
        };
      });
    };

    const formattedProducts = formatCategories(prodRes.rows, "product");
    const formattedServices = formatCategories(servRes.rows, "service");
    const formattedProfessionals = formatCategories(profRes.rows, "professional");
    const formattedCourses = formatCategories(courseRes.rows, "course");
    const formattedJobs = formatCategories(jobRes.rows, "job");
    const formattedBusinesses = formatCategories(bizRes.rows, "business");
    const formattedProperties = formatCategories(propRes.rows, "property");
    const formattedEvents = formatCategories(eventRes.rows, "event");
    const formattedVehicles = formatCategories(vehicleRes.rows, "vehicle");

    return NextResponse.json({
      success: true,
      location: rawLocation || "All Locations",
      isLocationSpecific: hasLocation,
      counts: {
        products: formattedProducts.length,
        services: formattedServices.length,
        professionals: formattedProfessionals.length,
        courses: formattedCourses.length,
        jobs: formattedJobs.length,
        businesses: formattedBusinesses.length,
        properties: formattedProperties.length,
        events: formattedEvents.length,
        vehicles: formattedVehicles.length,
        total:
          formattedProducts.length +
          formattedServices.length +
          formattedProfessionals.length +
          formattedCourses.length +
          formattedJobs.length +
          formattedBusinesses.length +
          formattedProperties.length +
          formattedEvents.length +
          formattedVehicles.length,
      },
      categories: {
        products: formattedProducts,
        services: formattedServices,
        professionals: formattedProfessionals,
        courses: formattedCourses,
        jobs: formattedJobs,
        businesses: formattedBusinesses,
        properties: formattedProperties,
        events: formattedEvents,
        vehicles: formattedVehicles,
      },
    });
  } catch (err: unknown) {
    console.error("[trending-categories GET] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load trending categories" },
      { status: 500 }
    );
  }
}
