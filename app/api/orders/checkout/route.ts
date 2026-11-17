import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthUser } from "@/lib/auth/auth";
import { ensureSalesOrdersTable } from "@/lib/queries/orders";

export async function POST(req: Request) {
  try {
    await ensureSalesOrdersTable();

    const authUser = await getAuthUser(req);
    if (!authUser?.id) {
      return NextResponse.json(
        { error: "Registration required. You must register or log in first before purchasing products or booking appointments." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      itemName,
      items, // Optional array of items from cart: [{ name, quantity, unitPrice, totalPrice, id }]
      itemType = "product", // "product" | "service"
      quantity = 1,
      unitPrice = 0,
      totalAmount = 0,
      fulfillmentType = "pickup", // "pickup" | "delivery" | "appointment"
      scheduledDate,
      scheduledTime,
      shippingAddress,
      paymentMethod = "Online (UPI / Card)",
      customerName,
      customerEmail,
      customerPhone,
      notes,
      institutionId,
      businessId,
      professionalId,
      sellerUserId,
    } = body;

    const hasMultiItems = Array.isArray(items) && items.length > 0;
    const resolvedItemName = hasMultiItems
      ? (items.length === 1 ? items[0].name : `${items[0].name} (+${items.length - 1} more items)`)
      : (itemName || "");

    // Strict validation: at one time either products can be bought OR services booked
    if (itemType !== "product" && itemType !== "service") {
      return NextResponse.json(
        { error: "Invalid order type. You can only purchase products or book services separately." },
        { status: 400 }
      );
    }

    if (itemType === "service" && fulfillmentType !== "appointment") {
      return NextResponse.json(
        { error: "Service bookings must be scheduled as an appointment." },
        { status: 400 }
      );
    }

    if (itemType === "product" && fulfillmentType === "appointment") {
      return NextResponse.json(
        { error: "Products cannot be booked as an appointment. Please select store pickup or doorstep delivery." },
        { status: 400 }
      );
    }

    // Self-ordering prevention: providers / business owners cannot order from their own storefront or book their own service
    const currentUserId = authUser?.id ? Number(authUser.id) : null;
    const userInstId = (authUser as any)?.institution_id ? Number((authUser as any).institution_id) : null;

    if (currentUserId) {
      // 1. Direct sellerUserId check
      if (sellerUserId && Number(sellerUserId) === currentUserId) {
        return NextResponse.json(
          { error: "Store Owner Restriction: You cannot order products or book services from your own store." },
          { status: 403 }
        );
      }

      // 2. Direct institutionId check
      if (userInstId && institutionId && Number(institutionId) === userInstId) {
        return NextResponse.json(
          { error: "Store Owner Restriction: You cannot order products or book services from your own store." },
          { status: 403 }
        );
      }

      // 3. Collect all businessIds from request (single or multi-item cart)
      const targetBusinessIds: number[] = [];
      if (businessId) targetBusinessIds.push(Number(businessId));
      if (Array.isArray(items)) {
        items.forEach((it: any) => {
          const bId = it.businessId || it.business_id;
          if (bId && !targetBusinessIds.includes(Number(bId))) {
            targetBusinessIds.push(Number(bId));
          }
        });
      }

      if (targetBusinessIds.length > 0) {
        const ownBizCheck = await db.query(
          `SELECT id, name FROM business_profiles 
           WHERE id = ANY($1::int[]) 
             AND (user_id = $2 OR institution_profile_id = $3)
           LIMIT 1`,
          [targetBusinessIds, currentUserId, userInstId || -1]
        );
        if (ownBizCheck.rows.length > 0) {
          return NextResponse.json(
            { error: `Store Owner Restriction: You cannot order products from your own store (${ownBizCheck.rows[0].name}).` },
            { status: 403 }
          );
        }
      }

      // 4. Check professional profile ownership if professionalId is specified
      if (professionalId) {
        const ownProfCheck = await db.query(
          `SELECT id, name FROM professional_profiles 
           WHERE id = $1 AND (user_id = $2 OR institution_profile_id = $3)
           LIMIT 1`,
          [Number(professionalId), currentUserId, userInstId || -1]
        );
        if (ownProfCheck.rows.length > 0) {
          return NextResponse.json(
            { error: `Store Owner Restriction: You cannot book services or appointments on your own professional profile (${ownProfCheck.rows[0].name}).` },
            { status: 403 }
          );
        }
      }
    }

    if (!resolvedItemName || !customerName || (!customerPhone && !customerEmail)) {
      return NextResponse.json(
        { error: "Item name, customer name, and contact info (phone or email) are required." },
        { status: 400 }
      );
    }

    if (!scheduledDate) {
      return NextResponse.json(
        { error: itemType === "service" ? "Appointment date is required." : "Date is required." },
        { status: 400 }
      );
    }

    // Generate readable order number
    const randPart = Math.floor(Math.random() * 9000 + 1000);
    const orderNumber = `ORD-${new Date().getFullYear()}-${randPart}`;

    const resolvedBusinessId = businessId
      ? Number(businessId)
      : Array.isArray(items) && (items[0]?.business_id || items[0]?.businessId)
      ? Number(items[0]?.business_id || items[0]?.businessId)
      : null;

    const resolvedProfId = professionalId ? Number(professionalId) : null;
    let resolvedSellerUserId = sellerUserId ? Number(sellerUserId) : null;

    if (!resolvedSellerUserId && resolvedBusinessId) {
      const bOwner = await db.query(
        "SELECT user_id, owner_id FROM business_profiles WHERE id = $1",
        [resolvedBusinessId]
      );
      if (bOwner.rows.length > 0) {
        resolvedSellerUserId = bOwner.rows[0].user_id || bOwner.rows[0].owner_id || null;
      }
    } else if (!resolvedSellerUserId && resolvedProfId) {
      const pOwner = await db.query(
        "SELECT user_id FROM professional_profiles WHERE id = $1",
        [resolvedProfId]
      );
      if (pOwner.rows.length > 0) {
        resolvedSellerUserId = pOwner.rows[0].user_id || null;
      }
    }

    const resolvedInstId = institutionId
      ? Number(institutionId)
      : Array.isArray(items) && items[0]?.institution_id
      ? Number(items[0].institution_id)
      : null;

    // Compute address / fulfillment text
    let formattedAddress = "";
    // All newly made orders start in "Received" status until store owner accepts
    const fulfillmentStatus: string = "Received";

    if (itemType === "service") {
      formattedAddress = `Appointment on ${scheduledDate} at ${scheduledTime || "Flexible"}`;
    } else if (fulfillmentType === "pickup") {
      formattedAddress = `🏪 Store Pickup scheduled for ${scheduledDate} at ${scheduledTime || "Store hours"}${shippingAddress ? ` (${shippingAddress})` : ""}`;
    } else {
      formattedAddress = `${shippingAddress || "Customer delivery address"} [Preferred Delivery: ${scheduledDate} at ${scheduledTime || "Anytime"}]`;
    }

    const isPaid = paymentMethod.toLowerCase().includes("online") || paymentMethod.toLowerCase().includes("upi") || paymentMethod.toLowerCase().includes("card");
    const paymentStatus = isPaid ? "Paid" : "Pending";

    const itemsSubtotal = hasMultiItems
      ? items.reduce((sum: number, it: any) => sum + (Number(it.unitPrice || it.price || 0) * (Number(it.quantity) || 1)), 0)
      : Number(unitPrice) * Math.max(1, Number(quantity));

    const computedTotal = Number(totalAmount) > 0 ? Number(totalAmount) : itemsSubtotal;
    const subtotal = itemsSubtotal;

    // Combine notes with fulfillment metadata
    const fullNotes = [
      `Type: ${itemType === "service" ? "Service Booking" : `Product Order (${fulfillmentType === "pickup" ? "Store Pickup" : "Doorstep Delivery"})`}`,
      `Date & Time: ${scheduledDate} ${scheduledTime ? `@ ${scheduledTime}` : ""}`,
      notes ? `Customer Note: ${notes}` : null,
    ].filter(Boolean).join(" | ");

    const userId = authUser?.id || null;

    const orderRes = await db.query(
      `INSERT INTO sales_orders (
         order_number, institution_id, customer_name, customer_email, customer_phone,
         subtotal_amount, discount_amount, tax_amount, total_amount,
         payment_status, payment_method, fulfillment_status,
         shipping_address, notes, created_by,
         business_id, professional_id, seller_user_id, order_type
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        orderNumber,
        resolvedInstId || null,
        customerName.trim(),
        (customerEmail || "").trim().toLowerCase(),
        (customerPhone || "").trim(),
        subtotal,
        0,
        0,
        computedTotal,
        paymentStatus,
        paymentMethod,
        fulfillmentStatus,
        formattedAddress,
        fullNotes,
        currentUserId,
        resolvedBusinessId || null,
        resolvedProfId || null,
        resolvedSellerUserId || null,
        itemType,
      ]
    );

    const createdOrder = orderRes.rows[0];

    // Insert order item(s)
    if (hasMultiItems) {
      for (const it of items) {
        const itQty = Math.max(1, Number(it.quantity) || 1);
        const itPrice = Number(it.unitPrice || it.price || 0);
        await db.query(
          `INSERT INTO sales_order_items (
             order_id, product_name, product_code, quantity, unit_price, total_price
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            createdOrder.id,
            it.name || "Product",
            itemType === "service" ? "SRV-BOOK" : "PRD-ORD",
            itQty,
            itPrice,
            itPrice * itQty,
          ]
        );
      }
    } else {
      await db.query(
        `INSERT INTO sales_order_items (
           order_id, product_name, product_code, quantity, unit_price, total_price
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          createdOrder.id,
          resolvedItemName,
          itemType === "service" ? "SRV-BOOK" : "PRD-ORD",
          Math.max(1, Number(quantity)),
          Number(unitPrice) || computedTotal,
          computedTotal,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: itemType === "service" ? "Appointment booked successfully!" : "Order placed successfully!",
      order: {
        ...createdOrder,
        order_number: orderNumber,
        items: hasMultiItems
          ? items.map((it: any) => ({
              product_name: it.name,
              quantity: Math.max(1, Number(it.quantity) || 1),
              unit_price: Number(it.unitPrice || it.price || 0),
              total_price: (Number(it.unitPrice || it.price || 0)) * Math.max(1, Number(it.quantity) || 1),
            }))
          : [{
              product_name: resolvedItemName,
              quantity: Math.max(1, Number(quantity)),
              unit_price: Number(unitPrice),
              total_price: computedTotal,
            }],
      },
    });
  } catch (err: any) {
    console.error("[Checkout Order API] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process order" },
      { status: 500 }
    );
  }
}
