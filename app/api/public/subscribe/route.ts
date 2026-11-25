import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, page_name, page_url } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPageName = (page_name && typeof page_name === "string" ? page_name.trim() : "General").slice(0, 255);
    const cleanPageUrl = (page_url && typeof page_url === "string" ? page_url.trim() : "/").slice(0, 2048);

    const referrer = req.headers.get("referer") || null;
    const userAgent = req.headers.get("user-agent") || null;
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    // Check if subscriber already exists
    const existing = await db.query(
      `SELECT id, email, page_name, subscribe_count, status FROM newsletter_subscribers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [cleanEmail]
    );

    let subscriberId: number;

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      subscriberId = row.id;

      await db.query(
        `UPDATE newsletter_subscribers
         SET page_name = $2,
             page_url = $3,
             referrer = COALESCE($4, referrer),
             ip_address = COALESCE($5, ip_address),
             user_agent = COALESCE($6, user_agent),
             subscribe_count = subscribe_count + 1,
             status = 'active',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [subscriberId, cleanPageName, cleanPageUrl, referrer, ipAddress, userAgent]
      );
    } else {
      const insertRes = await db.query(
        `INSERT INTO newsletter_subscribers (email, page_name, page_url, referrer, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [cleanEmail, cleanPageName, cleanPageUrl, referrer, ipAddress, userAgent]
      );
      subscriberId = insertRes.rows[0].id;
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for subscribing to 143Panda updates!",
      data: {
        id: subscriberId,
        email: cleanEmail,
        page_name: cleanPageName,
        page_url: cleanPageUrl,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/public/subscribe] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to process subscription. Please try again." },
      { status: 500 }
    );
  }
}
