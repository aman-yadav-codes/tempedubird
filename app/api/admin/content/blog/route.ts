import { NextResponse } from "next/server";
import { getAuthenticatedUser, requirePermission } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { hasPermission, isPlatformAdminUser, type PermissionUser } from "@/lib/auth/permissions";
import { cancelActiveJob, scheduleJob } from "@/lib/scheduled-jobs";
import { ensureBlogPostsTable } from "@/lib/db/ensure-blog-schema";

type BlogStatus = "draft" | "review" | "published";

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

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-" +
    Math.random().toString(36).substring(2, 7)
  );
}

function getFirstPermittedInstitutionId(user: PermissionUser, permission: string) {
  return (
    user.memberships?.find((membership) =>
      hasPermission(user, permission, { institutionId: membership.institution_id })
    )?.institution_id ?? null
  );
}

function resolveInstitutionId(
  user: PermissionUser,
  permission: string,
  requestedInstitutionId?: number | null
) {
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

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureBlogPostsTable();

    const url = new URL(req.url);
    const requestedInstitutionId = parsePositiveInteger(url.searchParams.get("institutionId"));
    const search = url.searchParams.get("search")?.trim();
    const category = url.searchParams.get("category")?.trim();
    const status = url.searchParams.get("status")?.trim();

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

    if (search) {
      values.push(`%${search}%`);
      filters.push(`(bp.title ILIKE $${values.length} OR bp.summary ILIKE $${values.length} OR bp.tags ILIKE $${values.length})`);
    }

    if (category && category !== "all") {
      values.push(category);
      filters.push(`bp.category = $${values.length}`);
    }

    if (status && status !== "all") {
      values.push(status);
      filters.push(`bp.status = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const result = await db.query(
      `
        SELECT
          bp.*,
          users.full_name AS created_by_name,
          ip.name AS institution_name,
          ip.slug AS institution_slug
        FROM blog_posts bp
        LEFT JOIN users ON users.id = bp.author_id
        LEFT JOIN institution_profiles ip ON ip.id = bp.institution_id
        ${whereClause}
        ORDER BY bp.updated_at DESC, bp.id DESC
      `,
      values
    );

    return NextResponse.json({ data: result.rows });
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

    const slug = typeof body.slug === "string" && body.slug.trim()
      ? body.slug.trim().toLowerCase().replace(/[^\w-]/g, "")
      : generateSlug(title);

    const category = typeof body.category === "string" ? body.category.trim() : "Academic & Curriculum";
    const coverImage = typeof body.cover_image === "string" ? body.cover_image.trim() : null;
    const videoUrl = typeof body.video_url === "string" ? body.video_url.trim() : null;
    const summary = typeof body.summary === "string" ? body.summary.trim() : null;
    const tags = typeof body.tags === "string" ? body.tags.trim() : null;
    const contentHtml = typeof body.content_html === "string" ? body.content_html : null;
    const content = body.content && typeof body.content === "object" ? body.content : {};
    const authorName = typeof body.author_name === "string" && body.author_name.trim() ? body.author_name.trim() : (currentUser.full_name || "Platform Editor");
    const authorRole = typeof body.author_role === "string" ? body.author_role.trim() : "Academic Contributor";
    const authorAvatar = typeof body.author_avatar === "string" ? body.author_avatar.trim() : null;
    const isFeatured = Boolean(body.is_featured);
    const readTimeMins = Number(body.read_time_mins) > 0 ? Number(body.read_time_mins) : 5;

    const metaTitle = typeof body.meta_title === "string" ? body.meta_title.trim() : title;
    const metaDescription = typeof body.meta_description === "string" ? body.meta_description.trim() : summary;
    const metaKeywords = typeof body.meta_keywords === "string" ? body.meta_keywords.trim() : tags;
    const canonicalUrl = typeof body.canonical_url === "string" ? body.canonical_url.trim() : null;

    const publishAt = typeof body.publish_at === "string" && body.publish_at ? new Date(body.publish_at) : null;
    const publishAtValue = publishAt && !Number.isNaN(publishAt.getTime()) ? publishAt.toISOString() : null;
    const status = publishAtValue && new Date(publishAtValue).getTime() <= Date.now()
      ? "published"
      : normalizeStatus(body.status);

    await ensureBlogPostsTable();

    const result = await db.query(
      `
        INSERT INTO blog_posts (
          institution_id,
          title,
          slug,
          category,
          cover_image,
          video_url,
          summary,
          tags,
          content,
          content_html,
          status,
          is_featured,
          read_time_mins,
          author_id,
          author_name,
          author_role,
          author_avatar,
          meta_title,
          meta_description,
          meta_keywords,
          canonical_url,
          publish_at,
          published_at,
          created_by,
          updated_by,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
          CASE WHEN $11 = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END,
          $14, $14, CURRENT_TIMESTAMP
        )
        RETURNING *
      `,
      [
        institutionId,
        title,
        slug,
        category,
        coverImage,
        videoUrl,
        summary,
        tags,
        JSON.stringify(content),
        contentHtml,
        status,
        isFeatured,
        readTimeMins,
        currentUser.id,
        authorName,
        authorRole,
        authorAvatar,
        metaTitle,
        metaDescription,
        metaKeywords,
        canonicalUrl,
        publishAtValue,
      ]
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

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
