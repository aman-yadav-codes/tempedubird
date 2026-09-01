import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { syncRecurringExpenseReminderJob } from "@/lib/scheduled-jobs";
import {
  createFinanceRecurringExpense,
  getInstitutionAdminName,
  listFinanceEmployeeOptions,
  listFinanceRecurringExpenseHistory,
  listFinanceRecurringExpenseCategories,
  listFinanceRecurringExpenses,
  listFinancePaymentMethods,
  updateFinanceRecurringExpense,
  updateFinanceRecurringExpensePaymentStatus,
  type FinanceScope,
} from "@/lib/queries/finance";

type CurrentUser = Awaited<ReturnType<typeof getAuthenticatedUser>>;

const PAYMENT_METHODS = new Set(["cash", "upi", "net_banking"]);
const FREQUENCIES = new Set(["monthly", "yearly"]);
const PAYMENT_STATUSES = new Set(["paid", "due"]);

function jsonError(error: unknown, status = 400) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Something went wrong" },
    { status }
  );
}

function userInstitutionIds(user: CurrentUser) {
  return new Set(
    (user.memberships ?? [])
      .map((membership) => Number(membership.institution_id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
}

function resolveScope(user: CurrentUser, requestedInstitutionId?: number | null): { scope: FinanceScope; institutionId: number | null } {
  const isPlatform = isPlatformAdminUser(user) || hasPermission(user, "finance.platform.recurring_expenses.view");
  const isInstitution = isInstitutionAdminUser(user) || hasPermission(user, "finance.recurring_expenses.view");
  const institutionIds = userInstitutionIds(user);

  if (isPlatform && requestedInstitutionId) {
    return { scope: "institution", institutionId: requestedInstitutionId };
  }

  if (isPlatform) {
    return { scope: "platform", institutionId: null };
  }

  if (isInstitution) {
    const institutionId = requestedInstitutionId && institutionIds.has(requestedInstitutionId)
      ? requestedInstitutionId
      : (Array.from(institutionIds)[0] ?? null);
    if (!institutionId) {
      throw new Error("No active institution found for recurring expenses");
    }
    return { scope: "institution", institutionId };
  }

  throw new Error("Forbidden: You do not have permission to access recurring expense records");
}

function positiveInt(value: string | null, fallback: number, max: number) {
  const next = Number(value);
  if (!Number.isInteger(next) || next <= 0) return fallback;
  return Math.min(next, max);
}

function validDate(value: unknown, label: string) {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new Error(`${label} is required`);
  }
  return text;
}

function optionalValidDate(value: unknown, label: string) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return validDate(text, label);
}

function reminderDays(value: unknown) {
  const next = Number(value ?? 3);
  if (!Number.isInteger(next) || next < 0 || next > 365) {
    throw new Error("Reminder days must be between 0 and 365");
  }
  return next;
}

function nextDueDate(startDate: string, dueDay: number, frequency: "monthly" | "yearly") {
  const start = new Date(`${startDate}T00:00:00Z`);
  const now = new Date();
  let year = Math.max(start.getUTCFullYear(), now.getUTCFullYear());
  let month = frequency === "yearly" ? start.getUTCMonth() : now.getUTCMonth();

  for (let attempt = 0; attempt < 36; attempt += 1) {
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const date = new Date(Date.UTC(year, month, Math.min(dueDay, lastDay)));
    if (date >= start && date >= new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))) {
      return date.toISOString().slice(0, 10);
    }
    if (frequency === "yearly") {
      year += 1;
    } else {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
  }
  return startDate;
}

function parseRecurringExpenseBody(body: Record<string, unknown>) {
  const paymentMethod = String(body.payment_method ?? "").trim();
  if (!PAYMENT_METHODS.has(paymentMethod)) throw new Error("Select a valid payment method");
  const frequency = String(body.frequency ?? "").trim();
  if (!FREQUENCIES.has(frequency)) throw new Error("Select a valid frequency");
  const paymentStatus = String(body.payment_status ?? "due").trim();
  if (!PAYMENT_STATUSES.has(paymentStatus)) throw new Error("Select a valid payment status");
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount");
  const categoryIds: number[] = Array.isArray(body.category_ids)
    ? body.category_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  const paidBy = String(body.paid_by ?? "").trim();
  const paidByLabel = String(body.paid_by_label ?? "").trim();
  if (!paidBy || !paidByLabel) throw new Error("Select who pays this expense");
  const startDate = validDate(body.start_date, "Start date");
  const endDate = optionalValidDate(body.end_date, "End date");
  if (endDate && new Date(`${endDate}T00:00:00Z`) < new Date(`${startDate}T00:00:00Z`)) {
    throw new Error("End date cannot be before start date");
  }
  const dueDay = new Date(`${startDate}T00:00:00Z`).getUTCDate();

  return {
    title: String(body.title ?? ""),
    category_ids: [...new Set(categoryIds)],
    payment_method: paymentMethod as "cash" | "upi" | "net_banking",
    paid_by: paidBy,
    paid_by_label: paidByLabel,
    amount,
    frequency: frequency as "monthly" | "yearly",
    due_day: dueDay,
    start_date: startDate,
    end_date: endDate,
    payment_status: paymentStatus as "paid" | "due",
    reminder_days_before: reminderDays(body.reminder_days_before),
    next_due_date: nextDueDate(startDate, dueDay, frequency as "monthly" | "yearly"),
    description: body.description ? String(body.description).trim() : null,
  };
}

async function syncReminderJob(id: number, userId: number) {
  await syncRecurringExpenseReminderJob(id, userId);
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const institutionIdRaw = Number(url.searchParams.get("institutionId"));
    const requestedInstitutionId = Number.isInteger(institutionIdRaw) && institutionIdRaw > 0
      ? institutionIdRaw
      : null;
    const { scope, institutionId } = resolveScope(user, requestedInstitutionId);
    const historyFor = Number(url.searchParams.get("historyFor"));
    if (Number.isInteger(historyFor) && historyFor > 0) {
      const history = await listFinanceRecurringExpenseHistory(db, {
        scope_type: scope,
        institution_id: institutionId,
        recurring_expense_id: historyFor,
      });
      return NextResponse.json({ data: history });
    }
    const page = positiveInt(url.searchParams.get("page"), 1, 10_000);
    const limit = positiveInt(url.searchParams.get("limit"), 10, 100);
    const result = await listFinanceRecurringExpenses(db, {
      scope_type: scope,
      institution_id: institutionId,
      search: url.searchParams.get("search") ?? "",
      payment_method: url.searchParams.get("paymentMethod") ?? "all",
      frequency: url.searchParams.get("frequency") ?? "all",
      status: url.searchParams.get("status") ?? "all",
      limit,
      offset: (page - 1) * limit,
    });
    const categoriesPromise = listFinanceRecurringExpenseCategories(db, scope, institutionId);
    const employeesPromise = listFinanceEmployeeOptions(db, scope, institutionId);
    const adminNamePromise = institutionId ? getInstitutionAdminName(db, institutionId) : Promise.resolve(user.full_name);
    const paymentMethodsPromise = listFinancePaymentMethods(db, { scope_type: scope, institution_id: institutionId });
    const [categories, employees, adminName, paymentMethods] = await Promise.all([
      categoriesPromise,
      employeesPromise,
      adminNamePromise,
      paymentMethodsPromise,
    ]);

    const basePaidByOptions = scope === "platform"
      ? [
          { value: "platform_account", label: "Platform Account" },
          { value: "admin", label: user.full_name || "Platform Admin" },
        ]
      : [
          { value: "institution_account", label: "Institution Account" },
          { value: "admin", label: adminName },
        ];

    const employeePaidByOptions = employees.map((emp) => ({
      value: String(emp.id),
      label: `${emp.full_name}${emp.role_label ? ` (${emp.role_label})` : ""}`,
    }));

    return NextResponse.json({
      data: result.data,
      meta: {
        total: result.total,
        page,
        limit,
        filtered_total: result.filtered_total,
        active_total: result.active_total,
        scope,
        institution_id: institutionId,
        categories,
        payment_methods: paymentMethods,
        paid_by_options: [...basePaidByOptions, ...employeePaidByOptions.filter((opt) => opt.value !== "admin")],
        employee_options: employees,
      },
    });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Forbidden") ? 403 : 400);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const institutionIdRaw = Number(body.institutionId);
    const requestedInstitutionId = Number.isInteger(institutionIdRaw) && institutionIdRaw > 0
      ? institutionIdRaw
      : null;
    const { scope, institutionId } = resolveScope(user, requestedInstitutionId);
    const permission = scope === "platform"
      ? "finance.platform.recurring_expenses.create"
      : "finance.recurring_expenses.create";
    if (!hasPermission(user, permission, { institutionId })) {
      throw new Error("Forbidden: You do not have permission to add recurring expenses");
    }

    const parsed = parseRecurringExpenseBody(body);

    const created = await createFinanceRecurringExpense(db, {
      scope_type: scope,
      institution_id: institutionId,
      ...parsed,
      user_id: user.id,
    });
    await syncReminderJob(Number(created.id), user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Forbidden") ? 403 : 400);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const institutionIdRaw = Number(body.institutionId);
    const requestedInstitutionId = Number.isInteger(institutionIdRaw) && institutionIdRaw > 0
      ? institutionIdRaw
      : null;
    const { scope, institutionId } = resolveScope(user, requestedInstitutionId);
    const permission = scope === "platform"
      ? "finance.platform.recurring_expenses.edit"
      : "finance.recurring_expenses.edit";
    if (!hasPermission(user, permission, { institutionId })) {
      throw new Error("Forbidden: You do not have permission to update recurring expenses");
    }

    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new Error("Recurring expense id is required");
    if (body.action !== "payment_status") {
      const parsed = parseRecurringExpenseBody(body);
      const updated = await updateFinanceRecurringExpense(db, {
        scope_type: scope,
        institution_id: institutionId,
        id,
        ...parsed,
        user_id: user.id,
      });
      if (!updated) throw new Error("Recurring expense was not found");
      await syncReminderJob(Number(updated.id), user.id);
      return NextResponse.json({ ok: true, data: updated });
    }
    const paymentStatus = String(body.payment_status ?? "").trim();
    if (!PAYMENT_STATUSES.has(paymentStatus)) throw new Error("Select a valid payment status");

    const updated = await updateFinanceRecurringExpensePaymentStatus(db, {
      scope_type: scope,
      institution_id: institutionId,
      id,
      payment_status: paymentStatus as "paid" | "due",
      user_id: user.id,
    });
    if (!updated) throw new Error("Recurring expense was not found");
    await syncReminderJob(id, user.id);

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Forbidden") ? 403 : 400);
  }
}
