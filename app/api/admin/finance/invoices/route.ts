import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  listFinanceInvoices,
  type FinanceScope,
} from "@/lib/queries/finance";

type CurrentUser = Awaited<ReturnType<typeof getAuthenticatedUser>>;

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
  const isPlatform = isPlatformAdminUser(user) || hasPermission(user, "finance.platform.income.view");
  const isInstitution = isInstitutionAdminUser(user) || hasPermission(user, "finance.income.view");
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
      throw new Error("No active institution found for invoices");
    }
    return { scope: "institution", institutionId };
  }

  throw new Error("Forbidden: You do not have permission to access invoice records");
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

    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

    const result = await listFinanceInvoices(db, {
      scope_type: scope,
      institution_id: institutionId,
      search: url.searchParams.get("search") ?? "",
      payment_method: url.searchParams.get("paymentMethod") ?? "all",
      status: url.searchParams.get("status") ?? "all",
      from_date: url.searchParams.get("from") || null,
      to_date: url.searchParams.get("to") || null,
      limit,
      offset: (page - 1) * limit,
    });

    return NextResponse.json({
      data: result.data,
      meta: {
        total: result.total,
        page,
        limit,
        total_amount: result.total_amount,
        this_month_total: result.this_month_total,
        scope,
        institution_id: institutionId,
      },
    });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Forbidden") ? 403 : 400);
  }
}
