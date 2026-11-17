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
    const propertyType = searchParams.get("property_type");
    const listingType = searchParams.get("listing_type");
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
      conditions.push(`(p.institution_id = $${params.length} OR p.institution_id IS NULL)`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.title ILIKE $${params.length} OR p.locality ILIKE $${params.length} OR p.city ILIKE $${params.length} OR p.property_type ILIKE $${params.length})`);
    }

    if (propertyType && propertyType !== "all") {
      params.push(propertyType);
      conditions.push(`p.property_type = $${params.length}`);
    }

    if (listingType && listingType !== "all") {
      params.push(listingType);
      conditions.push(`p.listing_type = $${params.length}`);
    }

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT p.*
      FROM marketing_properties p
      ${whereClause}
      ORDER BY p.id DESC
      LIMIT 100
    `;

    const res = await db.query(query, params);

    const statsQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'available' THEN 1 END)::int AS available,
        COUNT(CASE WHEN listing_type = 'For Sale' THEN 1 END)::int AS for_sale,
        COUNT(CASE WHEN listing_type = 'For Rent' THEN 1 END)::int AS for_rent
      FROM marketing_properties p
      ${whereClause}
    `;
    const statsRes = await db.query(statsQuery, params);
    const stats = statsRes.rows[0] || { total: 0, available: 0, for_sale: 0, for_rent: 0 };

    return NextResponse.json({
      success: true,
      properties: res.rows,
      stats,
    });
  } catch (error: any) {
    console.error("GET /api/admin/marketing/properties error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch properties" }, { status: 500 });
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
      property_type,
      listing_type,
      price,
      price_prefix,
      price_suffix,
      bedrooms,
      bathrooms,
      balconies,
      area_sqft,
      carpet_area_sqft,
      furnishing,
      floor_number,
      facing,
      address,
      locality,
      city,
      state,
      pincode,
      amenities,
      image_url,
      gallery,
      description,
      possession_status,
      status,
      is_featured,
      institution_id,
      business_profile_id,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Property title is required" }, { status: 400 });
    }

    const slug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;
    const effectiveInstId = institution_id || (user.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null);

    const query = `
      INSERT INTO marketing_properties (
        institution_id,
        business_profile_id,
        created_by,
        title,
        slug,
        property_type,
        listing_type,
        price,
        price_prefix,
        price_suffix,
        bedrooms,
        bathrooms,
        balconies,
        area_sqft,
        carpet_area_sqft,
        furnishing,
        floor_number,
        facing,
        address,
        locality,
        city,
        state,
        pincode,
        amenities,
        image_url,
        gallery,
        description,
        possession_status,
        status,
        is_featured,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      effectiveInstId,
      business_profile_id || null,
      user.id,
      title.trim(),
      slug,
      property_type || "Apartment / Flat",
      listing_type || "For Sale",
      price ? Number(price) : 0,
      price_prefix || "₹",
      price_suffix || "",
      bedrooms ? Number(bedrooms) : 2,
      bathrooms ? Number(bathrooms) : 2,
      balconies ? Number(balconies) : 1,
      area_sqft ? Number(area_sqft) : null,
      carpet_area_sqft ? Number(carpet_area_sqft) : null,
      furnishing || "Semi-Furnished",
      floor_number || null,
      facing || null,
      address || null,
      locality || null,
      city || null,
      state || null,
      pincode || null,
      JSON.stringify(Array.isArray(amenities) ? amenities : []),
      image_url || null,
      JSON.stringify(Array.isArray(gallery) ? gallery : []),
      description || null,
      possession_status || "Ready to Move",
      status || "available",
      Boolean(is_featured),
    ];

    const res = await db.query(query, values);

    return NextResponse.json({
      success: true,
      property: res.rows[0],
    });
  } catch (error: any) {
    console.error("POST /api/admin/marketing/properties error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create property" }, { status: 500 });
  }
}
