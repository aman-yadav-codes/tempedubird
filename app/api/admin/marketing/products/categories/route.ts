import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { handleDatabaseApiError } from "@/lib/db/api-error";

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("active") === "true";
    const parentIdParam = url.searchParams.get("parentId");

    const conditions: string[] = ["category_type = 'product'", "COALESCE(is_deleted, false) = false"];
    const params: any[] = [];

    if (activeOnly) {
      conditions.push("is_active = TRUE");
    }

    if (parentIdParam !== null && parentIdParam !== undefined && parentIdParam !== "") {
      if (parentIdParam === "null" || parentIdParam === "root") {
        conditions.push("parent_id IS NULL");
      } else {
        params.push(Number(parentIdParam));
        conditions.push(`parent_id = $${params.length}`);
      }
    }

    const businessCategoryIdParam = url.searchParams.get("business_category_id") || url.searchParams.get("businessCategoryId");
    if (businessCategoryIdParam && businessCategoryIdParam !== "all" && /^\d+$/.test(businessCategoryIdParam)) {
      params.push(Number(businessCategoryIdParam));
      conditions.push(`c.business_category_id = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const query = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        COALESCE(c.icon_url, '') AS icon,
        c.is_active,
        c.parent_id,
        c.business_category_id,
        (
          SELECT COUNT(*)::int 
          FROM products p 
          WHERE p.category_id = c.id OR p.subcategory_id = c.id OR p.category = c.name
        ) AS products_count
      FROM categories c
      ${whereClause}
      ORDER BY c.parent_id NULLS FIRST, c.name ASC
    `;

    const res = await db.query(query, params);

    if (res.rows.length > 0) {
      return NextResponse.json({
        success: true,
        categories: res.rows,
      });
    }

    // Fallback to legacy product_categories if unified categories returned empty
    const legacyWhere = activeOnly ? "WHERE is_active = TRUE" : "";
    const legacyQuery = `
      SELECT 
        pc.id,
        pc.name,
        pc.slug,
        pc.description,
        pc.icon,
        pc.is_active,
        pc.sort_order,
        pc.created_at,
        (
          SELECT COUNT(*)::int 
          FROM products p 
          WHERE p.category_id = pc.id OR p.category = pc.name
        ) AS products_count
      FROM product_categories pc
      ${legacyWhere}
      ORDER BY pc.sort_order ASC, pc.id ASC
    `;

    const legacyRes = await db.query(legacyQuery);

    return NextResponse.json({
      success: true,
      categories: legacyRes.rows,
    });
  } catch (error: any) {
    console.warn("[Product Categories GET] Error:", error?.message || error);
    return handleDatabaseApiError(error, "Failed to fetch product categories");
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const slug = slugify(body.slug || name);
    const description = body.description ? String(body.description).trim() : null;
    const icon = body.icon ? String(body.icon).trim() : "Package";
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : true;
    const sortOrder = Number(body.sort_order || 0);

    const checkRes = await db.query(`SELECT id FROM product_categories WHERE name = $1 OR slug = $2`, [name, slug]);
    if (checkRes.rows.length > 0) {
      return NextResponse.json({ error: "A category with this name or slug already exists" }, { status: 400 });
    }

    const insertRes = await db.query(
      `
      INSERT INTO product_categories (name, slug, description, icon, is_active, sort_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
      `,
      [name, slug, description, icon, isActive, sortOrder]
    );

    // Also sync into unified categories table
    const catCheck = await db.query(
      `SELECT id FROM categories WHERE (name = $1 OR slug = $2) AND category_type = 'product' AND COALESCE(is_deleted, false) = false`,
      [name, slug]
    );
    if (catCheck.rows.length === 0) {
      await db.query(
        `INSERT INTO categories (name, slug, category_type, is_active, description, icon_url, created_at, updated_at)
         VALUES ($1, $2, 'product', $3, $4, $5, NOW(), NOW())`,
        [name, slug, isActive, description, icon]
      );
    }

    return NextResponse.json({
      success: true,
      category: insertRes.rows[0],
    });
  } catch (error: any) {
    console.warn("[Product Categories POST] Error:", error?.message || error);
    return handleDatabaseApiError(error, "Failed to create product category");
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const name = String(body.name || "").trim();
    const description = body.description !== undefined ? String(body.description).trim() : null;
    const icon = body.icon ? String(body.icon).trim() : "Package";
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : true;

    const updateRes = await db.query(
      `
      UPDATE product_categories 
      SET name = COALESCE(NULLIF($1, ''), name),
          description = $2,
          icon = $3,
          is_active = $4,
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
      `,
      [name, description, icon, isActive, id]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      category: updateRes.rows[0],
    });
  } catch (error: any) {
    console.warn("[Product Categories PATCH] Error:", error?.message || error);
    return handleDatabaseApiError(error, "Failed to update product category");
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM product_categories WHERE id = $1`, [id]);

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error: any) {
    console.warn("[Product Categories DELETE] Error:", error?.message || error);
    return handleDatabaseApiError(error, "Failed to delete product category");
  }
}
