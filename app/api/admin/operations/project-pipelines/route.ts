import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { isPlatformAdminUser, isInstitutionAdminUser, hasPermission } from "@/lib/auth/permissions";

function canManagePipelines(user: any): boolean {
  if (!user) return false;
  if (isPlatformAdminUser(user) || isInstitutionAdminUser(user)) return true;
  return (
    hasPermission(user, "operations.tasks.manage") ||
    hasPermission(user, "operations.tasks.view_all") ||
    hasPermission(user, "managestaff.tasks") ||
    hasPermission(user, "operations.project_pipelines.view") ||
    hasPermission(user, "operations.project_pipelines.create") ||
    hasPermission(user, "operations.project_pipelines.edit") ||
    hasPermission(user, "operations.project_pipelines.delete") ||
    Boolean(user?.role_codes?.includes("head_of_operations")) ||
    Boolean(user?.role_codes?.includes("business_operations_manager"))
  );
}

// GET /api/admin/operations/project-pipelines
export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectTypeId = url.searchParams.get("project_type_id")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";
    const search = url.searchParams.get("search")?.trim().toLowerCase() || "";

    let query = `
      SELECT 
        pp.*,
        pt.name as project_type_name,
        pt.icon as project_type_icon,
        jsonb_array_length(COALESCE(pp.phases, '[]'::jsonb)) as phases_count
      FROM operations_project_pipelines pp
      INNER JOIN operations_project_types pt ON pt.id = pp.project_type_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (projectTypeId && projectTypeId !== "all") {
      params.push(Number(projectTypeId));
      query += ` AND pp.project_type_id = $${params.length}`;
    }

    if (status && status !== "all") {
      params.push(status);
      query += ` AND pp.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (LOWER(pp.name) LIKE $${params.length} OR LOWER(COALESCE(pp.description, '')) LIKE $${params.length} OR LOWER(pt.name) LIKE $${params.length})`;
    }

    query += ` ORDER BY pt.name ASC, pp.is_default DESC, pp.name ASC`;

    const res = await db.query(query, params);
    return NextResponse.json({ pipelines: res.rows });
  } catch (err: any) {
    console.error("[GET /api/admin/operations/project-pipelines] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch pipelines" }, { status: 500 });
  }
}

// POST /api/admin/operations/project-pipelines
export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user || !canManagePipelines(user)) {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const name = body.name?.trim();
    const projectTypeId = Number(body.project_type_id);
    const description = body.description?.trim() || null;
    const status = body.status === "inactive" ? "inactive" : "active";
    const isDefault = Boolean(body.is_default);
    const phases = Array.isArray(body.phases) ? body.phases : [];

    if (!name) {
      return NextResponse.json({ error: "Pipeline name is required" }, { status: 400 });
    }
    if (!projectTypeId) {
      return NextResponse.json({ error: "Project type is required" }, { status: 400 });
    }

    // Check project type exists
    const ptCheck = await db.query(`SELECT id FROM operations_project_types WHERE id = $1`, [projectTypeId]);
    if (ptCheck.rows.length === 0) {
      return NextResponse.json({ error: "Selected project type does not exist" }, { status: 400 });
    }

    // If this pipeline is default, unset any existing default for this project type
    if (isDefault) {
      await db.query(
        `UPDATE operations_project_pipelines SET is_default = FALSE WHERE project_type_id = $1`,
        [projectTypeId]
      );
    } else {
      // If no pipeline is default yet for this project type, make this one default
      const defaultCheck = await db.query(
        `SELECT id FROM operations_project_pipelines WHERE project_type_id = $1 AND is_default = TRUE LIMIT 1`,
        [projectTypeId]
      );
      if (defaultCheck.rows.length === 0) {
        // First pipeline for this project type defaults to true
        // isDefault = true;
      }
    }

    const res = await db.query(
      `INSERT INTO operations_project_pipelines (name, project_type_id, description, status, is_default, phases, created_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       RETURNING *`,
      [name, projectTypeId, description, status, isDefault, JSON.stringify(phases), user.id]
    );

    return NextResponse.json({ pipeline: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/admin/operations/project-pipelines] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create pipeline" }, { status: 500 });
  }
}

// PUT /api/admin/operations/project-pipelines
export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user || !canManagePipelines(user)) {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: "Pipeline ID is required" }, { status: 400 });
    }

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Pipeline name cannot be empty" }, { status: 400 });
    }

    const existingRes = await db.query(`SELECT * FROM operations_project_pipelines WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }
    const existing = existingRes.rows[0];

    const projectTypeId = body.project_type_id !== undefined ? Number(body.project_type_id) : existing.project_type_id;
    const description = body.description !== undefined ? (body.description?.trim() || null) : existing.description;
    const status = body.status === "inactive" ? "inactive" : body.status === "active" ? "active" : existing.status;
    const isDefault = body.is_default !== undefined ? Boolean(body.is_default) : existing.is_default;
    const phases = body.phases !== undefined ? (Array.isArray(body.phases) ? body.phases : []) : existing.phases;

    // If marked as default, ensure only one active default per project type
    if (isDefault) {
      await db.query(
        `UPDATE operations_project_pipelines SET is_default = FALSE WHERE project_type_id = $1 AND id <> $2`,
        [projectTypeId, id]
      );
    }

    const res = await db.query(
      `UPDATE operations_project_pipelines SET
        name = $1,
        project_type_id = $2,
        description = $3,
        status = $4,
        is_default = $5,
        phases = $6::jsonb,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *`,
      [name, projectTypeId, description, status, isDefault, JSON.stringify(phases), id]
    );

    return NextResponse.json({ pipeline: res.rows[0] });
  } catch (err: any) {
    console.error("[PUT /api/admin/operations/project-pipelines] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update pipeline" }, { status: 500 });
  }
}

// DELETE /api/admin/operations/project-pipelines
export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user || !canManagePipelines(user)) {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "Pipeline ID is required" }, { status: 400 });
    }

    // Check if any existing projects in operations_tasks reference this pipeline
    const taskRefs = await db.query(
      `SELECT COUNT(*)::int as count FROM operations_tasks WHERE pipeline_id = $1`,
      [id]
    );
    const isReferenced = (taskRefs.rows[0]?.count || 0) > 0;

    if (isReferenced) {
      // Soft-deactivate to protect ongoing and historical projects
      await db.query(
        `UPDATE operations_project_pipelines SET status = 'inactive', is_default = FALSE, updated_at = NOW() WHERE id = $1`,
        [id]
      );
      return NextResponse.json({
        success: true,
        action: "deactivated",
        message: "Pipeline is currently assigned to existing projects and was deactivated rather than deleted to protect project workflows.",
      });
    }

    await db.query(`DELETE FROM operations_project_pipelines WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, action: "deleted" });
  } catch (err: any) {
    console.error("[DELETE /api/admin/operations/project-pipelines] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete pipeline" }, { status: 500 });
  }
}

