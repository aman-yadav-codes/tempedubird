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
    const { listingId, listingType = "business", listingName = "" } = body;

    if (!listingId) {
      return NextResponse.json({ success: false, error: "listingId is required" }, { status: 400 });
    }

    // 1. Get user's active subscription
    const subRes = await db.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    if (subRes.rows.length === 0) {
      return NextResponse.json({ success: true, message: "No active subscription tracked" });
    }

    const sub = subRes.rows[0];

    // 2. Insert into subscription_listing_usage with ON CONFLICT DO NOTHING (prevents counting duplicate views)
    const insertRes = await db.query(
      `
      INSERT INTO subscription_listing_usage (
        subscription_id, user_id, listing_id, listing_type, listing_name,
        billing_cycle_start, billing_cycle_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (subscription_id, listing_id, billing_cycle_start) DO NOTHING
      RETURNING id
      `,
      [
        sub.id,
        userId,
        String(listingId),
        listingType,
        listingName,
        sub.starts_at,
        sub.expires_at,
      ]
    );

    const isNewUniqueListing = insertRes.rows.length > 0;

    // 3. If it was new, update subscription listings_used count
    if (isNewUniqueListing) {
      await db.query(
        `UPDATE subscriptions SET listings_used = COALESCE(listings_used, 0) + 1, updated_at = NOW() WHERE id = $1`,
        [sub.id]
      );
    }

    return NextResponse.json({
      success: true,
      uniqueRecorded: isNewUniqueListing,
      message: isNewUniqueListing
        ? "Unique listing data usage counted"
        : "Listing already recorded in current billing cycle (no double counting)",
    });
  } catch (error) {
    console.error("Error in POST /api/subscriptions/track-listing-usage:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track listing usage" },
      { status: 500 }
    );
  }
}
