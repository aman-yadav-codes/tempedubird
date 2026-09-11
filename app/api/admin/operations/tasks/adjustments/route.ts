import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/operations/tasks/adjustments?task_id=<id>
// Returns all manual score adjustments for a task, with running totals.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);

    const url = new URL(req.url);
    const taskId = url.searchParams.get("task_id");
    const employeeId = url.searchParams.get("employee_id");

    if (!taskId && !employeeId) {
      return NextResponse.json(
        { error: "Provide task_id or employee_id query param" },
        { status: 400 }
      );
    }

    // Build query
    let query = `
      SELECT
        tsa.*,
        CASE tsa.adjustment_type
          WHEN 'bonus'   THEN  tsa.points
          WHEN 'penalty' THEN -tsa.points
        END AS effective_points
      FROM task_score_adjustments tsa
      WHERE 1=1
    `;
    const params: any[] = [];

    if (taskId) {
      params.push(parseInt(taskId));
      query += ` AND tsa.task_id = $${params.length}`;
    }
    if (employeeId) {
      params.push(parseInt(employeeId));
      query += ` AND tsa.employee_id = $${params.length}`;
    }

    // Scope to institution if applicable
    const userInstId =
      (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    if (userInstId) {
      params.push(userInstId);
      query += ` AND (tsa.institution_id = $${params.length} OR tsa.institution_id IS NULL)`;
    }

    query += ` ORDER BY tsa.created_at DESC`;

    const res = await db.query(query, params);
    const adjustments = res.rows;

    // Compute summary totals
    const totalBonus = adjustments
      .filter((a: any) => a.adjustment_type === "bonus")
      .reduce((sum: number, a: any) => sum + parseFloat(a.points), 0);
    const totalPenalty = adjustments
      .filter((a: any) => a.adjustment_type === "penalty")
      .reduce((sum: number, a: any) => sum + parseFloat(a.points), 0);

    return NextResponse.json({
      adjustments,
      summary: {
        total_bonus: totalBonus,
        total_penalty: totalPenalty,
        net: totalBonus - totalPenalty,
        count: adjustments.length,
      },
    });
  } catch (error: any) {
    console.error("[Task Adjustments GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch adjustments" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/operations/tasks/adjustments
// Creates a new manual bonus or penalty adjustment (admin-only).
// Also logs to staff_performance_points_ledger for unified score tracking.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);

    // ── Admin-only guard ───────────────────────────────────────────────────────
    const isPlatform = user ? isPlatformAdminUser(user) : false;
    const isInstAdmin = user ? isInstitutionAdminUser(user) : false;
    const roleCodes: string[] =
      (user as any)?.role_codes ||
      [(user as any)?.role || (user as any)?.primary_role || ""];
    const isOwnerOrAdmin =
      Boolean((user as any)?.is_super_admin) ||
      isPlatform ||
      isInstAdmin ||
      roleCodes.some((r) =>
        [
          "platform_admin",
          "super_admin",
          "institution_admin",
          "school_owner",
          "college_owner",
          "university_owner",
          "director",
          "principal",
        ].includes(r)
      );

    if (!isOwnerOrAdmin) {
      return NextResponse.json(
        { error: "Only administrators can add score adjustments." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      task_id,
      employee_id,
      employee_name,
      adjustment_type,
      points,
      reason,
    } = body;

    // ── Validation ─────────────────────────────────────────────────────────────
    if (!employee_id) {
      return NextResponse.json({ error: "employee_id is required" }, { status: 400 });
    }
    if (!adjustment_type || !["bonus", "penalty"].includes(adjustment_type)) {
      return NextResponse.json(
        { error: "adjustment_type must be 'bonus' or 'penalty'" },
        { status: 400 }
      );
    }
    const pointsNum = parseFloat(String(points));
    if (!pointsNum || pointsNum <= 0) {
      return NextResponse.json({ error: "points must be a positive number" }, { status: 400 });
    }
    if (!reason || !String(reason).trim()) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }

    // Resolve institution from task or user context
    let institutionId =
      (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;

    if (task_id) {
      const taskRes = await db.query(
        `SELECT institution_id FROM operations_tasks WHERE id = $1`,
        [task_id]
      ).catch(() => ({ rows: [] }));
      if (taskRes.rows[0]?.institution_id) {
        institutionId = taskRes.rows[0].institution_id;
      }
    }

    const createdByName =
      user?.full_name || (user as any)?.email || "Admin";

    // ── Insert into task_score_adjustments ────────────────────────────────────
    const adjRes = await db.query(
      `INSERT INTO task_score_adjustments (
         task_id, institution_id, employee_id, employee_name,
         adjustment_type, points, reason, created_by, created_by_name, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [
        task_id ? parseInt(String(task_id)) : null,
        institutionId,
        parseInt(String(employee_id)),
        employee_name?.trim() || null,
        adjustment_type,
        pointsNum,
        String(reason).trim(),
        user?.id || null,
        createdByName,
      ]
    );

    const adjustment = adjRes.rows[0];

    // ── Mirror into staff_performance_points_ledger for unified scoring ────────
    const effectivePoints =
      adjustment_type === "bonus" ? pointsNum : -pointsNum;

    await db.query(
      `INSERT INTO staff_performance_points_ledger (
         employee_id, institution_id, task_id, point_type, points, reason, awarded_by, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        parseInt(String(employee_id)),
        institutionId,
        task_id ? parseInt(String(task_id)) : null,
        adjustment_type === "bonus" ? "manual_bonus" : "manual_penalty",
        effectivePoints,
        `[Manual ${adjustment_type === "bonus" ? "Bonus" : "Penalty"} by ${createdByName}] ${String(reason).trim()}`,
        user?.id || null,
      ]
    ).catch((err: any) => {
      // Non-fatal: log but don't fail the request
      console.error("[Task Adjustments POST] ledger insert error:", err.message);
    });

    return NextResponse.json({ adjustment }, { status: 201 });
  } catch (error: any) {
    console.error("[Task Adjustments POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create adjustment" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/operations/tasks/adjustments?id=<adjustment_id>
// Admins can delete a manual adjustment (also removes the ledger mirror entry).
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);

    const isPlatform = user ? isPlatformAdminUser(user) : false;
    const isInstAdmin = user ? isInstitutionAdminUser(user) : false;
    const roleCodes: string[] =
      (user as any)?.role_codes ||
      [(user as any)?.role || (user as any)?.primary_role || ""];
    const isOwnerOrAdmin =
      Boolean((user as any)?.is_super_admin) ||
      isPlatform ||
      isInstAdmin ||
      roleCodes.some((r) =>
        ["platform_admin", "super_admin", "institution_admin", "school_owner", "college_owner", "university_owner", "director", "principal"].includes(r)
      );

    if (!isOwnerOrAdmin) {
      return NextResponse.json({ error: "Only administrators can delete adjustments." }, { status: 403 });
    }

    const url = new URL(req.url);
    const adjId = url.searchParams.get("id");
    if (!adjId) {
      return NextResponse.json({ error: "Adjustment ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM task_score_adjustments WHERE id = $1`, [adjId]);

    return NextResponse.json({ success: true, message: "Adjustment removed" });
  } catch (error: any) {
    console.error("[Task Adjustments DELETE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete adjustment" },
      { status: 500 }
    );
  }
}
