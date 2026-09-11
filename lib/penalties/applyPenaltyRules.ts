/**
 * applyPenaltyRules.ts
 *
 * Shared penalty engine — loads matching active rules from `penalty_rules`,
 * computes the deduction (fixed or per-unit with optional cap), writes to
 * both `task_score_adjustments` and `staff_performance_points_ledger`.
 *
 * Called from:
 *   - Staff attendance API  (rule_type = 'attendance_late')
 *   - Task deadline checker (rule_type = 'task_deadline')
 */

import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApplyPenaltyParams {
  /** Which rule category to match */
  ruleType: "attendance_late" | "task_deadline";
  /** Institution to scope rules to (also checks global rules where institution_id IS NULL) */
  institutionId: number | null;
  /** Target staff member */
  employeeId: number;
  employeeName?: string;
  /** If triggered from a task context */
  taskId?: number | null;
  /**
   * The measured overrun in `overdueUnit` units.
   * e.g. 25 minutes late, or 2.5 days overdue.
   */
  overdueValue: number;
  overdueUnit: "minutes" | "hours" | "days";
  /** Prepended to the auto-generated reason string stored in the ledger */
  context: string;
  createdBy?: number | null;
  createdByName?: string;
}

export interface PenaltyResult {
  penaltyApplied: number; // total points deducted (positive number)
  rulesMatched: number;
  details: Array<{ ruleName: string; points: number }>;
}

// ─── Unit normaliser ──────────────────────────────────────────────────────────

/**
 * Convert the measured overdue value to the same unit as the rule's threshold.
 */
function normaliseToUnit(
  value: number,
  from: "minutes" | "hours" | "days",
  to: "minutes" | "hours" | "days"
): number {
  const toMinutes: Record<string, number> = { minutes: 1, hours: 60, days: 1440 };
  const inMinutes = value * toMinutes[from];
  return inMinutes / toMinutes[to];
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function applyPenaltyRules(
  params: ApplyPenaltyParams
): Promise<PenaltyResult> {
  const {
    ruleType,
    institutionId,
    employeeId,
    employeeName,
    taskId,
    overdueValue,
    overdueUnit,
    context,
    createdBy,
    createdByName,
  } = params;

  // Ensure tables exist
  await ensureFeatureSchema();

  // ── 1. Load matching active rules ──────────────────────────────────────────
  const rulesRes = await db.query(
    `SELECT *
     FROM penalty_rules
     WHERE rule_type = $1
       AND is_active = TRUE
       AND (institution_id = $2 OR institution_id IS NULL)
     ORDER BY threshold_value ASC, institution_id NULLS LAST`,
    [ruleType, institutionId ?? null]
  );

  if (rulesRes.rows.length === 0) {
    return { penaltyApplied: 0, rulesMatched: 0, details: [] };
  }

  const result: PenaltyResult = { penaltyApplied: 0, rulesMatched: 0, details: [] };

  // ── 2. Evaluate each rule ──────────────────────────────────────────────────
  for (const rule of rulesRes.rows) {
    const thresholdInInputUnit = normaliseToUnit(
      parseFloat(rule.threshold_value),
      rule.threshold_unit as "minutes" | "hours" | "days",
      overdueUnit
    );

    // Rule fires only if overdue > threshold
    if (overdueValue <= thresholdInInputUnit) continue;

    const overrun = overdueValue - thresholdInInputUnit; // how far past threshold

    let deduction = parseFloat(rule.penalty_points);

    if (rule.penalty_mode === "per_unit") {
      // Multiply by the number of full units overrun
      const units = Math.ceil(overrun); // round up (partial unit = full penalty)
      deduction = parseFloat(rule.penalty_points) * units;
    }

    // Apply cap if set
    if (rule.max_penalty != null) {
      deduction = Math.min(deduction, parseFloat(rule.max_penalty));
    }

    deduction = Math.round(deduction * 100) / 100; // 2 dp
    if (deduction <= 0) continue;

    const reason =
      `[Auto Penalty: ${rule.name}] ${context} ` +
      `(${overdueValue} ${overdueUnit} ${ruleType === "attendance_late" ? "late" : "overdue"}, ` +
      `rule threshold: ${rule.threshold_value} ${rule.threshold_unit})`;

    // ── 3a. Insert into task_score_adjustments ─────────────────────────────
    await db
      .query(
        `INSERT INTO task_score_adjustments (
           task_id, institution_id, employee_id, employee_name,
           adjustment_type, points, reason, created_by, created_by_name,
           created_at
         ) VALUES ($1, $2, $3, $4, 'penalty', $5, $6, $7, $8, NOW())`,
        [
          taskId ?? null,
          institutionId ?? null,
          employeeId,
          employeeName ?? null,
          deduction,
          reason,
          createdBy ?? null,
          createdByName ?? "System (Auto)",
        ]
      )
      .catch((err: Error) =>
        console.error("[applyPenaltyRules] task_score_adjustments insert error:", err.message)
      );

    // ── 3b. Mirror into staff_performance_points_ledger ────────────────────
    await db
      .query(
        `INSERT INTO staff_performance_points_ledger (
           employee_id, institution_id, task_id,
           point_type, points, reason, awarded_by, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          employeeId,
          institutionId ?? null,
          taskId ?? null,
          ruleType === "attendance_late" ? "auto_attendance_penalty" : "auto_deadline_penalty",
          -deduction, // negative = deduction
          reason,
          createdBy ?? null,
        ]
      )
      .catch((err: Error) =>
        console.error("[applyPenaltyRules] ledger insert error:", err.message)
      );

    result.penaltyApplied += deduction;
    result.rulesMatched += 1;
    result.details.push({ ruleName: rule.name, points: deduction });
  }

  return result;
}

// ─── Attendance helper ─────────────────────────────────────────────────────────

/**
 * Compute how many minutes late a staff member is, given their check-in time.
 * Reads the institution's attendance setup (start_time + grace_period_mins).
 * Falls back to 09:00 + 0 min grace if no setup found.
 *
 * Returns 0 if on time or early.
 */
export async function computeMinutesLate(
  checkInTime: string, // "HH:MM" or "HH:MM:SS"
  institutionId: number | null
): Promise<number> {
  let startHH = 9;
  let startMM = 0;
  let graceMins = 0;

  if (institutionId) {
    const setupRes = await db
      .query(
        `SELECT start_time, grace_period_mins
         FROM institution_attendance_setups
         WHERE (institution_id = $1 OR institution_id IS NULL)
           AND is_active = TRUE
         ORDER BY institution_id NULLS LAST, is_default DESC
         LIMIT 1`,
        [institutionId]
      )
      .catch(() => ({ rows: [] as any[] }));

    if (setupRes.rows[0]) {
      const parts = String(setupRes.rows[0].start_time || "09:00").split(":");
      startHH = parseInt(parts[0] ?? "9", 10);
      startMM = parseInt(parts[1] ?? "0", 10);
      graceMins = parseInt(setupRes.rows[0].grace_period_mins ?? "0", 10);
    }
  }

  // Deadline = start + grace
  const deadlineMinutes = startHH * 60 + startMM + graceMins;

  // Parse actual check-in
  const ciParts = String(checkInTime).split(":");
  const ciMinutes = parseInt(ciParts[0] ?? "0", 10) * 60 + parseInt(ciParts[1] ?? "0", 10);

  return Math.max(0, ciMinutes - deadlineMinutes);
}
