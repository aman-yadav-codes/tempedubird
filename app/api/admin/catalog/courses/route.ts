import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("categoryId");
    const authorityType = searchParams.get("authorityType");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit")) || 50));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["COALESCE(mc.is_deleted, false) = false"];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(
        mc.name ILIKE $${params.length} 
        OR COALESCE(mc.code, '') ILIKE $${params.length} 
        OR COALESCE(mc.university_name, '') ILIKE $${params.length}
        OR COALESCE(mc.description, '') ILIKE $${params.length}
      )`);
    }

    if (categoryId && categoryId !== "all") {
      params.push(Number(categoryId));
      conditions.push(`mc.category_id = $${params.length}`);
    }

    if (authorityType && authorityType !== "all") {
      params.push(authorityType);
      conditions.push(`mc.authority_type = $${params.length}`);
    }

    const whereClause = conditions.join(" AND ");

    const countRes = await db.query(
      `SELECT COUNT(*) FROM master_courses mc WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataQuery = `
      SELECT 
        mc.id,
        mc.name,
        mc.slug,
        mc.code,
        mc.category_id,
        c.name AS category_name,
        mc.authority_type,
        mc.university_id,
        mc.university_name,
        mc.board_id,
        mc.certification_provider_id,
        mc.duration_value,
        mc.duration_unit,
        mc.seats_available,
        mc.medium,
        COALESCE(mc.mediums, '{}') AS mediums,
        mc.description,
        mc.thumbnail_url,
        mc.icon_url,
        COALESCE(mc.is_active, true) AS is_active,
        mc.created_at,
        mc.updated_at
      FROM master_courses mc
      LEFT JOIN categories c ON c.id = mc.category_id
      WHERE ${whereClause}
      ORDER BY mc.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataRes = await db.query(dataQuery, [...params, limit, offset]);

    return NextResponse.json({
      success: true,
      data: dataRes.rows,
      meta: {
        total,
        page,
        limit,
        pageCount: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("[master_courses GET] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      slug,
      code,
      category_id,
      authority_type = "University",
      university_name,
      duration_value,
      duration_unit = "Years",
      seats_available = 60,
      medium = "English",
      description,
      thumbnail_url,
      icon_url,
      is_active = true,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Course name is required" }, { status: 400 });
    }
    if (!category_id) {
      return NextResponse.json({ error: "Course category is required" }, { status: 400 });
    }

    const cleanSlug =
      (slug?.trim() || name.trim())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "") +
      `-${Date.now().toString().slice(-4)}`;

    const res = await db.query(
      `
      INSERT INTO master_courses (
        name,
        slug,
        code,
        category_id,
        authority_type,
        university_name,
        duration_value,
        duration_unit,
        seats_available,
        medium,
        mediums,
        description,
        thumbnail_url,
        icon_url,
        is_active,
        is_deleted
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, FALSE)
      RETURNING *
      `,
      [
        name.trim(),
        cleanSlug,
        code?.trim() || null,
        Number(category_id),
        authority_type || "University",
        university_name?.trim() || null,
        duration_value ? Number(duration_value) : null,
        duration_unit || "Years",
        seats_available ? Number(seats_available) : 60,
        medium || "English",
        [medium || "English"],
        description?.trim() || null,
        thumbnail_url?.trim() || null,
        icon_url?.trim() || null,
        Boolean(is_active),
      ]
    );

    return NextResponse.json({ success: true, data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error("[master_courses POST] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      name,
      slug,
      code,
      category_id,
      authority_type,
      university_name,
      duration_value,
      duration_unit,
      seats_available,
      medium,
      description,
      thumbnail_url,
      icon_url,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    const res = await db.query(
      `
      UPDATE master_courses
      SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        code = $3,
        category_id = COALESCE($4, category_id),
        authority_type = COALESCE($5, authority_type),
        university_name = $6,
        duration_value = $7,
        duration_unit = COALESCE($8, duration_unit),
        seats_available = COALESCE($9, seats_available),
        medium = COALESCE($10, medium),
        description = $11,
        thumbnail_url = $12,
        icon_url = $13,
        is_active = COALESCE($14, is_active),
        updated_at = NOW()
      WHERE id = $15
      RETURNING *
      `,
      [
        name?.trim() || null,
        slug?.trim() || null,
        code?.trim() || null,
        category_id ? Number(category_id) : null,
        authority_type || null,
        university_name?.trim() || null,
        duration_value ? Number(duration_value) : null,
        duration_unit || null,
        seats_available !== undefined ? Number(seats_available) : null,
        medium || null,
        description !== undefined ? description?.trim() : null,
        thumbnail_url !== undefined ? thumbnail_url?.trim() : null,
        icon_url !== undefined ? icon_url?.trim() : null,
        is_active !== undefined ? Boolean(is_active) : null,
        Number(id),
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (err: any) {
    console.error("[master_courses PUT] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await db.query(
      `UPDATE master_courses SET is_deleted = TRUE, is_active = FALSE, deleted_at = NOW() WHERE id = $1`,
      [Number(id)]
    );

    return NextResponse.json({ success: true, message: "Course deleted successfully" });
  } catch (err: any) {
    console.error("[master_courses DELETE] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
