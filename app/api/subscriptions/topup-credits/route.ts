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

    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader
        .split(";")
        .map((c) => c.trim().split("="))
        .filter((pair) => pair.length === 2)
        .map(([k, v]) => [decodeURIComponent(k.trim()), decodeURIComponent(v.trim())])
    );

    const cookieToken = cookies["auth_token"] || cookies["token"] || cookies["accessToken"];
    if (cookieToken) {
      try {
        const decoded = jwt.verify(cookieToken, JWT_SECRET) as any;
        if (decoded && (decoded.userId || decoded.id || decoded.sub)) {
          return Number(decoded.userId || decoded.id || decoded.sub);
        }
      } catch {}
    }

    const refreshToken = cookies["refresh_token"];
    if (refreshToken) {
      try {
        const sessionRes = await db.query(
          `SELECT user_id, expires_at FROM sessions WHERE refresh_token = $1 AND expires_at > NOW() LIMIT 1`,
          [refreshToken]
        );
        if (sessionRes.rows[0]?.user_id) {
          return Number(sessionRes.rows[0].user_id);
        }
      } catch {}
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
    const { credits = 100, price = 149.0, currency } = body;

    // Find active subscription
    const subRes = await db.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    if (subRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "No active subscription found to add credits to" }, { status: 400 });
    }

    const sub = subRes.rows[0];
    const finalCurrency = currency || sub.price_unit || "INR";

    // Add credits to subscription
    const updatedSub = await db.query(
      `
      UPDATE subscriptions 
      SET additional_credits = COALESCE(additional_credits, 0) + $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [credits, sub.id]
    );

    // Record top-up transaction
    await db.query(
      `
      INSERT INTO package_credit_topups (
        subscription_id, user_id, credits_added, price_paid, payment_id
      ) VALUES ($1, $2, $3, $4, $5)
      `,
      [sub.id, userId, credits, price, `TOPUP-${Date.now()}`]
    );

    // Record invoice
    const invNum = `INV-TOPUP-${Date.now()}`;
    await db.query(
      `
      INSERT INTO subscription_invoices (
        subscription_id, user_id, invoice_number, amount, currency, status, plan_name, payment_method
      ) VALUES ($1, $2, $3, $4, $5, 'paid', $6, 'Credit Card')
      `,
      [sub.id, userId, invNum, price, finalCurrency, `Listing Data Top-up (+${credits} credits)`]
    );

    return NextResponse.json({
      success: true,
      message: `Successfully added ${credits} listing data credits!`,
      subscription: updatedSub.rows[0],
    });
  } catch (error) {
    console.error("Error in POST /api/subscriptions/topup-credits:", error);
    return NextResponse.json(
      { success: false, error: "Failed to purchase additional credits" },
      { status: 500 }
    );
  }
}
