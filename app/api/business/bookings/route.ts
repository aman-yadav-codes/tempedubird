import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    let query = `
      SELECT
        b.*,
        bp.name AS business_name,
        bp.city AS business_city
      FROM service_bookings b
      JOIN business_profiles bp ON bp.id = b.business_id
      WHERE bp.user_id = $1
    `;
    const params: any[] = [user.id];

    if (businessId) {
      query += ` AND bp.id = $2`;
      params.push(Number(businessId));
    }

    query += ` ORDER BY b.id DESC`;

    const res = await db.query(query, params);

    return NextResponse.json({
      success: true,
      bookings: res.rows,
    });
  } catch (err: unknown) {
    console.error("[GET /api/business/bookings] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load bookings" },
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

    // Verify booking belongs to user's business
    const verify = await db.query(
      `SELECT b.id 
       FROM service_bookings b
       JOIN business_profiles bp ON bp.id = b.business_id
       WHERE b.id = $1 AND bp.user_id = $2`,
      [Number(id), user.id]
    );

    if (verify.rows.length === 0) {
      return NextResponse.json({ error: "Booking not found or not authorized" }, { status: 403 });
    }

    const res = await db.query(
      `UPDATE service_bookings
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, Number(id)]
    );

    return NextResponse.json({
      success: true,
      message: "Booking status updated",
      booking: res.rows[0],
    });
  } catch (err: unknown) {
    console.error("[PATCH /api/business/bookings] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update booking" },
      { status: 500 }
    );
  }
}
