import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { headers } from "next/headers";
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

export async function GET(req: Request) {
  try {
    let userId = await getAuthUserId(req);

    // If unauthenticated, fallback to a default demo or first business user
    if (!userId) {
      const demoUser = await db.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`);
      userId = demoUser.rows[0]?.id || 1;
    }

    // 1. Get current active subscription
    const subRes = await db.query(
      `
      SELECT 
        s.*,
        p.name AS package_name,
        p.tier,
        p.listing_limit_monthly,
        p.overage_price_per_listing,
        p.auto_overage_enabled,
        p.features_list,
        p.services_list
      FROM subscriptions s
      LEFT JOIN sales_packages p ON s.package_id = p.id
      WHERE s.user_id = $1 AND s.status IN ('active', 'trialing')
      ORDER BY s.id DESC
      LIMIT 1
      `,
      [userId]
    );

    let subscription = subRes.rows[0];

    // If no subscription exists, provide a default Starter plan
    if (!subscription) {
      const starterPkg = await db.query(
        `SELECT * FROM sales_packages WHERE tier = 'starter' AND package_category = 'business_growth' LIMIT 1`
      );
      const pkg = starterPkg.rows[0];
      const pkgId = pkg?.id || null;
      const allowance = pkg?.listing_limit_monthly || 100;

      const newSub = await db.query(
        `
        INSERT INTO subscriptions (
          user_id, package_id, plan_name, status, starts_at, expires_at,
          price, price_unit, billing_cycle, listing_allowance, listings_used, additional_credits
        ) VALUES (
          $1, $2, $3, 'active', CURRENT_DATE, (CURRENT_DATE + INTERVAL '1 month')::date,
          $4, 'USD', 'monthly', $5, 0, 0
        ) RETURNING *
        `,
        [userId, pkgId, pkg?.name || "Starter", pkg?.price || 49.0, allowance]
      );

      subscription = {
        ...newSub.rows[0],
        package_name: pkg?.name || "Starter",
        tier: "starter",
        listing_limit_monthly: allowance,
        features_list: pkg?.features_list || [],
        services_list: pkg?.services_list || [],
      };
    }

    // 2. Count actual unique listing usage records for current billing cycle
    const cycleStart = subscription.starts_at;
    const cycleEnd = subscription.expires_at;

    const usageCountRes = await db.query(
      `
      SELECT COUNT(DISTINCT listing_id) AS used_count
      FROM subscription_listing_usage
      WHERE subscription_id = $1 AND billing_cycle_start >= $2
      `,
      [subscription.id, cycleStart]
    );

    const actualUsed = parseInt(usageCountRes.rows[0]?.used_count || "0", 10);
    const allowance = Number(subscription.listing_allowance || subscription.listing_limit_monthly || 100);
    const credits = Number(subscription.additional_credits || 0);
    const totalAllowed = allowance + credits;
    const remaining = Math.max(0, totalAllowed - actualUsed);
    const percentage = totalAllowed > 0 ? Math.min(100, Math.round((actualUsed / totalAllowed) * 100)) : 0;

    // Check notification threshold
    let notificationLevel = 0;
    if (percentage >= 100) notificationLevel = 100;
    else if (percentage >= 90) notificationLevel = 90;
    else if (percentage >= 80) notificationLevel = 80;

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        user_id: subscription.user_id,
        package_id: subscription.package_id,
        plan_name: subscription.plan_name || subscription.package_name,
        tier: subscription.tier || "starter",
        status: subscription.status,
        price: Number(subscription.price),
        price_unit: subscription.price_unit || "USD",
        billing_cycle: subscription.billing_cycle || "monthly",
        starts_at: subscription.starts_at,
        expires_at: subscription.expires_at,
        next_billing_date: subscription.expires_at,
        is_recurring: subscription.is_recurring ?? true,
        listing_allowance: allowance,
        listings_used: actualUsed,
        additional_credits: credits,
        total_allowed: totalAllowed,
        remaining_listings: remaining,
        usage_percentage: percentage,
        notification_level: notificationLevel,
        features_list: subscription.features_list || [],
        services_list: subscription.services_list || [],
      },
    });
  } catch (error) {
    console.error("Error in GET /api/subscriptions/current:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load subscription details" },
      { status: 500 }
    );
  }
}
