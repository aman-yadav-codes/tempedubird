import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser, getAuthUser } from "@/lib/auth/auth";

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
    const user = await getAuthUser(req);
    const body = await req.json();

    let businessId = body.businessId ? Number(body.businessId) : null;
    let professionalId = body.professionalId ? Number(body.professionalId) : null;
    const productId = body.productId ? Number(body.productId) : null;
    const serviceId = body.serviceId ? Number(body.serviceId) : null;
    const customerName = body.customerName?.trim() || user?.full_name || "Customer";
    const customerEmail = body.customerEmail?.trim() || user?.email || null;
    const customerPhone = body.customerPhone?.trim() || user?.phone || null;
    const message = body.message?.trim();
    const preferredDate = body.preferredDate || null;
    const preferredTime = body.preferredTime || null;
    const sourceUrl = body.sourceUrl || req.headers.get("referer") || null;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Attempt resolving businessId or professionalId if not explicitly provided
    if (!businessId && !professionalId) {
      if (productId) {
        try {
          const pRes = await db.query("SELECT business_profile_id FROM products WHERE id = $1", [productId]);
          if (pRes.rows[0]?.business_profile_id) businessId = Number(pRes.rows[0].business_profile_id);
        } catch {}
      } else if (serviceId) {
        try {
          const sRes = await db.query("SELECT business_profile_id FROM master_services WHERE id = $1", [serviceId]);
          if (sRes.rows[0]?.business_profile_id) businessId = Number(sRes.rows[0].business_profile_id);
        } catch {}
      } else if (body.courseId) {
        try {
          const ipRes = await db.query("SELECT institution_id FROM institution_programs WHERE id = $1", [Number(body.courseId)]);
          if (ipRes.rows[0]?.institution_id) {
            const bpRes = await db.query("SELECT id FROM business_profiles WHERE institution_profile_id = $1 LIMIT 1", [ipRes.rows[0].institution_id]);
            if (bpRes.rows[0]?.id) businessId = Number(bpRes.rows[0].id);
          }
        } catch {}
      }
    }

    const res = await db.query(
      `INSERT INTO customer_inquiries (
         customer_user_id, business_id, professional_id, product_id, service_id,
         customer_name, customer_email, customer_phone, message, status,
         preferred_date, preferred_time, source_url, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12, NOW())
       RETURNING *`,
      [
        user?.id || null,
        businessId,
        professionalId,
        productId,
        serviceId,
        customerName,
        customerEmail,
        customerPhone,
        message,
        preferredDate,
        preferredTime,
        sourceUrl,
      ]
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

