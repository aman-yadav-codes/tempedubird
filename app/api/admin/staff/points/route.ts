import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthUser } from "@/lib/auth/get-auth-user";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: NextRequest) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthUser(req);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employee_id") || searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json({ error: "employee_id is required" }, { status: 400 });
    }

    const ledgerRes = await db.query(
      `
        SELECT 
          spl.id,
          spl.employee_id,
          spl.institution_id,
          spl.task_id,
          spl.subtask_id,
          spl.point_type,
          spl.points::numeric AS points,
          spl.reason,
          spl.awarded_by,
          u_awarded.full_name AS awarded_by_name,
          t.title AS task_title,
          spl.created_at
        FROM staff_performance_points_ledger spl
        LEFT JOIN users u_awarded ON u_awarded.id = spl.awarded_by
        LEFT JOIN operations_tasks t ON t.id = spl.task_id
        WHERE spl.employee_id = $1
        ORDER BY spl.id DESC
        LIMIT 100
      `,
      [Number(employeeId)]
    );

    const history = ledgerRes.rows || [];
    const totalPoints = history.reduce((sum, h) => sum + (Number(h.points) || 0), 0);
    const positivePoints = history.filter((h) => Number(h.points) > 0).reduce((sum, h) => sum + Number(h.points), 0);
    const negativePoints = history.filter((h) => Number(h.points) < 0).reduce((sum, h) => sum + Math.abs(Number(h.points)), 0);

    return NextResponse.json({
      success: true,
      employee_id: Number(employeeId),
      total_points: totalPoints,
      positive_points: positivePoints,
      negative_points: negativePoints,
      history,
    });
  } catch (error: any) {
    console.error("[Staff Points GET] Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load points ledger" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isPlatformAdmin = isPlatformAdminUser(user);
    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const isOwnerOrAdmin =
      Boolean((user as any)?.is_super_admin) ||
      isPlatformAdmin ||
      ["platform_admin", "super_admin", "institution_admin", "director", "principal"].includes(userRole);

    if (!isOwnerOrAdmin) {
      return NextResponse.json({ error: "Only administrators can assign or deduct employee performance points" }, { status: 403 });
    }

    const body = await req.json();
    const {
      employee_id,
      points, // Positive number for reward, Negative number for penalty
      action_type = "manual_bonus", // 'manual_bonus' | 'manual_penalty' | 'task_completed' | 'task_failed'
      reason,
      task_id = null,
      subtask_id = null,
    } = body;

    if (!employee_id) {
      return NextResponse.json({ error: "Employee is required" }, { status: 400 });
    }

    const numPoints = parseFloat(String(points));
    if (isNaN(numPoints) || numPoints === 0) {
      return NextResponse.json({ error: "Points must be a non-zero number" }, { status: 400 });
    }

    // Determine final signed points
    const finalPoints = action_type === "manual_penalty" ? -Math.abs(numPoints) : numPoints;

    const res = await db.query(
      `
        INSERT INTO staff_performance_points_ledger (
          employee_id, institution_id, task_id, subtask_id, point_type, points, reason, awarded_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `,
      [
        Number(employee_id),
        (user as any)?.institution_id || null,
        task_id ? Number(task_id) : null,
        subtask_id ? String(subtask_id) : null,
        action_type,
        finalPoints,
        reason?.trim() || (finalPoints > 0 ? "Performance bonus awarded" : "Penalty points deducted"),
        user.id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: finalPoints > 0 ? `Successfully awarded +${finalPoints} points!` : `Successfully deducted ${finalPoints} points!`,
      entry: res.rows[0],
    });
  } catch (error: any) {
    console.error("[Staff Points POST] Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to adjust points" }, { status: 500 });
  }
}
