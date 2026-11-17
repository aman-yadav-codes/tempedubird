import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { getInstitutionTenantByHost } from "@/lib/tenancy/institution-domain";

// In-Memory Stale-While-Revalidate Cache
interface CacheEntry {
  jsonString: string;
  cachedAt: number;
  revalidating?: boolean;
}

const productCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds fresh
const STALE_TTL_MS = 10 * 60 * 1000; // 10 minutes max stale

export function clearProductsCache() {
  productCache.clear();
}

async function fetchProductsFromDb(
  targetInstitutionId: number | null,
  category: string | null,
  search: string | undefined,
  limit: number
) {
  const conditions: string[] = ["products.status = 'active'"];
  const params: any[] = [];

  if (targetInstitutionId) {
    params.push(targetInstitutionId);
    conditions.push(`(products.institution_id = $${params.length} OR products.business_profile_id = $${params.length} OR products.business_profile_id = (SELECT id FROM business_profiles WHERE institution_profile_id = $${params.length} LIMIT 1))`);
  }

  if (category && category !== "all") {
    params.push(category);
    conditions.push(`(products.category = $${params.length} OR pc.name = $${params.length} OR pc.slug = $${params.length})`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(products.title ILIKE $${params.length} OR products.description ILIKE $${params.length} OR products.sku ILIKE $${params.length})`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  params.push(limit);
  const limitClause = `LIMIT $${params.length}`;

  const query = `
    SELECT products.id, products.title, products.slug, products.description, products.price, products.sale_price,
           COALESCE(pc.name, products.category) AS category, products.category_id, products.image_url,
           products.gallery, products.institution_id, products.institution_name, products.business_profile_id,
           products.stock_quantity, products.sku,
           COALESCE(products.unit, 'piece') AS unit,
           COALESCE(products.unit_quantity, 1) AS unit_quantity,
           products.badge_text, products.features, products.status, products.is_featured, products.created_at,
           products.program_ids,
           CASE 
             WHEN products.program_ids IS NOT NULL 
                  AND jsonb_typeof(products.program_ids) = 'array' 
                  AND jsonb_array_length(products.program_ids) > 0 THEN (
               SELECT json_agg(json_build_object('id', prog.id, 'title', prog.title))
               FROM institution_programs prog
               WHERE prog.id IN (
                 SELECT jsonb_array_elements_text(products.program_ids)::int
               )
             )
             ELSE NULL
           END AS associated_programs
    FROM products
    LEFT JOIN product_categories pc ON pc.id = products.category_id
    ${whereClause}
    ORDER BY products.is_featured DESC, products.id DESC
    ${limitClause}
  `;

  const catPromise = targetInstitutionId
    ? db.query(
        `SELECT DISTINCT COALESCE(pc.name, p.category) AS category 
         FROM products p
         LEFT JOIN product_categories pc ON pc.id = p.category_id
         WHERE p.status = 'active' AND (p.category IS NOT NULL AND p.category != '' OR p.category_id IS NOT NULL)
           AND (p.institution_id = $1 OR p.business_profile_id = (SELECT id FROM business_profiles WHERE institution_profile_id = $1 LIMIT 1))
         ORDER BY category ASC`,
        [targetInstitutionId]
      )
    : null;

  const progPromise = db.query(
    `SELECT id, title, slug 
     FROM institution_programs 
     WHERE COALESCE(is_deleted, false) = false
       ${targetInstitutionId ? "AND institution_id = $1" : ""}
     ORDER BY title ASC
     LIMIT 150`,
    targetInstitutionId ? [targetInstitutionId] : []
  ).catch(() => ({ rows: [] }));

  const instPromise = targetInstitutionId
    ? db.query(
        `SELECT id, name, slug, logo_url FROM institution_profiles WHERE id = $1`,
        [targetInstitutionId]
      ).catch(() => ({ rows: [] }))
    : Promise.resolve({ rows: [] });

  const [res, catRes, progRes, instRes] = await Promise.all([
    db.query(query, params),
    catPromise,
    progPromise,
    instPromise,
  ]);

  const products = res.rows;
  const categories = catRes
    ? catRes.rows.map((r: any) => r.category)
    : Array.from(new Set(products.map((p: any) => p.category).filter(Boolean))).sort();

  return {
    products,
    categories,
    programs: progRes.rows || [],
    institution: instRes.rows?.[0] || null,
    target_institution_id: targetInstitutionId,
    is_platform_store: !targetInstitutionId,
    total: products.length,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const institutionIdParam =
      searchParams.get("institutionId") ||
      searchParams.get("institution_id") ||
      searchParams.get("businessId") ||
      searchParams.get("business_id");
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim();
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam), 2000) : 1000;

    // Resolve tenant by host/subdomain
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
    let tenant = null;
    try {
      tenant = await getInstitutionTenantByHost(db, host);
    } catch {}

    const envDefaultInstId = (
      process.env.BUSINESS_ID ||
      process.env.NEXT_PUBLIC_BUSINESS_ID ||
      process.env.INSTITUTION_ID ||
      process.env.NEXT_PUBLIC_INSTITUTION_ID ||
      process.env.DEFAULT_INSTITUTION_ID ||
      process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID ||
      ""
    ).trim();

    let targetInstitutionId: number | null = null;
    if (institutionIdParam === "all") {
      targetInstitutionId = null;
    } else if (institutionIdParam && !isNaN(Number(institutionIdParam)) && Number(institutionIdParam) > 0) {
      targetInstitutionId = Number(institutionIdParam);
    } else if (tenant?.institution_id) {
      targetInstitutionId = Number(tenant.institution_id);
    } else if (
      (process.env.APP_MODE === "institution" || process.env.APP_MODE === "business") &&
      envDefaultInstId &&
      /^\d+$/.test(envDefaultInstId) &&
      Number(envDefaultInstId) > 0
    ) {
      targetInstitutionId = Number(envDefaultInstId);
    }

    // Cache key
    const cacheKey = `${targetInstitutionId || "all"}::${category || "all"}::${search || ""}::${limit}`;
    const cached = productCache.get(cacheKey);
    const now = Date.now();

    // 1. FRESH CACHE HIT: Return in < 15ms!
    if (cached && (now - cached.cachedAt < CACHE_TTL_MS)) {
      return new Response(cached.jsonString, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Cache": "HIT",
          "X-Response-Time": "<15ms",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      });
    }

    // 2. STALE CACHE HIT (Background Revalidation): Return immediately in < 15ms, refresh in background!
    if (cached && (now - cached.cachedAt < STALE_TTL_MS)) {
      if (!cached.revalidating) {
        cached.revalidating = true;
        fetchProductsFromDb(targetInstitutionId, category, search, limit)
          .then((data) => {
            productCache.set(cacheKey, { jsonString: JSON.stringify(data), cachedAt: Date.now() });
          })
          .catch((err) => console.error("[Background Revalidate Error]", err));
      }
      return new Response(cached.jsonString, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Cache": "STALE",
          "X-Response-Time": "<15ms",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      });
    }

    // 3. CACHE MISS: Fetch from DB, cache pre-serialized string, and return
    const data = await fetchProductsFromDb(targetInstitutionId, category, search, limit);
    const jsonString = JSON.stringify(data);
    productCache.set(cacheKey, { jsonString, cachedAt: Date.now() });

    return new Response(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Cache": "MISS",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error: any) {
    console.error("[Public Products API] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch products" }, { status: 500 });
  }
}
