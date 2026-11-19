import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await db.query("SELECT * FROM marketing_vehicles WHERE id = $1 LIMIT 1", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, vehicle: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch vehicle" }, { status: 500 });
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
    } = body;

    const query = `
      UPDATE marketing_vehicles
      SET
        title = COALESCE($1, title),
        brand = COALESCE($2, brand),
        model = COALESCE($3, model),
        vehicle_type = COALESCE($4, vehicle_type),
        fuel_type = COALESCE($5, fuel_type),
        transmission = COALESCE($6, transmission),
        seating_capacity = COALESCE($7, seating_capacity),
        year = COALESCE($8, year),
        registration_number = COALESCE($9, registration_number),
        price = COALESCE($10, price),
        rental_price_per_day = COALESCE($11, rental_price_per_day),
        rental_price_per_hour = COALESCE($12, rental_price_per_hour),
        mileage = COALESCE($13, mileage),
        color = COALESCE($14, color),
        features = COALESCE($15, features),
        image_url = COALESCE($16, image_url),
        gallery = COALESCE($17, gallery),
        description = COALESCE($18, description),
        status = COALESCE($19, status),
        is_featured = COALESCE($20, is_featured),
        updated_at = NOW()
      WHERE id = $21
      RETURNING *
    `;

    const values = [
      title?.trim(),
      brand,
      model,
      vehicle_type,
      fuel_type,
      transmission,
      seating_capacity ? Number(seating_capacity) : null,
      year ? Number(year) : null,
      registration_number,
      price !== undefined ? (price ? Number(price) : null) : null,
      rental_price_per_day !== undefined ? (rental_price_per_day ? Number(rental_price_per_day) : null) : null,
      rental_price_per_hour !== undefined ? (rental_price_per_hour ? Number(rental_price_per_hour) : null) : null,
      mileage,
      color,
      features ? JSON.stringify(features) : null,
      image_url,
      gallery ? JSON.stringify(gallery) : null,
      description,
      status,
      is_featured !== undefined ? Boolean(is_featured) : null,
      id,
    ];

    const res = await db.query(query, values);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, vehicle: res.rows[0] });
  } catch (error: any) {
    console.error("PUT /api/admin/marketing/vehicles/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update vehicle" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await db.query("DELETE FROM marketing_vehicles WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/marketing/vehicles/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete vehicle" }, { status: 500 });
  }
}
