import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ success: true, data: [] });
    }

    const res = await db.query(
      `SELECT
         i.id,
         i.customer_name,
         i.customer_email,
         i.customer_phone,
         i.message,
         i.status,
         i.preferred_date,
         i.preferred_time,
         i.created_at,
         bp.name AS business_name,
         bp.phone AS business_phone,
         bp.city AS business_city,
         pp.name AS professional_name,
         pp.phone AS professional_phone,
         pp.city AS professional_city
       FROM customer_inquiries i
       LEFT JOIN business_profiles bp ON bp.id = i.business_id
       LEFT JOIN professional_profiles pp ON pp.id = i.professional_id
       WHERE i.customer_user_id = $1
       ORDER BY i.id DESC`,
      [user.id]
    );

    return NextResponse.json({ success: true, data: res.rows });
  } catch (err: unknown) {
    console.error("[enquiries GET] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load enquiries" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const businessId = body.businessId ? Number(body.businessId) : null;
    const professionalId = body.professionalId ? Number(body.professionalId) : null;
    const customerName = body.customerName?.trim() || user?.full_name || "Customer";
    const customerEmail = body.customerEmail?.trim() || user?.email || null;
    const customerPhone = body.customerPhone?.trim() || user?.phone || null;
    const message = body.message?.trim();
    const preferredDate = body.preferredDate || null;
    const preferredTime = body.preferredTime || null;

    if (!businessId && !professionalId) {
      return NextResponse.json({ error: "businessId or professionalId is required" }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const res = await db.query(
      `INSERT INTO customer_inquiries (
         customer_user_id, business_id, professional_id, customer_name, customer_email,
         customer_phone, message, status, preferred_date, preferred_time, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, NOW())
       RETURNING *`,
      [user?.id || null, businessId, professionalId, customerName, customerEmail, customerPhone, message, preferredDate, preferredTime]
    );

    return NextResponse.json({
      success: true,
      data: res.rows[0],
      message: "Enquiry submitted successfully! The provider will contact you shortly.",
    });
  } catch (err: unknown) {
    console.error("[enquiries POST] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit enquiry" },
      { status: 500 }
    );
  }
}

