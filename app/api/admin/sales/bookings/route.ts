import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    const isPlatformAdmin = isPlatformAdminUser(user);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const businessId = searchParams.get("businessId")?.trim() || "";

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Seller Scoping: Sellers only see bookings for their business/professional services OR which they booked
    if (!isPlatformAdmin) {
      const [bpRes, ppRes] = await Promise.all([
        db.query(`SELECT id FROM business_profiles WHERE user_id = $1`, [user.id]).catch(() => ({ rows: [] })),
        db.query(`SELECT id FROM professional_profiles WHERE user_id = $1`, [user.id]).catch(() => ({ rows: [] })),
      ]);
      const businessIds: number[] = bpRes.rows.map((r: any) => Number(r.id)).filter(Boolean);
      const professionalIds: number[] = ppRes.rows.map((r: any) => Number(r.id)).filter(Boolean);

      params.push(user.id);
      const uIdx = params.length;
      params.push(businessIds);
      const bIdx = params.length;
      params.push(professionalIds);
      const pIdx = params.length;

      whereClauses.push(`(
        b.customer_user_id = $${uIdx}
        OR bp.user_id = $${uIdx}
        OR pp.user_id = $${uIdx}
        OR (b.business_id IS NOT NULL AND b.business_id = ANY($${bIdx}))
        OR (b.professional_id IS NOT NULL AND b.professional_id = ANY($${pIdx}))
      )`);
    }

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
         COALESCE(bp.name, pp.name, 'Store') AS store_name,
         bp.name AS business_name,
         bp.city AS business_city,
         bp.phone AS business_phone,
         pp.name AS professional_name,
         COALESCE(u_bp.full_name, u_pp.full_name, 'Business Owner') AS seller_name,
         COALESCE(b.source_url, CASE WHEN b.service_id IS NOT NULL THEN '/services/' || b.service_id::text WHEN b.business_id IS NOT NULL THEN '/business/' || b.business_id::text WHEN b.professional_id IS NOT NULL THEN '/professional/' || b.professional_id::text ELSE '/explore' END) AS source_url
       FROM service_bookings b
       LEFT JOIN business_profiles bp ON bp.id = b.business_id
       LEFT JOIN users u_bp ON u_bp.id = bp.user_id
       LEFT JOIN professional_profiles pp ON pp.id = b.professional_id
       LEFT JOIN users u_pp ON u_pp.id = pp.user_id
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
    const user = await requireAdmin(req);
    const isPlatformAdmin = isPlatformAdminUser(user);
    const body = await req.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Booking ID and status are required" }, { status: 400 });
    }

    if (!isPlatformAdmin) {
      const checkRes = await db.query(
        `SELECT b.id FROM service_bookings b
         LEFT JOIN business_profiles bp ON bp.id = b.business_id
         LEFT JOIN professional_profiles pp ON pp.id = b.professional_id
         WHERE b.id = $1 AND (bp.user_id = $2 OR pp.user_id = $2 OR b.customer_user_id = $2)`,
        [Number(id), user.id]
      );
      if (checkRes.rows.length === 0) {
        return NextResponse.json({ error: "Unauthorized to update this booking" }, { status: 403 });
      }
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
