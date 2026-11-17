import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { getSalesOrdersList, ensureSalesOrdersTable } from "@/lib/queries/orders";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSalesOrdersTable();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getSalesOrdersList({
      customerUserId: user.id,
      customerEmail: user.email,
      customerPhone: user.phone,
      search,
      page,
      limit,
    });

    // Map orders to financial records/invoices
    const financeRecords = result.data.map((o) => ({
      id: o.id,
      invoiceNumber: `INV-${o.order_number.replace(/^ORD-/, "")}`,
      orderNumber: o.order_number,
      date: o.created_at,
      description: o.items_summary || `Order ${o.order_number}`,
      amount: Number(o.total_amount || 0),
      subtotal: Number(o.subtotal_amount || 0),
      discount: Number(o.discount_amount || 0),
      tax: Number(o.tax_amount || 0),
      paymentMethod: o.payment_method || "Online",
      status: o.payment_status,
      receiptUrl: `/admin/orders?order=${o.order_number}`,
    }));

    const totalSpent = financeRecords
      .filter((r) => r.status.toLowerCase() === "paid")
      .reduce((sum, r) => sum + r.amount, 0);

    const pendingAmount = financeRecords
      .filter((r) => r.status.toLowerCase() === "pending")
      .reduce((sum, r) => sum + r.amount, 0);

    return NextResponse.json({
      success: true,
      records: financeRecords,
      pagination: {
        total: result.total,
        page: result.page,
        pageCount: result.pageCount,
        limit,
      },
      metrics: {
        totalSpent,
        pendingAmount,
        totalInvoices: financeRecords.length,
        paidInvoices: financeRecords.filter((r) => r.status.toLowerCase() === "paid").length,
      },
    });
  } catch (err: any) {
    if (err?.message === "Unauthorized" || err?.message?.includes("token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Customer Finance API] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load finance records" },
      { status: 500 }
    );
  }
}
