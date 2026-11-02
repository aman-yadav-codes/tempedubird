import { recordPerformancePoints } from "@/lib/performance/performance-engine";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("task_id");
    if (!taskId) {
      return NextResponse.json({ error: "task_id is required" }, { status: 400 });
    }

    const res = await db.query(
      `SELECT id, title, client_name, currency, cost, price, base_price, extra_cost, invoices FROM operations_tasks WHERE id = $1`,
      [Number(taskId)]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = res.rows[0];
    return NextResponse.json({
      data: {
        task_id: task.id,
        title: task.title,
        client_name: task.client_name,
        currency: task.currency || "INR",
        invoices: Array.isArray(task.invoices) ? task.invoices : [],
      },
    });
  } catch (err: any) {
    console.error("[Project Invoices GET] Error:", err);
    const status = err.message === "Unauthorized" || err.message?.toLowerCase().includes("jwt") ? 401 : 500;
    return NextResponse.json({ error: err.message || "Failed to fetch invoices" }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { task_id, invoice } = body;

    if (!task_id || !invoice) {
      return NextResponse.json({ error: "task_id and invoice data are required" }, { status: 400 });
    }

    const taskRes = await db.query(
      `SELECT id, invoices, history FROM operations_tasks WHERE id = $1`,
      [Number(task_id)]
    );

    if (taskRes.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const currentInvoices = Array.isArray(taskRes.rows[0].invoices) ? taskRes.rows[0].invoices : [];
    const history = Array.isArray(taskRes.rows[0].history) ? taskRes.rows[0].history : [];

    const newInvoice = {
      id: invoice.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      invoice_number: invoice.invoice_number || `INV-${task_id}-${String(currentInvoices.length + 1).padStart(3, "0")}`,
      issue_date: invoice.issue_date || new Date().toISOString().substring(0, 10),
      due_date: invoice.due_date || new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10),
      client_name: invoice.client_name || "",
      client_company: invoice.client_company || "",
      client_email: invoice.client_email || "",
      currency: invoice.currency || "INR",
      items: Array.isArray(invoice.items) ? invoice.items : [],
      subtotal: parseFloat(invoice.subtotal) || 0,
      tax_rate: parseFloat(invoice.tax_rate) || 0,
      tax_amount: parseFloat(invoice.tax_amount) || 0,
      total_amount: parseFloat(invoice.total_amount) || 0,
      status: invoice.status || "unpaid",
      notes: invoice.notes || "",
      created_by_id: user.id,
      created_by_name: (user as any).full_name || (user as any).name || (user as any).email || "User",
      created_at: new Date().toISOString(),
    };

    const updatedInvoices = [newInvoice, ...currentInvoices];

    history.push({
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action: "invoice_created",
      timestamp: new Date().toISOString(),
      user_id: user.id,
      user_name: (user as any).full_name || (user as any).name || (user as any).email || "User",
      details: `Invoice ${newInvoice.invoice_number} created for ${newInvoice.currency} ${newInvoice.total_amount}`,
    });

    await db.query(
      `UPDATE operations_tasks 
       SET invoices = $1::jsonb, history = $2::jsonb, updated_at = NOW() 
       WHERE id = $3`,
      [JSON.stringify(updatedInvoices), JSON.stringify(history), Number(task_id)]
    );

    try {
      await recordPerformancePoints({
        employeeId: user.id,
        activityType: "finance_invoice",
        referenceModule: "finance_invoice",
        referenceRecordId: newInvoice.id || newInvoice.invoice_number,
        performedBy: { id: user.id, name: (user as any).full_name || "Admin" },
        customDescription: "Added invoice " + newInvoice.invoice_number + " for " + newInvoice.currency + " " + newInvoice.total_amount,
      });
    } catch (e) {
      console.warn("[Project Invoice] Performance points warning:", e);
    }

    return NextResponse.json({
      message: "Invoice created successfully",
      invoice: newInvoice,
      invoices: updatedInvoices,
    });
  } catch (err: any) {
    console.error("[Project Invoices POST] Error:", err);
    const status = err.message === "Unauthorized" || err.message?.toLowerCase().includes("jwt") ? 401 : 500;
    return NextResponse.json({ error: err.message || "Failed to create invoice" }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { task_id, invoice_id, updates } = body;

    if (!task_id || !invoice_id || !updates) {
      return NextResponse.json({ error: "task_id, invoice_id, and updates are required" }, { status: 400 });
    }

    const taskRes = await db.query(
      `SELECT id, invoices, history FROM operations_tasks WHERE id = $1`,
      [Number(task_id)]
    );

    if (taskRes.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const currentInvoices = Array.isArray(taskRes.rows[0].invoices) ? taskRes.rows[0].invoices : [];
    const history = Array.isArray(taskRes.rows[0].history) ? taskRes.rows[0].history : [];

    const index = currentInvoices.findIndex((inv: any) => inv.id === invoice_id);
    if (index === -1) {
      return NextResponse.json({ error: "Invoice not found in task" }, { status: 404 });
    }

    const oldInvoice = currentInvoices[index];
    const updatedInvoice = {
      ...oldInvoice,
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    currentInvoices[index] = updatedInvoice;

    history.push({
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action: "invoice_updated",
      timestamp: new Date().toISOString(),
      user_id: user.id,
      user_name: (user as any).full_name || (user as any).name || (user as any).email || "User",
      details: `Invoice ${updatedInvoice.invoice_number} status changed to "${updatedInvoice.status}"`,
    });

    await db.query(
      `UPDATE operations_tasks 
       SET invoices = $1::jsonb, history = $2::jsonb, updated_at = NOW() 
       WHERE id = $3`,
      [JSON.stringify(currentInvoices), JSON.stringify(history), Number(task_id)]
    );

    return NextResponse.json({
      message: "Invoice updated successfully",
      invoice: updatedInvoice,
      invoices: currentInvoices,
    });
  } catch (err: any) {
    console.error("[Project Invoices PUT] Error:", err);
    const status = err.message === "Unauthorized" || err.message?.toLowerCase().includes("jwt") ? 401 : 500;
    return NextResponse.json({ error: err.message || "Failed to update invoice" }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("task_id");
    const invoiceId = searchParams.get("invoice_id");

    if (!taskId || !invoiceId) {
      return NextResponse.json({ error: "task_id and invoice_id are required" }, { status: 400 });
    }

    const taskRes = await db.query(
      `SELECT id, invoices, history FROM operations_tasks WHERE id = $1`,
      [Number(taskId)]
    );

    if (taskRes.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const currentInvoices = Array.isArray(taskRes.rows[0].invoices) ? taskRes.rows[0].invoices : [];
    const history = Array.isArray(taskRes.rows[0].history) ? taskRes.rows[0].history : [];

    const filteredInvoices = currentInvoices.filter((inv: any) => inv.id !== invoiceId);

    history.push({
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action: "invoice_deleted",
      timestamp: new Date().toISOString(),
      user_id: user.id,
      user_name: (user as any).full_name || (user as any).name || (user as any).email || "User",
      details: `Invoice ${invoiceId} deleted`,
    });

    await db.query(
      `UPDATE operations_tasks 
       SET invoices = $1::jsonb, history = $2::jsonb, updated_at = NOW() 
       WHERE id = $3`,
      [JSON.stringify(filteredInvoices), JSON.stringify(history), Number(taskId)]
    );

    return NextResponse.json({
      message: "Invoice deleted successfully",
      invoices: filteredInvoices,
    });
  } catch (err: any) {
    console.error("[Project Invoices DELETE] Error:", err);
    const status = err.message === "Unauthorized" || err.message?.toLowerCase().includes("jwt") ? 401 : 500;
    return NextResponse.json({ error: err.message || "Failed to delete invoice" }, { status });
  }
}

