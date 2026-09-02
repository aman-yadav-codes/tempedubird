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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parsePositiveInteger(id);
    if (!postId) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    const user = await getAuthenticatedUser(req);
    await ensureBlogPostsTable();

    const result = await db.query(
      `
        SELECT 
          bp.*,
          ip.name AS institution_name,
          ip.slug AS institution_slug
        FROM blog_posts bp
        LEFT JOIN institution_profiles ip ON ip.id = bp.institution_id
        WHERE bp.id = $1
      `,
      [postId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const post = result.rows[0];

    // Permission check
    if (!isPlatformAdminUser(user) && post.institution_id) {
      const permitted = user.memberships?.some((m) => m.institution_id === post.institution_id);
      if (!permitted) {
        return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json({ data: post });
  } catch (error) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parsePositiveInteger(id);
    if (!postId) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    const body = await req.json();
    const requestedInstitutionId = parsePositiveInteger(body.institution_id ?? body.institutionId);
    const currentUser = await requirePermission(req, "content.blog.update", requestedInstitutionId);

    await ensureBlogPostsTable();

    // Verify existing post
    const existing = await db.query(`SELECT * FROM blog_posts WHERE id = $1`, [postId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const currentPost = existing.rows[0];
    if (!isPlatformAdminUser(currentUser) && currentPost.institution_id) {
      const hasAccess = currentUser.memberships?.some((m) => m.institution_id === currentPost.institution_id);
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
      }
    }

    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : currentPost.title;
    const slug = typeof body.slug === "string" && body.slug.trim() ? body.slug.trim() : currentPost.slug;
    const category = typeof body.category === "string" ? body.category.trim() : currentPost.category;
    const subCategory = typeof body.sub_category === "string"
      ? body.sub_category.trim()
      : typeof body.subCategory === "string"
      ? body.subCategory.trim()
      : currentPost.sub_category;
    const coverImage = typeof body.cover_image === "string" ? body.cover_image.trim() : currentPost.cover_image;
    const videoUrl = typeof body.video_url === "string" ? body.video_url.trim() : currentPost.video_url;
    const summary = typeof body.summary === "string" ? body.summary.trim() : currentPost.summary;
    const tags = typeof body.tags === "string" ? body.tags.trim() : currentPost.tags;
    const contentHtml = typeof body.content_html === "string" ? body.content_html : currentPost.content_html;
    const content = body.content && typeof body.content === "object" ? body.content : currentPost.content;
    const authorName = typeof body.author_name === "string" ? body.author_name.trim() : currentPost.author_name;
    const authorRole = typeof body.author_role === "string" ? body.author_role.trim() : currentPost.author_role;
    const authorAvatar = typeof body.author_avatar === "string" ? body.author_avatar.trim() : currentPost.author_avatar;
    const isFeatured = body.is_featured !== undefined ? Boolean(body.is_featured) : currentPost.is_featured;
    const readTimeMins = Number(body.read_time_mins) > 0 ? Number(body.read_time_mins) : currentPost.read_time_mins;

    const metaTitle = typeof body.meta_title === "string" ? body.meta_title.trim() : currentPost.meta_title;
    const metaDescription = typeof body.meta_description === "string" ? body.meta_description.trim() : currentPost.meta_description;
    const metaKeywords = typeof body.meta_keywords === "string" ? body.meta_keywords.trim() : currentPost.meta_keywords;
    const canonicalUrl = typeof body.canonical_url === "string" ? body.canonical_url.trim() : currentPost.canonical_url;

    const institutionId = isPlatformAdminUser(currentUser)
      ? (body.institution_id !== undefined ? (parsePositiveInteger(body.institution_id) || null) : currentPost.institution_id)
      : currentPost.institution_id;

    const publishAt = typeof body.publish_at === "string" && body.publish_at ? new Date(body.publish_at) : null;
    const publishAtValue = publishAt && !Number.isNaN(publishAt.getTime()) ? publishAt.toISOString() : null;
    const status = publishAtValue && new Date(publishAtValue).getTime() <= Date.now()
      ? "published"
      : (body.status ? normalizeStatus(body.status) : currentPost.status);

    const result = await db.query(
      `
        UPDATE blog_posts
        SET
          title = $1,
          slug = $2,
          category = $3,
          sub_category = $4,
          cover_image = $5,
          video_url = $6,
          summary = $7,
          tags = $8,
          content = $9::jsonb,
          content_html = $10,
          status = $11,
          is_featured = $12,
          read_time_mins = $13,
          author_name = $14,
          author_role = $15,
          author_avatar = $16,
          meta_title = $17,
          meta_description = $18,
          meta_keywords = $19,
          canonical_url = $20,
          institution_id = $21,
          publish_at = $22,
          published_at = CASE 
            WHEN $11 = 'published' AND published_at IS NULL THEN CURRENT_TIMESTAMP
            ELSE published_at
          END,
          updated_by = $23,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $24
        RETURNING *
      `,
      [
        title,
        slug,
        category,
        subCategory,
        coverImage,
        videoUrl,
        summary,
        tags,
        JSON.stringify(content),
        contentHtml,
        status,
        isFeatured,
        readTimeMins,
        authorName,
        authorRole,
        authorAvatar,
        metaTitle,
        metaDescription,
        metaKeywords,
        canonicalUrl,
        institutionId,
        publishAtValue,
        currentUser.id,
        postId,
      ]
    );

    const updatedPost = result.rows[0];
    const jobKey = `blog:${updatedPost.id}:publish`;
    if (publishAtValue && status !== "published") {
      await scheduleJob({
        jobKey,
        title: `Publish blog: ${title}`,
        taskType: "blog_publish",
        resourceType: "blog_post",
        resourceId: updatedPost.id,
        scopeType: institutionId ? "institution" : "platform",
        institutionId,
        runAt: publishAtValue,
        payload: { blogPostId: updatedPost.id },
        createdBy: currentUser.id,
      });
    } else {
      await cancelActiveJob(jobKey);
    }

    return NextResponse.json({ data: updatedPost });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Forbidden: Access denied" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parsePositiveInteger(id);
    if (!postId) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    const currentUser = await requirePermission(req, "content.blog.delete");
    await ensureBlogPostsTable();

    const existing = await db.query(`SELECT * FROM blog_posts WHERE id = $1`, [postId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const currentPost = existing.rows[0];
    if (!isPlatformAdminUser(currentUser) && currentPost.institution_id) {
      const hasAccess = currentUser.memberships?.some((m) => m.institution_id === currentPost.institution_id);
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
      }
    }

    await cancelActiveJob(`blog:${postId}:publish`);
    await db.query(`DELETE FROM blog_posts WHERE id = $1`, [postId]);

    return NextResponse.json({ success: true, message: "Article deleted successfully" });
  } catch (error) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
