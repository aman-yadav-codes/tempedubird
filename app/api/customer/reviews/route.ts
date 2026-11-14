import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId") ? Number(searchParams.get("businessId")) : null;
    const professionalId = searchParams.get("professionalId") ? Number(searchParams.get("professionalId")) : null;

    if (!businessId && !professionalId) {
      return NextResponse.json({ error: "businessId or professionalId is required" }, { status: 400 });
    }

    const res = await db.query(
      `SELECT
         r.id,
         r.author_user_id,
         r.rating,
         r.title,
         r.comment,
         r.images,
         r.is_featured,
         r.created_at,
         u.full_name AS author_name,
         u.avatar_url AS author_avatar
       FROM platform_reviews r
       LEFT JOIN users u ON u.id = r.author_user_id
       WHERE ($1::int IS NULL OR r.business_id = $1)
         AND ($2::int IS NULL OR r.professional_id = $2)
         AND r.moderation_status = 'approved'
       ORDER BY r.is_featured DESC, r.created_at DESC`,
      [businessId, professionalId]
    );

    return NextResponse.json({ success: true, data: res.rows });
  } catch (err: unknown) {
    console.error("[reviews GET] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load reviews" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const businessId = body.businessId ? Number(body.businessId) : null;
    const professionalId = body.professionalId ? Number(body.professionalId) : null;
    const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
    const title = body.title?.trim() || null;
    const comment = body.comment?.trim() || "";
    const images = Array.isArray(body.images) ? body.images : [];

    if (!businessId && !professionalId) {
      return NextResponse.json({ error: "businessId or professionalId is required" }, { status: 400 });
    }

    if (!comment) {
      return NextResponse.json({ error: "Review comment is required" }, { status: 400 });
    }

    const res = await db.query(
      `INSERT INTO platform_reviews (
         author_user_id, business_id, professional_id, rating, title, comment, images, moderation_status, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', NOW())
       RETURNING *`,
      [user?.id || null, businessId, professionalId, rating, title, comment, images]
    );

    return NextResponse.json({
      success: true,
      data: res.rows[0],
      message: "Thank you! Your review and rating have been posted.",
    });
  } catch (err: unknown) {
    console.error("[reviews POST] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit review" },
      { status: 500 }
    );
  }
}

