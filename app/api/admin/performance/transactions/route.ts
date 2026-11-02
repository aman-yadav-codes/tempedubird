import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const category = searchParams.get("category");
    const activityType = searchParams.get("activityType");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
    const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

    const isPlatform = isPlatformAdminUser(user);
    const isInst = isInstitutionAdminUser(user);
    const isAdmin = isPlatform || isInst;

    const whereClauses: string[] = ["1=1"];
    const params: any[] = [];

    // Non-admins can only see their own private performance transactions
    if (!isAdmin) {
      params.push(user.id);
      whereClauses.push(`t.employee_id = $${params.length}`);
    } else if (employeeId && !isNaN(Number(employeeId))) {
      params.push(Number(employeeId));
      whereClauses.push(`t.employee_id = $${params.length}`);
    }

    if (category && category !== "all") {
      params.push(category);
      whereClauses.push(`t.category = $${params.length}`);
    }

    if (activityType && activityType !== "all") {
      params.push(activityType);
      whereClauses.push(`t.activity_type = $${params.length}`);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRes, txRes] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total FROM employee_performance_transactions t WHERE ${whereSql}`, params),
      db.query(`
        SELECT t.*
        FROM employee_performance_transactions t
        WHERE ${whereSql}
        ORDER BY t.transaction_date DESC, t.id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]),
    ]);

    const total = Number(countRes.rows[0]?.total || 0);

    return NextResponse.json({
      success: true,
      total,
      limit,
      offset,
      transactions: txRes.rows,
    });
  } catch (err: any) {
    console.error("[Transactions GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch transactions" }, { status: 500 });
  }
}

/**
 * Admin adjustment or correction transaction
 */
export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isPlatform = isPlatformAdminUser(user);
    const isInst = isInstitutionAdminUser(user);
    if (!isPlatform && !isInst) {
      return NextResponse.json({ error: "Forbidden: Admin access required for point adjustments" }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, points, actionType = "add", reason, referenceRecordId } = body;

    if (!employeeId || isNaN(Number(points)) || Number(points) <= 0 || !reason) {
      return NextResponse.json(
        { error: "Employee ID, positive points value, and reason are required" },
        { status: 400 }
      );
    }

    const pts = Math.round(Number(points) * 100) / 100;
    const pointsEarned = actionType === "add" ? pts : 0;
    const pointsDeducted = actionType === "deduct" ? pts : 0;
    const netPoints = actionType === "add" ? pts : -pts;

    // Fetch employee details
    const empRes = await db.query(
      `SELECT u.id, u.full_name, u.institution_id, up.department, up.designation
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.id = $1 LIMIT 1`,
      [Number(employeeId)]
    );

    if (empRes.rows.length === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const emp = empRes.rows[0];
    const adminName = (user as any).full_name || (user as any).name || (user as any).email || "Admin";
    const idempotencyKey = `manual_adj:${emp.id}:${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const res = await db.query(`
      INSERT INTO employee_performance_transactions (
        employee_id, employee_name, department, designation, institution_id,
        activity_type, category, description, points_earned, points_deducted,
        net_points, calc_type, applied_rate, reference_module, reference_record_id,
        idempotency_key, performed_by, performed_by_id, transaction_status, transaction_date
      ) VALUES (
        $1, $2, $3, $4, $5, 'manual_adjustment', 'adjustment', $6, $7, $8, $9, 'fixed', $10,
        'admin_adjustment', $11, $12, $13, $14, 'completed', NOW()
      )
      RETURNING id
    `, [
      emp.id,
      emp.full_name,
      emp.department,
      emp.designation,
      emp.institution_id,
      `Manual Adjustment: ${reason}`,
      pointsEarned,
      pointsDeducted,
      netPoints,
      pts,
      referenceRecordId || "N/A",
      idempotencyKey,
      adminName,
      user.id,
    ]);

    return NextResponse.json({
      success: true,
      transactionId: res.rows[0].id,
      message: "Performance points adjusted successfully",
    });
  } catch (err: any) {
    console.error("[Transactions POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to adjust points" }, { status: 500 });
  }
}

