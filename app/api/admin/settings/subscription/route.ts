import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isInstitutionAdminUser, isPlatformAdminUser, type PermissionUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  approveInstitutionSubscription,
  getInstitutionSubscriptionState,
  listInstitutionSubscriptions,
  listPlansForInstitution,
  requestInstitutionSubscription,
  revokeInstitutionSubscription,
} from "@/lib/queries/subscriptions";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function parsePositiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getInstitutionAdminInstitutionId(user: PermissionUser, requestedInstitutionId?: number | null) {
  const memberships = user.memberships ?? [];
  if (requestedInstitutionId) {
    const canAccess = memberships.some((membership) =>
      membership.role_code === "institution_admin" &&
      membership.institution_id === requestedInstitutionId
    );
    return canAccess ? requestedInstitutionId : null;
  }

  return memberships.find((membership) =>
    membership.role_code === "institution_admin" &&
    Number.isInteger(Number(membership.institution_id)) &&
    Number(membership.institution_id) > 0
  )?.institution_id ?? null;
}

function assertCanViewInstitutionSubscription(user: PermissionUser, institutionId: number) {
  if (isInstitutionAdminUser(user) && getInstitutionAdminInstitutionId(user, institutionId)) {
    return;
  }
  throw new Error("Forbidden: Admin access required");
}

function assertCanEditInstitutionSubscription(user: PermissionUser, institutionId: number) {
  if (isInstitutionAdminUser(user) && getInstitutionAdminInstitutionId(user, institutionId)) {
    return;
  }
  throw new Error("Forbidden: Admin access required");
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);

    if (isPlatformAdminUser(user)) {
      const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 10) || 10));
      const search = url.searchParams.get("search")?.trim() ?? "";
      const { data, total } = await listInstitutionSubscriptions(db, {
        search,
        limit,
        offset: (page - 1) * limit,
      });
      return NextResponse.json({
        mode: "platform",
        data,
        total,
        page,
        pageCount: Math.max(1, Math.ceil(total / limit)),
      });
    }

    const requestedInstitutionId = parsePositiveInteger(url.searchParams.get("institutionId"));
    const institutionId = getInstitutionAdminInstitutionId(user, requestedInstitutionId);
    if (!institutionId) throw new Error("Forbidden: Admin access required");
    assertCanViewInstitutionSubscription(user, institutionId);

    const [state, planResult] = await Promise.all([
      getInstitutionSubscriptionState(db, institutionId),
      listPlansForInstitution(db, institutionId),
    ]);

    return NextResponse.json({
      mode: "institution",
      data: {
        institution: state?.institution ?? planResult.institution,
        subscription: state?.subscription ?? null,
        is_valid: Boolean(state?.is_valid),
        plans: planResult.plans,
      },
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const institutionId = getInstitutionAdminInstitutionId(user, parsePositiveInteger(body.institutionId));
    const packageId = parsePositiveInteger(body.packageId);

    if (!institutionId || !packageId) {
      return NextResponse.json({ error: "Select an institution and subscription plan" }, { status: 422 });
    }

    assertCanEditInstitutionSubscription(user, institutionId);
    const subscription = await requestInstitutionSubscription(db, institutionId, packageId, user.id);

    return NextResponse.json({ data: subscription });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required"
      ? 403
      : message.includes("not available") || message.includes("not found")
        ? 422
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) throw new Error("Forbidden: Admin access required");

    const body = await req.json();
    const subscriptionId = parsePositiveInteger(body.subscriptionId);
    const action = String(body.action ?? "approve");
    if (!subscriptionId) {
      return NextResponse.json({ error: "Select a subscription" }, { status: 422 });
    }

    const subscription = action === "revoke"
      ? await revokeInstitutionSubscription(db, subscriptionId, user.id)
      : await approveInstitutionSubscription(db, subscriptionId, user.id);
    return NextResponse.json({ data: subscription });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required"
      ? 403
      : message.includes("not found") || message.includes("missing")
        ? 422
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
