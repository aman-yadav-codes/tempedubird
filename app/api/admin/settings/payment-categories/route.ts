import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  createFinancePaymentCategory,
  deactivateFinancePaymentCategory,
  listFinancePaymentCategories,
  type FinanceCategoryUsage,
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
      .filter((membership) => membership.role_code === "institution_admin")
      .map((membership) => Number(membership.institution_id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
}

function resolveScope(user: CurrentUser, institutionId: number | null): { scope: FinanceScope; institutionId: number | null } {
  if (isPlatformAdminUser(user)) return { scope: "platform", institutionId: null };
  if (!isInstitutionAdminUser(user)) throw new Error("Forbidden: Admin access required");

  const ids = userInstitutionIds(user);
  const targetId = institutionId ?? Array.from(ids)[0] ?? null;
  if (!targetId || !ids.has(targetId)) throw new Error("Forbidden: Institution access required");
  return { scope: "institution", institutionId: targetId };
}

function ensureCanEdit(user: CurrentUser, scope: FinanceScope, institutionId: number | null) {
  if (scope === "platform" && !isPlatformAdminUser(user)) throw new Error("Forbidden: Platform access required");
  if (scope === "institution" && !hasPermission(user, "settings.payments.edit", { institutionId })) {
    throw new Error("Forbidden: You do not have permission to edit payment settings");
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const rawInstitutionId = Number(url.searchParams.get("institutionId"));
    const { scope, institutionId } = resolveScope(
      user,
      Number.isInteger(rawInstitutionId) && rawInstitutionId > 0 ? rawInstitutionId : null
    );
    const categories = await listFinancePaymentCategories(db, scope, institutionId);
    return NextResponse.json({ data: categories });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Forbidden") ? 403 : 400);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const rawInstitutionId = Number(body.institutionId);
    const { scope, institutionId } = resolveScope(
      user,
      Number.isInteger(rawInstitutionId) && rawInstitutionId > 0 ? rawInstitutionId : null
    );
    ensureCanEdit(user, scope, institutionId);
    const incomeId = Number(body.income_id);
    const expenseId = Number(body.expense_id);
    const recurringId = Number(body.recurring_id);
    const previousName = String(body.previous_name ?? "").trim();
    if (
      (Number.isInteger(incomeId) && incomeId > 0) ||
      (Number.isInteger(expenseId) && expenseId > 0) ||
      (Number.isInteger(recurringId) && recurringId > 0) ||
      previousName
    ) {
      await deactivateFinancePaymentCategory(
        db,
        scope,
        institutionId,
        {
          incomeId: Number.isInteger(incomeId) && incomeId > 0 ? incomeId : null,
          expenseId: Number.isInteger(expenseId) && expenseId > 0 ? expenseId : null,
          recurringId: Number.isInteger(recurringId) && recurringId > 0 ? recurringId : null,
          name: previousName,
        },
        user.id
      );
    }
    const rawUsageTypes: unknown[] = Array.isArray(body.usage_types)
      ? body.usage_types
      : String(body.usage_type ?? "income") === "both"
        ? ["income", "expense"]
        : [body.usage_type ?? "income"];
    const allowed = new Set<FinanceCategoryUsage>(["income", "expense", "recurring"]);
    const usageTypes = Array.from(
      new Set(
        rawUsageTypes
          .map((value) => String(value).trim())
          .filter((value): value is FinanceCategoryUsage => allowed.has(value as FinanceCategoryUsage))
      )
    );
    const category = await createFinancePaymentCategory(
      db,
      scope,
      institutionId,
      String(body.name ?? ""),
      usageTypes,
      user.id
    );
    return NextResponse.json({ data: category });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Forbidden") ? 403 : 400);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const rawInstitutionId = Number(body.institutionId);
    const incomeId = Number(body.income_id);
    const expenseId = Number(body.expense_id);
    const recurringId = Number(body.recurring_id);
    const name = String(body.name ?? "").trim();
    if (
      (!Number.isInteger(incomeId) || incomeId <= 0) &&
      (!Number.isInteger(expenseId) || expenseId <= 0) &&
      (!Number.isInteger(recurringId) || recurringId <= 0) &&
      !name
    ) {
      throw new Error("Select a valid category");
    }

    const { scope, institutionId } = resolveScope(
      user,
      Number.isInteger(rawInstitutionId) && rawInstitutionId > 0 ? rawInstitutionId : null
    );
    ensureCanEdit(user, scope, institutionId);
    await deactivateFinancePaymentCategory(
      db,
      scope,
      institutionId,
        {
          incomeId: Number.isInteger(incomeId) && incomeId > 0 ? incomeId : null,
          expenseId: Number.isInteger(expenseId) && expenseId > 0 ? expenseId : null,
          recurringId: Number.isInteger(recurringId) && recurringId > 0 ? recurringId : null,
          name,
        },
      user.id
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Forbidden") ? 403 : 400);
  }
}
