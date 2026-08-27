import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const url = new URL(req.url);
    const path = url.searchParams.get("path")?.trim();

    let query = `SELECT * FROM seo_meta_tags WHERE 1=1`;
    const params: string[] = [];

    if (path) {
      params.push(path);
      query += ` AND page_path = $${params.length}`;
    }

    query += ` ORDER BY page_path ASC`;

    const res = await db.query(query, params);
    return NextResponse.json({ tags: res.rows });
  } catch (error: any) {
    console.error("[SEO GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch SEO tags" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const {
      page_path,
      meta_title,
      meta_description,
      keywords,
      og_title,
      og_description,
      og_image,
      canonical_url,
      robots_directive = "index, follow",
    } = body;

    if (!page_path || !meta_title) {
      return NextResponse.json({ error: "Page Path and Meta Title are required" }, { status: 400 });
    }

    const res = await db.query(
      `
      INSERT INTO seo_meta_tags (
        page_path, meta_title, meta_description, keywords, og_title, og_description, og_image, canonical_url, robots_directive, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (page_path)
      DO UPDATE SET
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        keywords = EXCLUDED.keywords,
        og_title = EXCLUDED.og_title,
        og_description = EXCLUDED.og_description,
        og_image = EXCLUDED.og_image,
        canonical_url = EXCLUDED.canonical_url,
        robots_directive = EXCLUDED.robots_directive,
        updated_at = NOW()
      RETURNING *
      `,
      [
        page_path.trim(),
        meta_title.trim(),
        meta_description?.trim() || null,
        keywords || [],
        og_title?.trim() || meta_title.trim(),
        og_description?.trim() || meta_description?.trim() || null,
        og_image?.trim() || null,
        canonical_url?.trim() || null,
        robots_directive || "index, follow",
      ]
    );

    return NextResponse.json({ tag: res.rows[0], message: "SEO tags saved successfully" });
  } catch (error: any) {
    console.error("[SEO POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save SEO meta tags" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "SEO tag ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM seo_meta_tags WHERE id = $1`, [id]);
    return NextResponse.json({ message: "SEO tag deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete SEO tag" }, { status: 500 });
  }
}
