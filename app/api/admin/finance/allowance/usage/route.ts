import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  createFinanceAllowanceSpendEntry,
  listMyFinanceAllowanceSpends,
  listMyFinanceAllowances,
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

function userInstitutionIds(user: CurrentUser) {
  return Array.from(
    new Set(
      (user.memberships ?? [])
        .map((membership) => Number(membership.institution_id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );
}

function resolveMyScope(user: CurrentUser, requestedInstitutionId: number | null): { scope: FinanceScope; institutionId: number | null } {
  const institutionIds = userInstitutionIds(user);
  if (requestedInstitutionId) {
    if (!institutionIds.includes(requestedInstitutionId)) {
      throw new Error("Forbidden: Institution access required");
    }
    return { scope: "institution", institutionId: requestedInstitutionId };
  }

  if (institutionIds[0]) return { scope: "institution", institutionId: institutionIds[0] };
  return { scope: "platform", institutionId: null };
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const allowanceIdRaw = Number(url.searchParams.get("allowanceId"));
    const requestedAllowanceId = Number.isInteger(allowanceIdRaw) && allowanceIdRaw > 0
      ? allowanceIdRaw
      : null;
    const institutionIdRaw = Number(url.searchParams.get("institutionId"));
    const requestedInstitutionId = Number.isInteger(institutionIdRaw) && institutionIdRaw > 0
      ? institutionIdRaw
      : null;
    const page = positiveInt(url.searchParams.get("page"), 1, 10_000);
    const limit = positiveInt(url.searchParams.get("limit"), 10, 100);

    if (requestedAllowanceId) {
      const allowance = await db.query<{
        id: number;
        user_id: number;
        scope_type: FinanceScope;
        institution_id: number | null;
        amount: string | number;
        spent_amount: string | number;
        balance_amount: string | number;
      }>(`
        SELECT
          fae.id,
          fae.user_id,
          fae.scope_type::text AS scope_type,
          fae.institution_id,
          fae.amount,
          COALESCE(spend_totals.spent_amount, 0) AS spent_amount,
          (fae.amount - COALESCE(spend_totals.spent_amount, 0)) AS balance_amount
        FROM finance_allowance_entries fae
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(fase.amount), 0) AS spent_amount
          FROM finance_allowance_spend_entries fase
          WHERE fase.allowance_id = fae.id
        ) spend_totals ON TRUE
        WHERE fae.id = $1
        LIMIT 1
      `, [requestedAllowanceId]);

      const selectedAllowance = allowance.rows[0];
      if (!selectedAllowance) throw new Error("Select a valid allowance");

      const canViewSelectedAllowance = selectedAllowance.user_id === user.id ||
        (
          selectedAllowance.scope_type === "platform"
            ? hasPermission(user, "finance.platform.allowance.view")
            : hasPermission(user, "finance.allowance.view", {
                institutionId: selectedAllowance.institution_id ?? undefined,
              })
        );
      if (!canViewSelectedAllowance) {
        throw new Error("Forbidden: You do not have permission to view allowance usage");
      }

      const spends = await listMyFinanceAllowanceSpends(db, {
        user_id: selectedAllowance.user_id,
        institution_id: selectedAllowance.institution_id,
        scope_type: selectedAllowance.scope_type,
        allowance_id: selectedAllowance.id,
        search: url.searchParams.get("search") ?? "",
        payment_method: url.searchParams.get("paymentMethod") ?? "all",
        from_date: url.searchParams.get("from") || null,
        to_date: url.searchParams.get("to") || null,
        limit,
        offset: (page - 1) * limit,
      });

      return NextResponse.json({
        data: spends.data,
        meta: {
          total: spends.total,
          page,
          limit,
          scope: selectedAllowance.scope_type,
          institution_id: selectedAllowance.institution_id,
          allowances: [selectedAllowance],
          issued_total: selectedAllowance.amount,
          spent_total: selectedAllowance.spent_amount,
          balance_total: selectedAllowance.balance_amount,
          filtered_total: spends.filtered_total,
          this_month_total: spends.this_month_total,
          this_month_allowance_total: selectedAllowance.amount,
        },
      });
    }

    const { scope, institutionId } = resolveMyScope(user, requestedInstitutionId);

    const [allowances, spends] = await Promise.all([
      listMyFinanceAllowances(db, {
        user_id: user.id,
        institution_id: institutionId,
        scope_type: scope,
      }),
      listMyFinanceAllowanceSpends(db, {
        user_id: user.id,
        institution_id: institutionId,
        scope_type: scope,
        search: url.searchParams.get("search") ?? "",
        payment_method: url.searchParams.get("paymentMethod") ?? "all",
        from_date: url.searchParams.get("from") || null,
        to_date: url.searchParams.get("to") || null,
        limit,
        offset: (page - 1) * limit,
      }),
    ]);

    const issuedTotal = allowances.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const spentTotal = allowances.reduce((sum, row) => sum + Number(row.spent_amount || 0), 0);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thisMonthAllowanceTotal = allowances
      .filter((row) => String(row.allowance_date ?? "").startsWith(currentMonth))
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    return NextResponse.json({
      data: spends.data,
      meta: {
        total: spends.total,
        page,
        limit,
        scope,
        institution_id: institutionId,
        allowances,
        issued_total: issuedTotal,
        spent_total: spentTotal,
        balance_total: issuedTotal - spentTotal,
        filtered_total: spends.filtered_total,
        this_month_total: spends.this_month_total,
        this_month_allowance_total: thisMonthAllowanceTotal,
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

    const paymentMethod = String(body.payment_method ?? "").trim();
    if (!PAYMENT_METHODS.has(paymentMethod)) throw new Error("Select a valid payment method");

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount");

    const allowanceId = Number(body.allowance_id);
    if (!Number.isInteger(allowanceId) || allowanceId <= 0) throw new Error("Select a valid allowance");

    const allowanceScope = await db.query<{
      scope_type: FinanceScope;
      institution_id: number | null;
    }>(`
      SELECT scope_type::text AS scope_type, institution_id
      FROM finance_allowance_entries
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
    `, [allowanceId, user.id]);

    const scopeRow = allowanceScope.rows[0];
    if (!scopeRow) throw new Error("Select a valid allowance");

    const permission = scopeRow.scope_type === "platform"
      ? "finance.platform.allowance.create"
      : "finance.allowance.create";
    if (!hasPermission(user, permission, { institutionId: scopeRow.institution_id ?? undefined })) {
      throw new Error("Forbidden: You do not have permission to add expenditure");
    }

    await createFinanceAllowanceSpendEntry(db, {
      allowance_id: allowanceId,
      user_id: user.id,
      payment_method: paymentMethod as "cash" | "upi" | "net_banking",
      amount,
      spend_date: validDate(body.spend_date, "Spend date"),
      invoice_url: body.invoice_url ? String(body.invoice_url) : null,
      invoice_public_id: body.invoice_public_id ? String(body.invoice_public_id) : null,
      invoice_resource_type: body.invoice_resource_type ? String(body.invoice_resource_type) : null,
      invoice_file_name: body.invoice_file_name ? String(body.invoice_file_name) : null,
      description: body.description ? String(body.description).trim() : null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Forbidden") ? 403 : 400);
  }
}
