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
    const vehicleType = searchParams.get("vehicle_type");
    const fuelType = searchParams.get("fuel_type");
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
      conditions.push(`(v.institution_id = $${params.length} OR v.institution_id IS NULL)`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(v.title ILIKE $${params.length} OR v.brand ILIKE $${params.length} OR v.model ILIKE $${params.length} OR v.registration_number ILIKE $${params.length})`);
    }

    if (vehicleType && vehicleType !== "all") {
      params.push(vehicleType);
      conditions.push(`v.vehicle_type = $${params.length}`);
    }

    if (fuelType && fuelType !== "all") {
      params.push(fuelType);
      conditions.push(`v.fuel_type = $${params.length}`);
    }

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`v.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT v.*
      FROM marketing_vehicles v
      ${whereClause}
      ORDER BY v.id DESC
      LIMIT 100
    `;

    const res = await db.query(query, params);

    // Summary stats
    const statsQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'available' THEN 1 END)::int AS available,
        COUNT(CASE WHEN status = 'rented' OR status = 'booked' THEN 1 END)::int AS booked,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END)::int AS maintenance
      FROM marketing_vehicles v
      ${whereClause}
    `;
    const statsRes = await db.query(statsQuery, params);
    const stats = statsRes.rows[0] || { total: 0, available: 0, booked: 0, maintenance: 0 };

    return NextResponse.json({
      success: true,
      vehicles: res.rows,
      stats,
    });
  } catch (error: any) {
    console.error("GET /api/admin/marketing/vehicles error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch vehicles" }, { status: 500 });
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
      brand,
      model,
      vehicle_type,
      fuel_type,
      transmission,
      seating_capacity,
      year,
      registration_number,
      price,
      rental_price_per_day,
      rental_price_per_hour,
      mileage,
      color,
      features,
      image_url,
      gallery,
      description,
      status,
      is_featured,
      institution_id,
      business_profile_id,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Vehicle title is required" }, { status: 400 });
    }

    const slug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;
    const effectiveInstId = institution_id || (user.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null);

    const query = `
      INSERT INTO marketing_vehicles (
        institution_id,
        business_profile_id,
        created_by,
        title,
        slug,
        brand,
        model,
        vehicle_type,
        fuel_type,
        transmission,
        seating_capacity,
        year,
        registration_number,
        price,
        rental_price_per_day,
        rental_price_per_hour,
        mileage,
        color,
        features,
        image_url,
        gallery,
        description,
        status,
        is_featured,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      effectiveInstId,
      business_profile_id || null,
      user.id,
      title.trim(),
      slug,
      brand || null,
      model || null,
      vehicle_type || "SUV",
      fuel_type || "Petrol",
      transmission || "Automatic",
      seating_capacity ? Number(seating_capacity) : 5,
      year ? Number(year) : new Date().getFullYear(),
      registration_number || null,
      price ? Number(price) : null,
      rental_price_per_day ? Number(rental_price_per_day) : null,
      rental_price_per_hour ? Number(rental_price_per_hour) : null,
      mileage || null,
      color || null,
      JSON.stringify(Array.isArray(features) ? features : []),
      image_url || null,
      JSON.stringify(Array.isArray(gallery) ? gallery : []),
      description || null,
      status || "available",
      Boolean(is_featured),
    ];

    const res = await db.query(query, values);

    return NextResponse.json({
      success: true,
      vehicle: res.rows[0],
    });
  } catch (error: any) {
    console.error("POST /api/admin/marketing/vehicles error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create vehicle" }, { status: 500 });
  }
}
