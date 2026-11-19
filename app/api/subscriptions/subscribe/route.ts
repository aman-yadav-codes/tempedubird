import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "edubird-secret-key-change-in-prod";

async function getAuthUserId(req: Request): Promise<number | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && (decoded.userId || decoded.id || decoded.sub)) {
        return Number(decoded.userId || decoded.id || decoded.sub);
      }
    }
  } catch (err) {
    // ignore
  }
  return null;
}

export async function POST(req: Request) {
  try {
    let userId = await getAuthUserId(req);
    if (!userId) {
      const demoUser = await db.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`);
      userId = demoUser.rows[0]?.id || 1;
    }

    const body = await req.json();
    const { packageId, billingCycle = "monthly", paymentMethod = "Credit Card / Stripe / Razorpay" } = body;

    if (!packageId) {
      return NextResponse.json({ success: false, error: "Package ID is required" }, { status: 400 });
    }

    // Fetch the package details
    const pkgRes = await db.query(
      `SELECT * FROM sales_packages WHERE id = $1 AND is_active = TRUE`,
      [packageId]
    );

    if (pkgRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Package not found" }, { status: 404 });
    }

    const pkg = pkgRes.rows[0];
    const isYearly = billingCycle === "yearly";
    const priceToCharge = isYearly
      ? Number(pkg.price_annual || pkg.price * 10)
      : Number(pkg.price_monthly || pkg.price);

    const intervalSql = isYearly ? "1 year" : "1 month";
    const listingAllowance = Number(pkg.listing_limit_monthly || 100);

    // Cancel / archive previous active subscriptions
    await db.query(
      `UPDATE subscriptions SET status = 'replaced', updated_at = NOW() WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    // Create new subscription record
    const subRes = await db.query(
      `
      INSERT INTO subscriptions (
        user_id,
        package_id,
        plan_name,
        status,
        starts_at,
        expires_at,
        price,
        price_unit,
        billing_cycle,
        listing_allowance,
        listings_used,
        additional_credits,
        is_recurring,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, 'active', CURRENT_DATE, (CURRENT_DATE + INTERVAL '${intervalSql}')::date,
        $4, $5, $6, $7, 0, 0, TRUE, NOW(), NOW()
      ) RETURNING *
      `,
      [
        userId,
        pkg.id,
        pkg.name,
        priceToCharge,
        pkg.price_unit || "USD",
        billingCycle,
        listingAllowance,
      ]
    );

    const newSub = subRes.rows[0];

    // Generate invoice record
    const invoiceNum = `INV-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
    await db.query(
      `
      INSERT INTO subscription_invoices (
        subscription_id,
        user_id,
        invoice_number,
        amount,
        currency,
        status,
        plan_name,
        billing_period_start,
        billing_period_end,
        payment_method
      ) VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7, $8, $9)
      `,
      [
        newSub.id,
        userId,
        invoiceNum,
        priceToCharge,
        pkg.price_unit || "USD",
        pkg.name,
        newSub.starts_at,
        newSub.expires_at,
        paymentMethod,
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Successfully subscribed to ${pkg.name}!`,
      subscription: newSub,
      invoiceNumber: invoiceNum,
    });
  } catch (error) {
    console.error("Error in POST /api/subscriptions/subscribe:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process subscription" },
      { status: 500 }
    );
  }
}
