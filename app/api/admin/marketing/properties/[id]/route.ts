import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await db.query("SELECT * FROM marketing_properties WHERE id = $1 LIMIT 1", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, property: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch property" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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
    } = body;

    const query = `
      UPDATE marketing_properties
      SET
        title = COALESCE($1, title),
        property_type = COALESCE($2, property_type),
        listing_type = COALESCE($3, listing_type),
        price = COALESCE($4, price),
        price_prefix = COALESCE($5, price_prefix),
        price_suffix = COALESCE($6, price_suffix),
        bedrooms = COALESCE($7, bedrooms),
        bathrooms = COALESCE($8, bathrooms),
        balconies = COALESCE($9, balconies),
        area_sqft = COALESCE($10, area_sqft),
        carpet_area_sqft = COALESCE($11, carpet_area_sqft),
        furnishing = COALESCE($12, furnishing),
        floor_number = COALESCE($13, floor_number),
        facing = COALESCE($14, facing),
        address = COALESCE($15, address),
        locality = COALESCE($16, locality),
        city = COALESCE($17, city),
        state = COALESCE($18, state),
        pincode = COALESCE($19, pincode),
        amenities = COALESCE($20, amenities),
        image_url = COALESCE($21, image_url),
        gallery = COALESCE($22, gallery),
        description = COALESCE($23, description),
        possession_status = COALESCE($24, possession_status),
        status = COALESCE($25, status),
        is_featured = COALESCE($26, is_featured),
        updated_at = NOW()
      WHERE id = $27
      RETURNING *
    `;

    const values = [
      title?.trim(),
      property_type,
      listing_type,
      price !== undefined ? Number(price) : null,
      price_prefix,
      price_suffix,
      bedrooms !== undefined ? Number(bedrooms) : null,
      bathrooms !== undefined ? Number(bathrooms) : null,
      balconies !== undefined ? Number(balconies) : null,
      area_sqft !== undefined ? (area_sqft ? Number(area_sqft) : null) : null,
      carpet_area_sqft !== undefined ? (carpet_area_sqft ? Number(carpet_area_sqft) : null) : null,
      furnishing,
      floor_number,
      facing,
      address,
      locality,
      city,
      state,
      pincode,
      amenities ? JSON.stringify(amenities) : null,
      image_url,
      gallery ? JSON.stringify(gallery) : null,
      description,
      possession_status,
      status,
      is_featured !== undefined ? Boolean(is_featured) : null,
      id,
    ];

    const res = await db.query(query, values);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, property: res.rows[0] });
  } catch (error: any) {
    console.error("PUT /api/admin/marketing/properties/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update property" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await db.query("DELETE FROM marketing_properties WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/marketing/properties/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete property" }, { status: 500 });
  }
}
