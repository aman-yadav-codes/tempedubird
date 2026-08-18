import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { deleteFinanceRecurringExpense, updateFinanceRecurringExpense } from "@/lib/queries/finance";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;
    const expenseId = Number(id);
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return NextResponse.json({ error: "Invalid recurring expense record ID" }, { status: 400 });
    }

    const body = await req.json();
    await updateFinanceRecurringExpense(db, {
      id: expenseId,
      scope_type: body.scope_type || "institution",
      institution_id: body.institution_id ? Number(body.institution_id) : null,
      title: body.title,
      category_ids: body.category_ids || [],
      payment_method: body.payment_method || "net_banking",
      paid_by: body.paid_by || "institution",
      paid_by_label: body.paid_by_label || "Institution Admin",
      amount: Number(body.amount),
      frequency: body.frequency || "monthly",
      due_day: Number(body.due_day || 1),
      start_date: body.start_date,
      end_date: body.end_date || null,
      reminder_days_before: Number(body.reminder_days_before || 3),
      payment_status: body.payment_status || "due",
      next_due_date: body.next_due_date || body.start_date,
      description: body.description || null,
      user_id: user.id,
    });

    return NextResponse.json({ success: true, message: "Recurring expense updated successfully" });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update recurring expense" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getAuthenticatedUser(req);
    const { id } = await params;
    const expenseId = Number(id);
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return NextResponse.json({ error: "Invalid recurring expense record ID" }, { status: 400 });
    }

    await deleteFinanceRecurringExpense(db, expenseId);
    return NextResponse.json({ success: true, message: "Recurring expense deleted successfully" });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete recurring expense" }, { status: 500 });
  }
}
