import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

async function ensureEntityReviewsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS entity_reviews (
      id SERIAL PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INTEGER NOT NULL,
      institution_id INTEGER,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewer_name VARCHAR(255) NOT NULL,
      reviewer_role VARCHAR(100) DEFAULT 'Student',
      is_verified_user BOOLEAN DEFAULT TRUE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title VARCHAR(255),
      comment TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS is_verified_user BOOLEAN DEFAULT TRUE;
  `);
}

export async function GET(req: NextRequest) {
  try {
    await ensureEntityReviewsTable();
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
    }

    const reviewsRes = await db.query(
      `
      SELECT
        id,
        entity_type,
        entity_id,
        reviewer_name,
        reviewer_role,
        is_verified_user,
        rating,
        title,
        comment,
        created_at
      FROM entity_reviews
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY created_at DESC
      `,
      [entityType, Number(entityId)]
    );

    const verifiedReviews = reviewsRes.rows.filter((r) => r.is_verified_user);
    const communityReviews = reviewsRes.rows.filter((r) => !r.is_verified_user);

    const calcAvg = (items: any[]) =>
      items.length > 0
        ? Number((items.reduce((acc, curr) => acc + curr.rating, 0) / items.length).toFixed(1))
        : 0;

    const stats = {
      overall_avg: calcAvg(reviewsRes.rows),
      total_reviews: reviewsRes.rows.length,
      verified_avg: calcAvg(verifiedReviews),
      verified_count: verifiedReviews.length,
      community_avg: calcAvg(communityReviews),
      community_count: communityReviews.length,
    };

    return NextResponse.json({
      success: true,
      stats,
      verifiedReviews,
      communityReviews,
      allReviews: reviewsRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/public/reviews error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch entity reviews" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureEntityReviewsTable();

    // 1. Mandatory User Login Check
    let currentUser = null;
    try {
      currentUser = await getAuthenticatedUser(req);
    } catch {
      return NextResponse.json(
        { error: "You must be signed in to submit a rating or comment." },
        { status: 401 }
      );
    }

    if (!currentUser || !currentUser.id) {
      return NextResponse.json(
        { error: "You must be signed in to submit a rating or comment." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { entity_type, entity_id, rating, title, comment, reviewer_role } = body;

    if (!entity_type || !entity_id || !rating) {
      return NextResponse.json(
        { error: "entity_type, entity_id, and rating (1-5) are required." },
        { status: 400 }
      );
    }

    if (!comment || !comment.trim()) {
      return NextResponse.json(
        { error: "Please write a comment or feedback before submitting." },
        { status: 400 }
      );
    }

    const numRating = Math.min(5, Math.max(1, Number(rating)));
    const reviewerName = currentUser.full_name || currentUser.email || "Verified Member";
    const effectiveRole = reviewer_role || (currentUser.role_name || "Verified Student");

    const result = await db.query(
      `
      INSERT INTO entity_reviews (
        entity_type,
        entity_id,
        user_id,
        reviewer_name,
        reviewer_role,
        is_verified_user,
        rating,
        title,
        comment
      )
      VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8)
      RETURNING *
      `,
      [
        entity_type,
        Number(entity_id),
        currentUser.id,
        reviewerName,
        effectiveRole,
        numRating,
        title?.trim() || "",
        comment.trim(),
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Thank you! Your verified rating and feedback have been published.",
      review: result.rows[0],
    });
  } catch (err: any) {
    console.error("POST /api/public/reviews error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit review" }, { status: 500 });
  }
}
