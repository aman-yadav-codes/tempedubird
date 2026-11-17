import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformFullAccess } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { getSalesOrderById, ensureSalesOrdersTable } from "@/lib/queries/orders";
import { BUYER_CANCEL_WINDOW_MS, getOrderCancelRemainingSeconds } from "@/lib/auth/store-ownership";

/**
 * Server-side helper to verify if a user is authorized as the SELLER of this order.
 */
async function verifyIsOrderSeller(user: any, order: any): Promise<boolean> {
  if (!user || !order) return false;

  // 1. Platform admin has full access
  if (
    isPlatformFullAccess(user) ||
    user.role === "platform_admin" ||
    (Array.isArray(user.role_codes) && user.role_codes.includes("platform_admin"))
  ) {
    return true;
  }

  const currentUserId = user.id ? Number(user.id) : null;
  const userInstId = user.institution_id ? Number(user.institution_id) : null;
  const userUnderInstId = user.under_institution_id ? Number(user.under_institution_id) : null;

  // 2. Direct seller_user_id match
  if (currentUserId && order.seller_user_id && Number(order.seller_user_id) === currentUserId) {
    return true;
  }

  // 3. Institution match
  if (order.institution_id) {
    const oInstId = Number(order.institution_id);
    if (userInstId && userInstId === oInstId) return true;
    if (userUnderInstId && userUnderInstId === oInstId) return true;
    if (Array.isArray(user.memberships) && user.memberships.some((m: any) => Number(m.institution_id) === oInstId)) {
      return true;
    }
  }

  // 4. Business ownership in database
  if (order.business_id && currentUserId) {
    const bizRes = await db.query(
      `SELECT id FROM business_profiles 
       WHERE id = $1 AND (user_id = $2 OR owner_id = $2 OR ($3::int IS NOT NULL AND institution_profile_id = $3::int))
       LIMIT 1`,
      [Number(order.business_id), currentUserId, userInstId]
    );
    if (bizRes.rows.length > 0) return true;
  }

  // 5. Professional ownership in database
  if (order.professional_id && currentUserId) {
    const profRes = await db.query(
      `SELECT id FROM professional_profiles 
       WHERE id = $1 AND (user_id = $2 OR ($3::int IS NOT NULL AND institution_profile_id = $3::int))
       LIMIT 1`,
      [Number(order.professional_id), currentUserId, userInstId]
    );
    if (profRes.rows.length > 0) return true;
  }

  return false;
}

/**
 * Server-side helper to verify if a user is authorized as the BUYER of this order.
 */
function verifyIsOrderBuyer(user: any, order: any): boolean {
  if (!user || !order) return false;
  const currentUserId = user.id ? Number(user.id) : null;
  if (currentUserId && order.created_by && Number(order.created_by) === currentUserId) {
    return true;
  }
  if (user.email && order.customer_email && user.email.toLowerCase() === order.customer_email.toLowerCase()) {
    return true;
  }
  if (user.phone && order.customer_phone && user.phone === order.customer_phone) {
    return true;
  }
  return false;
}

/**
 * GET /api/orders/[id]
 * Fetch single order with line items, seller business details, and buyer info for bill generation.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await params;
    const orderId = Number(rawId);
    if (!orderId || isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid Order ID" }, { status: 400 });
    }

    await ensureSalesOrdersTable();
    const order = await getSalesOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isSeller = await verifyIsOrderSeller(user, order);
    const isBuyer = verifyIsOrderBuyer(user, order);

    if (!isSeller && !isBuyer && !isPlatformFullAccess(user)) {
      return NextResponse.json({ error: "Unauthorized access to this order" }, { status: 403 });
    }

    // Enrich with seller business name/address if available
    let sellerInfo: any = null;
    if (order.business_id) {
      const bRes = await db.query(
        "SELECT id, name, legal_name, address, city, state, postal_code, phone, email, gstin, logo_url FROM business_profiles WHERE id = $1",
        [order.business_id]
      );
      if (bRes.rows.length > 0) sellerInfo = bRes.rows[0];
    } else if (order.professional_id) {
      const pRes = await db.query(
        "SELECT id, name, title, address, phone, email, avatar_url as logo_url FROM professional_profiles WHERE id = $1",
        [order.professional_id]
      );
      if (pRes.rows.length > 0) sellerInfo = pRes.rows[0];
    }

    const cancelRemainingSec = getOrderCancelRemainingSeconds(order);
    const canCancel = isBuyer && cancelRemainingSec > 0 && order.fulfillment_status !== "Cancelled" && order.fulfillment_status !== "Delivered";

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        seller_info: sellerInfo,
        is_seller: isSeller,
        is_buyer: isBuyer,
        can_cancel: canCancel,
        cancel_remaining_seconds: cancelRemainingSec,
        cancellation_window_minutes: 5,
      },
    });
  } catch (err: any) {
    console.error("[Orders API GET] Error:", err);
    return NextResponse.json({ error: err?.message || "Failed to load order" }, { status: 500 });
  }
}

/**
 * PATCH /api/orders/[id]
 * - Buyer: Can ONLY cancel order within 5 minutes of placement.
 * - Seller: Can update fulfillment_status and payment_status after receiving the order.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await params;
    const orderId = Number(rawId);
    if (!orderId || isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid Order ID" }, { status: 400 });
    }

    await ensureSalesOrdersTable();
    const order = await getSalesOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await req.json();
    const { action, fulfillment_status, payment_status, notes } = body;

    const isSeller = await verifyIsOrderSeller(user, order);
    const isBuyer = verifyIsOrderBuyer(user, order);

    // =========================================================================
    // CASE 1: BUYER CANCEL ORDER (Allowed within 5 minutes only)
    // =========================================================================
    if (action === "cancel") {
      if (!isBuyer && !isSeller) {
        return NextResponse.json(
          { error: "Unauthorized: You are not a party to this order." },
          { status: 403 }
        );
      }

      // If buyer is cancelling, can ONLY cancel before order accept!
      if (!isSeller && isBuyer) {
        const status = (order.fulfillment_status || "").toLowerCase().trim();
        const isPendingAccept = status === "received" || status === "pending" || status === "";
        if (!isPendingAccept) {
          return NextResponse.json(
            {
              error:
                "Order cannot be cancelled. The store owner has already accepted your order.",
            },
            { status: 400 }
          );
        }
      }

      if (order.fulfillment_status === "Cancelled") {
        return NextResponse.json(
          { error: "Order is already cancelled." },
          { status: 400 }
        );
      }

      if (order.fulfillment_status === "Delivered" || order.fulfillment_status === "Shipped") {
        return NextResponse.json(
          { error: "Order cannot be cancelled as it is already dispatched or delivered." },
          { status: 400 }
        );
      }

      const cancellationNote = `[Cancelled by ${isSeller ? "Seller" : "Buyer"} at ${new Date().toISOString()}]`;
      const updatedNotes = order.notes ? `${order.notes} | ${cancellationNote}` : cancellationNote;

      await db.query(
        `UPDATE sales_orders 
         SET fulfillment_status = 'Cancelled', notes = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [updatedNotes, orderId]
      );

      const updatedOrder = await getSalesOrderById(orderId);
      return NextResponse.json({
        success: true,
        message: "Order has been cancelled successfully.",
        order: updatedOrder,
      });
    }

    // =========================================================================
    // CASE 2: SELLER STATUS UPDATE ("seller can only change status after getting order")
    // =========================================================================
    if (action === "update_status" || fulfillment_status || payment_status) {
      if (!isSeller) {
        return NextResponse.json(
          {
            error:
              "Store Owner Restriction: Only the store seller can change the order status after receiving the order. Buyers cannot modify order fulfillment status.",
          },
          { status: 403 }
        );
      }

      const fields: string[] = [];
      const values: any[] = [];

      if (fulfillment_status) {
        values.push(fulfillment_status);
        fields.push(`fulfillment_status = $${values.length}`);
      }

      if (payment_status) {
        values.push(payment_status);
        fields.push(`payment_status = $${values.length}`);
      }

      if (notes !== undefined) {
        values.push(notes);
        fields.push(`notes = $${values.length}`);
      }

      if (fields.length === 0) {
        return NextResponse.json({ error: "No fields provided to update." }, { status: 400 });
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(orderId);

      await db.query(
        `UPDATE sales_orders SET ${fields.join(", ")} WHERE id = $${values.length}`,
        values
      );

      const updatedOrder = await getSalesOrderById(orderId);
      return NextResponse.json({
        success: true,
        message: `Order status updated to ${fulfillment_status || order.fulfillment_status}.`,
        order: updatedOrder,
      });
    }

    return NextResponse.json({ error: "Invalid action or parameters." }, { status: 400 });
  } catch (err: any) {
    console.error("[Orders API PATCH] Error:", err);
    return NextResponse.json({ error: err?.message || "Failed to update order" }, { status: 500 });
  }
}
