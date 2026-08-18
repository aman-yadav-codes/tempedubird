import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import {
  ACTIVE_CHILD_QUERY_PARAM,
} from "@/lib/auth/active-child";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getParentChildEnrollmentContexts,
  getStudentEnrollmentContexts,
  resolveStudentEnrollmentContext,
} from "@/lib/auth/student-enrollment-context";
import { db } from "@/lib/db/db";
import { ensureSystemNotificationTemplates } from "@/lib/queries/notifications";
import { NotificationService } from "@/services/notificationService";

type FeeComponentRow = {
  id: number;
  title: string | null;
  amount: string | number | null;
  unit: string | null;
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
  rejection_reason?: string | null;
  screenshot_url?: string | null;
  screenshot_public_id?: string | null;
  screenshot_resource_type?: string | null;
  received_at?: string | Date | null;
  created_at?: string | Date | null;
};

type EnrollmentRow = {
  id: number;
  institution_id: number | null;
  student_profile_id: number | null;
  student_user_id: number | null;
  student_name: string | null;
  student_email: string | null;
  admission_number: string | null;
  program_id: number | null;
  section_id: number | null;
  academic_year_id: number | null;
  roll_number: string | null;
  admission_date: string | Date | null;
  status: string | null;
  institution_name: string | null;
  program_name: string | null;
  academic_year_name: string | null;
  class_category_name: string | null;
  section_name: string | null;
  duration_value: string | number | null;
  duration_unit: string | null;
  fee_components: FeeComponentRow[] | string | null;
  fee_payments?: FeePaymentRow[] | string | null;
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

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to load fees";
  const status =
    message === "Forbidden: Admin access required" ||
    message === "Forbidden: Invalid child context"
      ? 403
      : message === "Unauthorized" || message === "User not found"
        ? 401
        : 500;
  return NextResponse.json({ error: message }, { status });
}

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

function parsePositiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

async function ensureFeeSupportTables() {
  await db.query(`
    ALTER TABLE program_fee_components
      ADD COLUMN IF NOT EXISTS fee_unit TEXT NULL
  `);

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
    ALTER TABLE student_fee_payments
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
  if (!institutionId) return null;
  const result = await db.query<PaymentSettingsRow>(
    `
      SELECT id, scope_type, institution_id, upi_id, qr_image_url, is_active
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

async function getInstitutionAdminIds(institutionId: number) {
  const result = await db.query<{ user_id: number }>(
    `
      SELECT DISTINCT im.user_id
      FROM institution_memberships im
      INNER JOIN roles r ON r.id = im.role_id
      INNER JOIN users u ON u.id = im.user_id
      WHERE im.institution_id = $1
        AND im.is_active = TRUE
        AND COALESCE(im.is_deleted, FALSE) = FALSE
        AND r.code = 'institution_admin'
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
    `,
    [institutionId],
  );
  return result.rows.map((row) => row.user_id);
}

function formatNotificationAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
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
          const amount = recurringAmount + (index === 0 ? oneTimeAmount : 0);
          return {
            index: index + 1,
            start_date: toIsoDate(startDate),
            end_date: toIsoDate(endDate),
            duration_label: `1 ${unitLabel?.singular ?? durationUnit}`,
            amount,
            paid_amount: 0,
            remaining_amount: amount,
            is_paid: false,
            payment: null as FeePaymentRow | null,
          };
        })
      : [];
  const payments = parseFeePayments(enrollment.fee_payments);
  const paidPayments = payments.filter((payment) => String(payment.status ?? "paid") === "paid");
  const pendingPayments = payments.filter((payment) => String(payment.status ?? "") === "pending");
  const rejectedPayments = payments.filter((payment) => String(payment.status ?? "") === "rejected");
  const paidByPeriod = paidPayments.reduce<Record<number, number>>((acc, payment) => {
    const indexes = parsePeriodIndexes(payment.period_indexes);
    if (!indexes.length) return acc;
    const paidPerPeriod = (Number(payment.total_amount ?? 0) || 0) / indexes.length;
    indexes.forEach((index) => {
      acc[index] = (acc[index] ?? 0) + paidPerPeriod;
    });
    return acc;
  }, {});

  periods.forEach((period) => {
    const paid = paidByPeriod[period.index] ?? 0;
    const payment =
      paidPayments.find((item) => parsePeriodIndexes(item.period_indexes).includes(period.index)) ??
      null;
    const pendingPayment =
      pendingPayments.find((item) => parsePeriodIndexes(item.period_indexes).includes(period.index)) ??
      null;
    const rejectedPayment =
      rejectedPayments.find((item) => parsePeriodIndexes(item.period_indexes).includes(period.index)) ??
      null;
    period.paid_amount = paid;
    period.remaining_amount = Math.max(period.amount - paid, 0);
    period.is_paid = paid >= period.amount || paid > 0;
    period.payment = payment;
    (period as typeof period & { pending_payment: FeePaymentRow | null }).pending_payment = pendingPayment;
    (period as typeof period & { rejected_payment: FeePaymentRow | null }).rejected_payment = rejectedPayment;
  });

  const totalPayable =
    periods.reduce((sum, period) => sum + period.amount, 0) || recurringAmount + oneTimeAmount;
  const paidAmount = paidPayments.reduce(
    (sum, payment) => sum + (Number(payment.total_amount ?? 0) || 0),
    0,
  );

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
    periods,
  };
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const roleCodes = currentUser.role_codes ?? [];
    const isParentOnly = roleCodes.includes("parent") && !roleCodes.includes("student");
    const isStudent = roleCodes.includes("student");
    const canViewStudent = hasPermission(currentUser, "student.myclassroom.fees.view");
    const canViewParent = hasPermission(currentUser, "parent.childclassroom.fees.view");

    if (isParentOnly ? !canViewParent : !canViewStudent && !canViewParent) {
      throw new Error("Forbidden: Admin access required");
    }

    const url = new URL(req.url);
    const requestedChildId = Number(url.searchParams.get(ACTIVE_CHILD_QUERY_PARAM));
    const childStudentId =
      Number.isInteger(requestedChildId) && requestedChildId > 0 ? requestedChildId : null;
    const selectedContext = isStudent
      ? await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes)
      : null;
    const contexts = selectedContext
      ? [selectedContext]
      : isParentOnly
      ? await getParentChildEnrollmentContexts(db, currentUser.id, childStudentId)
      : isStudent
        ? await getStudentEnrollmentContexts(db, currentUser.id)
        : await getParentChildEnrollmentContexts(db, currentUser.id, childStudentId);

    if (childStudentId && contexts.length === 0) {
      throw new Error("Forbidden: Invalid child context");
    }

    if (!contexts.length) return NextResponse.json({ data: [] });

    await ensureFeeSupportTables();
    const enrollmentIds = contexts.map((context) => context.id);
    const result = await db.query<EnrollmentRow>(
      `
        SELECT
          se.id,
          se.institution_id,
          sp.id AS student_profile_id,
          sp.user_id AS student_user_id,
          student_user.full_name AS student_name,
          student_user.email AS student_email,
          sp.admission_number,
          se.program_id,
          se.section_id,
          se.academic_year_id,
          se.roll_number,
          se.admission_date,
          se.status,
          institution.name AS institution_name,
          program.title AS program_name,
          academic_year.name AS academic_year_name,
          category.name AS class_category_name,
          section.name AS section_name,
          program.duration_value,
          program.duration_unit,
          COALESCE(fees.fee_components, '[]'::json) AS fee_components,
          COALESCE(payments.fee_payments, '[]'::json) AS fee_payments
        FROM student_enrollments se
        INNER JOIN student_profiles sp
          ON sp.id = se.student_id
        INNER JOIN users student_user
          ON student_user.id = sp.user_id
         AND COALESCE(student_user.is_deleted, FALSE) = FALSE
        INNER JOIN institution_profiles institution
          ON institution.id = se.institution_id
         AND institution.is_active = TRUE
         AND COALESCE(institution.is_deleted, FALSE) = FALSE
        LEFT JOIN institution_programs program
          ON program.id = se.program_id
         AND COALESCE(program.is_deleted, FALSE) = FALSE
        LEFT JOIN academic_years academic_year
          ON academic_year.id = se.academic_year_id
         AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
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
                'status', sfp.status,
                'subtotal_amount', sfp.subtotal_amount,
              'discount_percent', sfp.discount_percent,
              'discount_amount', sfp.discount_amount,
              'total_amount', sfp.total_amount,
                'transaction_id', sfp.transaction_id,
                'screenshot_url', sfp.screenshot_url,
                'screenshot_public_id', sfp.screenshot_public_id,
                'screenshot_resource_type', sfp.screenshot_resource_type,
                'remarks', sfp.remarks,
                'rejection_reason', sfp.rejection_reason,
                'received_at', sfp.received_at,
                'created_at', sfp.created_at
            )
            ORDER BY sfp.received_at ASC, sfp.id ASC
          ) AS fee_payments
          FROM student_fee_payments sfp
          WHERE sfp.enrollment_id = se.id
            AND sfp.academic_year_id = se.academic_year_id
            AND sfp.status IN ('paid', 'pending', 'rejected')
        ) payments ON TRUE
        WHERE se.id = ANY($1::int[])
          AND COALESCE(se.is_deleted, FALSE) = FALSE
        ORDER BY se.status = 'active' DESC, institution.name, program.title, section.name NULLS LAST
      `,
      [enrollmentIds],
    );

    const institutionIds = Array.from(new Set(result.rows.map((row) => Number(row.institution_id)).filter(Boolean)));
    const settingsByInstitution = new Map<number, PaymentSettingsRow | null>();
    await Promise.all(
      institutionIds.map(async (institutionId) => {
        settingsByInstitution.set(institutionId, await getPaymentSettingsForInstitution(institutionId));
      }),
    );

    return NextResponse.json({
      data: result.rows.map((enrollment) => ({
        ...enrollment,
        fee_components: parseFeeComponents(enrollment.fee_components),
        fee_summary: buildFeeSummary(enrollment),
        payment_settings: settingsByInstitution.get(Number(enrollment.institution_id)) ?? null,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const roleCodes = currentUser.role_codes ?? [];
    const isParentOnly = roleCodes.includes("parent") && !roleCodes.includes("student");
    const isStudent = roleCodes.includes("student");
    const canViewStudent = hasPermission(currentUser, "student.myclassroom.fees.view");
    const canViewParent = hasPermission(currentUser, "parent.childclassroom.fees.view");

    if (isParentOnly ? !canViewParent : !canViewStudent && !canViewParent) {
      throw new Error("Forbidden: Admin access required");
    }

    const body = await req.json();
    const enrollmentId = parsePositiveInteger(body.enrollmentId);
    const periodIndexes = parsePeriodIndexes(body.periodIndexes);
    const transactionId = typeof body.transactionId === "string" ? body.transactionId.trim() : "";
    const screenshotUrl = typeof body.screenshotUrl === "string" ? body.screenshotUrl.trim() : "";
    const screenshotPublicId = typeof body.screenshotPublicId === "string" ? body.screenshotPublicId.trim() : "";
    const screenshotResourceType = typeof body.screenshotResourceType === "string" ? body.screenshotResourceType.trim() : "";
    const remarks = typeof body.remarks === "string" ? body.remarks.trim() : "";

    if (!enrollmentId) return NextResponse.json({ error: "Invalid fee record." }, { status: 400 });
    if (!periodIndexes.length) return NextResponse.json({ error: "Select at least one fee month." }, { status: 400 });
    if (!transactionId) return NextResponse.json({ error: "Enter the transaction ID." }, { status: 400 });
    if (!screenshotUrl) return NextResponse.json({ error: "Upload the payment screenshot." }, { status: 400 });

    const requestedChildId = parsePositiveInteger(body.childStudentId);
    const contexts = isParentOnly
      ? await getParentChildEnrollmentContexts(db, currentUser.id, requestedChildId)
      : isStudent
        ? await getStudentEnrollmentContexts(db, currentUser.id)
        : await getParentChildEnrollmentContexts(db, currentUser.id, requestedChildId);
    const allowed = contexts.find((context) => context.id === enrollmentId);
    if (!allowed) throw new Error("Forbidden: Invalid child context");

    await ensureFeeSupportTables();

    const enrollmentResult = await db.query<EnrollmentRow>(
      `
        SELECT
          se.id,
          se.institution_id,
          sp.id AS student_profile_id,
          sp.user_id AS student_user_id,
          u.full_name AS student_name,
          prog.title AS program_name,
          se.admission_date,
          se.academic_year_id,
          prog.duration_value,
          prog.duration_unit,
          COALESCE(fees.fee_components, '[]'::json) AS fee_components,
          COALESCE(payments.fee_payments, '[]'::json) AS fee_payments
        FROM student_enrollments se
        INNER JOIN student_profiles sp ON sp.id = se.student_id
        INNER JOIN users u ON u.id = sp.user_id AND COALESCE(u.is_deleted, FALSE) = FALSE
        LEFT JOIN institution_programs prog ON prog.id = se.program_id AND COALESCE(prog.is_deleted, FALSE) = FALSE
        LEFT JOIN LATERAL (
          SELECT json_agg(
            json_build_object('id', pfc.id, 'title', pfc.title, 'amount', pfc.amount, 'unit', pfc.fee_unit)
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
              'status', sfp.status,
              'rejection_reason', sfp.rejection_reason,
              'total_amount', sfp.total_amount
            )
            ORDER BY sfp.created_at ASC, sfp.id ASC
          ) AS fee_payments
          FROM student_fee_payments sfp
          WHERE sfp.enrollment_id = se.id
            AND sfp.academic_year_id = se.academic_year_id
            AND sfp.status IN ('paid', 'pending')
        ) payments ON TRUE
        WHERE se.id = $1
          AND COALESCE(se.is_deleted, FALSE) = FALSE
        LIMIT 1
      `,
      [enrollmentId],
    );

    const enrollment = enrollmentResult.rows[0];
    if (!enrollment?.student_profile_id || !enrollment.student_user_id || !enrollment.institution_id) {
      return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
    }

    const paymentSettings = await getPaymentSettingsForInstitution(enrollment.institution_id);
    if (!paymentSettings || (!paymentSettings.upi_id && !paymentSettings.qr_image_url)) {
      return NextResponse.json({ error: "Payment settings are not configured for this institution." }, { status: 400 });
    }

    const summary = buildFeeSummary(enrollment);
    const uniquePeriodIndexes = Array.from(new Set(periodIndexes)).sort((a, b) => a - b);
    const selectedPeriods = summary.periods.filter((period) => uniquePeriodIndexes.includes(period.index));
    if (selectedPeriods.length !== uniquePeriodIndexes.length) {
      return NextResponse.json({ error: "Selected fee period is invalid." }, { status: 400 });
    }
    if (selectedPeriods.some((period) => period.is_paid)) {
      return NextResponse.json({ error: "One or more selected months are already paid." }, { status: 400 });
    }
    if (selectedPeriods.some((period) => (period as typeof period & { pending_payment?: FeePaymentRow | null }).pending_payment)) {
      return NextResponse.json({ error: "A payment request is already pending for one or more selected months." }, { status: 400 });
    }

    const subtotalAmount = roundMoney(selectedPeriods.reduce((sum, period) => sum + (Number(period.amount) || 0), 0));
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
          student_user_id, student_profile_id, enrollment_id, institution_id,
          academic_year_id, period_indexes, period_labels, payment_method, subtotal_amount,
          discount_percent, discount_amount, total_amount, transaction_id,
          screenshot_url, screenshot_public_id, screenshot_resource_type,
          remarks, status, submitted_by, received_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::int[], $7::jsonb, 'upi', $8, 0, 0, $8, $9, $10, $11, $12, $13, 'pending', $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `,
      [
        enrollment.student_user_id,
        enrollment.student_profile_id,
        enrollment.id,
        enrollment.institution_id,
        enrollment.academic_year_id,
        uniquePeriodIndexes,
        JSON.stringify(periodLabels),
        subtotalAmount,
        transactionId,
        screenshotUrl,
        screenshotPublicId || null,
        screenshotResourceType || null,
        remarks || null,
        currentUser.id,
      ],
    );

    try {
      await ensureSystemNotificationTemplates(db);
      const recipients = await getInstitutionAdminIds(enrollment.institution_id);
      await new NotificationService(db).create({
        type: "fees.payment_request.created",
        recipients,
        institutionId: enrollment.institution_id,
        entityType: "student_fee_payment",
        entityId: Number(result.rows[0]?.id) || null,
        createdBy: currentUser.id,
        priority: "normal",
        payload: {
          student_name: enrollment.student_name ?? currentUser.full_name ?? "Student",
          program_name: enrollment.program_name ?? "Course",
          amount: formatNotificationAmount(subtotalAmount),
          raw_amount: subtotalAmount,
          period_count: uniquePeriodIndexes.length,
          transaction_id: transactionId,
          payment_request_id: result.rows[0]?.id ?? null,
          enrollment_id: enrollment.id,
          url: "/admin/students/fee-management?tab=payment_requests",
        },
      });
    } catch (notificationError) {
      console.error("[fee-payment-request.notification]", notificationError);
    }

    return NextResponse.json({ data: { payment_request: result.rows[0] } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
