import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const typeId = Number(id);

    const typeRes = await db.query(
      `SELECT id, name, slug, is_active, created_at, updated_at
       FROM institution_types 
       WHERE id = $1 AND COALESCE(is_deleted, false) = false`,
      [typeId]
    );

    if (typeRes.rows.length === 0) {
      return NextResponse.json({ error: "Business type not found" }, { status: 404 });
    }

    // Get all system modules joined with their enabled status for this business type
    const modulesRes = await db.query(
      `SELECT 
         sm.id,
         sm.module_key,
         sm.module_name,
         sm.parent_module_id,
         sm.route,
         sm.icon,
         sm.display_order,
         sm.description,
         COALESCE(btm.is_enabled, TRUE) as is_enabled
       FROM system_modules sm
       LEFT JOIN business_type_modules btm 
         ON btm.module_id = sm.id AND btm.business_type_id = $1
       WHERE sm.status = 'active'
       ORDER BY sm.parent_module_id NULLS FIRST, sm.display_order ASC`,
      [typeId]
    );

    // Structure into parent-child hierarchy
    const allRows = modulesRes.rows;
    const parents = allRows.filter((m: any) => !m.parent_module_id);
    const childrenMap: Record<number, any[]> = {};

    for (const row of allRows) {
      if (row.parent_module_id) {
        if (!childrenMap[row.parent_module_id]) {
          childrenMap[row.parent_module_id] = [];
        }
        childrenMap[row.parent_module_id].push(row);
      }
    }

    const structuredModules = parents.map((p: any) => ({
      ...p,
      children: childrenMap[p.id] || [],
    }));

    const enabledCount = allRows.filter((r: any) => r.is_enabled).length;
    const totalCount = allRows.length;

    return NextResponse.json({
      success: true,
      businessType: typeRes.rows[0],
      modules: structuredModules,
      flatModules: allRows,
      stats: {
        total: totalCount,
        enabled: enabledCount,
        disabled: totalCount - enabledCount,
      },
    });
  } catch (err: unknown) {
    console.error("[GET /api/admin/business-type-access/[id]] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load module configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || !isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Platform Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const typeId = Number(id);

    const body = await req.json();
    const { enabledModuleIds } = body;

    if (!Array.isArray(enabledModuleIds)) {
      return NextResponse.json({ error: "enabledModuleIds must be an array of module IDs" }, { status: 400 });
    }

    const enabledSet = new Set(enabledModuleIds.map(Number));

    // Fetch all active system modules
    const allModulesRes = await db.query(`SELECT id, parent_module_id FROM system_modules WHERE status = 'active'`);
    const allModules = allModulesRes.rows;

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      for (const mod of allModules) {
        const isEnabled = enabledSet.has(mod.id);

        await client.query(
          `INSERT INTO business_type_modules (business_type_id, module_id, is_enabled, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (business_type_id, module_id) 
           DO UPDATE SET is_enabled = $3, updated_at = NOW()`,
          [typeId, mod.id, isEnabled]
        );
      }

      await client.query(
        `UPDATE institution_types SET updated_at = NOW() WHERE id = $1`,
        [typeId]
      );

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      message: "Module access configuration updated successfully.",
    });
  } catch (err: unknown) {
    console.error("[PUT /api/admin/business-type-access/[id]] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update module configuration" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || !isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Platform Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const typeId = Number(id);

    await db.query(
      `UPDATE institution_types SET is_deleted = true, is_active = false, updated_at = NOW() WHERE id = $1`,
      [typeId]
    );

    return NextResponse.json({
      success: true,
      message: "Business type deleted successfully.",
    });
  } catch (err: unknown) {
    console.error("[DELETE /api/admin/business-type-access/[id]] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete business type" },
      { status: 500 }
    );
  }
}

