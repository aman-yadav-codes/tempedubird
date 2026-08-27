import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const url = new URL(req.url);
    const institutionId = url.searchParams.get("institutionId");

    let query = `
      SELECT io.*, ip.name AS institution_name
      FROM institution_offers io
      LEFT JOIN institution_profiles ip ON ip.id = io.institution_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (institutionId && !isNaN(Number(institutionId))) {
      params.push(Number(institutionId));
      query += ` AND (io.institution_id = $${params.length} OR io.institution_id IS NULL)`;
    }

    query += ` ORDER BY io.id DESC`;

    const res = await db.query(query, params);
    return NextResponse.json({ offers: res.rows });
  } catch (error: any) {
    console.error("[Offers GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load offers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const {
      institution_id,
      title,
      description,
      coupon_code,
      discount_type = "percentage",
      discount_value = 10,
      banner_image_url,
      start_date,
      end_date,
      is_active = true,
    } = body;

    if (!title || !discount_value) {
      return NextResponse.json({ error: "Title and Discount Value are required" }, { status: 400 });
    }

    const res = await db.query(
      `
      INSERT INTO institution_offers (
        institution_id, title, description, coupon_code, discount_type, discount_value, banner_image_url, start_date, end_date, is_active, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
      `,
      [
        institution_id || null,
        title.trim(),
        description?.trim() || null,
        coupon_code?.trim().toUpperCase() || null,
        discount_type,
        Number(discount_value),
        banner_image_url?.trim() || null,
        start_date || null,
        end_date || null,
        is_active,
      ]
    );

    return NextResponse.json({ offer: res.rows[0], message: "Offer created successfully" });
  } catch (error: any) {
    console.error("[Offers POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create offer" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const {
      id,
      title,
      description,
      coupon_code,
      discount_type,
      discount_value,
      banner_image_url,
      start_date,
      end_date,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Offer ID is required" }, { status: 400 });
    }

    const res = await db.query(
      `
      UPDATE institution_offers
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          coupon_code = COALESCE($3, coupon_code),
          discount_type = COALESCE($4, discount_type),
          discount_value = COALESCE($5, discount_value),
          banner_image_url = COALESCE($6, banner_image_url),
          start_date = COALESCE($7, start_date),
          end_date = COALESCE($8, end_date),
          is_active = COALESCE($9, is_active),
          updated_at = NOW()
      WHERE id = $10
      RETURNING *
      `,
      [
        title,
        description,
        coupon_code ? coupon_code.toUpperCase() : undefined,
        discount_type,
        discount_value ? Number(discount_value) : undefined,
        banner_image_url,
        start_date,
        end_date,
        is_active,
        id,
      ]
    );

    return NextResponse.json({ offer: res.rows[0], message: "Offer updated successfully" });
  } catch (error: any) {
    console.error("[Offers PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update offer" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Offer ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM institution_offers WHERE id = $1`, [id]);
    return NextResponse.json({ message: "Offer deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete offer" }, { status: 500 });
  }
}
