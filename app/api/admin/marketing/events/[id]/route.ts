import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await db.query("SELECT * FROM marketing_events WHERE id = $1 LIMIT 1", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, event: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch event" }, { status: 500 });
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
    } = body;

    const query = `
      UPDATE marketing_events
      SET
        title = COALESCE($1, title),
        event_category = COALESCE($2, event_category),
        event_type = COALESCE($3, event_type),
        price = COALESCE($4, price),
        price_model = COALESCE($5, price_model),
        guest_capacity_min = COALESCE($6, guest_capacity_min),
        guest_capacity_max = COALESCE($7, guest_capacity_max),
        start_date = COALESCE($8, start_date),
        end_date = COALESCE($9, end_date),
        duration = COALESCE($10, duration),
        venue_name = COALESCE($11, venue_name),
        venue_type = COALESCE($12, venue_type),
        location = COALESCE($13, location),
        inclusions = COALESCE($14, inclusions),
        image_url = COALESCE($15, image_url),
        gallery = COALESCE($16, gallery),
        description = COALESCE($17, description),
        status = COALESCE($18, status),
        is_featured = COALESCE($19, is_featured),
        updated_at = NOW()
      WHERE id = $20
      RETURNING *
    `;

    const values = [
      title?.trim(),
      event_category,
      event_type,
      price !== undefined ? Number(price) : null,
      price_model,
      guest_capacity_min !== undefined ? Number(guest_capacity_min) : null,
      guest_capacity_max !== undefined ? Number(guest_capacity_max) : null,
      start_date ? new Date(start_date) : null,
      end_date ? new Date(end_date) : null,
      duration,
      venue_name,
      venue_type,
      location,
      inclusions ? JSON.stringify(inclusions) : null,
      image_url,
      gallery ? JSON.stringify(gallery) : null,
      description,
      status,
      is_featured !== undefined ? Boolean(is_featured) : null,
      id,
    ];

    const res = await db.query(query, values);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, event: res.rows[0] });
  } catch (error: any) {
    console.error("PUT /api/admin/marketing/events/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await db.query("DELETE FROM marketing_events WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/marketing/events/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete event" }, { status: 500 });
  }
}
