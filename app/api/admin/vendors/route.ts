import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const url = new URL(req.url);
    const category = url.searchParams.get("category")?.trim() || "";
    const location = url.searchParams.get("location")?.trim() || "";
    const search = url.searchParams.get("search")?.trim() || "";

    let query = `SELECT * FROM vendors WHERE 1=1`;
    const params: any[] = [];

    if (category && category !== "all") {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (location && location !== "all") {
      params.push(`%${location}%`);
      query += ` AND (city ILIKE $${params.length} OR location ILIKE $${params.length} OR address ILIKE $${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    query += ` ORDER BY id DESC`;

    const res = await db.query(query, params);
    return NextResponse.json({ vendors: res.rows });
  } catch (error: any) {
    console.error("[Vendors GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch vendors" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Platform admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      category,
      phone,
      email,
      profile_image,
      address,
      city,
      location,
      map_url,
      rating = 4.5,
      description,
      status = "active",
    } = body;

    if (!name || !category || !phone) {
      return NextResponse.json({ error: "Vendor name, category, and phone are required" }, { status: 400 });
    }

    const res = await db.query(
      `
      INSERT INTO vendors (
        name, category, phone, email, profile_image, address, city, location, map_url, rating, description, status, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *
      `,
      [
        name.trim(),
        category,
        phone.trim(),
        email?.trim() || null,
        profile_image || null,
        address?.trim() || null,
        city?.trim() || null,
        location?.trim() || null,
        map_url || null,
        Number(rating) || 4.5,
        description?.trim() || null,
        status,
      ]
    );

    return NextResponse.json({ vendor: res.rows[0], message: "Vendor created successfully" });
  } catch (error: any) {
    console.error("[Vendors POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create vendor" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Platform admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      name,
      category,
      phone,
      email,
      profile_image,
      address,
      city,
      location,
      map_url,
      rating,
      description,
      status,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 });
    }

    const res = await db.query(
      `
      UPDATE vendors
      SET name = COALESCE($1, name),
          category = COALESCE($2, category),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          profile_image = COALESCE($5, profile_image),
          address = COALESCE($6, address),
          city = COALESCE($7, city),
          location = COALESCE($8, location),
          map_url = COALESCE($9, map_url),
          rating = COALESCE($10, rating),
          description = COALESCE($11, description),
          status = COALESCE($12, status),
          updated_at = NOW()
      WHERE id = $13
      RETURNING *
      `,
      [
        name,
        category,
        phone,
        email,
        profile_image,
        address,
        city,
        location,
        map_url,
        rating ? Number(rating) : undefined,
        description,
        status,
        id,
      ]
    );

    if (!res.rows.length) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ vendor: res.rows[0], message: "Vendor updated successfully" });
  } catch (error: any) {
    console.error("[Vendors PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update vendor" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Platform admin access required." }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM vendors WHERE id = $1`, [id]);
    return NextResponse.json({ message: "Vendor deleted successfully" });
  } catch (error: any) {
    console.error("[Vendors DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete vendor" }, { status: 500 });
  }
}
