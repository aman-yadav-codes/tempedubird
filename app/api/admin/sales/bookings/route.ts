import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { requireAdmin } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const businessId = searchParams.get("businessId")?.trim() || "";

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(
        `(b.booking_number ILIKE $${params.length} OR b.customer_name ILIKE $${params.length} OR b.customer_phone ILIKE $${params.length} OR b.service_name ILIKE $${params.length} OR bp.name ILIKE $${params.length})`
      );
    }

    if (status && status !== "all") {
      params.push(status);
      whereClauses.push(`b.status = $${params.length}`);
    }

    if (businessId && businessId !== "all") {
      params.push(Number(businessId));
      whereClauses.push(`b.business_id = $${params.length}`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const res = await db.query(
      `SELECT
         b.*,
         bp.name AS business_name,
         bp.city AS business_city,
         bp.phone AS business_phone,
         pp.name AS professional_name
       FROM service_bookings b
       LEFT JOIN business_profiles bp ON bp.id = b.business_id
       LEFT JOIN professional_profiles pp ON pp.id = b.professional_id
       ${whereStr}
       ORDER BY b.id DESC
       LIMIT 100`,
      params
    );

    return NextResponse.json({
      success: true,
      bookings: res.rows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load bookings";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Booking ID and status are required" }, { status: 400 });
    }

    const res = await db.query(
      `UPDATE service_bookings
       SET status = $1,
           notes = COALESCE($2, notes),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, notes || null, Number(id)]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Booking status updated",
      booking: res.rows[0],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update booking";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
