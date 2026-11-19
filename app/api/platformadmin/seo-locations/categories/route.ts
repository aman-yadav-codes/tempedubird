import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { requireAdmin } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessCategoryId = searchParams.get("business_category_id");
    const businessCategorySlug = searchParams.get("business_category_slug");
    const vertical = searchParams.get("vertical") || "course";
    const search = searchParams.get("search")?.trim() || "";

    // Normalize vertical
    let verticalFilter = vertical.toLowerCase();
    if (verticalFilter === "courses") verticalFilter = "course";
    if (verticalFilter === "products") verticalFilter = "product";
    if (verticalFilter === "services") verticalFilter = "service";
    if (verticalFilter === "vehicles") verticalFilter = "vehicle";
    if (verticalFilter === "properties") verticalFilter = "property";
    if (verticalFilter === "events") verticalFilter = "event";
    if (verticalFilter === "dishes") verticalFilter = "dish";
    if (verticalFilter === "rooms") verticalFilter = "room";
    if (verticalFilter === "jobs") verticalFilter = "job";

    // 1. Overall Summary Stats for Categories
    const summaryRes = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE COALESCE(is_seo_active, TRUE) = TRUE AND is_deleted = FALSE) AS active_count,
        COUNT(*) FILTER (WHERE COALESCE(is_seo_active, TRUE) = FALSE AND is_deleted = FALSE) AS inactive_count,
        COUNT(*) FILTER (WHERE is_deleted = FALSE) AS total_count
      FROM categories
    `);

    const summary = {
      seoActive: Number(summaryRes.rows[0]?.active_count || 0),
      inactive: Number(summaryRes.rows[0]?.inactive_count || 0),
      total: Number(summaryRes.rows[0]?.total_count || 0),
    };

    // 2. Fetch Business Categories for the selector dropdown
    const bizCategoriesRes = await db.query(`
      SELECT id, name, slug, icon_url
      FROM categories
      WHERE category_type = 'business'
        AND parent_id IS NULL
        AND is_deleted = FALSE
      ORDER BY name ASC
    `);

    // 3. Query root categories for the chosen vertical
    const conditions: string[] = [
      "c.is_deleted = FALSE",
      "c.parent_id IS NULL",
    ];
    const params: any[] = [];

    // Vertical condition
    if (verticalFilter === "course") {
      conditions.push(`c.category_type IN ('academic', 'course', 'courses')`);
    } else if (verticalFilter && verticalFilter !== "all") {
      params.push(verticalFilter);
      conditions.push(`c.category_type = $${params.length}`);
    }

    // Business category filter if specified
    if (businessCategoryId && /^\d+$/.test(businessCategoryId)) {
      params.push(Number(businessCategoryId));
      conditions.push(`(
        c.business_category_id = $${params.length} 
        OR c.id = $${params.length}
        OR EXISTS (
          SELECT 1 FROM categories sub 
          WHERE sub.parent_id = c.id 
            AND (sub.business_category_id = $${params.length} OR sub.business_subcategory_id = $${params.length})
        )
      )`);
    }

    // Search query
    if (search) {
      params.push(`%${search}%`);
      const sIdx = params.length;
      conditions.push(`(
        c.name ILIKE $${sIdx} 
        OR c.slug ILIKE $${sIdx}
        OR EXISTS (
          SELECT 1 FROM categories sub 
          WHERE sub.parent_id = c.id AND (sub.name ILIKE $${sIdx} OR sub.slug ILIKE $${sIdx})
        )
      )`);
    }

    const categoriesQuery = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.category_type,
        c.business_category_id,
        c.icon_url,
        COALESCE(c.is_active, TRUE) AS is_active,
        COALESCE(c.is_seo_active, TRUE) AS is_seo_active
      FROM categories c
      WHERE ${conditions.join(" AND ")}
      ORDER BY 
        CASE WHEN c.name ~ '^[0-9]' THEN 1 ELSE 0 END,
        c.name ASC
      LIMIT 150
    `;

    const catRes = await db.query(categoriesQuery, params);
    const rootCategories = catRes.rows;

    // 4. Fetch Subcategories for these root categories
    if (rootCategories.length > 0) {
      const rootIds = rootCategories.map((r: any) => r.id);
      const subRes = await db.query(
        `
        SELECT 
          id,
          name,
          slug,
          parent_id,
          category_type,
          business_category_id,
          business_subcategory_id,
          COALESCE(is_active, TRUE) AS is_active,
          COALESCE(is_seo_active, TRUE) AS is_seo_active
        FROM categories
        WHERE parent_id = ANY($1)
          AND is_deleted = FALSE
        ORDER BY name ASC
      `,
        [rootIds]
      );

      const subcategoriesByParent = new Map<number, any[]>();
      for (const sub of subRes.rows) {
        const pId = sub.parent_id;
        if (!subcategoriesByParent.has(pId)) {
          subcategoriesByParent.set(pId, []);
        }
        subcategoriesByParent.get(pId)!.push(sub);
      }

      // Attach subcategories and counters
      for (const cat of rootCategories) {
        const subs = subcategoriesByParent.get(cat.id) || [];
        cat.subcategories = subs;
        cat.subcategoriesCount = subs.length;
        cat.activeSubcategoriesCount = subs.filter(
          (s: any) => s.is_seo_active !== false
        ).length;
      }
    }

    return NextResponse.json({
      success: true,
      summary,
      businessCategories: bizCategoriesRes.rows,
      categories: rootCategories,
      totalRootCategories: rootCategories.length,
    });
  } catch (err: any) {
    console.error("[SEO Categories GET] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();
    const { id, is_seo_active, cascade } = body;

    if (!id || typeof is_seo_active !== "boolean") {
      return NextResponse.json(
        { error: "id and is_seo_active (boolean) are required." },
        { status: 400 }
      );
    }

    const numId = Number(id);

    // Update the target category
    const updateRes = await db.query(
      `
      UPDATE categories
      SET 
        is_seo_active = $1,
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, slug, parent_id, is_active, is_seo_active
    `,
      [is_seo_active, numId]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    const updated = updateRes.rows[0];

    // Cascade to children if requested
    let childrenUpdated = 0;
    if (cascade && !updated.parent_id) {
      const cascadeRes = await db.query(
        `
        UPDATE categories
        SET 
          is_seo_active = $1,
          is_active = $1,
          updated_at = NOW()
        WHERE parent_id = $2
        RETURNING id
      `,
        [is_seo_active, numId]
      );
      childrenUpdated = cascadeRes.rowCount || 0;
    }

    // Refresh summary stats
    const summaryRes = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE COALESCE(is_seo_active, TRUE) = TRUE AND is_deleted = FALSE) AS active_count,
        COUNT(*) FILTER (WHERE COALESCE(is_seo_active, TRUE) = FALSE AND is_deleted = FALSE) AS inactive_count,
        COUNT(*) FILTER (WHERE is_deleted = FALSE) AS total_count
      FROM categories
    `);

    const summary = {
      seoActive: Number(summaryRes.rows[0]?.active_count || 0),
      inactive: Number(summaryRes.rows[0]?.inactive_count || 0),
      total: Number(summaryRes.rows[0]?.total_count || 0),
    };

    return NextResponse.json({
      success: true,
      data: updated,
      childrenUpdated,
      summary,
    });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
