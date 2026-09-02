import { NextResponse } from "next/server";
import { getAuthenticatedUser, requirePermission } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureBlogPostsTable } from "@/lib/db/ensure-blog-schema";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(req: Request) {
  try {
    await getAuthenticatedUser(req);
    await ensureBlogPostsTable();

    // Fetch all categories and subcategories
    const result = await db.query<{
      id: number;
      name: string;
      slug: string;
      parent_id: number | null;
      parent_name: string | null;
      created_at: string;
    }>(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.parent_id,
        p.name AS parent_name,
        c.created_at
      FROM blog_categories c
      LEFT JOIN blog_categories p ON p.id = c.parent_id
      ORDER BY c.parent_id NULLS FIRST, c.name ASC
    `);

    const parents: {
      id: number;
      name: string;
      slug: string;
      subcategories: { id: number; name: string; slug: string }[];
    }[] = [];

    const map = new Map<number, typeof parents[0]>();

    // First pass: parents
    for (const row of result.rows) {
      if (!row.parent_id) {
        const item = {
          id: row.id,
          name: row.name,
          slug: row.slug,
          subcategories: [],
        };
        map.set(row.id, item);
        parents.push(item);
      }
    }

    // Second pass: children
    for (const row of result.rows) {
      if (row.parent_id && map.has(row.parent_id)) {
        map.get(row.parent_id)!.subcategories.push({
          id: row.id,
          name: row.name,
          slug: row.slug,
        });
      }
    }

    return NextResponse.json({
      data: parents,
      all: result.rows,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requirePermission(req, "content.blog.create");
    await ensureBlogPostsTable();

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    let parentId: number | null = null;
    if (body.parent_id) {
      const pid = Number(body.parent_id);
      if (Number.isInteger(pid) && pid > 0) parentId = pid;
    } else if (typeof body.parent_name === "string" && body.parent_name.trim()) {
      // Find parent by name
      const parentRow = await db.query<{ id: number }>(
        `SELECT id FROM blog_categories WHERE LOWER(name) = LOWER($1) AND parent_id IS NULL LIMIT 1`,
        [body.parent_name.trim()]
      );
      if (parentRow.rows.length > 0) {
        parentId = parentRow.rows[0].id;
      } else {
        // Create parent first
        const pSlug = slugify(body.parent_name.trim()) + "-" + Math.random().toString(36).substring(2, 5);
        const newParent = await db.query<{ id: number }>(
          `INSERT INTO blog_categories (name, slug, parent_id) VALUES ($1, $2, NULL) RETURNING id`,
          [body.parent_name.trim(), pSlug]
        );
        parentId = newParent.rows[0].id;
      }
    }

    const slug = slugify(name) + (parentId ? "-" + parentId : "") + "-" + Math.random().toString(36).substring(2, 5);

    // Check if category/subcategory already exists under this parent
    const existing = await db.query<{ id: number; name: string }>(
      `SELECT id, name FROM blog_categories WHERE LOWER(name) = LOWER($1) AND (parent_id = $2 OR ($2 IS NULL AND parent_id IS NULL)) LIMIT 1`,
      [name, parentId]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({
        data: existing.rows[0],
        message: "Category already exists",
      });
    }

    const inserted = await db.query(
      `
        INSERT INTO blog_categories (name, slug, parent_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [name, slug, parentId]
    );

    return NextResponse.json(
      { data: inserted.rows[0], message: "Category created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create category" },
      { status: 500 }
    );
  }
}
