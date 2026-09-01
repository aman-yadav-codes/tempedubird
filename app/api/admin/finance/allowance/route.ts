import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  createFinanceAllowanceEntry,
  listFinanceAllowance,
  listFinanceAllowanceUserOptions,
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
  return new Set(
    (user.memberships ?? [])
      .map((membership) => Number(membership.institution_id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
}

function resolveScope(user: CurrentUser, requestedInstitutionId?: number | null): {
  scope: FinanceScope;
  institutionId: number | null;
} {
  const isPlatform = isPlatformAdminUser(user) || hasPermission(user, "finance.platform.allowance.view");
  const isInstitution = isInstitutionAdminUser(user) || hasPermission(user, "finance.allowance.view");
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
      throw new Error("No active institution found for allowance management");
    }
    return { scope: "institution", institutionId };
  }

  throw new Error("Forbidden: You do not have permission to access allowance records");
}

function positiveInt(value: string | null, fallback: number, max: number) {
  const next = Number(value);
  if (!Number.isInteger(next) || next <= 0) return fallback;
  return Math.min(next, max);
}

function optionalPositiveInt(value: string | null) {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
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

    const [result, users] = await Promise.all([
      listFinanceAllowance(db, {
        scope_type: scope,
        institution_id: institutionId,
        search: url.searchParams.get("search") ?? "",
        payment_method: url.searchParams.get("paymentMethod") ?? "all",
        user_id: optionalPositiveInt(url.searchParams.get("userId")),
        from_date: url.searchParams.get("from") || null,
        to_date: url.searchParams.get("to") || null,
        limit,
        offset: (page - 1) * limit,
      }),
      listFinanceAllowanceUserOptions(db, scope, institutionId),
    ]);

    return NextResponse.json({
      data: result.data,
      meta: {
        total: result.total,
        page,
        limit,
        filtered_total: result.filtered_total,
        this_month_total: result.this_month_total,
        cash_in_hand_total: result.cash_in_hand_total,
        scope,
        institution_id: institutionId,
        users,
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

    const permission = scope === "platform" ? "finance.platform.allowance.create" : "finance.allowance.create";
    if (!hasPermission(user, permission, { institutionId })) {
      throw new Error("Forbidden: You do not have permission to add allowance");
    }

    const paymentMethod = String(body.payment_method ?? "").trim();
    if (!PAYMENT_METHODS.has(paymentMethod)) throw new Error("Select a valid payment method");

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount");

    const userId = Number(body.user_id);
    if (!Number.isInteger(userId) || userId <= 0) throw new Error("Select a valid user");

    await createFinanceAllowanceEntry(db, {
      scope_type: scope,
      institution_id: institutionId,
      user_id: userId,
      payment_method: paymentMethod as "cash" | "upi" | "net_banking",
      amount,
      allowance_date: validDate(body.allowance_date, "Allowance date"),
      invoice_url: body.invoice_url ? String(body.invoice_url) : null,
      invoice_public_id: body.invoice_public_id ? String(body.invoice_public_id) : null,
      invoice_resource_type: body.invoice_resource_type ? String(body.invoice_resource_type) : null,
      invoice_file_name: body.invoice_file_name ? String(body.invoice_file_name) : null,
      description: body.description ? String(body.description).trim() : null,
      created_by: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Forbidden") ? 403 : 400);
  }
}
