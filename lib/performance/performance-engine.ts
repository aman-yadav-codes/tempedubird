import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export interface AwardPerformanceParams {
  employeeId: number;
  activityType:
    | "attendance_on_time"
    | "attendance_violation"
    | "finance_income"
    | "finance_expense"
    | "finance_salary_slip"
    | "finance_invoice"
    | "lead_created"
    | "project_created"
    | "admin_monthly"
    | "employee_recruited"
    | "recruitment_applicant"
    | "recruitment_interview"
    | "recruitment_experience_letter"
    | "recruitment_offer_letter"
    | string;
  referenceModule: string; // e.g., 'attendance', 'finance', 'leads', 'operations', 'recruitment', 'staff'
  referenceRecordId: string | number;
  idempotencyKey?: string;
  performedBy?: {
    id?: number;
    name?: string;
  };
  originalAmount?: number; // e.g., project amount or salary
  customDescription?: string;
  transactionDate?: Date | string;
  institutionId?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceTransactionResult {
  success: boolean;
  duplicate?: boolean;
  ruleDisabled?: boolean;
  pointsEarned: number;
  pointsDeducted: number;
  netPoints: number;
  transactionId?: number;
  reason?: string;
}

/**
 * Retrieve the monthly salary for an employee.
 * Checks salary components, recent salary payouts, or defaults to ₹30,000.
 */
export async function getEmployeeMonthlySalary(employeeId: number): Promise<number> {
  try {
    const compRes = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_salary
       FROM staff_salary_components
       WHERE user_id = $1 AND component_type = 'EARNING'`,
      [employeeId]
    );
    const totalComp = Number(compRes.rows[0]?.total_salary || 0);
    if (totalComp > 0) return totalComp;

    const payoutRes = await db.query(
      `SELECT base_salary, net_payable
       FROM staff_salary_payouts
       WHERE user_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [employeeId]
    );
    if (payoutRes.rows.length > 0) {
      const base = Number(payoutRes.rows[0].base_salary || payoutRes.rows[0].net_payable || 0);
      if (base > 0) return base;
    }
  } catch (err) {
    console.warn("[PerformanceEngine] getEmployeeMonthlySalary lookup error:", err);
  }

  // Configured default baseline salary if not yet setup
  return 30000;
}

/**
 * Centralized function to calculate and record performance points.
 * Ensures strict idempotency so duplicate requests never award duplicate points.
 */
export async function recordPerformancePoints(
  params: AwardPerformanceParams
): Promise<PerformanceTransactionResult> {
  await ensureFeatureSchema();

  const {
    employeeId,
    activityType,
    referenceModule,
    referenceRecordId,
    performedBy,
    customDescription,
    transactionDate,
    institutionId,
    metadata = {},
  } = params;

  if (!employeeId) {
    return {
      success: false,
      reason: "Missing employee ID",
      pointsEarned: 0,
      pointsDeducted: 0,
      netPoints: 0,
    };
  }

  // 1. Fetch active performance rule
  const ruleRes = await db.query(
    `SELECT * FROM performance_settings WHERE rule_key = $1 LIMIT 1`,
    [activityType]
  );

  if (ruleRes.rows.length === 0) {
    return {
      success: false,
      reason: `Performance rule '${activityType}' not found in configuration`,
      pointsEarned: 0,
      pointsDeducted: 0,
      netPoints: 0,
    };
  }

  const rule = ruleRes.rows[0];
  if (!rule.is_enabled) {
    return {
      success: false,
      ruleDisabled: true,
      reason: `Rule '${rule.name}' is currently disabled in Performance Settings`,
      pointsEarned: 0,
      pointsDeducted: 0,
      netPoints: 0,
    };
  }

  // 2. Build unique idempotency key
  const finalIdempotencyKey =
    params.idempotencyKey ||
    `${referenceModule}:${referenceRecordId}:${activityType}`;

  // Check if transaction already exists
  const existingTx = await db.query(
    `SELECT id, points_earned, points_deducted, net_points
     FROM employee_performance_transactions
     WHERE idempotency_key = $1 LIMIT 1`,
    [finalIdempotencyKey]
  );

  if (existingTx.rows.length > 0) {
    const existing = existingTx.rows[0];
    return {
      success: true,
      duplicate: true,
      transactionId: existing.id,
      pointsEarned: Number(existing.points_earned),
      pointsDeducted: Number(existing.points_deducted),
      netPoints: Number(existing.net_points),
      reason: "Performance points were already calculated and awarded for this activity event",
    };
  }

  // 3. Determine applicable amount and calculate points
  let originalAmount = Number(params.originalAmount || 0);
  let appliedRate = 0;
  let rawPoints = 0;

  if (rule.calc_type === "percentage") {
    appliedRate = Number(rule.percentage_value || 0);
    if (!originalAmount || originalAmount <= 0) {
      // For attendance or recruitment, retrieve monthly salary if not passed
      originalAmount = await getEmployeeMonthlySalary(employeeId);
    }
    // Performance Points = Relevant Amount × Configured Percentage / 100
    rawPoints = (originalAmount * appliedRate) / 100;
  } else {
    // Fixed Points
    appliedRate = Number(rule.point_value || 0);
    rawPoints = appliedRate;
  }

  // Round points accurately to 2 decimal places
  const calculatedPoints = Math.round(rawPoints * 100) / 100;

  let pointsEarned = 0;
  let pointsDeducted = 0;
  let netPoints = 0;

  if (rule.action_type === "deduct") {
    pointsDeducted = calculatedPoints;
    netPoints = -calculatedPoints;
  } else {
    pointsEarned = calculatedPoints;
    netPoints = calculatedPoints;
  }

  // 4. Fetch Employee details (Name, Dept, Designation, Institution)
  let employeeName = "Employee";
  let department = "General";
  let designation = "Staff";
  let finalInstitutionId = institutionId || null;

  try {
    const userRes = await db.query(
      `SELECT u.id, u.full_name, u.institution_id,
              up.department, up.designation
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.id = $1 LIMIT 1`,
      [employeeId]
    );

    if (userRes.rows.length > 0) {
      const u = userRes.rows[0];
      employeeName = u.full_name || `Employee #${employeeId}`;
      department = u.department || department;
      designation = u.designation || designation;
      if (!finalInstitutionId && u.institution_id) {
        finalInstitutionId = u.institution_id;
      }
    }
  } catch (err) {
    console.warn("[PerformanceEngine] User details query warning:", err);
  }

  const description =
    customDescription ||
    `${rule.name} (${rule.calc_type === "percentage" ? `${appliedRate}% of ₹${originalAmount.toLocaleString("en-IN")}` : `${appliedRate} pts`})`;

  const txDate = transactionDate ? new Date(transactionDate) : new Date();

  // 5. Insert performance transaction into ledger
  try {
    const insertRes = await db.query(
      `INSERT INTO employee_performance_transactions (
        employee_id,
        employee_name,
        department,
        designation,
        institution_id,
        activity_type,
        category,
        description,
        points_earned,
        points_deducted,
        net_points,
        calc_type,
        original_amount,
        applied_rate,
        reference_module,
        reference_record_id,
        idempotency_key,
        performed_by,
        performed_by_id,
        rule_version,
        transaction_status,
        transaction_date,
        metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      )
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING id`,
      [
        employeeId,
        employeeName,
        department,
        designation,
        finalInstitutionId,
        activityType,
        rule.category,
        description,
        pointsEarned,
        pointsDeducted,
        netPoints,
        rule.calc_type,
        originalAmount,
        appliedRate,
        referenceModule,
        String(referenceRecordId),
        finalIdempotencyKey,
        performedBy?.name || "System Automation",
        performedBy?.id || null,
        rule.version || 1,
        "completed",
        txDate,
        JSON.stringify(metadata),
      ]
    );

    if (insertRes.rows.length === 0) {
      // Conflict happened concurrently
      return {
        success: true,
        duplicate: true,
        pointsEarned,
        pointsDeducted,
        netPoints,
        reason: "Duplicate transaction prevented by concurrency guard",
      };
    }

    return {
      success: true,
      duplicate: false,
      transactionId: insertRes.rows[0].id,
      pointsEarned,
      pointsDeducted,
      netPoints,
    };
  } catch (err: any) {
    console.error("[PerformanceEngine] Transaction insert failed:", err?.message);
    return {
      success: false,
      reason: err?.message || "Failed to record transaction",
      pointsEarned: 0,
      pointsDeducted: 0,
      netPoints: 0,
    };
  }
}

/**
 * Automatically process monthly admin role performance rewards.
 * Checks all active staff members with admin-level roles and awards points if not already awarded this month.
 */
export async function awardMonthlyAdminRewards(
  targetYearMonth?: string // Format: 'YYYY-MM', defaults to current month
): Promise<{ processed: number; awarded: number }> {
  await ensureFeatureSchema();

  const now = new Date();
  const yearMonth =
    targetYearMonth ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  try {
    // Find all users with admin role
    const adminUsersRes = await db.query(`
      SELECT DISTINCT u.id, u.full_name, u.institution_id
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE (
        u.role ILIKE '%admin%' OR
        r.name ILIKE '%admin%' OR
        r.role_name ILIKE '%admin%'
      )
      AND COALESCE(u.is_active, TRUE) = TRUE AND COALESCE(u.is_deleted, FALSE) = FALSE
    `);

    let awarded = 0;
    for (const admin of adminUsersRes.rows) {
      const res = await recordPerformancePoints({
        employeeId: admin.id,
        activityType: "admin_monthly",
        referenceModule: "admin_role",
        referenceRecordId: `${admin.id}_${yearMonth}`,
        idempotencyKey: `admin_monthly:${admin.id}:${yearMonth}`,
        customDescription: `Admin Role Monthly Performance Reward (${yearMonth})`,
        institutionId: admin.institution_id,
        performedBy: { name: "System Scheduler" },
      });

      if (res.success && !res.duplicate) {
        awarded++;
      }
    }

    return {
      processed: adminUsersRes.rows.length,
      awarded,
    };
  } catch (err) {
    console.error("[PerformanceEngine] Monthly admin reward calculation error:", err);
    return { processed: 0, awarded: 0 };
  }
}

