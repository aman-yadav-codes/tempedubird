import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    let user: any = null;
    try {
      user = await getAuthenticatedUser(req);
    } catch {
      user = null;
    }
    const url = new URL(req.url);

    const userRole = user?.role || user?.role_code || "";
    const userInstId = user?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const requestedInstId = url.searchParams.get("institution_id") || req.headers.get("x-institution-id");
    const parsedInstId = requestedInstId ? Number(requestedInstId) : null;
    const targetInstId = Number.isInteger(parsedInstId) && (parsedInstId as number) > 0 ? parsedInstId : (userRole === "institution_admin" ? userInstId : null);

    const isPlatformAdmin = isPlatformAdminUser(user);

    let query = `
      SELECT 
        ic.*,
        COUNT(i.id) as item_count
      FROM inventory_categories ic
      LEFT JOIN inventory_items i ON LOWER(TRIM(i.category)) = LOWER(TRIM(ic.name))
    `;
    const params: any[] = [];

    if (isPlatformAdmin && !targetInstId) {
      query += ` WHERE (ic.is_active = TRUE)`;
    } else if (targetInstId) {
      params.push(targetInstId);
      query += ` WHERE (ic.institution_id = $1 OR ic.institution_id IS NULL) AND ic.is_active = TRUE`;
    } else {
      query += ` WHERE (ic.institution_id IS NULL AND ic.is_active = TRUE)`;
    }

    query += ` GROUP BY ic.id ORDER BY ic.id ASC`;

    const res = await db.query(query, params);

    // Also get distinct categories from inventory_items table
    const extraItemsCatsRes = await db.query(`
      SELECT DISTINCT category 
      FROM inventory_items 
      WHERE category IS NOT NULL AND TRIM(category) <> ''
    `);

    const existingCatNames = new Set(res.rows.map((r: any) => r.name.toLowerCase().trim()));
    const dynamicCategories = [...res.rows];

    for (const row of extraItemsCatsRes.rows) {
      const catName = row.category?.trim();
      if (catName && !existingCatNames.has(catName.toLowerCase())) {
        dynamicCategories.push({
          id: `legacy_${encodeURIComponent(catName)}`,
          name: catName,
          slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: "Existing inventory category",
          institution_id: null,
          is_active: true,
          item_count: 1,
        });
        existingCatNames.add(catName.toLowerCase());
      }
    }

    return NextResponse.json({
      success: true,
      categories: dynamicCategories,
    });
  } catch (error: any) {
    console.error("[Inventory Categories GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch inventory categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const isAllowed = isPlatformAdminUser(user) || userRole === "institution_admin" || Boolean(userInstId);

    if (!isAllowed) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, institution_id } = body;

    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const isPlatformAdmin = isPlatformAdminUser(user);
    const effectiveInstId = isPlatformAdmin ? (institution_id ? Number(institution_id) : null) : (userInstId ? Number(userInstId) : null);

    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const safeDesc = description ? String(description).trim() : null;

    // Check if category name already exists
    const checkRes = await db.query(
      `SELECT * FROM inventory_categories 
       WHERE LOWER(TRIM(name)) = LOWER($1) 
       AND (institution_id = $2 OR (institution_id IS NULL AND $2 IS NULL))`,
      [trimmedName, effectiveInstId]
    );

    if (checkRes.rows.length > 0) {
      const existing = checkRes.rows[0];
      if (!existing.is_active) {
        const updateRes = await db.query(
          `UPDATE inventory_categories SET is_active = TRUE, description = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [safeDesc, existing.id]
        );
        return NextResponse.json({
          success: true,
          message: "Category reactivated successfully",
          category: updateRes.rows[0],
        });
      }
      return NextResponse.json(
        { error: "A category with this name already exists", category: existing },
        { status: 409 }
      );
    }

    const insertRes = await db.query(
      `INSERT INTO inventory_categories (name, slug, description, institution_id, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING *`,
      [trimmedName, slug, safeDesc, effectiveInstId]
    );

    return NextResponse.json({
      success: true,
      message: "Inventory category created successfully",
      category: insertRes.rows[0],
    });
  } catch (error: any) {
    console.error("[Inventory Categories POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create inventory category" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const isAllowed = isPlatformAdminUser(user) || (user as any)?.role === "institution_admin" || Boolean((user as any)?.institution_id);

    if (!isAllowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, description, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const trimmedName = name ? String(name).trim() : undefined;
    const slug = trimmedName ? trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : undefined;

    const res = await db.query(
      `UPDATE inventory_categories
       SET 
         name = COALESCE($1, name),
         slug = COALESCE($2, slug),
         description = COALESCE($3, description),
         is_active = COALESCE($4, is_active),
         updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [trimmedName, slug, description, is_active, id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Category updated successfully",
      category: res.rows[0],
    });
  } catch (error: any) {
    console.error("[Inventory Categories PUT] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const isAllowed = isPlatformAdminUser(user) || userRole === "institution_admin" || Boolean(userInstId);

    if (!isAllowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "Valid Category ID is required" }, { status: 400 });
    }

    const catId = Number(id);

    const catCheck = await db.query(`SELECT name FROM inventory_categories WHERE id = $1`, [catId]);
    if (catCheck.rows.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const catName = catCheck.rows[0].name;
    const usageCheck = await db.query(
      `SELECT COUNT(*) as count FROM inventory_items WHERE LOWER(TRIM(category)) = LOWER(TRIM($1))`,
      [catName]
    );
    const itemCount = parseInt(usageCheck.rows[0]?.count || "0");

    if (itemCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category "${catName}" because it is currently assigned to ${itemCount} inventory item(s). Please reassign those items first.` },
        { status: 400 }
      );
    }

    if (isPlatformAdminUser(user)) {
      await db.query(`DELETE FROM inventory_categories WHERE id = $1`, [catId]);
    } else {
      await db.query(
        `DELETE FROM inventory_categories WHERE id = $1 AND (institution_id = $2 OR institution_id IS NULL)`,
        [catId, userInstId]
      );
    }

    return NextResponse.json({
      success: true,
      message: "Inventory category deleted successfully",
    });
  } catch (error: any) {
    console.error("[Inventory Categories DELETE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete category" },
      { status: 500 }
    );
  }
}
