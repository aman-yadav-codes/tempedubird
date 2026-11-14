import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
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

    const whereClause = activeOnly ? "WHERE sc.is_active = TRUE" : "";
    const query = `
      SELECT 
        sc.id,
        sc.name,
        sc.slug,
        sc.description,
        sc.icon,
        sc.is_active,
        sc.sort_order,
        sc.created_at,
        (
          SELECT COUNT(*)::int 
          FROM services s 
          WHERE s.category_id = sc.id OR s.category = sc.name
        ) AS services_count
      FROM service_categories sc
      ${whereClause}
      ORDER BY sc.sort_order ASC, sc.id ASC
    `;

    const res = await db.query(query);

    return NextResponse.json({
      success: true,
      categories: res.rows,
    });
  } catch (error: any) {
    console.error("[Service Categories GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch service categories" }, { status: 500 });
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
    const icon = body.icon ? String(body.icon).trim() : "Briefcase";
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : true;
    const sortOrder = Number(body.sort_order || 0);

    const checkRes = await db.query(`SELECT id FROM service_categories WHERE name = $1 OR slug = $2`, [name, slug]);
    if (checkRes.rows.length > 0) {
      return NextResponse.json({ error: "A category with this name or slug already exists" }, { status: 400 });
    }

    const insertRes = await db.query(
      `
      INSERT INTO service_categories (name, slug, description, icon, is_active, sort_order, created_at, updated_at)
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
    console.error("[Service Categories POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create service category" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
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
    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const slug = slugify(body.slug || name);
    const description = body.description ? String(body.description).trim() : null;
    const icon = body.icon ? String(body.icon).trim() : "Briefcase";
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : true;
    const sortOrder = Number(body.sort_order || 0);

    const updateRes = await db.query(
      `
      UPDATE service_categories
      SET name = $1, slug = $2, description = $3, icon = $4, is_active = $5, sort_order = $6, updated_at = NOW()
      WHERE id = $7
      RETURNING *
      `,
      [name, slug, description, icon, isActive, sortOrder, id]
    );

    return NextResponse.json({
      success: true,
      category: updateRes.rows[0],
    });
  } catch (error: any) {
    console.error("[Service Categories PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update service category" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM service_categories WHERE id = $1`, [Number(id)]);
    return NextResponse.json({ success: true, message: "Category deleted" });
  } catch (error: any) {
    console.error("[Service Categories DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete service category" }, { status: 500 });
  }
}

