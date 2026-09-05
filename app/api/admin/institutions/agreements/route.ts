import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { isPlatformAdminUser, hasPermission } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const institutionId = url.searchParams.get("institutionId");
    if (!institutionId || isNaN(Number(institutionId))) {
      return NextResponse.json({ error: "Valid institutionId is required" }, { status: 400 });
    }

    const res = await db.query(
      `
        SELECT *
        FROM institution_agreements
        WHERE institution_id = $1
        LIMIT 1
      `,
      [Number(institutionId)]
    );

    return NextResponse.json({
      data: res.rows[0] || null,
    });
  } catch (error: any) {
    console.error("[GET /api/admin/institutions/agreements] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch agreement settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isPlatformAdmin = isPlatformAdminUser(user);
    const role = (user as any).role_code || (user as any).role || "";
    const isAllowed = isPlatformAdmin || role === "platform_admin" || role === "superadmin" || role === "admin" || (user as any).is_super_admin;
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Forbidden: Platform Admin permission required to configure agreement terms." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      institutionId,
      platformSalePercentage,
      enquiryCommission,
      affiliateCommissionPercentage,
      orgAgreementTerms,
      studentTerms,
      affiliateTerms,
    } = body;

    if (!institutionId || isNaN(Number(institutionId))) {
      return NextResponse.json({ error: "Valid institutionId is required" }, { status: 400 });
    }

    const salePct = parseFloat(platformSalePercentage ?? "10.00");
    const enqComm = parseFloat(enquiryCommission ?? "50.00");
    const affPct = parseFloat(affiliateCommissionPercentage ?? "10.00");

    const result = await db.query(
      `
        INSERT INTO institution_agreements (
          institution_id,
          platform_sale_percentage,
          enquiry_commission,
          affiliate_commission_percentage,
          org_agreement_terms,
          student_terms,
          affiliate_terms,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (institution_id)
        DO UPDATE SET
          platform_sale_percentage = EXCLUDED.platform_sale_percentage,
          enquiry_commission = EXCLUDED.enquiry_commission,
          affiliate_commission_percentage = EXCLUDED.affiliate_commission_percentage,
          org_agreement_terms = EXCLUDED.org_agreement_terms,
          student_terms = EXCLUDED.student_terms,
          affiliate_terms = EXCLUDED.affiliate_terms,
          updated_at = NOW()
        RETURNING *
      `,
      [
        Number(institutionId),
        salePct,
        enqComm,
        affPct,
        orgAgreementTerms ?? null,
        studentTerms ?? null,
        affiliateTerms ?? null,
      ]
    );

    return NextResponse.json({
      message: "Agreement terms & commissions saved successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("[POST /api/admin/institutions/agreements] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save agreement terms" },
      { status: 500 }
    );
  }
}
