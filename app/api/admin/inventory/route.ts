import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

async function ensureInventoryExtraColumns() {
  try {
    await db.query(`
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS bill_url TEXT;
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS assigned_to_user_id INT;
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(255);
    `);
  } catch {
    // ignore
  }
}

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    await ensureInventoryExtraColumns();

    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const category = url.searchParams.get("category")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";
    const condition = url.searchParams.get("condition")?.trim() || "";

    const isPlatformAdmin = isPlatformAdminUser(user);
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const requestedInstId = url.searchParams.get("institution_id") || req.headers.get("x-institution-id");
    const parsedInstId = requestedInstId ? Number(requestedInstId) : null;

    let targetInstId: number | null = null;
    if (isPlatformAdmin) {
      targetInstId = Number.isInteger(parsedInstId) && (parsedInstId as number) > 0 ? parsedInstId : null;
    } else {
      targetInstId = userInstId;
    }

    let query = `
      SELECT 
        i.*,
        v.name as supplier_vendor_name,
        v.phone as supplier_phone
      FROM inventory_items i
      LEFT JOIN vendors v ON v.id = i.supplier_vendor_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (isPlatformAdmin) {
      if (targetInstId) {
        params.push(targetInstId);
        query += ` AND i.institution_id = $${params.length}`;
      } else {
        query += ` AND i.institution_id IS NULL`;
      }
    } else {
      if (targetInstId) {
        params.push(targetInstId);
        query += ` AND i.institution_id = $${params.length}`;
      } else {
        query += ` AND 1=0`;
      }
    }

    if (category && category !== "all") {
      params.push(category);
      query += ` AND i.category = $${params.length}`;
    }

    if (status && status !== "all") {
      params.push(status);
      query += ` AND i.status = $${params.length}`;
    }

    if (condition && condition !== "all") {
      params.push(condition);
      query += ` AND i.condition = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (i.name ILIKE $${params.length} OR i.sku ILIKE $${params.length} OR i.supplier_name ILIKE $${params.length} OR i.location ILIKE $${params.length} OR i.assigned_to_name ILIKE $${params.length} OR i.description ILIKE $${params.length})`;
    }

    query += ` ORDER BY i.id DESC`;

    const res = await db.query(query, params);
    const items = res.rows;

    // Fetch vendors list for supplier dropdown
    let vendorsRes;
    if (isPlatformAdmin) {
      if (targetInstId) {
        vendorsRes = await db.query(
          `SELECT id, name, category, phone, email 
           FROM vendors 
           WHERE status = 'active' AND institution_id = $1
           ORDER BY name ASC`,
          [targetInstId]
        );
      } else {
        vendorsRes = await db.query(
          `SELECT id, name, category, phone, email 
           FROM vendors 
           WHERE status = 'active' AND institution_id IS NULL
           ORDER BY name ASC`
        );
      }
    } else {
      vendorsRes = await db.query(
        `SELECT id, name, category, phone, email 
         FROM vendors 
         WHERE status = 'active' AND institution_id = $1
         ORDER BY name ASC`,
        [targetInstId]
      );
    }

    // Fetch staff / employees list for assigned-to dropdown
    let staffRes;
    try {
      staffRes = await db.query(
        `
          WITH unique_staff AS (
            SELECT DISTINCT ON (u.id)
              u.id,
              COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS name,
              u.email,
              u.phone,
              COALESCE(d.name, r.name, r.code, 'Staff Member') AS role,
              COALESCE(r.code, 'staff') AS role_code
            FROM users u
            LEFT JOIN institution_memberships im 
              ON im.user_id = u.id 
              AND im.is_active = TRUE 
              AND COALESCE(im.is_deleted, FALSE) = FALSE
            LEFT JOIN user_profiles up 
              ON up.user_id = u.id
            LEFT JOIN designations d 
              ON d.id = up.designation_id
            LEFT JOIN roles r 
              ON r.id = im.role_id
            WHERE COALESCE(u.is_deleted, FALSE) = FALSE
              AND ($1::int IS NULL OR im.institution_id = $1::int OR up.under_institution_id = $1::int)
              AND (r.code IS NULL OR r.code NOT IN ('student', 'parent', 'guardian'))
            ORDER BY u.id, im.updated_at DESC NULLS LAST
          )
          SELECT * FROM unique_staff ORDER BY name ASC;
        `,
        [targetInstId]
      );
    } catch {
      staffRes = { rows: [] };
    }

    // Calculate Summary Stats
    const totalItems = items.length;
    const totalQuantity = items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
    const totalValue = items.reduce((acc: number, item: any) => acc + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0);
    const lowStockCount = items.filter((item: any) => Number(item.quantity) <= Number(item.min_quantity) && Number(item.quantity) > 0).length;
    const outOfStockCount = items.filter((item: any) => Number(item.quantity) <= 0 || item.status === "out_of_stock").length;

    // Fetch inventory categories
    let catQuery = `SELECT * FROM inventory_categories WHERE is_active = TRUE`;
    const catParams: any[] = [];
    if (!isPlatformAdmin && targetInstId) {
      catQuery += ` AND (institution_id = $1 OR institution_id IS NULL)`;
      catParams.push(targetInstId);
    } else if (!isPlatformAdmin) {
      catQuery += ` AND institution_id IS NULL`;
    }
    catQuery += ` ORDER BY id ASC`;
    let categoriesRes;
    try {
      categoriesRes = await db.query(catQuery, catParams);
    } catch {
      categoriesRes = { rows: [] };
    }

    return NextResponse.json({
      items,
      suppliers: vendorsRes.rows,
      employees: staffRes.rows,
      categories: categoriesRes.rows,
      scope: {
        isPlatformAdmin,
        targetInstitutionId: targetInstId,
      },
      stats: {
        totalItems,
        totalQuantity,
        totalValue,
        lowStockCount,
        outOfStockCount,
      },
    });
  } catch (error: any) {
    console.error("[Inventory GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch inventory items" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    await ensureInventoryExtraColumns();

    const user = await getAuthenticatedUser(req);
    const isPlatformAdmin = isPlatformAdminUser(user);
    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const isAllowed = isPlatformAdmin || userRole === "institution_admin" || Boolean(userInstId);

    if (!isAllowed) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      sku,
      category = "General",
      quantity = 0,
      min_quantity = 5,
      unit = "units",
      unit_price = 0,
      supplier_vendor_id,
      supplier_name,
      location,
      condition = "new",
      status = "in_stock",
      description,
      bill_url,
      assigned_to_user_id,
      assigned_to_name,
      institution_id,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    const targetInstitutionId = isPlatformAdmin
      ? (institution_id ? Number(institution_id) : null)
      : userInstId;

    const numQty = parseInt(String(quantity), 10) || 0;
    const numMinQty = parseInt(String(min_quantity), 10) || 5;
    
    // Auto status determination
    let determinedStatus = status;
    if (numQty <= 0) determinedStatus = "out_of_stock";
    else if (numQty <= numMinQty) determinedStatus = "low_stock";

    const res = await db.query(
      `
      INSERT INTO inventory_items (
        name,
        sku,
        category,
        quantity,
        min_quantity,
        unit,
        unit_price,
        supplier_vendor_id,
        supplier_name,
        location,
        condition,
        status,
        description,
        bill_url,
        assigned_to_user_id,
        assigned_to_name,
        institution_id,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      RETURNING *
      `,
      [
        name.trim(),
        sku?.trim() || null,
        category || "General",
        numQty,
        numMinQty,
        unit || "units",
        parseFloat(String(unit_price)) || 0,
        supplier_vendor_id ? Number(supplier_vendor_id) : null,
        supplier_name?.trim() || null,
        location?.trim() || null,
        condition || "new",
        determinedStatus,
        description?.trim() || null,
        bill_url?.trim() || null,
        assigned_to_user_id ? Number(assigned_to_user_id) : null,
        assigned_to_name?.trim() || null,
        targetInstitutionId,
      ]
    );

    return NextResponse.json({ item: res.rows[0], message: "Inventory item added successfully" }, { status: 201 });
  } catch (error: any) {
    console.error("[Inventory POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to add inventory item" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    await ensureInventoryExtraColumns();

    const user = await getAuthenticatedUser(req);
    const isPlatformAdmin = isPlatformAdminUser(user);
    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const isAllowed = isPlatformAdmin || userRole === "institution_admin" || Boolean(userInstId);

    if (!isAllowed) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      name,
      sku,
      category,
      quantity,
      min_quantity,
      unit,
      unit_price,
      supplier_vendor_id,
      supplier_name,
      location,
      condition,
      status,
      description,
      bill_url,
      assigned_to_user_id,
      assigned_to_name,
      institution_id,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const numQty = quantity !== undefined ? parseInt(String(quantity), 10) : undefined;
    const numMinQty = min_quantity !== undefined ? parseInt(String(min_quantity), 10) : undefined;

    let determinedStatus = status;
    if (numQty !== undefined && numMinQty !== undefined) {
      if (numQty <= 0) determinedStatus = "out_of_stock";
      else if (numQty <= numMinQty) determinedStatus = "low_stock";
      else if (status === "out_of_stock" || status === "low_stock") determinedStatus = "in_stock";
    }

    let query = `
      UPDATE inventory_items
      SET name = COALESCE($1, name),
          sku = COALESCE($2, sku),
          category = COALESCE($3, category),
          quantity = COALESCE($4, quantity),
          min_quantity = COALESCE($5, min_quantity),
          unit = COALESCE($6, unit),
          unit_price = COALESCE($7, unit_price),
          supplier_vendor_id = COALESCE($8, supplier_vendor_id),
          supplier_name = COALESCE($9, supplier_name),
          location = COALESCE($10, location),
          condition = COALESCE($11, condition),
          status = COALESCE($12, status),
          description = COALESCE($13, description),
          bill_url = COALESCE($14, bill_url),
          assigned_to_user_id = COALESCE($15, assigned_to_user_id),
          assigned_to_name = COALESCE($16, assigned_to_name),
          institution_id = COALESCE($17, institution_id),
          updated_at = NOW()
      WHERE id = $18
    `;

    const params: any[] = [
      name ?? null,
      sku ?? null,
      category ?? null,
      numQty,
      numMinQty,
      unit ?? null,
      unit_price !== undefined ? parseFloat(String(unit_price)) : undefined,
      supplier_vendor_id !== undefined ? (supplier_vendor_id ? Number(supplier_vendor_id) : null) : undefined,
      supplier_name ?? null,
      location ?? null,
      condition ?? null,
      determinedStatus ?? null,
      description ?? null,
      bill_url !== undefined ? bill_url : null,
      assigned_to_user_id !== undefined ? (assigned_to_user_id ? Number(assigned_to_user_id) : null) : undefined,
      assigned_to_name !== undefined ? assigned_to_name : null,
      isPlatformAdmin ? (institution_id ? Number(institution_id) : undefined) : userInstId,
      id,
    ];

    if (!isPlatformAdmin) {
      params.push(userInstId);
      query += ` AND institution_id = $${params.length}`;
    }

    query += ` RETURNING *`;

    const res = await db.query(query, params);

    if (!res.rows.length) {
      return NextResponse.json({ error: "Inventory item not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ item: res.rows[0], message: "Inventory item updated successfully" });
  } catch (error: any) {
    console.error("[Inventory PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update inventory item" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    await ensureInventoryExtraColumns();

    const user = await getAuthenticatedUser(req);
    const isPlatformAdmin = isPlatformAdminUser(user);
    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const isAllowed = isPlatformAdmin || userRole === "institution_admin" || Boolean(userInstId);

    if (!isAllowed) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    if (isPlatformAdmin) {
      await db.query(`DELETE FROM inventory_items WHERE id = $1`, [id]);
    } else {
      await db.query(`DELETE FROM inventory_items WHERE id = $1 AND institution_id = $2`, [id, userInstId]);
    }

    return NextResponse.json({ message: "Inventory item deleted successfully" });
  } catch (error: any) {
    console.error("[Inventory DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete inventory item" }, { status: 500 });
  }
}
