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
    const paymentStatus = searchParams.get("payment_status") || undefined;
    const fulfillmentStatus = searchParams.get("fulfillment_status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getSalesOrdersList({
      customerUserId: user.id,
      customerEmail: user.email,
      customerPhone: user.phone,
      search,
      paymentStatus,
      fulfillmentStatus,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      orders: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        pageCount: result.pageCount,
        limit,
      },
      metrics: {
        totalOrders: result.stats.totalOrders,
        totalSpent: result.stats.totalRevenue,
        paidCount: result.stats.paidCount,
        pendingCount: result.stats.pendingCount,
      },
    });
  } catch (err: any) {
    if (err?.message === "Unauthorized" || err?.message?.includes("token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Customer Orders API] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load orders" },
      { status: 500 }
    );
  }
}
