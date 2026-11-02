import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { awardMonthlyAdminRewards } from "@/lib/performance/performance-engine";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-award monthly admin rewards for current month if eligible
    await awardMonthlyAdminRewards().catch(() => null);

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "this_month";
    const department = searchParams.get("department");
    const designation = searchParams.get("designation");
    const search = searchParams.get("search")?.trim().toLowerCase();
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const targetEmployeeId = searchParams.get("employeeId");

    // Build date filters
    let dateFilterSql = "";
    const filterParams: any[] = [];

    const now = new Date();
    if (timeframe === "today") {
      filterParams.push(now.toISOString().substring(0, 10));
      dateFilterSql = `AND t.transaction_date::date = $${filterParams.length}::date`;
    } else if (timeframe === "this_week") {
      dateFilterSql = `AND t.transaction_date >= date_trunc('week', NOW())`;
    } else if (timeframe === "this_month") {
      dateFilterSql = `AND t.transaction_date >= date_trunc('month', NOW())`;
    } else if (timeframe === "last_month") {
      dateFilterSql = `AND t.transaction_date >= date_trunc('month', NOW() - INTERVAL '1 month') 
                       AND t.transaction_date < date_trunc('month', NOW())`;
    } else if (timeframe === "this_year") {
      dateFilterSql = `AND t.transaction_date >= date_trunc('year', NOW())`;
    } else if (startDateParam && endDateParam) {
      filterParams.push(startDateParam);
      filterParams.push(endDateParam);
      dateFilterSql = `AND t.transaction_date::date BETWEEN $${filterParams.length - 1}::date AND $${filterParams.length}::date`;
    }

    // Single employee detailed lookup (for modal or profile)
    if (targetEmployeeId && !isNaN(Number(targetEmployeeId))) {
      const empId = Number(targetEmployeeId);

      // User info
      const uRes = await db.query(`
        SELECT u.id, u.full_name, u.email, u.phone, u.avatar_url AS profile_picture_url,
               up.department, up.designation, up.joining_date
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        WHERE u.id = $1 LIMIT 1
      `, [empId]);

      if (uRes.rows.length === 0) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      const employee = uRes.rows[0];

      // Categories summary
      const catRes = await db.query(`
        SELECT 
          category,
          COALESCE(SUM(points_earned), 0) AS earned,
          COALESCE(SUM(points_deducted), 0) AS deducted,
          COALESCE(SUM(net_points), 0) AS net,
          COUNT(id) AS activities_count
        FROM employee_performance_transactions t
        WHERE t.employee_id = $1 ${dateFilterSql}
        GROUP BY category
      `, [empId, ...filterParams]);

      // Overall totals
      const totalsRes = await db.query(`
        SELECT 
          COALESCE(SUM(points_earned), 0) AS total_earned,
          COALESCE(SUM(points_deducted), 0) AS total_deducted,
          COALESCE(SUM(net_points), 0) AS net_points,
          COUNT(id) AS total_activities
        FROM employee_performance_transactions t
        WHERE t.employee_id = $1 ${dateFilterSql}
      `, [empId, ...filterParams]);

      // Previous month performance for comparison
      const prevMonthRes = await db.query(`
        SELECT 
          COALESCE(SUM(points_earned), 0) AS prev_earned,
          COALESCE(SUM(points_deducted), 0) AS prev_deducted,
          COALESCE(SUM(net_points), 0) AS prev_net
        FROM employee_performance_transactions t
        WHERE t.employee_id = $1 
          AND t.transaction_date >= date_trunc('month', NOW() - INTERVAL '1 month') 
          AND t.transaction_date < date_trunc('month', NOW())
      `, [empId]);

      // Recent transactions (filtered if private: only show if requesting user is this employee OR admin)
      const isSelf = user.id === empId;
      const isAdmin = (user as any).role?.toLowerCase().includes("admin") ||
        (user as any).role_codes?.some((r: string) => r.toLowerCase().includes("admin"));

      let transactions: any[] = [];
      if (isSelf || isAdmin) {
        const txRes = await db.query(`
          SELECT id, activity_type, category, description, points_earned, points_deducted,
                 net_points, calc_type, original_amount, applied_rate, reference_module,
                 reference_record_id, performed_by, transaction_date, transaction_status
          FROM employee_performance_transactions t
          WHERE t.employee_id = $1 ${dateFilterSql}
          ORDER BY transaction_date DESC
          LIMIT 100
        `, [empId, ...filterParams]);
        transactions = txRes.rows;
      }

      return NextResponse.json({
        success: true,
        employee,
        totals: totalsRes.rows[0],
        previousMonth: prevMonthRes.rows[0],
        categories: catRes.rows,
        transactions,
        isPrivateView: isSelf || isAdmin,
      });
    }

    // Company-wide leaderboard query
    const leaderboardRes = await db.query(`
      WITH emp_scores AS (
        SELECT 
          t.employee_id,
          COALESCE(SUM(t.points_earned), 0) AS total_earned,
          COALESCE(SUM(t.points_deducted), 0) AS total_deducted,
          COALESCE(SUM(t.net_points), 0) AS net_points,
          COUNT(t.id) AS total_activities,
          MAX(t.transaction_date) AS last_activity
        FROM employee_performance_transactions t
        WHERE 1=1 ${dateFilterSql}
        GROUP BY t.employee_id
      ),
      cat_breakdown AS (
        SELECT 
          t.employee_id,
          t.category,
          COALESCE(SUM(t.points_earned), 0) AS earned,
          COALESCE(SUM(t.points_deducted), 0) AS deducted,
          COALESCE(SUM(t.net_points), 0) AS net
        FROM employee_performance_transactions t
        WHERE 1=1 ${dateFilterSql}
        GROUP BY t.employee_id, t.category
      )
      SELECT 
        u.id AS employee_id,
        u.full_name AS employee_name,
        u.email,
        u.avatar_url AS profile_picture_url,
        COALESCE(up.department, 'Operations') AS department,
        COALESCE(up.designation, r.name, 'Team Member') AS designation,
        COALESCE(es.total_earned, 0) AS total_earned,
        COALESCE(es.total_deducted, 0) AS total_deducted,
        COALESCE(es.net_points, 0) AS net_points,
        COALESCE(es.total_activities, 0) AS total_activities,
        es.last_activity,
        COALESCE(
          jsonb_object_agg(
            cb.category,
            jsonb_build_object('earned', cb.earned, 'deducted', cb.deducted, 'net', cb.net)
          ) FILTER (WHERE cb.category IS NOT NULL),
          '{}'::jsonb
        ) AS categories
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      LEFT JOIN emp_scores es ON es.employee_id = u.id
      LEFT JOIN cat_breakdown cb ON cb.employee_id = u.id
      WHERE COALESCE(u.is_active, TRUE) = TRUE AND COALESCE(u.is_deleted, FALSE) = FALSE
        AND (r.code IS NULL OR r.code != 'student')
      GROUP BY u.id, u.full_name, u.email, u.avatar_url, up.department, up.designation, r.name, es.total_earned, es.total_deducted, es.net_points, es.total_activities, es.last_activity
      ORDER BY net_points DESC, total_earned DESC, u.full_name ASC
    `, filterParams);

    // Filter by department, designation, and search in memory or SQL
    let rows = leaderboardRes.rows;
    if (department && department !== "all") {
      rows = rows.filter((r) => r.department?.toLowerCase() === department.toLowerCase());
    }
    if (designation && designation !== "all") {
      rows = rows.filter((r) => r.designation?.toLowerCase() === designation.toLowerCase());
    }
    if (search) {
      rows = rows.filter((r) =>
        r.employee_name?.toLowerCase().includes(search) ||
        r.email?.toLowerCase().includes(search) ||
        r.department?.toLowerCase().includes(search) ||
        r.designation?.toLowerCase().includes(search)
      );
    }

    // Calculate Standard Competition Ranking (1, 2, 2, 4...)
    let currentRank = 1;
    const rankedRows = rows.map((row, idx) => {
      if (idx > 0) {
        const prev = rows[idx - 1];
        if (Number(row.net_points) < Number(prev.net_points)) {
          currentRank = idx + 1;
        }
      }
      return {
        ...row,
        rank: currentRank,
        total_earned: Number(row.total_earned),
        total_deducted: Number(row.total_deducted),
        net_points: Number(row.net_points),
        total_activities: Number(row.total_activities),
      };
    });

    // Find current user's entry & rank
    const myEntry = rankedRows.find((r) => r.employee_id === user.id) || null;

    // Overall summary metrics across all employees
    const totalEmployees = rankedRows.length;
    const positiveEmployees = rankedRows.filter((r) => r.net_points > 0).length;
    const totalPointsEarned = rankedRows.reduce((acc, r) => acc + r.total_earned, 0);
    const totalPointsDeducted = rankedRows.reduce((acc, r) => acc + r.total_deducted, 0);
    const netCompanyPoints = totalPointsEarned - totalPointsDeducted;
    const averagePoints = totalEmployees > 0 ? Math.round((netCompanyPoints / totalEmployees) * 100) / 100 : 0;

    return NextResponse.json({
      success: true,
      timeframe,
      metrics: {
        totalEmployees,
        positiveEmployees,
        totalPointsEarned,
        totalPointsDeducted,
        netCompanyPoints,
        averagePoints,
      },
      myPerformance: myEntry,
      leaderboard: rankedRows,
    });
  } catch (err: any) {
    console.error("[Leaderboard GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load leaderboard" }, { status: 500 });
  }
}

