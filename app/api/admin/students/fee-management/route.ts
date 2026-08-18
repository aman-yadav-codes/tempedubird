import { GET as listStudents } from "@/app/api/admin/students/route";
import { requirePermission } from "@/lib/auth/auth";
import {
  canAccessInstitution,
  getRequestedInstitutionId,
  getScopedInstitutionIds,
} from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { ensureSystemNotificationTemplates } from "@/lib/queries/notifications";
import { NotificationService } from "@/services/notificationService";
import { NextResponse } from "next/server";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

async function ensureProgramFeeComponentUnitColumn() {
  await db.query(`
    ALTER TABLE program_fee_components
      ADD COLUMN IF NOT EXISTS fee_unit TEXT NULL
  `);
}

type FeeComponentRow = {
  id: number;
  title: string | null;
  amount: string | number | null;
  unit: string | null;
};

type EnrollmentRow = {
  id: number;
  institution_id?: number | null;
  student_profile_id?: number | null;
  academic_year_id?: number | null;
  admission_date: string | Date | null;
  duration_value: string | number | null;
  duration_unit: string | null;
  fee_components: FeeComponentRow[] | string | null;
  fee_payments?: FeePaymentRow[] | string | null;
};

type FeePaymentRow = {
  id: number;
  academic_year_id?: number | null;
  period_indexes: number[] | string | null;
  payment_method?: string | null;
  status?: string | null;
  subtotal_amount?: string | number | null;
  discount_percent?: string | number | null;
  discount_amount?: string | number | null;
  total_amount: string | number | null;
  transaction_id?: string | null;
  remarks?: string | null;
  screenshot_url?: string | null;
  screenshot_public_id?: string | null;
  screenshot_resource_type?: string | null;
  received_at?: string | Date | null;
  created_at?: string | Date | null;
};

type PaymentSettingsRow = {
  id: number;
  scope_type: string;
  institution_id: number | null;
  upi_id: string | null;
  qr_image_url: string | null;
  is_active: boolean;
};

const UNIT_LABELS: Record<string, { singular: string; plural: string }> = {
  hour: { singular: "hour", plural: "hours" },
  day: { singular: "day", plural: "days" },
  week: { singular: "week", plural: "weeks" },
  month: { singular: "month", plural: "months" },
  year: { singular: "year", plural: "years" },
};

function normalizeUnit(value: unknown) {
  const unit = String(value ?? "").trim().toLowerCase();
  if (!unit) return null;
  if (unit.startsWith("hour")) return "hour";
  if (unit.startsWith("day")) return "day";
  if (unit.startsWith("week")) return "week";
  if (unit.startsWith("month")) return "month";
  if (unit.startsWith("year")) return "year";
  return null;
}

function parseFeeComponents(value: EnrollmentRow["fee_components"]): FeeComponentRow[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseFeePayments(value: EnrollmentRow["fee_payments"]): FeePaymentRow[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parsePeriodIndexes(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);
  }
  if (typeof value === "string") {
    try {
      return parsePeriodIndexes(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

function parseDateOnly(value: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  const [datePart] = value.split("T");
  const parts = datePart.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

function addUnit(date: Date, unit: string, amount: number) {
  const next = new Date(date.getTime());
  if (unit === "hour") next.setUTCHours(next.getUTCHours() + amount);
  if (unit === "day") next.setUTCDate(next.getUTCDate() + amount);
  if (unit === "week") next.setUTCDate(next.getUTCDate() + amount * 7);
  if (unit === "month") next.setUTCMonth(next.getUTCMonth() + amount);
  if (unit === "year") next.setUTCFullYear(next.getUTCFullYear() + amount);
  return next;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTodayDateOnly() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function parsePositiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseDiscountPercent(value: unknown) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), 100);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatNotificationAmount(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "Rs. 0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function buildFeeSummary(enrollment: EnrollmentRow) {
  const durationValue = Math.max(0, Math.floor(Number(enrollment.duration_value ?? 0) || 0));
  const durationUnit = normalizeUnit(enrollment.duration_unit);
  const unitLabel = durationUnit ? UNIT_LABELS[durationUnit] : null;
  const components = parseFeeComponents(enrollment.fee_components);
  const recurringAmount = components.reduce((sum, fee) => {
    const amount = Number(fee.amount ?? 0) || 0;
    return normalizeUnit(fee.unit) === durationUnit ? sum + amount : sum;
  }, 0);
  const oneTimeAmount = components.reduce((sum, fee) => {
    const amount = Number(fee.amount ?? 0) || 0;
    return normalizeUnit(fee.unit) !== durationUnit ? sum + amount : sum;
  }, 0);
  const admissionDate = parseDateOnly(enrollment.admission_date);
  const periods =
    admissionDate && durationUnit && durationValue > 0
      ? Array.from({ length: durationValue }, (_, index) => {
          const startDate = addUnit(admissionDate, durationUnit, index);
          const endDate = addUnit(admissionDate, durationUnit, index + 1);
          const periodAmount = recurringAmount + (index === 0 ? oneTimeAmount : 0);
          return {
            index: index + 1,
            start_date: toIsoDate(startDate),
            end_date: toIsoDate(endDate),
            duration_label: `1 ${unitLabel?.singular ?? durationUnit}`,
            amount: periodAmount,
            paid_amount: 0,
            remaining_amount: periodAmount,
            is_paid: false,
            payment: null as FeePaymentRow | null,
          };
        })
      : [];
  const totalPayable = periods.reduce((sum, period) => sum + period.amount, 0) || recurringAmount + oneTimeAmount;
  const payments = parseFeePayments(enrollment.fee_payments);
  const periodPaidAmounts = payments.reduce<Record<number, number>>((acc, payment) => {
    const indexes = parsePeriodIndexes(payment.period_indexes);
    if (!indexes.length) return acc;
    const paidPerPeriod = (Number(payment.total_amount ?? 0) || 0) / indexes.length;
    indexes.forEach((index) => {
      acc[index] = (acc[index] ?? 0) + paidPerPeriod;
    });
    return acc;
  }, {});
  periods.forEach((period) => {
    const paid = periodPaidAmounts[period.index] ?? 0;
    const payment =
      payments.find((item) => parsePeriodIndexes(item.period_indexes).includes(period.index)) ??
      null;
    period.paid_amount = paid;
    period.remaining_amount = Math.max(period.amount - paid, 0);
    period.is_paid = paid >= period.amount || paid > 0;
    period.payment = payment;
  });
  const paidAmount = payments.reduce(
    (sum, payment) => sum + (Number(payment.total_amount ?? 0) || 0),
    0,
  );
  const today = getTodayDateOnly();
  const currentPeriod =
    periods.find((period) => {
      const startDate = parseDateOnly(period.start_date);
      const endDate = parseDateOnly(period.end_date);
      return Boolean(
        startDate &&
          endDate &&
          today.getTime() >= startDate.getTime() &&
          today.getTime() < endDate.getTime(),
      );
    }) ?? null;
  const currentPeriodPaidAmount = currentPeriod
    ? payments.reduce((sum, payment) => {
        const periodIndexes = parsePeriodIndexes(payment.period_indexes);
        if (!periodIndexes.includes(currentPeriod.index)) return sum;
        const paid = Number(payment.total_amount ?? 0) || 0;
        return sum + paid / Math.max(periodIndexes.length, 1);
      }, 0)
    : 0;
  const currentPeriodAmount = currentPeriod?.amount ?? 0;

  return {
    duration_value: durationValue || null,
    duration_unit: durationUnit,
    duration_label:
      durationValue && unitLabel
        ? `${durationValue} ${durationValue === 1 ? unitLabel.singular : unitLabel.plural}`
        : null,
    recurring_amount: recurringAmount,
    one_time_amount: oneTimeAmount,
    total_payable: totalPayable,
    paid_amount: paidAmount,
    due_amount: Math.max(totalPayable - paidAmount, 0),
    current_period: currentPeriod,
    current_period_amount: currentPeriodAmount,
    current_period_paid_amount: currentPeriodPaidAmount,
    current_period_remaining_amount: Math.max(
      currentPeriodAmount - currentPeriodPaidAmount,
      0,
    ),
    periods,
  };
}

async function ensurePaymentSettingsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS payment_settings (
      id SERIAL PRIMARY KEY,
      scope_type TEXT NOT NULL CHECK (scope_type IN ('platform', 'institution')),
      institution_id INTEGER NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      upi_id TEXT NULL,
      qr_image_url TEXT NULL,
      qr_image_public_id TEXT NULL,
      qr_image_resource_type TEXT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS payment_settings_platform_unique
      ON payment_settings(scope_type)
      WHERE scope_type = 'platform' AND institution_id IS NULL
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS payment_settings_institution_unique
      ON payment_settings(scope_type, institution_id)
      WHERE scope_type = 'institution' AND institution_id IS NOT NULL
  `);
}

async function ensureStudentFeePaymentsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS student_fee_payments (
      id SERIAL PRIMARY KEY,
      student_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
      enrollment_id INTEGER NOT NULL REFERENCES student_enrollments(id) ON DELETE CASCADE,
      institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      academic_year_id INTEGER NULL REFERENCES academic_years(id) ON DELETE SET NULL,
      period_indexes INTEGER[] NOT NULL DEFAULT '{}',
      period_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'qr', 'cash')),
      subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
      discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      transaction_id TEXT NULL,
      screenshot_url TEXT NULL,
      screenshot_public_id TEXT NULL,
      screenshot_resource_type TEXT NULL,
      remarks TEXT NULL,
      status TEXT NOT NULL DEFAULT 'paid',
      submitted_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      received_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      verified_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      rejected_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      verified_at TIMESTAMP NULL,
      rejected_at TIMESTAMP NULL,
      rejection_reason TEXT NULL,
      received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS student_fee_payments_enrollment_idx
      ON student_fee_payments(enrollment_id, status)
  `);

  await db.query(`
    ALTER TABLE student_fee_payments
      ADD COLUMN IF NOT EXISTS remarks TEXT NULL,
      ADD COLUMN IF NOT EXISTS screenshot_url TEXT NULL,
      ADD COLUMN IF NOT EXISTS screenshot_public_id TEXT NULL,
      ADD COLUMN IF NOT EXISTS screenshot_resource_type TEXT NULL,
      ADD COLUMN IF NOT EXISTS academic_year_id INTEGER NULL REFERENCES academic_years(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS submitted_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS verified_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS rejected_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL
  `);

  await db.query(`
    UPDATE student_fee_payments payment
    SET academic_year_id = enrollment.academic_year_id
    FROM student_enrollments enrollment
    WHERE payment.enrollment_id = enrollment.id
      AND payment.academic_year_id IS NULL
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS student_fee_payments_session_idx
      ON student_fee_payments(enrollment_id, academic_year_id, status)
  `);
}

async function getPaymentSettingsForInstitution(institutionId: number | null) {
  await ensurePaymentSettingsTable();
  if (!institutionId) return null;

  const result = await db.query<PaymentSettingsRow>(
    `
      SELECT
        id,
        scope_type,
        institution_id,
        upi_id,
        qr_image_url,
        is_active
      FROM payment_settings
      WHERE is_active = TRUE
        AND (
          (scope_type = 'institution' AND institution_id = $1)
          OR (scope_type = 'platform' AND institution_id IS NULL)
        )
      ORDER BY CASE WHEN scope_type = 'institution' THEN 0 ELSE 1 END
      LIMIT 1
    `,
    [institutionId],
  );

  return result.rows[0] ?? null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  if (action === "payment_requests") {
    try {
      const institutionId = getRequestedInstitutionId(url.searchParams);
      const currentUser = await requirePermission(
        req,
        "managestudents.fee_management.view",
        institutionId,
      );
      if (institutionId && !canAccessInstitution(currentUser, institutionId)) {
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
      }

      await ensureStudentFeePaymentsTable();
      const scopedInstitutionIds = getScopedInstitutionIds(currentUser, institutionId);
      const params: unknown[] = [];
      const scopedWhere =
        scopedInstitutionIds === null
          ? ""
          : scopedInstitutionIds.length === 0
            ? "AND FALSE"
            : `AND sfp.institution_id = ANY($${params.push(scopedInstitutionIds)}::int[])`;

      const result = await db.query(
        `
          SELECT
            sfp.id,
            sfp.student_user_id,
            sfp.student_profile_id,
            sfp.enrollment_id,
            sfp.institution_id,
            sfp.academic_year_id,
            sfp.period_indexes,
            sfp.period_labels,
            sfp.payment_method,
            sfp.subtotal_amount,
            sfp.discount_percent,
            sfp.discount_amount,
            sfp.total_amount,
            sfp.transaction_id,
            sfp.screenshot_url,
            sfp.screenshot_public_id,
            sfp.screenshot_resource_type,
            sfp.remarks,
            sfp.status,
            sfp.created_at,
            student.full_name AS student_name,
            student.email AS student_email,
            sp.admission_number,
            inst.name AS institution_name,
            prog.title AS program_name,
            ay.name AS academic_year_name,
            category.name AS class_category_name,
            section.name AS section_name
          FROM student_fee_payments sfp
          INNER JOIN users student
            ON student.id = sfp.student_user_id
           AND COALESCE(student.is_deleted, FALSE) = FALSE
          INNER JOIN student_profiles sp ON sp.id = sfp.student_profile_id
          INNER JOIN student_enrollments se
            ON se.id = sfp.enrollment_id
           AND COALESCE(se.is_deleted, FALSE) = FALSE
          INNER JOIN institution_profiles inst
            ON inst.id = sfp.institution_id
           AND inst.is_active = TRUE
           AND COALESCE(inst.is_deleted, FALSE) = FALSE
          LEFT JOIN institution_programs prog
            ON prog.id = se.program_id
           AND COALESCE(prog.is_deleted, FALSE) = FALSE
          LEFT JOIN academic_years ay
            ON ay.id = COALESCE(sfp.academic_year_id, se.academic_year_id)
           AND COALESCE(ay.is_deleted, FALSE) = FALSE
          LEFT JOIN categories category ON category.id = se.class_category_id
          LEFT JOIN sections section ON section.id = se.section_id
          WHERE sfp.status = 'pending'
            ${scopedWhere}
          ORDER BY sfp.created_at DESC, sfp.id DESC
        `,
        params,
      );

      return NextResponse.json({ data: result.rows });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (message === "Forbidden: Admin access required") {
        return NextResponse.json({ error: message }, { status: 403 });
      }
      if (message === "Unauthorized" || message === "User not found") {
        return NextResponse.json({ error: message }, { status: 401 });
      }
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (action !== "detail") {
    return listStudents(req);
  }

  try {
    const institutionId = getRequestedInstitutionId(url.searchParams);
    const currentUser = await requirePermission(
      req,
      "managestudents.fee_management.view",
      institutionId,
    );
    if (institutionId && !canAccessInstitution(currentUser, institutionId)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await ensureProgramFeeComponentUnitColumn();
    await Promise.all([
      ensureStudentFeePaymentsTable(),
      ensurePaymentSettingsTable(),
    ]);

    const studentUserId = Number(url.searchParams.get("studentId"));
    if (!Number.isInteger(studentUserId) || studentUserId <= 0) {
      return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
    }

    const scopedInstitutionIds = getScopedInstitutionIds(currentUser, institutionId);
    const params: unknown[] = [studentUserId];
    const scopedEnrollmentWhere =
      scopedInstitutionIds === null
        ? ""
        : scopedInstitutionIds.length === 0
          ? "AND FALSE"
          : `AND se.institution_id = ANY($${params.push(scopedInstitutionIds)}::int[])`;

    const [studentResult, enrollmentsResult, guardiansResult] = await Promise.all([
      db.query(
        `
          SELECT
            u.id,
            u.full_name,
            u.email,
            u.phone,
            u.avatar_url,
            u.is_active,
            u.created_at,
            up.gender,
            COALESCE(ul.formatted_address, ul.full_address) AS address,
            sp.id AS student_profile_id,
            sp.admission_number,
            sp.apar_id,
            sp.date_of_birth
          FROM users u
          LEFT JOIN user_profiles up ON up.user_id = u.id
          LEFT JOIN user_locations ul ON ul.user_id = u.id
          INNER JOIN student_profiles sp ON sp.user_id = u.id
          WHERE u.id = $1
            AND COALESCE(u.is_deleted, FALSE) = FALSE
            AND EXISTS (
              SELECT 1
              FROM student_enrollments se
              WHERE se.student_id = sp.id
                AND COALESCE(se.is_deleted, FALSE) = FALSE
                ${scopedEnrollmentWhere}
            )
          LIMIT 1
        `,
        params,
      ),
      db.query(
        `
          SELECT
            se.id,
            se.institution_id,
            sp.id AS student_profile_id,
            se.program_id,
            se.section_id,
            se.academic_year_id,
            se.roll_number,
            se.admission_date,
            se.status,
            se.remarks,
            inst.name AS institution_name,
            prog.title AS program_name,
            ay.name AS academic_year_name,
            category.name AS class_category_name,
            section.name AS section_name,
            prog.duration_value,
            prog.duration_unit,
            COALESCE(fees.fee_components, '[]'::json) AS fee_components,
            COALESCE(payments.fee_payments, '[]'::json) AS fee_payments
          FROM student_profiles sp
          INNER JOIN student_enrollments se
            ON se.student_id = sp.id
           AND COALESCE(se.is_deleted, FALSE) = FALSE
          INNER JOIN institution_profiles inst
            ON inst.id = se.institution_id
           AND inst.is_active = TRUE
           AND COALESCE(inst.is_deleted, FALSE) = FALSE
          LEFT JOIN institution_programs prog
            ON prog.id = se.program_id
           AND COALESCE(prog.is_deleted, FALSE) = FALSE
          LEFT JOIN academic_years ay
            ON ay.id = se.academic_year_id
           AND COALESCE(ay.is_deleted, FALSE) = FALSE
          LEFT JOIN categories category ON category.id = se.class_category_id
          LEFT JOIN sections section ON section.id = se.section_id
          LEFT JOIN LATERAL (
            SELECT json_agg(
              json_build_object(
                'id', pfc.id,
                'title', pfc.title,
                'amount', pfc.amount,
                'unit', pfc.fee_unit
              )
              ORDER BY pfc.sort_order ASC, pfc.id ASC
            ) AS fee_components
            FROM program_fee_components pfc
            WHERE pfc.program_id = se.program_id
          ) fees ON TRUE
          LEFT JOIN LATERAL (
            SELECT json_agg(
              json_build_object(
                'id', sfp.id,
                'academic_year_id', sfp.academic_year_id,
                'period_indexes', sfp.period_indexes,
                'payment_method', sfp.payment_method,
                'subtotal_amount', sfp.subtotal_amount,
                'discount_percent', sfp.discount_percent,
                'discount_amount', sfp.discount_amount,
                'total_amount', sfp.total_amount,
                'transaction_id', sfp.transaction_id,
                'remarks', sfp.remarks,
                'received_at', sfp.received_at
              )
              ORDER BY sfp.received_at ASC, sfp.id ASC
            ) AS fee_payments
            FROM student_fee_payments sfp
            WHERE sfp.enrollment_id = se.id
              AND sfp.academic_year_id = se.academic_year_id
              AND sfp.status = 'paid'
          ) payments ON TRUE
          WHERE sp.user_id = $1
            ${scopedEnrollmentWhere}
          ORDER BY se.status = 'active' DESC, se.updated_at DESC, se.id DESC
        `,
        params,
      ),
      db.query(
        `
          SELECT
            sg.id,
            sg.guardian_user_id,
            sg.relationship,
            sg.is_primary,
            guardian.full_name AS guardian_name,
            guardian.email AS guardian_email,
            guardian.phone AS guardian_phone
          FROM student_profiles sp
          INNER JOIN student_guardians sg
            ON sg.student_id = sp.id
           AND COALESCE(sg.is_deleted, FALSE) = FALSE
          INNER JOIN users guardian
            ON guardian.id = sg.guardian_user_id
           AND COALESCE(guardian.is_deleted, FALSE) = FALSE
          WHERE sp.user_id = $1
          ORDER BY sg.is_primary DESC, sg.id ASC
        `,
        [studentUserId],
      ),
    ]);

    const student = studentResult.rows[0];
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const enrollments = enrollmentsResult.rows.map((enrollment: EnrollmentRow) => ({
      ...enrollment,
      fee_components: parseFeeComponents(enrollment.fee_components),
      fee_summary: buildFeeSummary(enrollment),
    }));
    const firstInstitutionId = Number(enrollments[0]?.institution_id ?? 0) || null;
    const paymentSettings = await getPaymentSettingsForInstitution(firstInstitutionId);

    return NextResponse.json({
      data: {
        ...student,
        enrollments,
        guardians: guardiansResult.rows,
        payment_settings: paymentSettings,
      },
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    if (message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "Unauthorized" || message === "User not found") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.action === "approve_payment_request") {
      const paymentRequestId = parsePositiveInteger(body.paymentRequestId);
      if (!paymentRequestId) {
        return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
      }

      await ensureStudentFeePaymentsTable();
      const requestResult = await db.query<{
        id: number;
        institution_id: number;
        student_user_id: number;
        student_profile_id: number;
        enrollment_id: number;
        total_amount: string | number | null;
        transaction_id: string | null;
        period_indexes: number[] | string | null;
        student_name: string | null;
        status: string;
      }>(
        `
          SELECT
            sfp.id,
            sfp.institution_id,
            sfp.student_user_id,
            sfp.student_profile_id,
            sfp.enrollment_id,
            sfp.total_amount,
            sfp.transaction_id,
            sfp.period_indexes,
            u.full_name AS student_name,
            sfp.status
          FROM student_fee_payments sfp
          INNER JOIN users u ON u.id = sfp.student_user_id
          WHERE sfp.id = $1
          LIMIT 1
        `,
        [paymentRequestId],
      );
      const paymentRequest = requestResult.rows[0];
      if (!paymentRequest) {
        return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
      }
      if (paymentRequest.status !== "pending") {
        return NextResponse.json({ error: "This payment request is already processed." }, { status: 400 });
      }

      const currentUser = await requirePermission(
        req,
        "managestudents.fee_management.create",
        paymentRequest.institution_id,
      );
      if (!canAccessInstitution(currentUser, paymentRequest.institution_id)) {
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
      }

      const result = await db.query(
        `
          UPDATE student_fee_payments
          SET status = 'paid',
              received_by = $2,
              verified_by = $2,
              received_at = CURRENT_TIMESTAMP,
              verified_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
            AND status = 'pending'
          RETURNING *
        `,
        [paymentRequestId, currentUser.id],
      );

      try {
        await ensureSystemNotificationTemplates(db);
        const guardianResult = await db.query<{ guardian_user_id: number }>(
          `
            SELECT DISTINCT sg.guardian_user_id
            FROM student_guardians sg
            INNER JOIN users guardian ON guardian.id = sg.guardian_user_id
            WHERE sg.student_id = $1
              AND COALESCE(sg.is_deleted, FALSE) = FALSE
              AND guardian.is_active = TRUE
              AND COALESCE(guardian.is_deleted, FALSE) = FALSE
          `,
          [paymentRequest.student_profile_id],
        );
        const recipients = Array.from(
          new Set([
            paymentRequest.student_user_id,
            ...guardianResult.rows.map((row) => row.guardian_user_id),
          ].filter((id) => Number.isInteger(Number(id)) && Number(id) > 0)),
        );
        await new NotificationService(db).create({
          type: "fees.payment_request.approved",
          recipients,
          institutionId: paymentRequest.institution_id,
          entityType: "student_fee_payment",
          entityId: paymentRequest.id,
          createdBy: currentUser.id,
          priority: "normal",
          payload: {
            student_name: paymentRequest.student_name ?? "Student",
            amount: formatNotificationAmount(paymentRequest.total_amount),
            raw_amount: Number(paymentRequest.total_amount ?? 0) || 0,
            period_count: parsePeriodIndexes(paymentRequest.period_indexes).length,
            transaction_id: paymentRequest.transaction_id ?? "",
            payment_request_id: paymentRequest.id,
            enrollment_id: paymentRequest.enrollment_id,
            url: "/admin/classroom/fees",
          },
        });
      } catch (notificationError) {
        console.error("[fee-payment-approved.notification]", notificationError);
      }

      return NextResponse.json({ data: { payment: result.rows[0] } });
    }

    if (body.action === "reject_payment_request") {
      const paymentRequestId = parsePositiveInteger(body.paymentRequestId);
      const rejectionReason = typeof body.rejectionReason === "string" ? body.rejectionReason.trim() : "";
      if (!paymentRequestId) {
        return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
      }
      if (!rejectionReason) {
        return NextResponse.json({ error: "Enter a rejection reason." }, { status: 400 });
      }

      await ensureStudentFeePaymentsTable();
      const requestResult = await db.query<{
        id: number;
        institution_id: number;
        student_user_id: number;
        student_profile_id: number;
        enrollment_id: number;
        total_amount: string | number | null;
        transaction_id: string | null;
        period_indexes: number[] | string | null;
        student_name: string | null;
        status: string;
      }>(
        `
          SELECT
            sfp.id,
            sfp.institution_id,
            sfp.student_user_id,
            sfp.student_profile_id,
            sfp.enrollment_id,
            sfp.total_amount,
            sfp.transaction_id,
            sfp.period_indexes,
            u.full_name AS student_name,
            sfp.status
          FROM student_fee_payments sfp
          INNER JOIN users u ON u.id = sfp.student_user_id
          WHERE sfp.id = $1
          LIMIT 1
        `,
        [paymentRequestId],
      );
      const paymentRequest = requestResult.rows[0];
      if (!paymentRequest) {
        return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
      }
      if (paymentRequest.status !== "pending") {
        return NextResponse.json({ error: "This payment request is already processed." }, { status: 400 });
      }

      const currentUser = await requirePermission(
        req,
        "managestudents.fee_management.create",
        paymentRequest.institution_id,
      );
      if (!canAccessInstitution(currentUser, paymentRequest.institution_id)) {
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
      }

      const result = await db.query(
        `
          UPDATE student_fee_payments
          SET status = 'rejected',
              rejected_by = $2,
              rejection_reason = $3,
              rejected_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
            AND status = 'pending'
          RETURNING *
        `,
        [paymentRequestId, currentUser.id, rejectionReason],
      );

      try {
        await ensureSystemNotificationTemplates(db);
        const guardianResult = await db.query<{ guardian_user_id: number }>(
          `
            SELECT DISTINCT sg.guardian_user_id
            FROM student_guardians sg
            INNER JOIN users guardian ON guardian.id = sg.guardian_user_id
            WHERE sg.student_id = $1
              AND COALESCE(sg.is_deleted, FALSE) = FALSE
              AND guardian.is_active = TRUE
              AND COALESCE(guardian.is_deleted, FALSE) = FALSE
          `,
          [paymentRequest.student_profile_id],
        );
        const recipients = Array.from(
          new Set([
            paymentRequest.student_user_id,
            ...guardianResult.rows.map((row) => row.guardian_user_id),
          ].filter((id) => Number.isInteger(Number(id)) && Number(id) > 0)),
        );
        await new NotificationService(db).create({
          type: "fees.payment_request.rejected",
          recipients,
          institutionId: paymentRequest.institution_id,
          entityType: "student_fee_payment",
          entityId: paymentRequest.id,
          createdBy: currentUser.id,
          priority: "high",
          payload: {
            student_name: paymentRequest.student_name ?? "Student",
            amount: formatNotificationAmount(paymentRequest.total_amount),
            raw_amount: Number(paymentRequest.total_amount ?? 0) || 0,
            period_count: parsePeriodIndexes(paymentRequest.period_indexes).length,
            transaction_id: paymentRequest.transaction_id ?? "",
            rejection_reason: rejectionReason,
            payment_request_id: paymentRequest.id,
            enrollment_id: paymentRequest.enrollment_id,
            url: "/admin/classroom/fees",
          },
        });
      } catch (notificationError) {
        console.error("[fee-payment-rejected.notification]", notificationError);
      }

      return NextResponse.json({ data: { payment: result.rows[0] } });
    }

    const institutionId = parsePositiveInteger(body.institutionId);
    const studentUserId = parsePositiveInteger(body.studentId);
    const enrollmentId = parsePositiveInteger(body.enrollmentId);
    const periodIndexes = parsePeriodIndexes(body.periodIndexes);
    const paymentMethod = String(body.paymentMethod ?? "").trim().toLowerCase();
    const transactionId =
      typeof body.transactionId === "string" ? body.transactionId.trim() : "";
    const remarks =
      typeof body.remarks === "string" ? body.remarks.trim() : "";
    const discountPercent = parseDiscountPercent(body.discountPercent);

    if (!studentUserId || !enrollmentId || !institutionId) {
      return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
    }
    if (!periodIndexes.length) {
      return NextResponse.json({ error: "Select at least one fee month." }, { status: 400 });
    }
    if (!["upi", "qr", "cash"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Select a valid payment method." }, { status: 400 });
    }
    if ((paymentMethod === "upi" || paymentMethod === "qr") && !transactionId) {
      return NextResponse.json({ error: "Enter the transaction ID before confirming payment." }, { status: 400 });
    }

    const currentUser = await requirePermission(
      req,
      "managestudents.fee_management.create",
      institutionId,
    );
    if (!canAccessInstitution(currentUser, institutionId)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await ensureProgramFeeComponentUnitColumn();
    await Promise.all([
      ensureStudentFeePaymentsTable(),
      ensurePaymentSettingsTable(),
    ]);

    const enrollmentResult = await db.query<EnrollmentRow & {
      student_name: string | null;
      admission_number: string | null;
      program_name: string | null;
      section_name: string | null;
      academic_year_name: string | null;
    }>(
      `
        SELECT
          se.id,
          se.institution_id,
          se.academic_year_id,
          sp.id AS student_profile_id,
          se.admission_date,
          se.roll_number,
          prog.title AS program_name,
          section.name AS section_name,
          ay.name AS academic_year_name,
          prog.duration_value,
          prog.duration_unit,
          u.full_name AS student_name,
          sp.admission_number,
          COALESCE(fees.fee_components, '[]'::json) AS fee_components,
          COALESCE(payments.fee_payments, '[]'::json) AS fee_payments
        FROM student_profiles sp
        INNER JOIN users u
          ON u.id = sp.user_id
         AND COALESCE(u.is_deleted, FALSE) = FALSE
        INNER JOIN student_enrollments se
          ON se.student_id = sp.id
         AND COALESCE(se.is_deleted, FALSE) = FALSE
        LEFT JOIN institution_programs prog
          ON prog.id = se.program_id
         AND COALESCE(prog.is_deleted, FALSE) = FALSE
        LEFT JOIN sections section ON section.id = se.section_id
        LEFT JOIN academic_years ay
          ON ay.id = se.academic_year_id
         AND COALESCE(ay.is_deleted, FALSE) = FALSE
        LEFT JOIN LATERAL (
          SELECT json_agg(
            json_build_object(
              'id', pfc.id,
              'title', pfc.title,
              'amount', pfc.amount,
              'unit', pfc.fee_unit
            )
            ORDER BY pfc.sort_order ASC, pfc.id ASC
          ) AS fee_components
          FROM program_fee_components pfc
          WHERE pfc.program_id = se.program_id
        ) fees ON TRUE
        LEFT JOIN LATERAL (
          SELECT json_agg(
            json_build_object(
              'id', sfp.id,
              'academic_year_id', sfp.academic_year_id,
              'period_indexes', sfp.period_indexes,
              'payment_method', sfp.payment_method,
              'subtotal_amount', sfp.subtotal_amount,
              'discount_percent', sfp.discount_percent,
              'discount_amount', sfp.discount_amount,
              'total_amount', sfp.total_amount,
              'transaction_id', sfp.transaction_id,
              'remarks', sfp.remarks,
              'received_at', sfp.received_at
            )
            ORDER BY sfp.received_at ASC, sfp.id ASC
          ) AS fee_payments
          FROM student_fee_payments sfp
          WHERE sfp.enrollment_id = se.id
            AND sfp.academic_year_id = se.academic_year_id
            AND sfp.status = 'paid'
        ) payments ON TRUE
        WHERE u.id = $1
          AND se.id = $2
          AND se.institution_id = $3
        LIMIT 1
      `,
      [studentUserId, enrollmentId, institutionId],
    );

    const enrollment = enrollmentResult.rows[0];
    if (!enrollment || !enrollment.student_profile_id || !enrollment.institution_id) {
      return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
    }

    const paymentSettings = await getPaymentSettingsForInstitution(enrollment.institution_id);
    if (
      (paymentMethod === "upi" || paymentMethod === "qr") &&
      (!paymentSettings || (!paymentSettings.upi_id && !paymentSettings.qr_image_url))
    ) {
      return NextResponse.json(
        { error: "Payment settings are not configured for this institution." },
        { status: 400 },
      );
    }

    const summary = buildFeeSummary(enrollment);
    const uniquePeriodIndexes = Array.from(new Set(periodIndexes)).sort((a, b) => a - b);
    const selectedPeriods = summary.periods.filter((period) =>
      uniquePeriodIndexes.includes(period.index),
    );

    if (selectedPeriods.length !== uniquePeriodIndexes.length) {
      return NextResponse.json({ error: "Selected fee period is invalid." }, { status: 400 });
    }

    const subtotalAmount = roundMoney(
      selectedPeriods.reduce((sum, period) => sum + (Number(period.amount) || 0), 0),
    );
    const discountAmount = roundMoney((subtotalAmount * discountPercent) / 100);
    const totalAmount = roundMoney(Math.max(subtotalAmount - discountAmount, 0));
    const periodLabels = selectedPeriods.map((period) => ({
      index: period.index,
      start_date: period.start_date,
      end_date: period.end_date,
      duration_label: period.duration_label,
      amount: period.amount,
    }));

    const result = await db.query(
      `
        INSERT INTO student_fee_payments (
          student_user_id,
          student_profile_id,
          enrollment_id,
          institution_id,
          academic_year_id,
          period_indexes,
          period_labels,
          payment_method,
          subtotal_amount,
          discount_percent,
          discount_amount,
          total_amount,
          transaction_id,
          remarks,
          status,
          received_by,
          received_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::int[], $7::jsonb, $8, $9, $10, $11, $12, $13, $14, 'paid', $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `,
      [
        studentUserId,
        enrollment.student_profile_id,
        enrollment.id,
        enrollment.institution_id,
        enrollment.academic_year_id,
        uniquePeriodIndexes,
        JSON.stringify(periodLabels),
        paymentMethod,
        subtotalAmount,
        discountPercent,
        discountAmount,
        totalAmount,
        transactionId || null,
        remarks || null,
        currentUser.id,
      ],
    );

    return NextResponse.json({
      data: {
        payment: result.rows[0],
        summary: {
          student_name: enrollment.student_name,
          admission_number: enrollment.admission_number,
          program_name: enrollment.program_name,
          section_name: enrollment.section_name,
          academic_year_name: enrollment.academic_year_name,
          periods: periodLabels,
          subtotal_amount: subtotalAmount,
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          transaction_id: transactionId || null,
          remarks: remarks || null,
        },
      },
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    if (message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "Unauthorized" || message === "User not found") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
