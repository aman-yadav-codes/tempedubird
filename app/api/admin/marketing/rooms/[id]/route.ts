import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await db.query("SELECT * FROM marketing_rooms WHERE id = $1 LIMIT 1", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, room: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch room" }, { status: 500 });
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
    } = body;

    const query = `
      UPDATE marketing_rooms
      SET
        title = COALESCE($1, title),
        room_type = COALESCE($2, room_type),
        price_per_night = COALESCE($3, price_per_night),
        weekend_price = COALESCE($4, weekend_price),
        max_adults = COALESCE($5, max_adults),
        max_children = COALESCE($6, max_children),
        bed_type = COALESCE($7, bed_type),
        room_size_sqft = COALESCE($8, room_size_sqft),
        view_type = COALESCE($9, view_type),
        amenities = COALESCE($10, amenities),
        check_in_time = COALESCE($11, check_in_time),
        check_out_time = COALESCE($12, check_out_time),
        image_url = COALESCE($13, image_url),
        gallery = COALESCE($14, gallery),
        description = COALESCE($15, description),
        status = COALESCE($16, status),
        is_featured = COALESCE($17, is_featured),
        updated_at = NOW()
      WHERE id = $18
      RETURNING *
    `;

    const values = [
      title?.trim(),
      room_type,
      price_per_night !== undefined ? Number(price_per_night) : null,
      weekend_price !== undefined ? (weekend_price ? Number(weekend_price) : null) : null,
      max_adults !== undefined ? Number(max_adults) : null,
      max_children !== undefined ? Number(max_children) : null,
      bed_type,
      room_size_sqft !== undefined ? (room_size_sqft ? Number(room_size_sqft) : null) : null,
      view_type,
      amenities ? JSON.stringify(amenities) : null,
      check_in_time,
      check_out_time,
      image_url,
      gallery ? JSON.stringify(gallery) : null,
      description,
      status,
      is_featured !== undefined ? Boolean(is_featured) : null,
      id,
    ];

    const res = await db.query(query, values);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, room: res.rows[0] });
  } catch (error: any) {
    console.error("PUT /api/admin/marketing/rooms/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update room" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await db.query("DELETE FROM marketing_rooms WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/marketing/rooms/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete room" }, { status: 500 });
  }
}
