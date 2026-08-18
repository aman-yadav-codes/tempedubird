import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { updateFinanceAllowanceEntry, deleteFinanceAllowanceEntry } from "@/lib/queries/finance";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;
    const allowanceId = Number(id);
    if (!Number.isInteger(allowanceId) || allowanceId <= 0) {
      return NextResponse.json({ error: "Invalid allowance record ID" }, { status: 400 });
    }

    const body = await req.json();
    await updateFinanceAllowanceEntry(db, allowanceId, {
      user_id: body.user_id ? Number(body.user_id) : undefined,
      payment_method: body.payment_method ? String(body.payment_method) : undefined,
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      allowance_date: body.allowance_date ? String(body.allowance_date) : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
      updated_by: user.id,
    });

    return NextResponse.json({ success: true, message: "Allowance record updated successfully" });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update allowance record" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getAuthenticatedUser(req);
    const { id } = await params;
    const allowanceId = Number(id);
    if (!Number.isInteger(allowanceId) || allowanceId <= 0) {
      return NextResponse.json({ error: "Invalid allowance record ID" }, { status: 400 });
    }

    await deleteFinanceAllowanceEntry(db, allowanceId);
    return NextResponse.json({ success: true, message: "Allowance record deleted successfully" });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete allowance record" }, { status: 500 });
  }
}
