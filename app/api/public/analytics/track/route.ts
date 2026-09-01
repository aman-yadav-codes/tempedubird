import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureAnalyticsSchema } from "@/lib/db/ensure-analytics-schema";

function extractClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "127.0.0.1";
}

function resolveLocationFromIp(ip: string, clientLocation?: string): string {
  if (clientLocation && clientLocation.trim()) return clientLocation.trim();
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return "Localhost / Dev (India)";
  }
  return "India";
}

export async function POST(req: Request) {
  try {
    await ensureAnalyticsSchema();
    const body = await req.json();
    const {
      anonymous_id,
      user_id,
      user_name,
      institution_id,
      event_type, // 'click' | 'view' | 'impression' | 'search'
      page_url,
      page_name,
      button_name,
      keywords,
      referrer,
      location: clientLocation,
      device_type,
      metadata,
    } = body;

    if (!anonymous_id || !event_type || !page_url) {
      return NextResponse.json({ error: "Missing required tracking parameters" }, { status: 400 });
    }

    const ipAddress = extractClientIp(req);
    const location = resolveLocationFromIp(ipAddress, clientLocation);
    const userAgent = req.headers.get("user-agent") || "Unknown";

    // 1. Upsert Visitor Session
    await db.query(`
      INSERT INTO analytics_visitors (
        anonymous_id, user_id, user_name, ip_address, location, user_agent, referrer, first_seen_at, last_seen_at, total_events
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), 1)
      ON CONFLICT (anonymous_id) DO UPDATE
      SET 
        user_id = COALESCE(EXCLUDED.user_id, analytics_visitors.user_id),
        user_name = COALESCE(EXCLUDED.user_name, analytics_visitors.user_name),
        ip_address = EXCLUDED.ip_address,
        location = COALESCE(EXCLUDED.location, analytics_visitors.location),
        user_agent = EXCLUDED.user_agent,
        referrer = COALESCE(analytics_visitors.referrer, EXCLUDED.referrer),
        last_seen_at = NOW(),
        total_events = analytics_visitors.total_events + 1,
        updated_at = NOW()
    `, [
      anonymous_id,
      user_id || null,
      user_name || (user_id ? `User #${user_id}` : "Anonymous Visitor"),
      ipAddress,
      location,
      userAgent,
      referrer || null,
    ]);

    // 2. Insert Event
    await db.query(`
      INSERT INTO analytics_events (
        anonymous_id,
        user_id,
        institution_id,
        event_type,
        page_url,
        page_name,
        button_name,
        keywords,
        referrer,
        ip_address,
        location,
        device_type,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      anonymous_id,
      user_id || null,
      institution_id || null,
      event_type,
      page_url,
      page_name || null,
      button_name || null,
      keywords || null,
      referrer || null,
      ipAddress,
      location,
      device_type || "desktop",
      JSON.stringify(metadata || {}),
    ]);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Analytics tracking error:", err);
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }
}
