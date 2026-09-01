import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  createFinancePaymentMethod,
  listFinancePaymentMethods,
  type FinancePaymentMethodType,
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
      .filter((membership) =>
        [
          "institution_admin",
          "professional_organization",
          "school_owner",
          "college_owner",
          "university_owner",
          "library_owner",
          "pg_owner",
        ].includes(membership.role_code)
      )
      .map((membership) => Number(membership.institution_id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
}

function resolveScope(user: CurrentUser, institutionId: number | null): { scope: FinanceScope; institutionId: number | null } {
  if (isPlatformAdminUser(user)) {
    if (institutionId) {
      return { scope: "institution", institutionId };
    }
    return { scope: "platform", institutionId: null };
  }

  if (!isInstitutionAdminUser(user)) {
    throw new Error("Forbidden: Admin access required");
  }

  const institutionIds = userInstitutionIds(user);
  const targetId = institutionId ?? Array.from(institutionIds)[0] ?? null;
  if (!targetId || !institutionIds.has(targetId)) {
    throw new Error("Forbidden: Institution access required");
  }

  return { scope: "institution", institutionId: targetId };
}

const VALID_METHOD_TYPES = new Set<FinancePaymentMethodType>([
  "net_banking",
  "phonepe",
  "google_pay",
  "paytm",
  "bhim_upi",
  "other_upi",
  "cash",
  "cheque",
  "pos_card",
  "custom",
]);

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const searchParams = req.nextUrl.searchParams;
    const instParam = searchParams.get("institutionId");
    const rawInstitutionId = instParam ? Number(instParam) : null;
    const { scope, institutionId } = resolveScope(
      user,
      Number.isInteger(rawInstitutionId) && (rawInstitutionId ?? 0) > 0 ? rawInstitutionId : null
    );

    const data = await listFinancePaymentMethods(db, {
      scope_type: scope,
      institution_id: institutionId,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const rawInstitutionId = body.institutionId ? Number(body.institutionId) : null;
    const { scope, institutionId } = resolveScope(
      user,
      Number.isInteger(rawInstitutionId) && (rawInstitutionId ?? 0) > 0 ? rawInstitutionId : null
    );

    const methodType = String(body.method_type || "net_banking") as FinancePaymentMethodType;
    if (!VALID_METHOD_TYPES.has(methodType)) {
      return jsonError("Invalid payment method type", 400);
    }

    const title = String(body.title || "").trim();
    if (!title) {
      return jsonError("Payment method title / display name is required", 400);
    }

    // Validate type-specific required fields
    if (methodType === "net_banking") {
      if (!body.bank_name?.trim()) return jsonError("Bank name is required for Net Banking", 400);
      if (!body.account_number?.trim()) return jsonError("Account number is required for Net Banking", 400);
      if (!body.ifsc_code?.trim()) return jsonError("IFSC code is required for Net Banking", 400);
    } else if (["phonepe", "google_pay", "paytm", "bhim_upi", "other_upi"].includes(methodType)) {
      if (!body.upi_id?.trim() && !body.qr_code_url?.trim()) {
        return jsonError("UPI ID or QR Code image is required", 400);
      }
    }

    const created = await createFinancePaymentMethod(db, {
      scope_type: scope,
      institution_id: institutionId,
      method_type: methodType,
      title,
      bank_name: body.bank_name?.trim() || null,
      account_holder_name: body.account_holder_name?.trim() || null,
      account_number: body.account_number?.trim() || null,
      ifsc_code: body.ifsc_code?.trim() ? body.ifsc_code.trim().toUpperCase() : null,
      branch_name: body.branch_name?.trim() || null,
      account_type: body.account_type?.trim() || null,
      upi_id: body.upi_id?.trim() || null,
      upi_number: body.upi_number?.trim() || null,
      upi_provider_name: body.upi_provider_name?.trim() || null,
      merchant_name: body.merchant_name?.trim() || null,
      qr_code_url: body.qr_code_url?.trim() || null,
      qr_code_public_id: body.qr_code_public_id?.trim() || null,
      instructions: body.instructions?.trim() || null,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      is_default: Boolean(body.is_default),
      user_id: user.id,
    });

    return NextResponse.json({ success: true, message: "Payment method created successfully", data: created });
  } catch (error) {
    return jsonError(error, 400);
  }
}
