import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const parentIdParam = searchParams.get("parentId") || searchParams.get("parent_id");
    const parentId = parentIdParam ? Number(parentIdParam) : null;
    const onlyRoot = searchParams.get("onlyRoot") === "true";
    const limit = Math.max(1, Math.min(500, Number(searchParams.get("limit")) || 300));
    const bizParam = searchParams.get("businessId") || searchParams.get("business_id");
    const bizId = bizParam && /^\d+$/.test(bizParam) ? Number(bizParam) : null;

    const conditions = [
      "is_deleted = FALSE",
      "COALESCE(is_active, TRUE) = TRUE",
      "COALESCE(is_seo_active, TRUE) = TRUE",
    ];
    const params: any[] = [];

    if (bizId) {
      params.push(bizId);
      const bIdx = params.length;
      conditions.push(`(
        EXISTS (
          SELECT 1 FROM business_profiles bp
          WHERE bp.id = $${bIdx}
            AND (
              categories.id = bp.category_id
              OR categories.id = bp.subcategory_id
              OR categories.id = ANY(COALESCE(bp.category_ids, '{}'))
              OR categories.id = ANY(COALESCE(bp.subcategory_ids, '{}'))
              OR categories.id IN (
                SELECT parent_id FROM categories c_child
                WHERE c_child.id = bp.category_id OR c_child.id = bp.subcategory_id OR c_child.id = ANY(COALESCE(bp.category_ids, '{}'))
              )
            )
        )
        OR EXISTS (
          SELECT 1 FROM master_products mp
          WHERE (mp.business_profile_id = $${bIdx} OR mp.id IN (SELECT bprod.master_product_id FROM business_products bprod WHERE bprod.business_id = $${bIdx} OR bprod.business_profile_id = $${bIdx}))
            AND (categories.id = mp.category_id OR categories.id = mp.subcategory_id OR categories.id IN (SELECT parent_id FROM categories c_p WHERE c_p.id = mp.category_id))
        )
        OR EXISTS (
          SELECT 1 FROM master_services ms
          WHERE (ms.business_profile_id = $${bIdx} OR ms.id IN (SELECT bserv.master_service_id FROM business_services bserv WHERE bserv.business_id = $${bIdx}))
            AND (categories.id = ms.category_id OR categories.id = ms.subcategory_id OR categories.id IN (SELECT parent_id FROM categories c_s WHERE c_s.id = ms.category_id))
        )
        OR NOT EXISTS (
          SELECT 1 FROM business_profiles bp
          WHERE bp.id = $${bIdx} AND (bp.category_id IS NOT NULL OR array_length(bp.category_ids, 1) > 0)
        )
      )`);
    }

    if (type && type !== "all") {
      if (type === "course" || type === "courses") {
        conditions.push(`category_type IN ('academic', 'course', 'courses')`);
      } else if (type === "job" || type === "jobs") {
        conditions.push(`category_type IN ('job', 'jobs')`);
      } else {
        params.push(type);
        conditions.push(`category_type = $${params.length}`);
      }
    }

    const idParam = searchParams.get("id");
    const slugParam = searchParams.get("slug") || (!/^\d+$/.test(idParam || "") && idParam ? idParam : null);
    const id = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null;
    let exactSlugParam = "";
    if (id) {
      params.push(id);
      conditions.push(`id = $${params.length}`);
    } else if (slugParam) {
      const cleanSlug = slugParam.toLowerCase().trim();
      exactSlugParam = cleanSlug;
      const namePattern1 = `%${cleanSlug.replace(/-/g, " ")}%`;
      const namePattern2 = `%${cleanSlug.replace(/-/g, " ").replace(/\band\b/g, "&")}%`;
      const namePattern3 = `%${cleanSlug.replace(/-/g, " ").replace(/\band\b/g, "%")}%`;
      params.push(cleanSlug);
      params.push(`%${cleanSlug}%`);
      params.push(namePattern1);
      params.push(namePattern2);
      params.push(namePattern3);
      conditions.push(`(
        slug = $${params.length - 4}
        OR slug LIKE $${params.length - 3}
        OR name ILIKE $${params.length - 2}
        OR name ILIKE $${params.length - 1}
        OR name ILIKE $${params.length}
      )`);
    } else if (parentId !== null && !isNaN(parentId)) {
      params.push(parentId);
      conditions.push(`parent_id = $${params.length}`);
    } else if (onlyRoot) {
      conditions.push("parent_id IS NULL");
    }

    const orderClause = exactSlugParam
      ? `ORDER BY 
          CASE 
            WHEN slug = '${exactSlugParam.replace(/'/g, "''")}' THEN 0
            WHEN parent_id IS NULL AND slug LIKE '${exactSlugParam.replace(/'/g, "''")}%' THEN 1
            WHEN parent_id IS NULL AND LOWER(name) LIKE '${exactSlugParam.replace(/'/g, "''").replace(/-/g, " ")}%' THEN 2
            WHEN parent_id IS NULL THEN 3
            WHEN slug LIKE '${exactSlugParam.replace(/'/g, "''")}%' THEN 4
            ELSE 5
          END,
          CASE WHEN name ~ '^[0-9]' THEN 1 ELSE 0 END,
          name ASC`
      : `ORDER BY 
          CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END,
          CASE WHEN name ~ '^[0-9]' THEN 1 ELSE 0 END,
          name ASC`;

    const query = `
      SELECT id, name, slug, parent_id, category_type, business_category_id, business_subcategory_id, icon_url
      FROM categories
      WHERE ${conditions.join(" AND ")}
      ${orderClause}
      LIMIT $${params.length + 1}
    `;

    const res = await db.query(query, [...params, limit]);
    return NextResponse.json({
      success: true,
      data: res.rows,
      total: res.rows.length,
    });
  } catch (err: any) {
    console.error("[public categories GET] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
