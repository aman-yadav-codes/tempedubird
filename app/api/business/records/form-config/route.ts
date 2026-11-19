import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { resolveTenantContext } from "@/lib/records/tenant-context";

/**
 * GET /api/business/records/form-config?vertical=vehicles
 * Returns all master dropdowns, types, categories, and dynamic custom attributes
 * required to render the dynamic form for the given vertical.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const verticalCode = url.searchParams.get("vertical")?.trim().toLowerCase();

    if (!verticalCode) {
      return NextResponse.json({ error: "Vertical code is required (e.g. vehicles, properties)" }, { status: 400 });
    }

    const tenant = await resolveTenantContext(req);

    // 1. Fetch Vertical
    const verticalRes = await db.query(
      `SELECT * FROM master_verticals WHERE LOWER(code) = LOWER($1) AND is_active = TRUE LIMIT 1`,
      [verticalCode]
    );
    if (verticalRes.rows.length === 0) {
      return NextResponse.json({ error: `Vertical '${verticalCode}' not found` }, { status: 404 });
    }
    const vertical = verticalRes.rows[0];

    // 2. Fetch Master Types for this vertical
    const typesRes = await db.query(
      `SELECT mt.*,
              (SELECT COUNT(*)::int FROM master_records mr WHERE mr.master_type_id = mt.id AND mr.status = 'active') as active_records_count
       FROM master_types mt
       WHERE mt.vertical_id = $1 AND mt.is_active = TRUE
       ORDER BY mt.hierarchy_level ASC, mt.display_order ASC, mt.id ASC`,
      [vertical.id]
    );

    // 3. Fetch Master Records for all types in this vertical (for fast initial dropdown population)
    const recordsRes = await db.query(
      `SELECT mr.id, mr.master_type_id, mt.code as type_code, mr.parent_id, mr.name, mr.code, mr.slug, mr.icon, mr.display_order
       FROM master_records mr
       JOIN master_types mt ON mt.id = mr.master_type_id
       WHERE mr.vertical_id = $1 AND mr.status = 'active'
       ORDER BY mr.display_order ASC, mr.name ASC`,
      [vertical.id]
    );

    // Group records by type_code
    const masterOptions: Record<string, any[]> = {};
    for (const r of recordsRes.rows) {
      if (!masterOptions[r.type_code]) {
        masterOptions[r.type_code] = [];
      }
      masterOptions[r.type_code].push(r);
    }

    // 4. Fetch Dynamic Custom Attributes configured for this vertical
    const attrRes = await db.query(
      `SELECT a.*, mt.code as type_code
       FROM master_attributes a
       LEFT JOIN master_types mt ON mt.id = a.master_type_id
       WHERE a.vertical_id = $1 AND a.is_active = TRUE
       ORDER BY a.display_order ASC, a.id ASC`,
      [vertical.id]
    );

    // 5. If Restaurant vertical, fetch custom business menu categories
    let menuCategories: any[] = [];
    if (verticalCode === "restaurants" && tenant?.businessId) {
      const mcRes = await db.query(
        `SELECT id, name, slug, description, image_url, display_order, is_active
         FROM menu_categories
         WHERE (business_id = $1 OR institution_id = $2) AND is_active = TRUE
         ORDER BY display_order ASC, name ASC`,
        [tenant.businessId, tenant.institutionId || tenant.businessId]
      );
      menuCategories = mcRes.rows;
    }

    return NextResponse.json({
      success: true,
      vertical: {
        id: vertical.id,
        code: vertical.code,
        name: vertical.name,
        description: vertical.description,
        icon: vertical.icon,
      },
      types: typesRes.rows,
      masterOptions,
      attributes: attrRes.rows,
      menuCategories,
      tenant: tenant ? {
        businessId: tenant.businessId,
        institutionId: tenant.institutionId,
        businessName: tenant.businessName,
      } : null,
    });
  } catch (err: any) {
    console.error("[Form Config GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load form config" }, { status: 500 });
  }
}
