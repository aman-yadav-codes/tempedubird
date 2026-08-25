import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import {
  hasPermission,
  isInstitutionAdminUser,
  isPlatformAdminUser,
  isPlatformFullAccess,
  type PermissionUser,
} from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureStaffSalaryStructureSchema } from "@/lib/queries/user";

type Queryable = {
  query: (text: string, params?: readonly unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

let staffSalaryAttendanceSchemaReady: Promise<void> | null = null;

function positive(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function monthValue(value: unknown) {
  const next = String(value || new Date().toISOString().slice(0, 7));
  if (!/^\d{4}-\d{2}$/.test(next)) throw new Error("Select a valid month");
  return next;
}

function previousMonthValues(month: string, count = 6) {
  const [year, monthIndex] = month.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, monthIndex - 1, 1));
  return Array.from({ length: count }, () => {
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
    return cursor.toISOString().slice(0, 7);
  });
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function canManageStaffSalary(user: PermissionUser, institutionId: number) {
  return (
    isPlatformFullAccess(user) ||
    isPlatformAdminUser(user) ||
    (isInstitutionAdminUser(user) &&
      (hasPermission(user, "managestaff.salary.view", { institutionId }) ||
       hasPermission(user, "managestaff.allstaff.view", { institutionId }))) ||
    hasPermission(user, "managestaff.salary.view") ||
    hasPermission(user, "managestaff.allstaff.view")
  );
}

function ownSalaryPermission(user: PermissionUser) {
  if (user.role_codes.includes("teacher")) return "teacher.myinstitution.mysalary.view";
  if (user.role_codes.includes("driver")) return "driver.myinstitution.mysalary.view";
  return null;
}

async function ensureDefaultSalaryHolidays() {
  await db.query(`
    INSERT INTO institution_calendar_events (
      institution_id,
      academic_year_id,
      title,
      description,
      event_type,
      start_date,
      end_date,
      color,
      created_by
    )
    SELECT
      institution.id,
      institution.default_academic_year_id,
      holiday.title,
      'Default salary holiday',
      'HOLIDAY',
      holiday.holiday_date::timestamp,
      (holiday.holiday_date::timestamp + interval '23 hours 59 minutes 59 seconds'),
      '#ef4444',
      NULL
    FROM institution_profiles institution
    CROSS JOIN (
      VALUES
        ('Independence Day', DATE '2026-08-15'),
        ('Gandhi Jayanti', DATE '2026-10-02'),
        ('Diwali Holiday', DATE '2026-11-09'),
        ('Christmas Day', DATE '2026-12-25'),
        ('Republic Day', DATE '2027-01-26')
    ) AS holiday(title, holiday_date)
    WHERE LOWER(institution.name) = 'mp english school'
      AND COALESCE(institution.is_deleted, FALSE) = FALSE
      AND NOT EXISTS (
        SELECT 1
        FROM institution_calendar_events existing
        WHERE existing.institution_id = institution.id
          AND existing.event_type = 'HOLIDAY'
          AND COALESCE(existing.is_deleted, FALSE) = FALSE
          AND existing.start_date::date = holiday.holiday_date
          AND LOWER(existing.title) = LOWER(holiday.title)
      )
  `);
}

async function ensureAttendanceLookupSchema(queryable: Queryable) {
  await queryable.query(`
    CREATE TABLE IF NOT EXISTS staff_attendance (
      id BIGSERIAL PRIMARY KEY,
      institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
      staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      attendance_date DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
      check_in_time TIME,
      check_out_time TIME,
      remarks TEXT,
      marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
      updated_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
      CONSTRAINT staff_attendance_status_check
        CHECK (status IN ('PRESENT', 'ABSENT', 'LEAVE', 'LATE', 'HALF_DAY'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_attendance_scope
      ON staff_attendance (institution_id, staff_user_id, attendance_date);
    CREATE INDEX IF NOT EXISTS idx_staff_attendance_institution_date
      ON staff_attendance (institution_id, attendance_date);

    CREATE TABLE IF NOT EXISTS staff_salary_payouts (
      id BIGSERIAL PRIMARY KEY,
      institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      salary_month CHAR(7) NOT NULL,
      base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
      deduction_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      bonus_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      manual_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
      payable_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'PAID',
      paid_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      paid_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
      remarks TEXT,
      created_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
      updated_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
      CONSTRAINT staff_salary_payouts_status_check CHECK (status IN ('PAID')),
      CONSTRAINT uq_staff_salary_payout_month UNIQUE (institution_id, staff_user_id, salary_month)
    );

    ALTER TABLE staff_salary_payouts ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(12,2) DEFAULT 0;
    ALTER TABLE staff_salary_payouts ADD COLUMN IF NOT EXISTS manual_deduction NUMERIC(12,2) DEFAULT 0;

    CREATE INDEX IF NOT EXISTS idx_staff_salary_payouts_institution_month
      ON staff_salary_payouts (institution_id, salary_month, paid_at DESC);
    CREATE INDEX IF NOT EXISTS idx_staff_salary_payouts_staff_month
      ON staff_salary_payouts (staff_user_id, salary_month DESC);
  `);
}

function ensureStaffSalarySchemas() {
  staffSalaryAttendanceSchemaReady ??= (async () => {
    await ensureStaffSalaryStructureSchema(db);
    await ensureAttendanceLookupSchema(db);
    await ensureDefaultSalaryHolidays();
  })();
  return staffSalaryAttendanceSchemaReady;
}

async function assertStaffMembership(userId: number, institutionId: number) {
  const result = await db.query(
    `
      SELECT 1
      FROM institution_memberships im
      INNER JOIN roles r ON r.id = im.role_id
      INNER JOIN users u ON u.id = im.user_id
      WHERE im.user_id = $1
        AND im.institution_id = $2
        AND im.is_active = TRUE
        AND COALESCE(im.is_deleted, FALSE) = FALSE
        AND r.code <> 'student'
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
      UNION
      SELECT 1
      FROM user_profiles up
      INNER JOIN user_roles ur ON ur.user_id = up.user_id
      INNER JOIN roles r ON r.id = ur.role_id
      INNER JOIN users u ON u.id = up.user_id
      WHERE up.user_id = $1
        AND up.under_institution_id = $2
        AND r.code <> 'student'
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [userId, institutionId]
  );
  if (!result.rows[0]) throw new Error("Staff member does not belong to this institution");
}

async function listMonthlySalary(institutionId: number, month: string, staffUserId?: number) {
  const params: unknown[] = [institutionId, month];
  const staffFilter = staffUserId ? `AND u.id = $${params.push(staffUserId)}` : "";

  const result = await db.query(
    `
      WITH raw_staff_scope AS (
        SELECT
          im.user_id AS staff_user_id,
          u.full_name,
          u.email,
          r.code AS role_code,
          r.name AS role_name,
          im.join_date
        FROM institution_memberships im
        INNER JOIN roles r ON r.id = im.role_id AND r.code <> 'student'
        INNER JOIN users u ON u.id = im.user_id
        WHERE im.institution_id = $1
          AND im.is_active = TRUE
          AND COALESCE(im.is_deleted, FALSE) = FALSE
          AND u.is_active = TRUE
          AND COALESCE(u.is_deleted, FALSE) = FALSE
          ${staffFilter}

        UNION

        SELECT
          up.user_id AS staff_user_id,
          u.full_name,
          u.email,
          r.code AS role_code,
          r.name AS role_name,
          up.joining_date AS join_date
        FROM user_profiles up
        INNER JOIN user_roles ur ON ur.user_id = up.user_id
        INNER JOIN roles r ON r.id = ur.role_id AND r.code <> 'student'
        INNER JOIN users u ON u.id = up.user_id
        WHERE up.under_institution_id = $1
          AND u.is_active = TRUE
          AND COALESCE(u.is_deleted, FALSE) = FALSE
          ${staffFilter}
      ),
      staff_scope AS (
        SELECT DISTINCT ON (staff_user_id)
          staff_user_id,
          full_name,
          email,
          role_code,
          role_name,
          join_date
        FROM raw_staff_scope
        ORDER BY staff_user_id, role_code DESC
      ),
      month_bounds AS (
        SELECT
          ($2 || '-01')::date AS month_start,
          (date_trunc('month', ($2 || '-01')::date) + interval '1 month - 1 day')::date AS month_end,
          timezone('Asia/Kolkata', NOW())::date AS today
      ),
      effective_bounds AS (
        SELECT
          month_start,
          month_end,
          CASE
            WHEN today < month_start THEN month_start - interval '1 day'
            WHEN today > month_end THEN month_end
            ELSE today
          END::date AS effective_end
        FROM month_bounds
      ),
      holiday_dates AS (
        SELECT DISTINCT calendar_day::date AS holiday_date
        FROM institution_calendar_events event
        CROSS JOIN LATERAL generate_series(event.start_date::date, event.end_date::date, interval '1 day') AS calendar_day
        CROSS JOIN month_bounds
        WHERE event.institution_id = $1
          AND event.event_type = 'HOLIDAY'
          AND COALESCE(event.is_deleted, FALSE) = FALSE
          AND calendar_day::date BETWEEN month_bounds.month_start AND month_bounds.month_end
      ),
      working_dates AS (
        SELECT calendar_day::date AS work_date
        FROM month_bounds
        CROSS JOIN LATERAL generate_series(month_start, month_end, interval '1 day') AS calendar_day
        LEFT JOIN holiday_dates holidays ON holidays.holiday_date = calendar_day::date
        WHERE EXTRACT(ISODOW FROM calendar_day::date) <> 7
          AND holidays.holiday_date IS NULL
      ),
      elapsed_working_dates AS (
        SELECT work_date
        FROM working_dates
        CROSS JOIN effective_bounds
        WHERE work_date BETWEEN effective_bounds.month_start AND effective_bounds.effective_end
      ),
      salary_totals AS (
        SELECT
          ssc.user_id,
          COALESCE(
            SUM(CASE WHEN COALESCE(ssc.component_type, 'EARNING') = 'DEDUCTION' THEN -ssc.amount ELSE ssc.amount END),
            0
          )::numeric(12,2) AS base_salary,
          COALESCE(
            json_agg(
              json_build_object(
                'label', ssc.label,
                'amount', ssc.amount,
                'type', COALESCE(ssc.component_type, 'EARNING')
              )
              ORDER BY ssc.sort_order, ssc.id
            ) FILTER (WHERE ssc.id IS NOT NULL),
            '[]'::json
          ) AS components
        FROM staff_salary_components ssc
        GROUP BY ssc.user_id
      ),
      attendance_totals AS (
        SELECT
          sa.staff_user_id,
          COUNT(*) FILTER (WHERE sa.status = 'PRESENT')::int AS present_days,
          COUNT(*) FILTER (WHERE sa.status = 'LATE')::int AS late_days,
          COUNT(*) FILTER (WHERE sa.status = 'HALF_DAY')::int AS half_days,
          COUNT(*) FILTER (WHERE sa.status = 'ABSENT')::int AS absent_days,
          COUNT(*) FILTER (WHERE sa.status = 'LEAVE')::int AS leave_days
        FROM staff_attendance sa
        INNER JOIN elapsed_working_dates elapsed ON elapsed.work_date = sa.attendance_date
        WHERE sa.institution_id = $1
          AND to_char(sa.attendance_date, 'YYYY-MM') = $2
        GROUP BY sa.staff_user_id
      ),
      payout_totals AS (
        SELECT
          ssp.staff_user_id,
          ssp.id AS payout_id,
          ssp.status AS payout_status,
          ssp.payable_salary::text AS paid_amount,
          COALESCE(ssp.bonus_amount, 0)::text AS paid_bonus,
          COALESCE(ssp.manual_deduction, 0)::text AS paid_manual_deduction,
          ssp.remarks AS paid_remarks,
          ssp.paid_at,
          payer.full_name AS paid_by_name
        FROM staff_salary_payouts ssp
        LEFT JOIN users payer ON payer.id = ssp.paid_by
        WHERE ssp.institution_id = $1
          AND ssp.salary_month = $2
      ),
      payment_history AS (
        SELECT
          ssp.staff_user_id,
          COALESCE(
            json_agg(
              json_build_object(
                'salary_month', ssp.salary_month,
                'base_salary', ssp.base_salary,
                'deduction_amount', ssp.deduction_amount,
                'bonus_amount', COALESCE(ssp.bonus_amount, 0),
                'manual_deduction', COALESCE(ssp.manual_deduction, 0),
                'payable_salary', ssp.payable_salary,
                'remarks', ssp.remarks,
                'status', ssp.status,
                'paid_at', ssp.paid_at,
                'paid_by_name', payer.full_name
              )
              ORDER BY ssp.salary_month DESC
            ),
            '[]'::json
          ) AS history
        FROM staff_salary_payouts ssp
        LEFT JOIN users payer ON payer.id = ssp.paid_by
        WHERE ssp.institution_id = $1
        GROUP BY ssp.staff_user_id
      ),
      month_meta AS (
        SELECT
          EXTRACT(day FROM (date_trunc('month', ($2 || '-01')::date) + interval '1 month - 1 day'))::int AS days_in_month,
          (SELECT COUNT(*)::int FROM working_dates) AS working_days,
          (SELECT COUNT(*)::int FROM elapsed_working_dates) AS elapsed_working_days
      )
      SELECT
        staff_scope.staff_user_id,
        staff_scope.full_name,
        staff_scope.email,
        staff_scope.role_code,
        staff_scope.join_date,
        COALESCE(salary_totals.base_salary, 0)::text AS base_salary,
        COALESCE(salary_totals.components, '[]'::json) AS components,
        month_meta.days_in_month,
        month_meta.working_days,
        month_meta.elapsed_working_days,
        COALESCE(attendance_totals.present_days, 0) AS present_days,
        COALESCE(attendance_totals.late_days, 0) AS late_days,
        COALESCE(attendance_totals.half_days, 0) AS half_days,
        COALESCE(attendance_totals.absent_days, 0) AS absent_days,
        COALESCE(attendance_totals.leave_days, 0) AS leave_days,
        payout_totals.payout_id,
        payout_totals.payout_status,
        payout_totals.paid_amount,
        payout_totals.paid_bonus,
        payout_totals.paid_manual_deduction,
        payout_totals.paid_remarks,
        payout_totals.paid_at,
        payout_totals.paid_by_name,
        COALESCE(payment_history.history, '[]'::json) AS payment_history
      FROM staff_scope
      CROSS JOIN month_meta
      LEFT JOIN salary_totals ON salary_totals.user_id = staff_scope.staff_user_id
      LEFT JOIN attendance_totals ON attendance_totals.staff_user_id = staff_scope.staff_user_id
      LEFT JOIN payout_totals ON payout_totals.staff_user_id = staff_scope.staff_user_id
      LEFT JOIN payment_history ON payment_history.staff_user_id = staff_scope.staff_user_id
      ORDER BY staff_scope.full_name ASC
    `,
    params
  );

  return result.rows.map((row) => {
    const baseSalary = Number(row.base_salary || 0);
    const workingDays = Number(row.working_days || 0);
    const elapsedWorkingDays = Number(row.elapsed_working_days || 0);
    const presentDays = Number(row.present_days || 0);
    const lateDays = Number(row.late_days || 0);
    const halfDays = Number(row.half_days || 0);
    const paidDays = presentDays + lateDays + halfDays * 0.5;
    const deductionDays = Math.max(elapsedWorkingDays - paidDays, 0);
    const perDaySalary = workingDays > 0 ? baseSalary / workingDays : 0;
    const deductionAmount = perDaySalary * deductionDays;
    const payableSalary = perDaySalary * paidDays;
    const paidBonus = Number(row.paid_bonus || 0);
    const paidManualDeduction = Number(row.paid_manual_deduction || 0);

    return {
      ...row,
      base_salary: Number(baseSalary.toFixed(2)),
      per_day_salary: Number(perDaySalary.toFixed(2)),
      paid_days: Number(paidDays.toFixed(2)),
      deduction_days: Number(deductionDays.toFixed(2)),
      deduction_amount: Number(deductionAmount.toFixed(2)),
      payable_salary: Number(payableSalary.toFixed(2)),
      payout_id: row.payout_id ? Number(row.payout_id) : null,
      payout_status: row.payout_status ?? null,
      paid_amount: row.paid_amount == null ? null : Number(Number(row.paid_amount).toFixed(2)),
      paid_bonus: Number(paidBonus.toFixed(2)),
      paid_manual_deduction: Number(paidManualDeduction.toFixed(2)),
      paid_remarks: row.paid_remarks || "",
    };
  });
}

async function listMonthlyExpenses(institutionId: number) {
  const result = await db.query(
    `
      SELECT
        salary_month,
        COUNT(*)::int AS paid_count,
        COALESCE(SUM(payable_salary), 0)::numeric(12,2)::text AS paid_total,
        MAX(paid_at) AS last_paid_at
      FROM staff_salary_payouts
      WHERE institution_id = $1
      GROUP BY salary_month
      ORDER BY salary_month DESC
      LIMIT 24
    `,
    [institutionId]
  );

  return result.rows.map((row) => ({
    ...row,
    paid_total: Number(row.paid_total || 0),
  }));
}

async function listPaidHistory(institutionId: number, month: string, staffUserId?: number) {
  const params: unknown[] = [institutionId, month];
  const staffFilter = staffUserId ? `AND ssp.staff_user_id = $${params.push(staffUserId)}` : "";

  const result = await db.query(
    `
      SELECT
        ssp.id,
        ssp.staff_user_id,
        u.full_name,
        u.email,
        COALESCE(r.code, 'staff') AS role_code,
        im.join_date,
        ssp.salary_month,
        ssp.base_salary::text AS base_salary,
        ssp.deduction_amount::text AS deduction_amount,
        COALESCE(ssp.bonus_amount, 0)::text AS bonus_amount,
        COALESCE(ssp.manual_deduction, 0)::text AS manual_deduction,
        ssp.payable_salary::text AS payable_salary,
        ssp.remarks,
        ssp.status,
        ssp.paid_at,
        payer.full_name AS paid_by_name
      FROM staff_salary_payouts ssp
      INNER JOIN users u ON u.id = ssp.staff_user_id
      LEFT JOIN institution_memberships im
        ON im.user_id = ssp.staff_user_id
       AND im.institution_id = ssp.institution_id
       AND im.is_active = TRUE
       AND COALESCE(im.is_deleted, FALSE) = FALSE
      LEFT JOIN roles r ON r.id = im.role_id
      LEFT JOIN users payer ON payer.id = ssp.paid_by
      WHERE ssp.institution_id = $1
        AND ssp.salary_month = $2
        ${staffFilter}
      ORDER BY ssp.paid_at DESC, u.full_name ASC
    `,
    params
  );

  return result.rows.map((row) => ({
    ...row,
    id: Number(row.id),
    staff_user_id: Number(row.staff_user_id),
    base_salary: Number(Number(row.base_salary || 0).toFixed(2)),
    deduction_amount: Number(Number(row.deduction_amount || 0).toFixed(2)),
    bonus_amount: Number(Number(row.bonus_amount || 0).toFixed(2)),
    manual_deduction: Number(Number(row.manual_deduction || 0).toFixed(2)),
    payable_salary: Number(Number(row.payable_salary || 0).toFixed(2)),
    remarks: row.remarks || "",
  }));
}

async function listPreviousUnpaidSalary(institutionId: number, month: string, staffUserId?: number) {
  const months = previousMonthValues(month, 6);
  const monthlyRows = await Promise.all(months.map((targetMonth) => listMonthlySalary(institutionId, targetMonth, staffUserId)));

  return monthlyRows.flatMap((rows, index) =>
    rows
      .filter((row) => row.payout_status !== "PAID" && Number(row.payable_salary) > 0)
      .map((row) => ({
        staff_user_id: Number(row.staff_user_id),
        full_name: row.full_name,
        email: row.email,
        role_code: row.role_code,
        salary_month: months[index],
        base_salary: row.base_salary,
        per_day_salary: row.per_day_salary,
        paid_days: row.paid_days,
        working_days: row.working_days,
        elapsed_working_days: row.elapsed_working_days,
        deduction_days: row.deduction_days,
        deduction_amount: row.deduction_amount,
        payable_salary: row.payable_salary,
      }))
  );
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureStaffSalarySchemas();

    const url = new URL(req.url);
    const institutionId = positive(url.searchParams.get("institutionId"));
    const mode = url.searchParams.get("mode") === "self" ? "self" : "admin";
    const month = monthValue(url.searchParams.get("month"));

    if (!institutionId) return NextResponse.json({ salary: [] });
    assertCanAccessInstitution(currentUser, institutionId);

    if (mode === "self") {
      const permission = ownSalaryPermission(currentUser);
      if (!permission || !hasPermission(currentUser, permission, { institutionId })) {
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
      }
      await assertStaffMembership(currentUser.id, institutionId);
      const [salary, paidHistory, unpaidSalary] = await Promise.all([
        listMonthlySalary(institutionId, month, currentUser.id),
        listPaidHistory(institutionId, month, currentUser.id),
        listPreviousUnpaidSalary(institutionId, month, currentUser.id),
      ]);
      return NextResponse.json({ salary, paidHistory, unpaidSalary });
    }

    if (!canManageStaffSalary(currentUser, institutionId)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const [salary, expenses, paidHistory, unpaidSalary] = await Promise.all([
      listMonthlySalary(institutionId, month),
      listMonthlyExpenses(institutionId),
      listPaidHistory(institutionId, month),
      listPreviousUnpaidSalary(institutionId, month),
    ]);
    return NextResponse.json({ salary, expenses, paidHistory, unpaidSalary });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status =
      message === "Forbidden: Admin access required" ||
      message === "Staff member does not belong to this institution"
        ? 403
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureStaffSalarySchemas();
    const body = await req.json();
    const institutionId = positive(body.institutionId);
    const month = monthValue(body.month);
    const staffUserIds = Array.isArray(body.staffUserIds)
      ? body.staffUserIds.map(positive).filter(Boolean)
      : [];
    const payments: {
      staffUserId: number;
      month: string;
      bonusAmount?: number;
      manualDeduction?: number;
      customPayableSalary?: number;
      remarks?: string;
    }[] = Array.isArray(body.payments)
      ? body.payments
          .map((payment: {
            staffUserId?: unknown;
            month?: unknown;
            bonusAmount?: unknown;
            manualDeduction?: unknown;
            customPayableSalary?: unknown;
            remarks?: unknown;
          }) => ({
            staffUserId: positive(payment?.staffUserId),
            month: monthValue(payment?.month ?? month),
            bonusAmount: Math.max(0, Number(payment?.bonusAmount) || 0),
            manualDeduction: Math.max(0, Number(payment?.manualDeduction) || 0),
            customPayableSalary: payment?.customPayableSalary != null ? Number(payment?.customPayableSalary) : undefined,
            remarks: payment?.remarks ? String(payment.remarks).trim() : undefined,
          }))
          .filter((payment) => payment.staffUserId > 0)
      : staffUserIds.map((staffUserId) => ({
          staffUserId,
          month,
          bonusAmount: Math.max(0, Number(body.bonusAmount) || 0),
          manualDeduction: Math.max(0, Number(body.manualDeduction) || 0),
          remarks: body.remarks ? String(body.remarks).trim() : undefined,
        }));

    if (!institutionId) throw new Error("Select an institution");
    if (payments.length === 0) throw new Error("Select at least one staff member");
    assertCanAccessInstitution(currentUser, institutionId);
    if (!canManageStaffSalary(currentUser, institutionId)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const uniqueMonths = Array.from(new Set(payments.map((payment) => payment.month)));
    const salaryRowsByMonth = new Map<string, Awaited<ReturnType<typeof listMonthlySalary>>>();
    await Promise.all(uniqueMonths.map(async (targetMonth) => {
      salaryRowsByMonth.set(targetMonth, await listMonthlySalary(institutionId, targetMonth));
    }));
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      for (const payment of payments) {
        const salaryRows = salaryRowsByMonth.get(payment.month) ?? [];
        const salary = salaryRows.find((row) => Number(row.staff_user_id) === payment.staffUserId);
        if (!salary) continue;

        const bonusAmount = payment.bonusAmount ?? (Math.max(0, Number(body.bonusAmount) || 0));
        const manualDeduction = payment.manualDeduction ?? (Math.max(0, Number(body.manualDeduction) || 0));
        const totalDeductions = Number((Number(salary.deduction_amount) + manualDeduction).toFixed(2));
        const finalPayable = payment.customPayableSalary != null
          ? Math.max(0, Number(payment.customPayableSalary.toFixed(2)))
          : Math.max(0, Number((Number(salary.payable_salary) + bonusAmount - manualDeduction).toFixed(2)));
        const paymentRemarks = payment.remarks || String(body.remarks || "").trim();

        await client.query(
          `
            INSERT INTO staff_salary_payouts (
              institution_id,
              staff_user_id,
              salary_month,
              base_salary,
              deduction_amount,
              bonus_amount,
              manual_deduction,
              payable_salary,
              status,
              paid_by,
              paid_at,
              remarks,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PAID', $9, timezone('Asia/Kolkata', NOW()), NULLIF($10, ''), timezone('Asia/Kolkata', NOW()))
            ON CONFLICT (institution_id, staff_user_id, salary_month)
            DO UPDATE SET
              base_salary = EXCLUDED.base_salary,
              deduction_amount = EXCLUDED.deduction_amount,
              bonus_amount = EXCLUDED.bonus_amount,
              manual_deduction = EXCLUDED.manual_deduction,
              payable_salary = EXCLUDED.payable_salary,
              status = 'PAID',
              paid_by = EXCLUDED.paid_by,
              paid_at = timezone('Asia/Kolkata', NOW()),
              remarks = EXCLUDED.remarks,
              updated_at = timezone('Asia/Kolkata', NOW())
          `,
          [
            institutionId,
            payment.staffUserId,
            payment.month,
            salary.base_salary,
            totalDeductions,
            bonusAmount,
            manualDeduction,
            finalPayable,
            currentUser.id,
            paymentRemarks,
          ]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
