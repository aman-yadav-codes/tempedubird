import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformFullAccess } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { getSalesOrdersList, ensureSalesOrdersTable } from "@/lib/queries/orders";
import { getOrderCancelRemainingSeconds } from "@/lib/auth/store-ownership";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSalesOrdersTable();

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "purchases"; // "purchases" (default) or "sales" (received store orders)
    const search = searchParams.get("search") || undefined;
    const paymentStatus = searchParams.get("payment_status") || undefined;
    const fulfillmentStatus = searchParams.get("fulfillment_status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const userInstId = (user as any)?.institution_id ? Number((user as any).institution_id) : null;

    // Get user's businesses and professionals to accurately identify seller orders
    const bizRes = await db.query(
      `SELECT id FROM business_profiles WHERE user_id = $1 OR ($2::int IS NOT NULL AND institution_profile_id = $2::int)`,
      [user.id, userInstId]
    );
    const bizIds = bizRes.rows.map((r: any) => Number(r.id));

    const profRes = await db.query(
      `SELECT id FROM professional_profiles WHERE user_id = $1 OR ($2::int IS NOT NULL AND institution_profile_id = $2::int)`,
      [user.id, userInstId]
    );
    const profIds = profRes.rows.map((r: any) => Number(r.id));

    let result;
    if (scope === "sales") {
      // Incoming orders where user is the merchant / seller
      result = await getSalesOrdersList({
        sellerUserId: user.id,
        sellerBusinessIds: bizIds.length > 0 ? bizIds : undefined,
        sellerProfessionalIds: profIds.length > 0 ? profIds : undefined,
        institutionId: (bizIds.length === 0 && profIds.length === 0 && userInstId) ? userInstId : undefined,
        search,
        paymentStatus,
        fulfillmentStatus,
        page,
        limit,
      });
    } else {
      // Purchases placed by user
      result = await getSalesOrdersList({
        customerUserId: user.id,
        customerEmail: user.email,
        customerPhone: user.phone,
        search,
        paymentStatus,
        fulfillmentStatus,
        page,
        limit,
      });
    }

    const isPlatformAdmin = Boolean(
      isPlatformFullAccess(user) ||
      (user as any)?.role_codes?.includes("platform_admin") ||
      user.id === 1
    );

    const enrichedOrders = result.data.map((ord: any) => {
      const cancelRemainingSec = getOrderCancelRemainingSeconds(ord);
      const isBuyer =
        (ord.created_by && Number(ord.created_by) === Number(user.id)) ||
        (ord.customer_email && user.email && ord.customer_email.toLowerCase() === user.email.toLowerCase());
      const isSeller =
        isPlatformAdmin ||
        scope === "sales" ||
        (ord.seller_user_id && Number(ord.seller_user_id) === Number(user.id)) ||
        (ord.business_id && bizIds.includes(Number(ord.business_id))) ||
        (ord.professional_id && profIds.includes(Number(ord.professional_id))) ||
        (ord.institution_id && userInstId && Number(ord.institution_id) === userInstId);

      const canCancel =
        isBuyer &&
        cancelRemainingSec > 0 &&
        ord.fulfillment_status !== "Cancelled" &&
        ord.fulfillment_status !== "Delivered" &&
        ord.fulfillment_status !== "Shipped";

      return {
        ...ord,
        is_seller: Boolean(isSeller),
        is_buyer: Boolean(isBuyer),
        can_cancel: Boolean(canCancel),
        cancel_remaining_seconds: cancelRemainingSec,
        cancellation_window_minutes: 5,
      };
    });

    return NextResponse.json({
      success: true,
      orders: enrichedOrders,
      scope,
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
