import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  deleteFinanceInvoice,
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
  if (isPlatformAdminUser(user) || hasPermission(user, "finance.platform.income.view")) {
    return { scope: "platform", institutionId: null };
  }

  if (!isInstitutionAdminUser(user)) {
    throw new Error("Forbidden: Admin access required");
  }

  const institutionIds = userInstitutionIds(user);
  if (institutionId && !institutionIds.has(institutionId)) {
    throw new Error("Forbidden: You do not have access to this institution");
  }

  const effectiveInstitutionId = institutionId ?? Array.from(institutionIds)[0] ?? null;
  if (!effectiveInstitutionId) {
    throw new Error("No active institution found for this admin user");
  }

  return { scope: "institution", institutionId: effectiveInstitutionId };
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const institutionIdRaw = Number(url.searchParams.get("institutionId"));
    const requestedInstitutionId = Number.isInteger(institutionIdRaw) && institutionIdRaw > 0
      ? institutionIdRaw
      : null;
    const { scope, institutionId } = resolveScope(user, requestedInstitutionId);

    await deleteFinanceInvoice(db, id, scope, institutionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Forbidden") ? 403 : 400);
  }
}
