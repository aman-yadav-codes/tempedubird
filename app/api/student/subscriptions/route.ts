import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);

    // 1. Fetch available student packages
    const plansRes = await db.query(`
      SELECT 
        id, 
        name, 
        price, 
        price_unit, 
        validity_count, 
        validity_unit, 
        storage_limit_gb, 
        description,
        target_role,
        is_recurring,
        badge_text
      FROM marketing_packages
      WHERE (target_role = 'student' OR target_role IS NULL OR package_for = 'student')
        AND is_active = true
      ORDER BY price ASC
    `);

    let plans = plansRes.rows;

    // Provide default fallback student plans if none configured yet
    if (!plans.length) {
      plans = [
        {
          id: 991,
          name: "Student Starter Pass",
          price: 499,
          price_unit: "month",
          validity_count: 1,
          validity_unit: "month",
          storage_limit_gb: 5,
          description: "Access all classroom materials, mock tests, and standard teacher notes.",
          target_role: "student",
          is_recurring: true,
          badge_text: "Standard"
        },
        {
          id: 992,
          name: "Student Pro Annual",
          price: 3999,
          price_unit: "year",
          validity_count: 1,
          validity_unit: "year",
          storage_limit_gb: 50,
          description: "Unlimited tests, all competitive & institutional exam series, priority doubt solver & AI notes.",
          target_role: "student",
          is_recurring: true,
          badge_text: "Most Popular"
        }
      ];
    }

    // 2. Fetch user's active subscription
    const subRes = await db.query(`
      SELECT 
        s.id,
        s.package_id,
        p.name as package_name,
        s.status,
        s.starts_at,
        s.expires_at,
        s.price,
        s.price_unit,
        s.is_recurring,
        s.razorpay_payment_id
      FROM subscriptions s
      LEFT JOIN marketing_packages p ON s.package_id = p.id
      WHERE s.user_id = $1 
        AND s.status = 'active'
        AND (s.expires_at IS NULL OR s.expires_at >= CURRENT_DATE)
      ORDER BY s.id DESC
      LIMIT 1
    `, [user.id]);

    const activeSubscription = subRes.rows[0] || null;

    return NextResponse.json({
      hasActiveSubscription: Boolean(activeSubscription),
      activeSubscription,
      plans,
    });
  } catch (error: any) {
    console.error("[Student Subscriptions GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load subscriptions" }, { status: 500 });
  }
}
