import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim();
    const eventCategory = searchParams.get("event_category");
    const eventType = searchParams.get("event_type");
    const status = searchParams.get("status");
    const institutionIdParam = searchParams.get("institution_id");

    const isPlatformAdmin = Boolean(
      user?.role_codes?.some((r: string) => r.includes("super") || r.includes("platform")) ||
      (user as any)?.role === "platform_admin" ||
      (user as any)?.is_super_admin
    );

    let institutionId: number | null = null;
    if (institutionIdParam && !isNaN(Number(institutionIdParam)) && institutionIdParam !== "all") {
      institutionId = Number(institutionIdParam);
    } else if (!isPlatformAdmin && user?.memberships?.length) {
      const instMem = user.memberships.find((m: any) => m.institution_id);
      if (instMem) institutionId = Number(instMem.institution_id);
    }

    const conditions: string[] = [];
    const params: any[] = [];

    if (institutionId) {
      params.push(institutionId);
      conditions.push(`(e.institution_id = $${params.length} OR e.institution_id IS NULL)`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(e.title ILIKE $${params.length} OR e.venue_name ILIKE $${params.length} OR e.event_category ILIKE $${params.length})`);
    }

    if (eventCategory && eventCategory !== "all") {
      params.push(eventCategory);
      conditions.push(`e.event_category = $${params.length}`);
    }

    if (eventType && eventType !== "all") {
      params.push(eventType);
      conditions.push(`e.event_type = $${params.length}`);
    }

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`e.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT e.*
      FROM marketing_events e
      ${whereClause}
      ORDER BY e.id DESC
      LIMIT 100
    `;

    const res = await db.query(query, params);

    const statsQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int AS active,
        COUNT(CASE WHEN status = 'upcoming' THEN 1 END)::int AS upcoming,
        COUNT(CASE WHEN event_category ILIKE '%wedding%' THEN 1 END)::int AS weddings
      FROM marketing_events e
      ${whereClause}
    `;
    const statsRes = await db.query(statsQuery, params);
    const stats = statsRes.rows[0] || { total: 0, active: 0, upcoming: 0, weddings: 0 };

    return NextResponse.json({
      success: true,
      events: res.rows,
      stats,
    });
  } catch (error: any) {
    console.error("GET /api/admin/marketing/events error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      event_category,
      event_type,
      price,
      price_model,
      guest_capacity_min,
      guest_capacity_max,
      start_date,
      end_date,
      duration,
      venue_name,
      venue_type,
      location,
      inclusions,
      image_url,
      gallery,
      description,
      status,
      is_featured,
      institution_id,
      business_profile_id,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Event title is required" }, { status: 400 });
    }

    const slug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;
    const effectiveInstId = institution_id || (user.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null);

    const query = `
      INSERT INTO marketing_events (
        institution_id,
        business_profile_id,
        created_by,
        title,
        slug,
        event_category,
        event_type,
        price,
        price_model,
        guest_capacity_min,
        guest_capacity_max,
        start_date,
        end_date,
        duration,
        venue_name,
        venue_type,
        location,
        inclusions,
        image_url,
        gallery,
        description,
        status,
        is_featured,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      effectiveInstId,
      business_profile_id || null,
      user.id,
      title.trim(),
      slug,
      event_category || "Wedding & Reception",
      event_type || "Venue Package",
      price ? Number(price) : 0,
      price_model || "per_package",
      guest_capacity_min ? Number(guest_capacity_min) : 50,
      guest_capacity_max ? Number(guest_capacity_max) : 500,
      start_date ? new Date(start_date) : null,
      end_date ? new Date(end_date) : null,
      duration || null,
      venue_name || null,
      venue_type || "Indoor AC Banquet",
      location || null,
      JSON.stringify(Array.isArray(inclusions) ? inclusions : []),
      image_url || null,
      JSON.stringify(Array.isArray(gallery) ? gallery : []),
      description || null,
      status || "active",
      Boolean(is_featured),
    ];

    const res = await db.query(query, values);

    return NextResponse.json({
      success: true,
      event: res.rows[0],
    });
  } catch (error: any) {
    console.error("POST /api/admin/marketing/events error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create event" }, { status: 500 });
  }
}
