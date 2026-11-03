import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { isPlatformAdminUser, isInstitutionAdminUser, hasPermission } from "@/lib/auth/permissions";

function canManageProjectTypes(user: any): boolean {
  if (!user) return false;
  if (isPlatformAdminUser(user) || isInstitutionAdminUser(user)) return true;
  return (
    hasPermission(user, "operations.tasks.manage") ||
    hasPermission(user, "operations.tasks.view_all") ||
    hasPermission(user, "managestaff.tasks") ||
    hasPermission(user, "operations.project_types.view") ||
    hasPermission(user, "operations.project_types.create") ||
    hasPermission(user, "operations.project_types.edit") ||
    hasPermission(user, "operations.project_types.delete") ||
    Boolean(user?.role_codes?.includes("head_of_operations")) ||
    Boolean(user?.role_codes?.includes("business_operations_manager"))
  );
}

// GET /api/admin/operations/project-types
export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim().toLowerCase() || "";
    const status = url.searchParams.get("status")?.trim() || "";

    let query = `
      SELECT 
        pt.*,
        COUNT(pp.id)::int as pipelines_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pp.id,
              'name', pp.name,
              'is_default', pp.is_default,
              'status', pp.status,
              'phases_count', jsonb_array_length(COALESCE(pp.phases, '[]'::jsonb))
            )
          ) FILTER (WHERE pp.id IS NOT NULL),
          '[]'::json
        ) as pipelines
      FROM operations_project_types pt
      LEFT JOIN operations_project_pipelines pp ON pp.project_type_id = pt.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (LOWER(pt.name) LIKE $${params.length} OR LOWER(COALESCE(pt.description, '')) LIKE $${params.length})`;
    }

    if (status && status !== "all") {
      params.push(status);
      query += ` AND pt.status = $${params.length}`;
    }

    query += ` GROUP BY pt.id ORDER BY pt.name ASC`;

    const res = await db.query(query, params);
    return NextResponse.json({ project_types: res.rows });
  } catch (err: any) {
    console.error("[GET /api/admin/operations/project-types] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch project types" }, { status: 500 });
  }
}

// POST /api/admin/operations/project-types
export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user || !canManageProjectTypes(user)) {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const name = body.name?.trim();
    const description = body.description?.trim() || null;
    const icon = body.icon?.trim() || "FolderKanban";
    const status = body.status === "inactive" ? "inactive" : "active";

    if (!name) {
      return NextResponse.json({ error: "Project type name is required" }, { status: 400 });
    }

    // Check duplicate name
    const existing = await db.query(
      `SELECT id FROM operations_project_types WHERE LOWER(TRIM(name)) = LOWER($1) LIMIT 1`,
      [name]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: `Project type "${name}" already exists` }, { status: 400 });
    }

    const res = await db.query(
      `INSERT INTO operations_project_types (name, description, icon, status, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, icon, status, user.id]
    );

    return NextResponse.json({ project_type: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/admin/operations/project-types] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create project type" }, { status: 500 });
  }
}

// PUT /api/admin/operations/project-types
export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user || !canManageProjectTypes(user)) {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: "Project type ID is required" }, { status: 400 });
    }

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Project type name cannot be empty" }, { status: 400 });
    }

    // Check duplicate name on another record
    const duplicate = await db.query(
      `SELECT id FROM operations_project_types WHERE LOWER(TRIM(name)) = LOWER($1) AND id <> $2 LIMIT 1`,
      [name, id]
    );
    if (duplicate.rows.length > 0) {
      return NextResponse.json({ error: `Another project type named "${name}" already exists` }, { status: 400 });
    }

    const description = body.description !== undefined ? (body.description?.trim() || null) : undefined;
    const icon = body.icon?.trim() || undefined;
    const status = body.status === "inactive" ? "inactive" : body.status === "active" ? "active" : undefined;

    const updates: string[] = ["name = $1", "updated_at = NOW()"];
    const params: any[] = [name, id];

    if (description !== undefined) {
      params.push(description);
      updates.push(`description = $${params.length}`);
    }
    if (icon !== undefined) {
      params.push(icon);
      updates.push(`icon = $${params.length}`);
    }
    if (status !== undefined) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }

    const res = await db.query(
      `UPDATE operations_project_types SET ${updates.join(", ")} WHERE id = $2 RETURNING *`,
      params
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Project type not found" }, { status: 404 });
    }

    return NextResponse.json({ project_type: res.rows[0] });
  } catch (err: any) {
    console.error("[PUT /api/admin/operations/project-types] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update project type" }, { status: 500 });
  }
}

// DELETE /api/admin/operations/project-types
export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user || !canManageProjectTypes(user)) {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "Project type ID is required" }, { status: 400 });
    }

    // Check if referenced by active tasks in operations_tasks
    const taskRefs = await db.query(
      `SELECT COUNT(*)::int as count FROM operations_tasks WHERE project_type_id = $1`,
      [id]
    );
    const isReferenced = (taskRefs.rows[0]?.count || 0) > 0;

    if (isReferenced) {
      // Soft-deactivate to prevent breaking existing projects
      await db.query(
        `UPDATE operations_project_types SET status = 'inactive', updated_at = NOW() WHERE id = $1`,
        [id]
      );
      return NextResponse.json({
        success: true,
        action: "deactivated",
        message: "Project type has existing projects and was deactivated rather than deleted to preserve historical data.",
      });
    }

    await db.query(`DELETE FROM operations_project_types WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, action: "deleted" });
  } catch (err: any) {
    console.error("[DELETE /api/admin/operations/project-types] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete project type" }, { status: 500 });
  }
}

