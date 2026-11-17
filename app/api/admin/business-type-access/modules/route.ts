import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();

    let query = `
      SELECT 
        sm.id,
        sm.module_key,
        sm.module_name,
        sm.parent_module_id,
        parent.module_name as parent_module_name,
        sm.route,
        sm.icon,
        sm.display_order,
        sm.description,
        sm.status,
        sm.created_at,
        sm.updated_at,
        (
          SELECT COUNT(*)::int 
          FROM business_type_modules btm 
          JOIN institution_types it ON it.id = btm.business_type_id 
          WHERE btm.module_id = sm.id 
            AND btm.is_enabled = TRUE 
            AND COALESCE(it.is_deleted, FALSE) = FALSE
        ) as enabled_business_types_count,
        (
          SELECT COUNT(*)::int 
          FROM institution_types it 
          WHERE COALESCE(it.is_deleted, FALSE) = FALSE
        ) as total_business_types_count,
        (
          SELECT COUNT(*)::int 
          FROM system_modules child 
          WHERE child.parent_module_id = sm.id AND child.status = 'active'
        ) as children_count
      FROM system_modules sm
      LEFT JOIN system_modules parent ON parent.id = sm.parent_module_id
      WHERE sm.status = 'active'
    `;

    const params: any[] = [];
    if (search) {
      query += ` AND (LOWER(sm.module_name) LIKE $1 OR LOWER(sm.module_key) LIKE $1 OR LOWER(COALESCE(sm.route, '')) LIKE $1 OR LOWER(COALESCE(sm.description, '')) LIKE $1)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY sm.parent_module_id NULLS FIRST, sm.display_order ASC, sm.id ASC`;

    const result = await db.query(query, params);

    // Parent options for dropdown
    const parents = result.rows.filter((r: any) => !r.parent_module_id);

    return NextResponse.json({
      success: true,
      modules: result.rows,
      parentOptions: parents.map((p: any) => ({ id: p.id, name: p.module_name, key: p.module_key })),
      totalCount: result.rows.length,
    });
  } catch (err: unknown) {
    console.error("[GET /api/admin/business-type-access/modules] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load modules" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || !isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Platform Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      module_name,
      module_key,
      parent_module_id,
      route,
      icon,
      display_order,
      description,
      enable_for_all = true,
      selected_business_type_ids,
    } = body;

    if (!module_name?.trim()) {
      return NextResponse.json({ error: "Module name is required" }, { status: 400 });
    }

    // Auto generate module_key if not provided
    const cleanKey = (module_key || module_name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Insert module
      const insertRes = await client.query(
        `INSERT INTO system_modules (
           module_key, module_name, parent_module_id, route, icon, display_order, description, status, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
         ON CONFLICT (module_key) DO UPDATE
         SET module_name = EXCLUDED.module_name,
             parent_module_id = EXCLUDED.parent_module_id,
             route = EXCLUDED.route,
             icon = EXCLUDED.icon,
             display_order = EXCLUDED.display_order,
             description = EXCLUDED.description,
             status = 'active',
             updated_at = NOW()
         RETURNING id, module_name, module_key`,
        [
          cleanKey,
          module_name.trim(),
          parent_module_id ? Number(parent_module_id) : null,
          route?.trim() || `/admin/${cleanKey.replace(/_/g, "-")}`,
          icon?.trim() || "Layers",
          display_order ? Number(display_order) : 50,
          description?.trim() || `Manage ${module_name.trim()}`,
        ]
      );

      const moduleId = insertRes.rows[0].id;

      // Populate access for all business types
      const typesRes = await client.query(
        `SELECT id FROM institution_types WHERE COALESCE(is_deleted, false) = false`
      );

      const selectedSet = Array.isArray(selected_business_type_ids)
        ? new Set(selected_business_type_ids.map(Number))
        : null;

      for (const t of typesRes.rows) {
        let isEnabled = true;
        if (!enable_for_all && selectedSet) {
          isEnabled = selectedSet.has(t.id);
        }

        await client.query(
          `INSERT INTO business_type_modules (business_type_id, module_id, is_enabled, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT (business_type_id, module_id) 
           DO UPDATE SET is_enabled = $3, updated_at = NOW()`,
          [t.id, moduleId, isEnabled]
        );
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: `Module "${module_name}" created successfully.`,
        module: insertRes.rows[0],
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.error("[POST /api/admin/business-type-access/modules] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create module" },
      { status: 500 }
    );
  }
}

