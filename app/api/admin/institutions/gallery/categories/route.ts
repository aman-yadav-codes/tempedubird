import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getAllowedInstitutionIds, getUserInstitutionIds } from "@/lib/auth/institution-scope";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

const DEFAULT_CATEGORIES = [
  { name: "Campus & Architecture", slug: "campus" },
  { name: "Laboratories & Tech", slug: "labs" },
  { name: "Central Library", slug: "library" },
  { name: "Hostels & Living", slug: "hostels" },
  { name: "Smart Classrooms", slug: "classrooms" },
  { name: "Events & Fests", slug: "events" },
  { name: "Sports & Fitness", slug: "sports" },
  { name: "Auditorium & Seminars", slug: "auditorium" },
];

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const institutionIdParam = searchParams.get("institutionId");

    const allowedIds = isPlatformAdminUser(user)
      ? null
      : (await getUserInstitutionIds(db, user.id)).concat(getAllowedInstitutionIds(user));

    const params: unknown[] = [];
    const where: string[] = ["COALESCE(gc.is_active, TRUE) = TRUE"];

    if (institutionIdParam && institutionIdParam !== "all") {
      params.push(Number(institutionIdParam));
      where.push(`(gc.institution_id = $${params.length} OR gc.institution_id IS NULL)`);
    } else if (allowedIds && allowedIds.length > 0) {
      params.push(allowedIds);
      where.push(`(gc.institution_id = ANY($${params.length}::int[]) OR gc.institution_id IS NULL)`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const query = `
      SELECT
        gc.id,
        gc.institution_id,
        gc.name,
        gc.slug,
        gc.description,
        gc.sort_order,
        COUNT(m.id)::int AS image_count
      FROM institution_gallery_categories gc
      LEFT JOIN institution_media m ON m.category_id = gc.id AND COALESCE(m.is_deleted, FALSE) = FALSE
      ${whereSql}
      GROUP BY gc.id, gc.institution_id, gc.name, gc.slug, gc.description, gc.sort_order
      ORDER BY gc.sort_order ASC, gc.name ASC
    `;

    const res = await db.query(query, params);
    let rows = res.rows || [];

    // If no custom categories exist for this institution yet, return default standard categories
    if (rows.length === 0) {
      rows = DEFAULT_CATEGORIES.map((cat, idx) => ({
        id: -(idx + 1),
        institution_id: institutionIdParam ? Number(institutionIdParam) : null,
        name: cat.name,
        slug: cat.slug,
        description: null,
        sort_order: idx,
        image_count: 0,
      }));
    }

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (err: any) {
    console.error("GET /api/admin/institutions/gallery/categories error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch gallery categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { institution_id, name, description, sort_order } = body;

    const institutionId = Number(institution_id);
    if (!institutionId || institutionId <= 0) {
      return NextResponse.json({ error: "Institution ID is required" }, { status: 400 });
    }

    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const existing = await db.query<{ id: number }>(
      `SELECT id FROM institution_gallery_categories WHERE institution_id = $1 AND (LOWER(name) = LOWER($2) OR slug = $3) LIMIT 1`,
      [institutionId, trimmedName, slug]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({
        success: true,
        data: existing.rows[0],
        message: "Category already exists",
      });
    }

    const res = await db.query(
      `
      INSERT INTO institution_gallery_categories (
        institution_id,
        name,
        slug,
        description,
        sort_order,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, institution_id, name, slug, description, sort_order
      `,
      [institutionId, trimmedName, slug, String(description || "").trim() || null, Number(sort_order || 0)]
    );

    return NextResponse.json({
      success: true,
      data: res.rows[0],
      message: "Gallery category created successfully",
    });
  } catch (err: any) {
    console.error("POST /api/admin/institutions/gallery/categories error:", err);
    return NextResponse.json({ error: err.message || "Failed to create gallery category" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id || id <= 0) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM institution_gallery_categories WHERE id = $1`, [id]);

    return NextResponse.json({
      success: true,
      message: "Gallery category deleted successfully",
    });
  } catch (err: any) {
    console.error("DELETE /api/admin/institutions/gallery/categories error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete gallery category" }, { status: 500 });
  }
}
