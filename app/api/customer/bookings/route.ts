import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ success: true, data: [] });
    }

    const res = await db.query(
      `SELECT
         b.id,
         b.booking_number,
         b.customer_user_id,
         b.customer_name,
         b.customer_email,
         b.customer_phone,
         b.service_name,
         b.service_id,
         b.booking_date,
         b.booking_time,
         b.notes,
         b.status,
         b.total_price,
         b.payment_status,
         b.created_at,
         bp.id AS business_id,
         bp.name AS business_name,
         bp.phone AS business_phone,
         bp.city AS business_city,
         bp.logo_url AS business_logo,
         pp.id AS professional_id,
         pp.name AS professional_name,
         pp.phone AS professional_phone,
         pp.city AS professional_city,
         pp.avatar_url AS professional_avatar
       FROM service_bookings b
       LEFT JOIN business_profiles bp ON bp.id = b.business_id
       LEFT JOIN professional_profiles pp ON pp.id = b.professional_id
       WHERE b.customer_user_id = $1 OR b.customer_email = $2
       ORDER BY b.id DESC`,
      [user.id, user.email || ""]
    );

    return NextResponse.json({ success: true, data: res.rows });
  } catch (err: unknown) {
    console.error("[GET /api/customer/bookings] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load bookings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const {
      businessId,
      professionalId,
      serviceId,
      serviceName,
      bookingDate,
      bookingTime,
      notes,
      totalPrice,
      customerName,
      customerEmail,
      customerPhone,
    } = body;

    if (!serviceName) {
      return NextResponse.json({ error: "Service name is required" }, { status: 400 });
    }

    const name = customerName?.trim() || user?.full_name || "Customer";
    const email = customerEmail?.trim() || user?.email || null;
    const phone = customerPhone?.trim() || user?.phone || null;
    const bookingNumber = `BK-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const res = await db.query(
      `INSERT INTO service_bookings (
         booking_number,
         customer_user_id,
         customer_name,
         customer_email,
         customer_phone,
         business_id,
         professional_id,
         service_id,
         service_name,
         booking_date,
         booking_time,
         notes,
         status,
         total_price,
         payment_status,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13, 'pending', NOW(), NOW())
       RETURNING *`,
      [
        bookingNumber,
        user?.id || null,
        name,
        email,
        phone,
        businessId ? Number(businessId) : null,
        professionalId ? Number(professionalId) : null,
        serviceId ? Number(serviceId) : null,
        serviceName,
        bookingDate || null,
        bookingTime || null,
        notes || null,
        totalPrice ? Number(totalPrice) : 0,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Booking submitted successfully",
      booking: res.rows[0],
    });
  } catch (err: unknown) {
    console.error("[POST /api/customer/bookings] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create booking" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Booking ID and status are required" }, { status: 400 });
    }

    const res = await db.query(
      `UPDATE service_bookings
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND customer_user_id = $3
       RETURNING *`,
      [status, Number(id), user.id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Booking not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, booking: res.rows[0] });
  } catch (err: unknown) {
    console.error("[PATCH /api/customer/bookings] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update booking" },
      { status: 500 }
    );
  }
}
