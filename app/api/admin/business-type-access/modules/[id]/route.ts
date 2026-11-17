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
    const moduleId = Number(id);

    const res = await db.query(
      `SELECT sm.*, parent.module_name as parent_module_name
       FROM system_modules sm
       LEFT JOIN system_modules parent ON parent.id = sm.parent_module_id
       WHERE sm.id = $1`,
      [moduleId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      module: res.rows[0],
    });
  } catch (err: unknown) {
    console.error("[GET /api/admin/business-type-access/modules/[id]] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load module" },
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
    const moduleId = Number(id);

    const body = await req.json();
    const { module_name, parent_module_id, route, icon, display_order, description } = body;

    if (!module_name?.trim()) {
      return NextResponse.json({ error: "Module name is required" }, { status: 400 });
    }

    const res = await db.query(
      `UPDATE system_modules
       SET module_name = $1,
           parent_module_id = $2,
           route = $3,
           icon = $4,
           display_order = $5,
           description = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, module_name, module_key`,
      [
        module_name.trim(),
        parent_module_id ? Number(parent_module_id) : null,
        route?.trim() || null,
        icon?.trim() || "Layers",
        display_order != null ? Number(display_order) : 50,
        description?.trim() || null,
        moduleId,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Module "${module_name}" updated successfully.`,
      module: res.rows[0],
    });
  } catch (err: unknown) {
    console.error("[PUT /api/admin/business-type-access/modules/[id]] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update module" },
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
    const moduleId = Number(id);

    // Delete module (cascades to business_type_modules)
    await db.query(`DELETE FROM system_modules WHERE id = $1`, [moduleId]);

    return NextResponse.json({
      success: true,
      message: "Module deleted successfully.",
    });
  } catch (err: unknown) {
    console.error("[DELETE /api/admin/business-type-access/modules/[id]] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete module" },
      { status: 500 }
    );
  }
}

