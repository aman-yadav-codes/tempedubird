import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const targetType = body.targetType || "business"; // 'business' | 'professional' | 'product' | 'service'
    const businessId = body.businessId ? Number(body.businessId) : null;
    const professionalId = body.professionalId ? Number(body.professionalId) : null;
    const reportReason = body.reportReason?.trim() || "incorrect"; // 'incorrect' | 'duplicate' | 'fake' | 'misleading' | 'other'
    const description = body.description?.trim() || "";
    const reporterName = body.reporterName?.trim() || user?.full_name || null;
    const reporterEmail = body.reporterEmail?.trim() || user?.email || null;
    const reporterPhone = body.reporterPhone?.trim() || user?.phone || null;

    if (!businessId && !professionalId) {
      return NextResponse.json({ error: "businessId or professionalId is required" }, { status: 400 });
    }

    if (!description && !reportReason) {
      return NextResponse.json({ error: "Please provide a reason or description for your report" }, { status: 400 });
    }

    const res = await db.query(
      `INSERT INTO listing_reports (
         reporter_user_id, reporter_name, reporter_email, reporter_phone,
         target_type, business_id, professional_id, report_reason, description,
         status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW(), NOW())
       RETURNING *`,
      [user?.id || null, reporterName, reporterEmail, reporterPhone, targetType, businessId, professionalId, reportReason, description]
    );

    return NextResponse.json({
      success: true,
      data: res.rows[0],
      message: "Listing reported successfully. Our moderation team will investigate.",
    });
  } catch (err: unknown) {
    console.error("[reports POST] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to report listing" },
      { status: 500 }
    );
  }
}

