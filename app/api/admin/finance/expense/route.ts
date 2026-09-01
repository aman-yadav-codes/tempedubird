import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  createFinanceExpenseCategory,
  createFinanceExpenseEntry,
  getInstitutionAdminName,
  listFinanceEmployeeOptions,
  listFinanceExpense,
  listFinanceExpenseCategories,
  listFinancePaymentMethods,
  listFinanceVendorSuggestions,
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
      .map((membership) => Number(membership.institution_id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
}

function resolveScope(user: CurrentUser, requestedInstitutionId?: number | null): { scope: FinanceScope; institutionId: number | null } {
  const isPlatform = isPlatformAdminUser(user) || hasPermission(user, "finance.platform.expense.view");
  const isInstitution = isInstitutionAdminUser(user) || hasPermission(user, "finance.expense.view");
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
      throw new Error("No active institution found for expense management");
    }
    return { scope: "institution", institutionId };
  }

  throw new Error("Forbidden: You do not have permission to access expense records");
}

function positiveInt(value: string | null, fallback: number, max: number) {
  const next = Number(value);
  if (!Number.isInteger(next) || next <= 0) return fallback;
  return Math.min(next, max);
}

function validDate(value: unknown, label: string) {
  const text = String(value ?? "").trim();
  if (!text || Number.isNaN(new Date(text).getTime())) {
    throw new Error(`Enter a valid ${label.toLowerCase()}`);
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
    const employeesPromise = listFinanceEmployeeOptions(db, scope, institutionId);
    const adminNamePromise = institutionId ? getInstitutionAdminName(db, institutionId) : Promise.resolve(user.full_name);
    const paymentMethodsPromise = listFinancePaymentMethods(db, { scope_type: scope, institution_id: institutionId });
    const vendorSuggestionsPromise = listFinanceVendorSuggestions(db, scope, institutionId);
    const [result, categories, employees, adminName, paymentMethods, vendorSuggestions] = await Promise.all([
      resultPromise,
      categoriesPromise,
      employeesPromise,
      adminNamePromise,
      paymentMethodsPromise,
      vendorSuggestionsPromise,
    ]);

    const currentUserOption = {
      value: String(user.id),
      label: `${user.full_name || "Admin"} (You)`,
    };

    const basePaidByOptions = scope === "platform"
      ? [
          currentUserOption,
          { value: "platform_account", label: "Platform Account" },
        ]
      : [
          currentUserOption,
          { value: "institution_account", label: "Institution Account" },
          ...(adminName && adminName !== user.full_name ? [{ value: "admin", label: adminName }] : []),
        ];

    const employeePaidByOptions = employees
      .filter((emp) => emp.id !== user.id)
      .map((emp) => ({
        value: String(emp.id),
        label: `${emp.full_name}${emp.role_label ? ` (${emp.role_label})` : ""}`,
      }));

    let userBalancesRes: any = { rows: [] };
    try {
      const balanceSql = `
        WITH user_allowance_totals AS (
          SELECT 
            fae.user_id,
            u.full_name AS user_name,
            u.email AS user_email,
            COALESCE(SUM(fae.amount), 0) AS total_allowance_provided,
            COUNT(fae.id) AS allowance_count
          FROM finance_allowance_entries fae
          JOIN users u ON u.id = fae.user_id
          WHERE ($1::text IS NULL OR fae.scope_type = $1)
            AND ($2::int IS NULL OR fae.institution_id = $2)
          GROUP BY fae.user_id, u.full_name, u.email
        ),
        user_spend_totals AS (
          SELECT 
            spends.user_id,
            COALESCE(SUM(spends.amount), 0) AS total_spent,
            COUNT(*) AS spend_count
          FROM (
            SELECT fase.user_id, fase.amount, fase.scope_type, fase.institution_id
            FROM finance_allowance_spend_entries fase
            UNION ALL
            SELECT 
              CASE 
                WHEN fee.paid_by ~ '^[0-9]+$' THEN fee.paid_by::int 
                ELSE fee.user_id 
              END AS user_id,
              fee.amount,
              fee.scope_type,
              fee.institution_id
            FROM finance_expense_entries fee
            WHERE (fee.paid_by ~ '^[0-9]+$' OR fee.paid_by NOT IN ('institution_account', 'platform_account'))
          ) spends
          WHERE ($1::text IS NULL OR spends.scope_type = $1)
            AND ($2::int IS NULL OR spends.institution_id = $2)
          GROUP BY spends.user_id
        )
        SELECT 
          uat.user_id,
          uat.user_name,
          uat.user_email,
          uat.total_allowance_provided::numeric AS total_allowance_provided,
          COALESCE(ust.total_spent, 0)::numeric AS total_spent,
          GREATEST(0, (uat.total_allowance_provided - COALESCE(ust.total_spent, 0)))::numeric AS in_hand_balance,
          uat.allowance_count,
          COALESCE(ust.spend_count, 0) AS spend_count
        FROM user_allowance_totals uat
        LEFT JOIN user_spend_totals ust ON ust.user_id = uat.user_id
        ORDER BY in_hand_balance DESC, uat.total_allowance_provided DESC
      `;
      userBalancesRes = await db.query(balanceSql, [scope, institutionId]);
    } catch {
      userBalancesRes = { rows: [] };
    }

    const userBalances = userBalancesRes.rows;
    const totalAllowanceProvided = userBalances.reduce((acc: number, r: any) => acc + Number(r.total_allowance_provided || 0), 0);
    const totalAllowanceSpent = userBalances.reduce((acc: number, r: any) => acc + Number(r.total_spent || 0), 0);
    const totalAllowanceInHand = userBalances.reduce((acc: number, r: any) => acc + Number(r.in_hand_balance || 0), 0);

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
        payment_methods: paymentMethods,
        vendor_suggestions: vendorSuggestions,
        paid_by_options: [...basePaidByOptions, ...employeePaidByOptions],
        current_user_payer: {
          value: String(user.id),
          label: user.full_name || "Admin",
        },
        employee_options: employees,
        allowance_summary: {
          total_provided: totalAllowanceProvided,
          total_spent: totalAllowanceSpent,
          total_in_hand: totalAllowanceInHand,
          user_balances: userBalances,
        },
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

    let categoryId = Number(body.category_id);
    const customCategoryName = String(body.custom_category_name || body.category_name || "").trim();

    if ((!Number.isInteger(categoryId) || categoryId <= 0) && customCategoryName) {
      const createdCat = await createFinanceExpenseCategory(db, scope, institutionId, customCategoryName, user.id);
      categoryId = createdCat.id;
    }

    if (!Number.isInteger(categoryId) || categoryId <= 0) throw new Error("Select or enter a payment category");

    const paidBy = String(body.paid_by ?? "").trim();
    const paidByLabel = String(body.paid_by_label ?? "").trim();
    if (!paidBy || !paidByLabel) throw new Error("Select who paid this expense");

    const paidTo = body.paid_to ? String(body.paid_to).trim() : null;
    const paidToLabel = body.paid_to_label ? String(body.paid_to_label).trim() : (paidTo || null);

    await createFinanceExpenseEntry(db, {
      scope_type: scope,
      institution_id: institutionId,
      category_id: categoryId,
      payment_method: paymentMethod as "cash" | "upi" | "net_banking",
      payment_status: paymentStatus as "paid" | "due",
      paid_by: paidBy,
      paid_by_label: paidByLabel,
      paid_to: paidTo,
      paid_to_label: paidToLabel,
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
