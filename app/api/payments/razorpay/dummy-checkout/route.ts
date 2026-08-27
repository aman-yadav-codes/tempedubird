import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const {
      packageId,
      institutionId,
      amount,
      isRecurring = false,
      paymentMethod = "upi_dummy",
      roleTarget = "institution_admin",
    } = body;

    if (!packageId) {
      return NextResponse.json({ error: "Package ID is required" }, { status: 400 });
    }

    const dummyPaymentId = `pay_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const dummyOrderId = `order_mock_${Date.now()}`;

    // Fetch package details
    const pkgRes = await db.query(
      `SELECT * FROM marketing_packages WHERE id = $1 LIMIT 1`,
      [packageId]
    );

    const pkg = pkgRes.rows[0];
    const validityCount = pkg?.validity_count || 1;
    const validityUnit = pkg?.validity_unit || "month";

    const daysToAdd = validityUnit === "year" ? validityCount * 365 : validityCount * 30;

    const startsAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysToAdd);

    const formattedStarts = startsAt.toISOString().split("T")[0];
    const formattedExpires = expiresAt.toISOString().split("T")[0];

    // Determine target institution vs user
    const targetInstId = institutionId || user.memberships?.find(m => m.institution_id)?.institution_id || null;

    // Check if an existing active subscription exists and update or insert
    if (targetInstId && roleTarget === "institution_admin") {
      await db.query(`
        UPDATE subscriptions 
        SET status = 'expired' 
        WHERE institution_id = $1 AND status = 'active'
      `, [targetInstId]);

      await db.query(`
        INSERT INTO subscriptions (
          institution_id, 
          package_id, 
          status, 
          starts_at, 
          expires_at, 
          price, 
          price_unit, 
          is_recurring, 
          razorpay_payment_id, 
          razorpay_order_id,
          role_target,
          requested_at,
          approved_at
        ) VALUES ($1, $2, 'active', $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      `, [
        targetInstId,
        packageId,
        formattedStarts,
        formattedExpires,
        amount || pkg?.price || 0,
        pkg?.price_unit || "month",
        Boolean(isRecurring),
        dummyPaymentId,
        dummyOrderId,
        roleTarget
      ]);
    } else {
      // Student or user-specific subscription
      await db.query(`
        INSERT INTO subscriptions (
          user_id,
          package_id, 
          status, 
          starts_at, 
          expires_at, 
          price, 
          price_unit, 
          is_recurring, 
          razorpay_payment_id, 
          razorpay_order_id,
          role_target,
          requested_at,
          approved_at
        ) VALUES ($1, $2, 'active', $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      `, [
        user.id,
        packageId,
        formattedStarts,
        formattedExpires,
        amount || pkg?.price || 0,
        pkg?.price_unit || "month",
        Boolean(isRecurring),
        dummyPaymentId,
        dummyOrderId,
        roleTarget || "student"
      ]);
    }

    return NextResponse.json({
      success: true,
      message: "Payment processed and subscription activated successfully!",
      payment: {
        paymentId: dummyPaymentId,
        orderId: dummyOrderId,
        amount,
        isRecurring,
        status: "captured",
        startsAt: formattedStarts,
        expiresAt: formattedExpires,
      }
    });
  } catch (error: any) {
    console.error("[Dummy Razorpay Checkout] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process payment" },
      { status: 500 }
    );
  }
}
