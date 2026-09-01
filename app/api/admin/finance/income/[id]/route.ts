import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { updateFinanceIncomeEntry, deleteFinanceIncomeEntry } from "@/lib/queries/finance";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;
    const incomeId = Number(id);
    if (!Number.isInteger(incomeId) || incomeId <= 0) {
      return NextResponse.json({ error: "Invalid income record ID" }, { status: 400 });
    }

    const body = await req.json();
    await updateFinanceIncomeEntry(db, incomeId, {
      category_id: body.category_id ? Number(body.category_id) : undefined,
      payment_method: body.payment_method ? String(body.payment_method) : undefined,
      paid_by: body.paid_by !== undefined ? (body.paid_by ? String(body.paid_by) : null) : undefined,
      paid_by_label: body.paid_by_label !== undefined ? (body.paid_by_label ? String(body.paid_by_label) : null) : undefined,
      payer_name: body.payer_name !== undefined ? (body.payer_name ? String(body.payer_name) : null) : (body.paid_by_label ? String(body.paid_by_label) : undefined),
      paid_to: body.paid_to ? String(body.paid_to) : undefined,
      paid_to_label: body.paid_to_label ? String(body.paid_to_label) : undefined,
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      income_date: body.income_date ? String(body.income_date) : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
      user_id: user.id,
    });

    return NextResponse.json({ success: true, message: "Income record updated successfully" });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update income record" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getAuthenticatedUser(req);
    const { id } = await params;
    const incomeId = Number(id);
    if (!Number.isInteger(incomeId) || incomeId <= 0) {
      return NextResponse.json({ error: "Invalid income record ID" }, { status: 400 });
    }

    await deleteFinanceIncomeEntry(db, incomeId);
    return NextResponse.json({ success: true, message: "Income record deleted successfully" });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete income record" }, { status: 500 });
  }
}
