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
      SELECT ib.*, ip.name AS institution_name, ip.slug AS institution_slug
      FROM institution_blogs ib
      LEFT JOIN institution_profiles ip ON ip.id = ib.institution_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (institutionId && !isNaN(Number(institutionId))) {
      params.push(Number(institutionId));
      query += ` AND (ib.institution_id = $${params.length} OR ib.institution_id IS NULL)`;
    }

    query += ` ORDER BY ib.id DESC`;

    const res = await db.query(query, params);
    return NextResponse.json({ blogs: res.rows });
  } catch (error: any) {
    console.error("[Blogs GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load blogs" }, { status: 500 });
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
      slug,
      cover_image_url,
      excerpt,
      content,
      author_name,
      tags = [],
      is_published = true,
    } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and Content are required" }, { status: 400 });
    }

    const cleanSlug = (slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const res = await db.query(
      `
      INSERT INTO institution_blogs (
        institution_id, title, slug, cover_image_url, excerpt, content, author_name, tags, is_published, published_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
      `,
      [
        institution_id || null,
        title.trim(),
        cleanSlug,
        cover_image_url?.trim() || null,
        excerpt?.trim() || null,
        content,
        author_name?.trim() || user.full_name || "Academic Editor",
        tags || [],
        is_published,
      ]
    );

    return NextResponse.json({ blog: res.rows[0], message: "Blog published successfully" });
  } catch (error: any) {
    console.error("[Blogs POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create blog" }, { status: 500 });
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
      slug,
      cover_image_url,
      excerpt,
      content,
      author_name,
      tags,
      is_published,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Blog ID is required" }, { status: 400 });
    }

    const res = await db.query(
      `
      UPDATE institution_blogs
      SET title = COALESCE($1, title),
          slug = COALESCE($2, slug),
          cover_image_url = COALESCE($3, cover_image_url),
          excerpt = COALESCE($4, excerpt),
          content = COALESCE($5, content),
          author_name = COALESCE($6, author_name),
          tags = COALESCE($7, tags),
          is_published = COALESCE($8, is_published),
          updated_at = NOW()
      WHERE id = $9
      RETURNING *
      `,
      [
        title,
        slug,
        cover_image_url,
        excerpt,
        content,
        author_name,
        tags,
        is_published,
        id,
      ]
    );

    return NextResponse.json({ blog: res.rows[0], message: "Blog updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update blog" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Blog ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM institution_blogs WHERE id = $1`, [id]);
    return NextResponse.json({ message: "Blog post deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete blog" }, { status: 500 });
  }
}
