import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPagination, getPageCount } from "@/lib/queries/pagination";
import {
  ensurePageSeoTable,
  DEFAULT_PLATFORM_SEO_PAGES,
  type PageSeoRecord,
} from "@/lib/seo/metadata";

function getEffectiveInstitutionId(user: Awaited<ReturnType<typeof getAuthenticatedUser>>, paramId?: string | null): number | null {
  if (paramId && !Number.isNaN(Number(paramId))) {
    return Number(paramId);
  }
  const isPlatformAdmin = Boolean((user as any).is_super_admin || user.role_codes?.includes("platform_admin"));
  if (isPlatformAdmin) return null;
  return user.memberships?.[0]?.institution_id ?? null;
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensurePageSeoTable();

    const url = new URL(req.url);
    const institutionId = getEffectiveInstitutionId(user, url.searchParams.get("institution_id"));
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit") || "100"
    );
    const search = url.searchParams.get("search")?.trim() || "";
    const category = url.searchParams.get("category")?.trim() || "ALL";

    // Auto-seed default pages if table is empty
    const checkCount = await db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM page_seo_metadata`
    );

    if ((checkCount.rows[0]?.count || 0) === 0) {
      for (const page of DEFAULT_PLATFORM_SEO_PAGES) {
        await db.query(
          `
          INSERT INTO page_seo_metadata (
            institution_id, page_path, page_name, meta_title, meta_description,
            meta_keywords, canonical_url, og_title, og_description, og_image,
            twitter_card, twitter_title, twitter_description, twitter_image,
            favicon_url, robots, is_active, is_default
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          `,
          [
            page.institution_id,
            page.page_path,
            page.page_name,
            page.meta_title,
            page.meta_description,
            page.meta_keywords,
            page.canonical_url,
            page.og_title,
            page.og_description,
            page.og_image,
            page.twitter_card,
            page.twitter_title,
            page.twitter_description,
            page.twitter_image,
            page.favicon_url,
            page.robots,
            page.is_active,
            page.is_default,
          ]
        );
      }
    }

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (institutionId) {
      params.push(institutionId);
      whereClauses.push(`(institution_id = $${params.length} OR institution_id IS NULL)`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(
        `(page_name ILIKE $${params.length} OR page_path ILIKE $${params.length} OR meta_title ILIKE $${params.length} OR meta_keywords ILIKE $${params.length})`
      );
    }

    if (category === "MAIN_MENU") {
      whereClauses.push(`page_path IN ('/', '/courses', '/institutes', '/teachers', '/hostels', '/libraries', '/exams', '/notes', '/blogs')`);
    } else if (category === "LEGAL") {
      whereClauses.push(`page_path IN ('/about', '/contact', '/privacy', '/terms', '/refund-policy', '/copyright', '/faqs')`);
    } else if (category === "CUSTOM") {
      whereClauses.push(`is_default = FALSE`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [countRes, dataRes, statsRes] = await Promise.all([
      db.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM page_seo_metadata ${whereSql}`,
        params
      ),
      db.query<PageSeoRecord>(
        `
        SELECT * FROM page_seo_metadata
        ${whereSql}
        ORDER BY (CASE WHEN page_path = '/' THEN 0 ELSE 1 END), page_name ASC, id ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        [...params, limit, offset]
      ),
      db.query(
        `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_pages,
          COUNT(*) FILTER (WHERE favicon_url IS NOT NULL AND favicon_url != '')::int AS with_favicon,
          COUNT(*) FILTER (WHERE og_image IS NOT NULL AND og_image != '')::int AS with_social_card
        FROM page_seo_metadata
        ${whereSql}
        `,
        params
      ),
    ]);

    const total = countRes.rows[0]?.count || 0;
    return NextResponse.json({
      data: dataRes.rows,
      total,
      pageCount: getPageCount(total, limit),
      stats: statsRes.rows[0] || {
        total: 0,
        active_pages: 0,
        with_favicon: 0,
        with_social_card: 0,
      },
    });
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to load SEO pages" }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensurePageSeoTable();

    const body = await req.json();
    const institutionId = getEffectiveInstitutionId(user, body.institution_id);
    const {
      page_path,
      page_name,
      meta_title,
      meta_description,
      meta_keywords,
      canonical_url,
      og_title,
      og_description,
      og_image,
      twitter_card = "summary_large_image",
      twitter_title,
      twitter_description,
      twitter_image,
      favicon_url,
      robots = "index, follow",
      schema_json,
      is_active = true,
    } = body;

    if (!page_path || !meta_title) {
      return NextResponse.json({ error: "Page Path and Meta Title are required." }, { status: 400 });
    }

    const cleanPath = page_path.trim().startsWith("/") ? page_path.trim() : `/${page_path.trim()}`;
    const cleanName = page_name?.trim() || cleanPath;

    const insertRes = await db.query(
      `
      INSERT INTO page_seo_metadata (
        institution_id, page_path, page_name, meta_title, meta_description,
        meta_keywords, canonical_url, og_title, og_description, og_image,
        twitter_card, twitter_title, twitter_description, twitter_image,
        favicon_url, robots, schema_json, is_active, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, FALSE)
      RETURNING *
      `,
      [
        institutionId ?? null,
        cleanPath,
        cleanName,
        meta_title.trim(),
        meta_description?.trim() || null,
        meta_keywords?.trim() || null,
        canonical_url?.trim() || null,
        og_title?.trim() || meta_title.trim(),
        og_description?.trim() || meta_description?.trim() || null,
        og_image?.trim() || null,
        twitter_card,
        twitter_title?.trim() || og_title?.trim() || meta_title.trim(),
        twitter_description?.trim() || og_description?.trim() || meta_description?.trim() || null,
        twitter_image?.trim() || og_image?.trim() || null,
        favicon_url?.trim() || null,
        robots,
        schema_json?.trim() || null,
        Boolean(is_active),
      ]
    );

    return NextResponse.json({ data: insertRes.rows[0], message: "SEO page configuration saved successfully." }, { status: 201 });
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to save SEO configuration" }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensurePageSeoTable();

    const body = await req.json();
    const {
      id,
      page_name,
      meta_title,
      meta_description,
      meta_keywords,
      canonical_url,
      og_title,
      og_description,
      og_image,
      twitter_card,
      twitter_title,
      twitter_description,
      twitter_image,
      favicon_url,
      robots,
      schema_json,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required." }, { status: 400 });
    }

    const updateRes = await db.query(
      `
      UPDATE page_seo_metadata
      SET
        page_name = COALESCE($1, page_name),
        meta_title = COALESCE($2, meta_title),
        meta_description = COALESCE($3, meta_description),
        meta_keywords = COALESCE($4, meta_keywords),
        canonical_url = COALESCE($5, canonical_url),
        og_title = COALESCE($6, og_title),
        og_description = COALESCE($7, og_description),
        og_image = COALESCE($8, og_image),
        twitter_card = COALESCE($9, twitter_card),
        twitter_title = COALESCE($10, twitter_title),
        twitter_description = COALESCE($11, twitter_description),
        twitter_image = COALESCE($12, twitter_image),
        favicon_url = COALESCE($13, favicon_url),
        robots = COALESCE($14, robots),
        schema_json = COALESCE($15, schema_json),
        is_active = COALESCE($16, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
      RETURNING *
      `,
      [
        page_name?.trim() || null,
        meta_title?.trim() || null,
        meta_description !== undefined ? meta_description?.trim() || null : null,
        meta_keywords !== undefined ? meta_keywords?.trim() || null : null,
        canonical_url !== undefined ? canonical_url?.trim() || null : null,
        og_title !== undefined ? og_title?.trim() || null : null,
        og_description !== undefined ? og_description?.trim() || null : null,
        og_image !== undefined ? og_image?.trim() || null : null,
        twitter_card || null,
        twitter_title !== undefined ? twitter_title?.trim() || null : null,
        twitter_description !== undefined ? twitter_description?.trim() || null : null,
        twitter_image !== undefined ? twitter_image?.trim() || null : null,
        favicon_url !== undefined ? favicon_url?.trim() || null : null,
        robots || null,
        schema_json !== undefined ? schema_json?.trim() || null : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
      ]
    );

    if (updateRes.rowCount === 0) {
      return NextResponse.json({ error: "SEO record not found." }, { status: 404 });
    }

    return NextResponse.json({ data: updateRes.rows[0], message: "SEO page updated successfully." });
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to update SEO configuration" }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensurePageSeoTable();

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required." }, { status: 400 });
    }

    const deleteRes = await db.query(
      `DELETE FROM page_seo_metadata WHERE id = $1 RETURNING id, page_path`,
      [Number(id)]
    );

    if (deleteRes.rowCount === 0) {
      return NextResponse.json({ error: "SEO record not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "SEO configuration removed successfully.", data: deleteRes.rows[0] });
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to delete SEO configuration" }, { status });
  }
}
