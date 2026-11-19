import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { requireAdmin } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentIdParam = searchParams.get("parent_id");
    const parentId = parentIdParam && /^\d+$/.test(parentIdParam) ? Number(parentIdParam) : null;
    const search = searchParams.get("search")?.trim() || "";

    // 1. Overall Summary Stats for Locations
    const summaryRes = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE COALESCE(is_seo_active, TRUE) = TRUE AND is_deleted = FALSE) AS active_count,
        COUNT(*) FILTER (WHERE COALESCE(is_seo_active, TRUE) = FALSE AND is_deleted = FALSE) AS inactive_count,
        COUNT(*) FILTER (WHERE is_deleted = FALSE) AS total_count
      FROM locations
    `);

    const summary = {
      seoActive: Number(summaryRes.rows[0]?.active_count || 0),
      inactive: Number(summaryRes.rows[0]?.inactive_count || 0),
      total: Number(summaryRes.rows[0]?.total_count || 0),
    };

    // 2. Build Breadcrumbs Hierarchy
    const breadcrumbs: Array<{ id: number | null; name: string; type: string; slug?: string }> = [
      { id: null, name: "All locations", type: "root" },
    ];

    let currentParent: any = null;

    if (parentId !== null) {
      // Trace parent and ancestors using recursive CTE
      const ancestorRes = await db.query(
        `
        WITH RECURSIVE ancestors AS (
          SELECT id, name, slug, type, parent_id, 1 as depth
          FROM locations
          WHERE id = $1 AND is_deleted = FALSE
          UNION ALL
          SELECT p.id, p.name, p.slug, p.type, p.parent_id, a.depth + 1
          FROM locations p
          JOIN ancestors a ON a.parent_id = p.id
          WHERE p.is_deleted = FALSE
        )
        SELECT * FROM ancestors ORDER BY depth DESC;
      `,
        [parentId]
      );

      for (const row of ancestorRes.rows) {
        breadcrumbs.push({
          id: row.id,
          name: row.name,
          type: row.type,
          slug: row.slug,
        });
      }

      if (ancestorRes.rows.length > 0) {
        currentParent = ancestorRes.rows[ancestorRes.rows.length - 1];
      }
    }

    // 3. Query Locations at Current Level
    const conditions: string[] = ["l.is_deleted = FALSE"];
    const params: any[] = [];

    if (parentId !== null) {
      params.push(parentId);
      conditions.push(`l.parent_id = $${params.length}`);
    } else {
      // At root level, show countries (or records with parent_id IS NULL)
      conditions.push(`(l.parent_id IS NULL OR l.type = 'country')`);
    }

    if (search) {
      params.push(`%${search}%`);
      const sIdx = params.length;
      conditions.push(`(l.name ILIKE $${sIdx} OR l.slug ILIKE $${sIdx})`);
    }

    const locationsQuery = `
      SELECT 
        l.id,
        l.name,
        l.slug,
        l.type,
        l.parent_id,
        COALESCE(l.is_active, TRUE) AS is_active,
        COALESCE(l.is_seo_active, TRUE) AS is_seo_active,
        (
          SELECT COUNT(*)::INT 
          FROM locations child 
          WHERE child.parent_id = l.id AND child.is_deleted = FALSE
        ) AS children_count
      FROM locations l
      WHERE ${conditions.join(" AND ")}
      ORDER BY 
        CASE 
          WHEN l.type = 'country' THEN 1 
          WHEN l.type = 'state' THEN 2 
          WHEN l.type = 'city' THEN 3 
          ELSE 4 
        END,
        l.name ASC
    `;

    const locRes = await db.query(locationsQuery, params);

    return NextResponse.json({
      success: true,
      summary,
      breadcrumbs,
      currentParent,
      locations: locRes.rows,
      totalCount: locRes.rows.length,
    });
  } catch (err: any) {
    console.error("[SEO Locations GET] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { id, is_seo_active, cascade } = body;

    if (!id || typeof is_seo_active !== "boolean") {
      return NextResponse.json(
        { error: "id and is_seo_active (boolean) are required." },
        { status: 400 }
      );
    }

    const numId = Number(id);

    // Update location
    const updateRes = await db.query(
      `
      UPDATE locations
      SET 
        is_seo_active = $1,
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, slug, type, parent_id, is_active, is_seo_active
    `,
      [is_seo_active, numId]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: "Location not found." }, { status: 404 });
    }

    const updated = updateRes.rows[0];

    // Cascade to children if requested
    let childrenUpdated = 0;
    if (cascade) {
      const cascadeRes = await db.query(
        `
        UPDATE locations
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

    // Refresh summary
    const summaryRes = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE COALESCE(is_seo_active, TRUE) = TRUE AND is_deleted = FALSE) AS active_count,
        COUNT(*) FILTER (WHERE COALESCE(is_seo_active, TRUE) = FALSE AND is_deleted = FALSE) AS inactive_count,
        COUNT(*) FILTER (WHERE is_deleted = FALSE) AS total_count
      FROM locations
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

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { name, type, parent_id } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanType = (type || "city").toLowerCase();
    const slug = toSlug(cleanName);
    const parentId = parent_id ? Number(parent_id) : null;

    // Check existing
    const existing = await db.query(
      `
      SELECT id, name, slug, type FROM locations 
      WHERE slug = $1 AND COALESCE(parent_id, 0) = COALESCE($2, 0) AND is_deleted = FALSE
    `,
      [slug, parentId]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "A location with this name and parent already exists." },
        { status: 409 }
      );
    }

    const insertRes = await db.query(
      `
      INSERT INTO locations (name, slug, type, parent_id, is_active, is_seo_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, TRUE, TRUE, NOW(), NOW())
      RETURNING id, name, slug, type, parent_id, is_active, is_seo_active
    `,
      [cleanName, slug, cleanType, parentId]
    );

    return NextResponse.json({
      success: true,
      data: insertRes.rows[0],
    });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
