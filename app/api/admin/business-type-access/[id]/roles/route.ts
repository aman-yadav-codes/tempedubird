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
      `SELECT id, name, slug, is_active 
       FROM institution_types 
       WHERE id = $1 AND COALESCE(is_deleted, false) = false`,
      [typeId]
    );

    if (typeRes.rows.length === 0) {
      return NextResponse.json({ error: "Business type not found" }, { status: 404 });
    }

    // Fetch all roles with is_enabled for this business type
    const rolesRes = await db.query(
      `SELECT 
         r.id,
         r.name,
         r.code,
         st.code as scope_code,
         st.name as scope_name,
         COALESCE(btr.is_enabled, TRUE) as is_enabled,
         btr.updated_at
       FROM roles r
       LEFT JOIN scope_types st ON st.id = r.scope_id
       LEFT JOIN business_type_roles btr 
         ON btr.role_id = r.id AND btr.business_type_id = $1
       WHERE COALESCE(r.is_deleted, false) = false
         AND r.code != 'platform_admin'
       ORDER BY 
         (r.scope_id = 1) DESC, 
         COALESCE(btr.is_enabled, TRUE) DESC, 
         r.name ASC`,
      [typeId]
    );

    const roles = rolesRes.rows;
    const enabledCount = roles.filter((r: any) => r.is_enabled).length;
    const totalCount = roles.length;

    return NextResponse.json({
      success: true,
      businessType: typeRes.rows[0],
      roles,
      stats: {
        total: totalCount,
        enabled: enabledCount,
        disabled: totalCount - enabledCount,
      },
    });
  } catch (err: unknown) {
    console.error("[GET /api/admin/business-type-access/[id]/roles] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load roles" },
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
    const { enabledRoleIds } = body;

    if (!Array.isArray(enabledRoleIds)) {
      return NextResponse.json({ error: "enabledRoleIds must be an array of role IDs" }, { status: 400 });
    }

    const enabledSet = new Set(enabledRoleIds.map(Number));

    // Fetch all active non-platform roles
    const allRolesRes = await db.query(
      `SELECT id FROM roles WHERE COALESCE(is_deleted, false) = false AND code != 'platform_admin'`
    );
    const allRoles = allRolesRes.rows;

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      for (const role of allRoles) {
        const isEnabled = enabledSet.has(role.id);

        await client.query(
          `INSERT INTO business_type_roles (business_type_id, role_id, is_enabled, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (business_type_id, role_id) 
           DO UPDATE SET is_enabled = $3, updated_at = NOW()`,
          [typeId, role.id, isEnabled]
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
      message: "Role access configuration updated successfully.",
    });
  } catch (err: unknown) {
    console.error("[PUT /api/admin/business-type-access/[id]/roles] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update role configuration" },
      { status: 500 }
    );
  }
}
