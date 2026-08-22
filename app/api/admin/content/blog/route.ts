import { NextResponse } from "next/server";

import { getAuthenticatedUser, requirePermission } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { hasPermission, isPlatformAdminUser, type PermissionUser } from "@/lib/auth/permissions";
import { cancelActiveJob, scheduleJob } from "@/lib/scheduled-jobs";

type BlogStatus = "draft" | "review" | "published";

type BlogPostRow = {
  id: number;
  institution_id: number | null;
  title: string;
  category: string | null;
  cover_image: string | null;
  video_url: string | null;
  summary: string | null;
  tags: string | null;
  content: Record<string, unknown> | null;
  status: BlogStatus;
  publish_at: string | null;
  published_at: string | null;
  author_id: number | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function parsePositiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeStatus(value: unknown): BlogStatus {
  if (value === "review") return "review";
  if (value === "published") return "published";
  return "draft";
}

function getFirstPermittedInstitutionId(user: PermissionUser, permission: string) {
  return user.memberships?.find((membership) =>
    hasPermission(user, permission, { institutionId: membership.institution_id })
  )?.institution_id ?? null;
}

function resolveInstitutionId(user: PermissionUser, permission: string, requestedInstitutionId?: number | null) {
  if (isPlatformAdminUser(user)) return requestedInstitutionId ?? null;

  if (requestedInstitutionId) {
    if (hasPermission(user, permission, { institutionId: requestedInstitutionId })) {
      return requestedInstitutionId;
    }
    throw new Error("Forbidden: Admin access required");
  }

  const institutionId = getFirstPermittedInstitutionId(user, permission);
  if (institutionId) return institutionId;

  throw new Error("Forbidden: Admin access required");
}

async function ensureBlogPostsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      institution_id INTEGER NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'Academic & Curriculum',
      cover_image TEXT NULL,
      video_url TEXT NULL,
      summary TEXT NULL,
      tags TEXT NULL,
      content JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
      publish_at TIMESTAMPTZ NULL,
      published_at TIMESTAMPTZ NULL,
      author_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.query(`
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Academic & Curriculum';
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS cover_image TEXT;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS video_url TEXT;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS summary TEXT;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS tags TEXT;
    `);
  } catch {}

  await db.query(`
    CREATE INDEX IF NOT EXISTS blog_posts_institution_status_idx
      ON blog_posts(institution_id, status, publish_at)
  `);
}

function serializeBlog(row: BlogPostRow) {
  return {
    id: row.id,
    institution_id: row.institution_id,
    title: row.title,
    category: row.category || "Academic & Curriculum",
    cover_image: row.cover_image || null,
    video_url: row.video_url || null,
    summary: row.summary || null,
    tags: row.tags || null,
    content: row.content,
    status: row.status,
    publish_at: row.publish_at,
    published_at: row.published_at,
    author_id: row.author_id,
    author: row.author_name ?? "Unknown",
    updated_at: row.updated_at,
    created_at: row.created_at,
  };
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureBlogPostsTable();

    const requestedInstitutionId = parsePositiveInteger(new URL(req.url).searchParams.get("institutionId"));
    const canSeePlatform = isPlatformAdminUser(user);
    const institutionIds = user.memberships?.map((membership) => membership.institution_id) ?? [];

    const values: unknown[] = [];
    const filters: string[] = [];

    if (requestedInstitutionId) {
      if (!canSeePlatform && !institutionIds.includes(requestedInstitutionId)) {
        throw new Error("Forbidden: Admin access required");
      }
      values.push(requestedInstitutionId);
      filters.push(`bp.institution_id = $${values.length}`);
    } else if (!canSeePlatform) {
      if (institutionIds.length === 0) return NextResponse.json({ data: [] });
      values.push(institutionIds);
      filters.push(`bp.institution_id = ANY($${values.length}::int[])`);
    }

    const result = await db.query<BlogPostRow>(
      `
        SELECT
          bp.id,
          bp.institution_id,
          bp.title,
          bp.category,
          bp.cover_image,
          bp.video_url,
          bp.summary,
          bp.tags,
          bp.content,
          bp.status,
          bp.publish_at,
          bp.published_at,
          bp.author_id,
          users.full_name AS author_name,
          bp.created_at,
          bp.updated_at
        FROM blog_posts bp
        LEFT JOIN users ON users.id = bp.author_id
        ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
        ORDER BY bp.updated_at DESC, bp.id DESC
      `,
      values,
    );

    return NextResponse.json({ data: result.rows.map(serializeBlog) });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Forbidden: Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const requestedInstitutionId = parsePositiveInteger(body.institution_id ?? body.institutionId);
    const currentUser = await requirePermission(req, "content.blog.create", requestedInstitutionId);
    const institutionId = resolveInstitutionId(currentUser, "content.blog.create", requestedInstitutionId);

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

    const category = typeof body.category === "string" ? body.category.trim() : "Academic & Curriculum";
    const coverImage = typeof body.cover_image === "string" ? body.cover_image.trim() : null;
    const videoUrl = typeof body.video_url === "string" ? body.video_url.trim() : null;
    const summary = typeof body.summary === "string" ? body.summary.trim() : null;
    const tags = typeof body.tags === "string" ? body.tags.trim() : null;

    const content =
      body.content && typeof body.content === "object"
        ? (body.content as Record<string, unknown>)
        : {};
    const publishAt = typeof body.publish_at === "string" && body.publish_at ? new Date(body.publish_at) : null;
    const publishAtValue = publishAt && !Number.isNaN(publishAt.getTime()) ? publishAt.toISOString() : null;
    const status = publishAtValue && new Date(publishAtValue).getTime() <= Date.now()
      ? "published"
      : normalizeStatus(body.status);

    await ensureBlogPostsTable();
    const result = await db.query<BlogPostRow>(
      `
        INSERT INTO blog_posts (
          institution_id,
          title,
          category,
          cover_image,
          video_url,
          summary,
          tags,
          content,
          status,
          publish_at,
          published_at,
          author_id,
          created_by,
          updated_by,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, CASE WHEN $9 = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END, $11, $11, $11, CURRENT_TIMESTAMP)
        RETURNING
          id,
          institution_id,
          title,
          category,
          cover_image,
          video_url,
          summary,
          tags,
          content,
          status,
          publish_at,
          published_at,
          author_id,
          (SELECT full_name FROM users WHERE id = $11) AS author_name,
          created_at,
          updated_at
      `,
      [
        institutionId,
        title,
        category,
        coverImage,
        videoUrl,
        summary,
        tags,
        JSON.stringify(content),
        status,
        publishAtValue,
        currentUser.id,
      ],
    );

    const post = result.rows[0];
    const jobKey = `blog:${post.id}:publish`;
    if (publishAtValue && status !== "published") {
      await scheduleJob({
        jobKey,
        title: `Publish blog: ${title}`,
        taskType: "blog_publish",
        resourceType: "blog_post",
        resourceId: post.id,
        scopeType: institutionId ? "institution" : "platform",
        institutionId,
        runAt: publishAtValue,
        payload: { blogPostId: post.id },
        createdBy: currentUser.id,
      });
    } else {
      await cancelActiveJob(jobKey);
    }

    return NextResponse.json({ data: serializeBlog(post) }, { status: 201 });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
