import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await db.query("SELECT * FROM marketing_dishes WHERE id = $1 LIMIT 1", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, dish: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch dish" }, { status: 500 });
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
      category,
      diet_type,
      price,
      sale_price,
      preparation_time,
      portion_size,
      spice_level,
      calories,
      dietary_tags,
      ingredients,
      image_url,
      description,
      status,
      is_featured,
    } = body;

    const query = `
      UPDATE marketing_dishes
      SET
        title = COALESCE($1, title),
        category = COALESCE($2, category),
        diet_type = COALESCE($3, diet_type),
        price = COALESCE($4, price),
        sale_price = COALESCE($5, sale_price),
        preparation_time = COALESCE($6, preparation_time),
        portion_size = COALESCE($7, portion_size),
        spice_level = COALESCE($8, spice_level),
        calories = COALESCE($9, calories),
        dietary_tags = COALESCE($10, dietary_tags),
        ingredients = COALESCE($11, ingredients),
        image_url = COALESCE($12, image_url),
        description = COALESCE($13, description),
        status = COALESCE($14, status),
        is_featured = COALESCE($15, is_featured),
        updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `;

    const values = [
      title?.trim(),
      category,
      diet_type,
      price !== undefined ? Number(price) : null,
      sale_price !== undefined ? (sale_price ? Number(sale_price) : null) : null,
      preparation_time,
      portion_size,
      spice_level,
      calories,
      dietary_tags ? JSON.stringify(dietary_tags) : null,
      ingredients,
      image_url,
      description,
      status,
      is_featured !== undefined ? Boolean(is_featured) : null,
      id,
    ];

    const res = await db.query(query, values);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, dish: res.rows[0] });
  } catch (error: any) {
    console.error("PUT /api/admin/marketing/dishes/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update dish" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await db.query("DELETE FROM marketing_dishes WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/marketing/dishes/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete dish" }, { status: 500 });
  }
}
