import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getAllowedInstitutionIds, getUserInstitutionIds } from "@/lib/auth/institution-scope";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

let schemaReady = false;
async function ensureGallerySchema() {
  if (schemaReady) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS institution_gallery_categories (
        id SERIAL PRIMARY KEY,
        institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
        name VARCHAR(120) NOT NULL,
        slug VARCHAR(150) NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE institution_media ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES institution_gallery_categories(id) ON DELETE SET NULL;
      ALTER TABLE institution_media ADD COLUMN IF NOT EXISTS category VARCHAR(120);
      ALTER TABLE institution_media ADD COLUMN IF NOT EXISTS description TEXT;
    `);
    schemaReady = true;
  } catch (err) {
    console.error("Error creating gallery schema:", err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    await ensureGallerySchema();

    const { searchParams } = new URL(req.url);
    const requestedInstId = searchParams.get("institutionId");
    const categoryIdParam = searchParams.get("categoryId");
    const search = searchParams.get("search")?.trim().toLowerCase();

    const allowedIds = isPlatformAdminUser(user)
      ? null
      : (await getUserInstitutionIds(db, user.id)).concat(getAllowedInstitutionIds(user));

    const params: unknown[] = [];
    const where: string[] = ["COALESCE(m.is_deleted, FALSE) = FALSE"];

    if (requestedInstId && requestedInstId !== "all") {
      params.push(Number(requestedInstId));
      where.push(`m.institution_id = $${params.length}`);
    } else if (allowedIds && allowedIds.length > 0) {
      params.push(allowedIds);
      where.push(`m.institution_id = ANY($${params.length}::int[])`);
    }

    if (categoryIdParam && categoryIdParam !== "all") {
      params.push(Number(categoryIdParam));
      where.push(`m.category_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      where.push(`(m.title ILIKE $${params.length} OR m.description ILIKE $${params.length} OR gc.name ILIKE $${params.length})`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const query = `
      SELECT
        m.id,
        m.institution_id,
        COALESCE(ip.name, ip.slug, 'Institution') AS institution_name,
        m.url,
        COALESCE(m.title, 'Campus Photo') AS title,
        m.description,
        m.sort_order,
        m.category_id,
        COALESCE(gc.name, m.category, 'Campus & Architecture') AS category_name,
        m.media_type,
        m.created_at,
        m.updated_at
      FROM institution_media m
      LEFT JOIN institution_profiles ip ON ip.id = m.institution_id
      LEFT JOIN institution_gallery_categories gc ON gc.id = m.category_id
      ${whereSql}
      ORDER BY m.sort_order ASC, m.id DESC
    `;

    const res = await db.query(query, params);

    return NextResponse.json({
      success: true,
      data: res.rows,
      total: res.rows.length,
    });
  } catch (err: any) {
    console.error("GET /api/admin/institutions/gallery error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch gallery items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    await ensureGallerySchema();

    const body = await req.json();
    const {
      institution_id,
      images, // array of { url, title, description, category_id, sort_order } or single image
      url,
      title,
      description,
      category_id,
      category_name,
      sort_order,
    } = body;

    const institutionId = Number(institution_id);
    if (!institutionId || institutionId <= 0) {
      return NextResponse.json({ error: "Institution ID is required" }, { status: 400 });
    }

    let finalCategoryId = category_id ? Number(category_id) : null;

    // Auto-create category if category_name is provided without category_id
    if (!finalCategoryId && category_name && String(category_name).trim()) {
      const trimmedCat = String(category_name).trim();
      const slug = trimmedCat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const existing = await db.query<{ id: number }>(
        `SELECT id FROM institution_gallery_categories WHERE institution_id = $1 AND (LOWER(name) = LOWER($2) OR slug = $3) LIMIT 1`,
        [institutionId, trimmedCat, slug]
      );
      if (existing.rows.length > 0) {
        finalCategoryId = existing.rows[0].id;
      } else {
        const createCat = await db.query<{ id: number }>(
          `INSERT INTO institution_gallery_categories (institution_id, name, slug, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id`,
          [institutionId, trimmedCat, slug]
        );
        finalCategoryId = createCat.rows[0].id;
      }
    }

    // Handle batch image items
    if (Array.isArray(images) && images.length > 0) {
      const inserted = [];
      for (const img of images) {
        if (!img.url || !String(img.url).trim()) continue;
        const itemCatId = img.category_id ? Number(img.category_id) : finalCategoryId;
        const itemTitle = String(img.title || title || "Campus Photo").trim();
        const itemDesc = String(img.description || description || "").trim();
        const itemSort = Number(img.sort_order ?? sort_order ?? 0);

        const res = await db.query(
          `
          INSERT INTO institution_media (
            institution_id,
            media_type,
            url,
            title,
            description,
            category_id,
            sort_order,
            created_by,
            created_at,
            updated_at
          ) VALUES ($1, 'gallery', $2, $3, $4, $5, $6, $7, NOW(), NOW())
          RETURNING id, url, title, description, category_id, sort_order
          `,
          [institutionId, img.url.trim(), itemTitle, itemDesc, itemCatId, itemSort, user.id]
        );
        inserted.push(res.rows[0]);
      }

      return NextResponse.json({
        success: true,
        data: inserted,
        message: `Successfully added ${inserted.length} gallery image(s)`,
      });
    }

    // Single image insert
    if (!url || !String(url).trim()) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    }

    const res = await db.query(
      `
      INSERT INTO institution_media (
        institution_id,
        media_type,
        url,
        title,
        description,
        category_id,
        sort_order,
        created_by,
        created_at,
        updated_at
      ) VALUES ($1, 'gallery', $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, url, title, description, category_id, sort_order
      `,
      [
        institutionId,
        String(url).trim(),
        String(title || "Campus Photo").trim(),
        String(description || "").trim(),
        finalCategoryId,
        Number(sort_order || 0),
        user.id,
      ]
    );

    return NextResponse.json({
      success: true,
      data: res.rows[0],
      message: "Gallery image added successfully",
    });
  } catch (err: any) {
    console.error("POST /api/admin/institutions/gallery error:", err);
    return NextResponse.json({ error: err.message || "Failed to save gallery item" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    await ensureGallerySchema();

    const body = await req.json();
    const { id, title, description, category_id, sort_order } = body;

    const mediaId = Number(id);
    if (!mediaId || mediaId <= 0) {
      return NextResponse.json({ error: "Media ID is required" }, { status: 400 });
    }

    const res = await db.query(
      `
      UPDATE institution_media
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          category_id = $3,
          sort_order = COALESCE($4, sort_order),
          updated_by = $5,
          updated_at = NOW()
      WHERE id = $6 AND COALESCE(is_deleted, FALSE) = FALSE
      RETURNING id, title, description, category_id, sort_order
      `,
      [
        title ? String(title).trim() : null,
        description !== undefined ? String(description).trim() : null,
        category_id ? Number(category_id) : null,
        sort_order !== undefined ? Number(sort_order) : null,
        user.id,
        mediaId,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: res.rows[0],
      message: "Gallery item updated successfully",
    });
  } catch (err: any) {
    console.error("PUT /api/admin/institutions/gallery error:", err);
    return NextResponse.json({ error: err.message || "Failed to update gallery item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id || id <= 0) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await db.query(
      `UPDATE institution_media SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $1 WHERE id = $2`,
      [user.id, id]
    );

    return NextResponse.json({
      success: true,
      message: "Gallery image deleted successfully",
    });
  } catch (err: any) {
    console.error("DELETE /api/admin/institutions/gallery error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete gallery item" }, { status: 500 });
  }
}
