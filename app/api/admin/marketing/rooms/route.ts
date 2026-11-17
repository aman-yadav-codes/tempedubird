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
    const roomType = searchParams.get("room_type");
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
      conditions.push(`(r.institution_id = $${params.length} OR r.institution_id IS NULL)`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(r.title ILIKE $${params.length} OR r.room_type ILIKE $${params.length} OR r.bed_type ILIKE $${params.length})`);
    }

    if (roomType && roomType !== "all") {
      params.push(roomType);
      conditions.push(`r.room_type = $${params.length}`);
    }

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT r.*
      FROM marketing_rooms r
      ${whereClause}
      ORDER BY r.id DESC
      LIMIT 100
    `;

    const res = await db.query(query, params);

    const statsQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'available' THEN 1 END)::int AS available,
        COUNT(CASE WHEN status = 'booked' THEN 1 END)::int AS booked,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END)::int AS maintenance
      FROM marketing_rooms r
      ${whereClause}
    `;
    const statsRes = await db.query(statsQuery, params);
    const stats = statsRes.rows[0] || { total: 0, available: 0, booked: 0, maintenance: 0 };

    return NextResponse.json({
      success: true,
      rooms: res.rows,
      stats,
    });
  } catch (error: any) {
    console.error("GET /api/admin/marketing/rooms error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch rooms" }, { status: 500 });
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
      room_type,
      price_per_night,
      weekend_price,
      max_adults,
      max_children,
      bed_type,
      room_size_sqft,
      view_type,
      amenities,
      check_in_time,
      check_out_time,
      image_url,
      gallery,
      description,
      status,
      is_featured,
      institution_id,
      business_profile_id,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Room title is required" }, { status: 400 });
    }

    const slug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;
    const effectiveInstId = institution_id || (user.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null);

    const query = `
      INSERT INTO marketing_rooms (
        institution_id,
        business_profile_id,
        created_by,
        title,
        slug,
        room_type,
        price_per_night,
        weekend_price,
        max_adults,
        max_children,
        bed_type,
        room_size_sqft,
        view_type,
        amenities,
        check_in_time,
        check_out_time,
        image_url,
        gallery,
        description,
        status,
        is_featured,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      effectiveInstId,
      business_profile_id || null,
      user.id,
      title.trim(),
      slug,
      room_type || "Deluxe Room",
      price_per_night ? Number(price_per_night) : 0,
      weekend_price ? Number(weekend_price) : null,
      max_adults ? Number(max_adults) : 2,
      max_children ? Number(max_children) : 1,
      bed_type || "1 King Bed",
      room_size_sqft ? Number(room_size_sqft) : null,
      view_type || "City View",
      JSON.stringify(Array.isArray(amenities) ? amenities : []),
      check_in_time || "02:00 PM",
      check_out_time || "11:00 AM",
      image_url || null,
      JSON.stringify(Array.isArray(gallery) ? gallery : []),
      description || null,
      status || "available",
      Boolean(is_featured),
    ];

    const res = await db.query(query, values);

    return NextResponse.json({
      success: true,
      room: res.rows[0],
    });
  } catch (error: any) {
    console.error("POST /api/admin/marketing/rooms error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create room" }, { status: 500 });
  }
}
