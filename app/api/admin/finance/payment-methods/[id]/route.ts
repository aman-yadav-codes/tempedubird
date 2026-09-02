import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  deleteFinancePaymentMethod,
  updateFinancePaymentMethod,
  type FinancePaymentMethodType,
} from "@/lib/queries/finance";

function jsonError(error: unknown, status = 400) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Something went wrong" },
    { status }
  );
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return jsonError("Invalid payment method ID", 400);
    }

    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      throw new Error("Forbidden: Admin access required");
    }

    const body = await req.json();

    const updated = await updateFinancePaymentMethod(db, id, {
      method_type: body.method_type as FinancePaymentMethodType | undefined,
      title: body.title !== undefined ? String(body.title).trim() : undefined,
      bank_name: body.bank_name !== undefined ? (body.bank_name ? String(body.bank_name).trim() : null) : undefined,
      account_holder_name: body.account_holder_name !== undefined ? (body.account_holder_name ? String(body.account_holder_name).trim() : null) : undefined,
      account_number: body.account_number !== undefined ? (body.account_number ? String(body.account_number).trim() : null) : undefined,
      ifsc_code: body.ifsc_code !== undefined ? (body.ifsc_code ? String(body.ifsc_code).trim().toUpperCase() : null) : undefined,
      branch_name: body.branch_name !== undefined ? (body.branch_name ? String(body.branch_name).trim() : null) : undefined,
      account_type: body.account_type !== undefined ? (body.account_type ? String(body.account_type).trim() : null) : undefined,
      upi_id: body.upi_id !== undefined ? (body.upi_id ? String(body.upi_id).trim() : null) : undefined,
      upi_number: body.upi_number !== undefined ? (body.upi_number ? String(body.upi_number).trim() : null) : undefined,
      upi_provider_name: body.upi_provider_name !== undefined ? (body.upi_provider_name ? String(body.upi_provider_name).trim() : null) : undefined,
      merchant_name: body.merchant_name !== undefined ? (body.merchant_name ? String(body.merchant_name).trim() : null) : undefined,
      qr_code_url: body.qr_code_url !== undefined ? (body.qr_code_url ? String(body.qr_code_url).trim() : null) : undefined,
      qr_code_public_id: body.qr_code_public_id !== undefined ? (body.qr_code_public_id ? String(body.qr_code_public_id).trim() : null) : undefined,
      instructions: body.instructions !== undefined ? (body.instructions ? String(body.instructions).trim() : null) : undefined,
      gateway_provider: body.gateway_provider !== undefined ? (body.gateway_provider ? String(body.gateway_provider).trim() : null) : undefined,
      gateway_key_id: body.gateway_key_id !== undefined ? (body.gateway_key_id ? String(body.gateway_key_id).trim() : null) : undefined,
      gateway_key_secret: body.gateway_key_secret !== undefined ? (body.gateway_key_secret ? String(body.gateway_key_secret).trim() : null) : undefined,
      gateway_webhook_secret: body.gateway_webhook_secret !== undefined ? (body.gateway_webhook_secret ? String(body.gateway_webhook_secret).trim() : null) : undefined,
      gateway_environment: body.gateway_environment !== undefined ? (body.gateway_environment ? String(body.gateway_environment).trim() : "live") : undefined,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
      is_default: body.is_default !== undefined ? Boolean(body.is_default) : undefined,
      updated_by: user.id,
    });

    if (!updated) {
      return jsonError("Payment method not found", 404);
    }

    return NextResponse.json({ success: true, message: "Payment method updated successfully", data: updated });
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return jsonError("Invalid payment method ID", 400);
    }

    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      throw new Error("Forbidden: Admin access required");
    }

    await deleteFinancePaymentMethod(db, id);

    return NextResponse.json({ success: true, message: "Payment method deleted successfully" });
  } catch (error) {
    return jsonError(error, 400);
  }
}
