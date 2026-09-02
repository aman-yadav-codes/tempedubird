import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  createFinanceIncomeCategory,
  createFinanceIncomeEntry,
  getInstitutionAdminName,
  listFinanceEmployeeOptions,
  listFinanceIncome,
  listFinanceIncomeCategories,
  listFinancePayerSuggestions,
  listFinancePaymentMethods,
  type FinanceScope,
} from "@/lib/queries/finance";

type CurrentUser = Awaited<ReturnType<typeof getAuthenticatedUser>>;

const PAYMENT_METHODS = new Set(["cash", "upi", "net_banking"]);

function jsonError(error: unknown, status = 400) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Something went wrong" },
    { status }
  );
}

function userInstitutionIds(user: CurrentUser) {
  const ids = new Set<number>();
  (user.memberships ?? []).forEach((membership) => {
    const id = Number(membership.institution_id);
    if (Number.isInteger(id) && id > 0) ids.add(id);
  });
  const directId = Number((user as any)?.institution_id);
  if (Number.isInteger(directId) && directId > 0) ids.add(directId);
  const underId = Number((user as any)?.under_institution_id);
  if (Number.isInteger(underId) && underId > 0) ids.add(underId);
  const profileInstId = Number((user as any)?.profile?.under_institution_id || (user as any)?.profile?.institution_id);
  if (Number.isInteger(profileInstId) && profileInstId > 0) ids.add(profileInstId);
  return ids;
}

function resolveScope(user: CurrentUser, requestedInstitutionId?: number | null): { scope: FinanceScope; institutionId: number | null } {
  const isPlatform = isPlatformAdminUser(user) || hasPermission(user, "finance.platform.income.view");
  const isInstitution = isInstitutionAdminUser(user) || (user as any)?.role === "institution_admin" || hasPermission(user, "finance.income.view");
  const institutionIds = userInstitutionIds(user);

  if (isPlatform && requestedInstitutionId) {
    return { scope: "institution", institutionId: requestedInstitutionId };
  }

  if (isPlatform) {
    return { scope: "platform", institutionId: null };
  }

  if (isInstitution || institutionIds.size > 0) {
    const institutionId = requestedInstitutionId && (institutionIds.has(requestedInstitutionId) || isInstitutionAdminUser(user) || (user as any)?.role === "institution_admin")
      ? requestedInstitutionId
      : (Array.from(institutionIds)[0] ?? requestedInstitutionId ?? (user as any)?.institution_id ?? null);
    if (!institutionId) {
      throw new Error("No active institution found for income management");
    }
    return { scope: "institution", institutionId };
  }

  throw new Error("Forbidden: You do not have permission to access income records");
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
    const result = await listFinanceIncome(db, {
      scope_type: scope,
      institution_id: institutionId,
      search: url.searchParams.get("search") ?? "",
      payment_method: url.searchParams.get("paymentMethod") ?? "all",
      source_type: url.searchParams.get("source") ?? "all",
      from_date: url.searchParams.get("from") || null,
      to_date: url.searchParams.get("to") || null,
      limit,
      offset: (page - 1) * limit,
    });
    const [categories, employees, adminName, paymentMethods, payerSuggestions] = await Promise.all([
      listFinanceIncomeCategories(db, scope, institutionId),
      listFinanceEmployeeOptions(db, scope, institutionId),
      institutionId ? getInstitutionAdminName(db, institutionId) : Promise.resolve(user.full_name),
      listFinancePaymentMethods(db, { scope_type: scope, institution_id: institutionId }),
      listFinancePayerSuggestions(db, scope, institutionId),
    ]);

    const currentUserOption = {
      value: String(user.id),
      label: `${user.full_name || "Admin"} (You)`,
    };

    const basePaidToOptions = scope === "platform"
      ? [
          currentUserOption,
          { value: "platform_account", label: "Platform Account" },
        ]
      : [
          currentUserOption,
          { value: "institution_account", label: "Institution Account" },
          ...(adminName && adminName !== user.full_name ? [{ value: "admin", label: adminName }] : []),
        ];

    const employeePaidToOptions = employees
      .filter((emp) => emp.id !== user.id)
      .map((emp) => ({
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
        this_month_total: result.this_month_total,
        scope,
        institution_id: institutionId,
        categories,
        payment_methods: paymentMethods,
        payer_suggestions: payerSuggestions,
        paid_to_options: [...basePaidToOptions, ...employeePaidToOptions],
        current_user_receiver: {
          value: String(user.id),
          label: user.full_name || "Admin",
        },
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

    const isPlatform = isPlatformAdminUser(user);
    const isInstAdmin = isInstitutionAdminUser(user) || (user as any)?.role === "institution_admin";
    const permission = scope === "platform" ? "finance.platform.income.create" : "finance.income.create";
    if (!isPlatform && !isInstAdmin && !hasPermission(user, permission, { institutionId })) {
      throw new Error("Forbidden: You do not have permission to add income");
    }

    const paymentMethod = String(body.payment_method ?? "").trim();
    if (!PAYMENT_METHODS.has(paymentMethod)) throw new Error("Select a valid payment method");

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount");

    let categoryId = Number(body.category_id);
    const customCategoryName = String(body.custom_category_name || body.category_name || "").trim();

    if ((!Number.isInteger(categoryId) || categoryId <= 0) && customCategoryName) {
      const createdCat = await createFinanceIncomeCategory(db, scope, institutionId, customCategoryName, user.id);
      categoryId = createdCat.id;
    }

    if (!Number.isInteger(categoryId) || categoryId <= 0) throw new Error("Select or enter a payment category");

    const paidTo = String(body.paid_to ?? "").trim();
    const paidToLabel = String(body.paid_to_label ?? "").trim();
    if (!paidTo || !paidToLabel) throw new Error("Select who received the payment");

    const paidBy = body.paid_by ? String(body.paid_by).trim() : null;
    const paidByLabel = body.paid_by_label ? String(body.paid_by_label).trim() : null;
    const payerName = body.payer_name ? String(body.payer_name).trim() : (paidByLabel || null);

    await createFinanceIncomeEntry(db, {
      scope_type: scope,
      institution_id: institutionId,
      category_id: categoryId,
      payment_method: paymentMethod as "cash" | "upi" | "net_banking",
      paid_by: paidBy,
      paid_by_label: paidByLabel,
      payer_name: payerName,
      paid_to: paidTo,
      paid_to_label: paidToLabel,
      amount,
      income_date: validDate(body.income_date, "Payment date"),
      invoice_url: body.invoice_url ? String(body.invoice_url) : null,
      invoice_public_id: body.invoice_public_id ? String(body.invoice_public_id) : null,
      invoice_resource_type: body.invoice_resource_type ? String(body.invoice_resource_type) : null,
      invoice_file_name: body.invoice_file_name ? String(body.invoice_file_name) : null,
      description: body.description ? String(body.description).trim() : null,
      user_id: user.id,
      staff_id: user.id,
      created_by_role: isPlatformAdminUser(user) ? "Platform Admin" : isInstitutionAdminUser(user) ? "Institution Admin" : "Staff",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Forbidden") ? 403 : 400);
  }
}
