import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    let query = `
      SELECT 
        pr.*,
        bp.name AS business_name,
        COALESCE(u.full_name, 'Customer') AS author_name
      FROM platform_reviews pr
      JOIN business_profiles bp ON bp.id = pr.business_id
      LEFT JOIN users u ON u.id = pr.author_user_id
      WHERE bp.user_id = $1
    `;
    const params: any[] = [user.id];

    if (businessId) {
      query += ` AND bp.id = $2`;
      params.push(Number(businessId));
    }
    query += ` ORDER BY pr.id DESC`;

    const res = await db.query(query, params);

    return NextResponse.json({
      success: true,
      reviews: res.rows,
    });
  } catch (err: unknown) {
    console.error("[GET /api/business/reviews] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load reviews" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reviewId, reply } = body;

    if (!reviewId || !reply?.trim()) {
      return NextResponse.json({ error: "Review ID and reply text are required" }, { status: 400 });
    }

    // Verify ownership of the business
    const check = await db.query(
      `SELECT pr.id 
       FROM platform_reviews pr
       JOIN business_profiles bp ON bp.id = pr.business_id
       WHERE pr.id = $1 AND bp.user_id = $2 LIMIT 1`,
      [Number(reviewId), user.id]
    );

    if (!check.rows[0]) {
      return NextResponse.json({ error: "Review not found or unauthorized" }, { status: 403 });
    }

    await db.query(
      `UPDATE platform_reviews
       SET reply = $1, replied_at = NOW()
       WHERE id = $2`,
      [reply.trim(), Number(reviewId)]
    );

    return NextResponse.json({ success: true, message: "Reply published successfully" });
  } catch (err: unknown) {
    console.error("[POST /api/business/reviews] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reply to review" },
      { status: 500 }
    );
  }
}

