import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  createFinanceExpenseEntry,
  getInstitutionAdminName,
  listFinanceExpense,
  listFinanceExpenseCategories,
  type FinanceScope,
} from "@/lib/queries/finance";

type CurrentUser = Awaited<ReturnType<typeof getAuthenticatedUser>>;

const PAYMENT_METHODS = new Set(["cash", "upi", "net_banking"]);
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
      .filter((membership) => membership.role_code === "institution_admin")
      .map((membership) => Number(membership.institution_id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
}

function resolveScope(user: CurrentUser, institutionId: number | null): { scope: FinanceScope; institutionId: number | null } {
  if (isPlatformAdminUser(user)) return { scope: "platform", institutionId: null };
  if (!isInstitutionAdminUser(user)) throw new Error("Forbidden: Admin access required");

  const institutionIds = userInstitutionIds(user);
  const targetId = institutionId ?? Array.from(institutionIds)[0] ?? null;
  if (!targetId || !institutionIds.has(targetId)) throw new Error("Forbidden: Institution access required");
  return { scope: "institution", institutionId: targetId };
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

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const institutionIdRaw = Number(url.searchParams.get("institutionId"));
    const requestedInstitutionId = Number.isInteger(institutionIdRaw) && institutionIdRaw > 0
      ? institutionIdRaw
      : null;
    const { scope, institutionId } = resolveScope(user, requestedInstitutionId);
    const page = positiveInt(url.searchParams.get("page"), 1, 10_000);
    const limit = positiveInt(url.searchParams.get("limit"), 10, 100);

    const resultPromise = listFinanceExpense(db, {
      scope_type: scope,
      institution_id: institutionId,
      search: url.searchParams.get("search") ?? "",
      payment_method: url.searchParams.get("paymentMethod") ?? "all",
      payment_status: url.searchParams.get("paymentStatus") ?? "all",
      source_type: url.searchParams.get("source") ?? "all",
      from_date: url.searchParams.get("from") || null,
      to_date: url.searchParams.get("to") || null,
      limit,
      offset: (page - 1) * limit,
    });
    const categoriesPromise = listFinanceExpenseCategories(db, scope, institutionId);
    const adminNamePromise = institutionId ? getInstitutionAdminName(db, institutionId) : Promise.resolve(user.full_name);
    const [result, categories, adminName] = await Promise.all([resultPromise, categoriesPromise, adminNamePromise]);

    return NextResponse.json({
      data: result.data,
      meta: {
        total: result.total,
        page,
        limit,
        filtered_total: result.filtered_total,
        this_month_total: result.this_month_total,
        due_total: result.due_total,
        due_count: result.due_count,
        scope,
        institution_id: institutionId,
        categories,
        paid_by_options: scope === "platform"
          ? [
              { value: "platform_account", label: "Platform Account" },
              { value: "admin", label: user.full_name || "Platform Admin" },
            ]
          : [
              { value: "institution_account", label: "Institution Account" },
              { value: "admin", label: adminName },
            ],
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

    const permission = scope === "platform" ? "finance.platform.expense.create" : "finance.expense.create";
    if (!hasPermission(user, permission, { institutionId })) {
      throw new Error("Forbidden: You do not have permission to add expense");
    }

    const paymentMethod = String(body.payment_method ?? "").trim();
    if (!PAYMENT_METHODS.has(paymentMethod)) throw new Error("Select a valid payment method");

    const paymentStatus = String(body.payment_status ?? "").trim();
    if (!PAYMENT_STATUSES.has(paymentStatus)) throw new Error("Select a valid payment status");

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount");

    const categoryId = Number(body.category_id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) throw new Error("Select a payment category");

    const paidBy = String(body.paid_by ?? "").trim();
    const paidByLabel = String(body.paid_by_label ?? "").trim();
    if (!paidBy || !paidByLabel) throw new Error("Select who paid this expense");

    await createFinanceExpenseEntry(db, {
      scope_type: scope,
      institution_id: institutionId,
      category_id: categoryId,
      payment_method: paymentMethod as "cash" | "upi" | "net_banking",
      payment_status: paymentStatus as "paid" | "due",
      paid_by: paidBy,
      paid_by_label: paidByLabel,
      amount,
      expense_date: validDate(body.expense_date, "Payment date"),
      invoice_url: body.invoice_url ? String(body.invoice_url) : null,
      invoice_public_id: body.invoice_public_id ? String(body.invoice_public_id) : null,
      invoice_resource_type: body.invoice_resource_type ? String(body.invoice_resource_type) : null,
      invoice_file_name: body.invoice_file_name ? String(body.invoice_file_name) : null,
      description: body.description ? String(body.description).trim() : null,
      user_id: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Forbidden") ? 403 : 400);
  }
}
