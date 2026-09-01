import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { updateFinanceExpenseEntry, deleteFinanceExpenseEntry } from "@/lib/queries/finance";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;
    const expenseId = Number(id);
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return NextResponse.json({ error: "Invalid expense record ID" }, { status: 400 });
    }

    const body = await req.json();
    await updateFinanceExpenseEntry(db, expenseId, {
      category_id: body.category_id ? Number(body.category_id) : undefined,
      payment_method: body.payment_method ? String(body.payment_method) : undefined,
      payment_status: body.payment_status ? String(body.payment_status) : undefined,
      paid_by: body.paid_by ? String(body.paid_by) : undefined,
      paid_by_label: body.paid_by_label ? String(body.paid_by_label) : undefined,
      paid_to: body.paid_to !== undefined ? (body.paid_to ? String(body.paid_to) : null) : undefined,
      paid_to_label: body.paid_to_label !== undefined ? (body.paid_to_label ? String(body.paid_to_label) : null) : (body.paid_to ? String(body.paid_to) : undefined),
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      expense_date: body.expense_date ? String(body.expense_date) : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
      user_id: user.id,
    });

    return NextResponse.json({ success: true, message: "Expense record updated successfully" });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update expense record" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getAuthenticatedUser(req);
    const { id } = await params;
    const expenseId = Number(id);
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return NextResponse.json({ error: "Invalid expense record ID" }, { status: 400 });
    }

    await deleteFinanceExpenseEntry(db, expenseId);
    return NextResponse.json({ success: true, message: "Expense record deleted successfully" });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete expense record" }, { status: 500 });
  }
}
