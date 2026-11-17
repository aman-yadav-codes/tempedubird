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

    // Format output with navigation links
    const formatCategories = (rows: any[], verticalType: string) => {
      return rows.map((r) => {
        let href = `/explore?type=${verticalType}&categoryId=${r.id}&categoryName=${encodeURIComponent(r.name)}`;
        if (verticalType === "course") {
          href = `/courses?category=${encodeURIComponent(r.name)}`;
        } else if (verticalType === "job") {
          href = `/jobs?department=${encodeURIComponent(r.name)}`;
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
        total:
          formattedProducts.length +
          formattedServices.length +
          formattedProfessionals.length +
          formattedCourses.length +
          formattedJobs.length,
      },
      categories: {
        products: formattedProducts,
        services: formattedServices,
        professionals: formattedProfessionals,
        courses: formattedCourses,
        jobs: formattedJobs,
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
