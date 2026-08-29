import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

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

    const whereClause = activeOnly ? "WHERE is_active = TRUE" : "";
    const query = `
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
      ${whereClause}
      ORDER BY pc.sort_order ASC, pc.id ASC
    `;

    const res = await db.query(query);

    return NextResponse.json({
      success: true,
      categories: res.rows,
    });
  } catch (error: any) {
    console.error("[Product Categories GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch product categories" }, { status: 500 });
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

    return NextResponse.json({
      success: true,
      category: insertRes.rows[0],
    });
  } catch (error: any) {
    console.error("[Product Categories POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create product category" }, { status: 500 });
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
    console.error("[Product Categories PATCH] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update product category" }, { status: 500 });
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
    console.error("[Product Categories DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete product category" }, { status: 500 });
  }
}
