import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

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
      is_verified_user BOOLEAN DEFAULT FALSE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title VARCHAR(255),
      comment TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
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
    const body = await req.json();
    const { entity_type, entity_id, reviewer_name, reviewer_role, rating, title, comment, is_verified } = body;

    if (!entity_type || !entity_id || !rating || !reviewer_name?.trim()) {
      return NextResponse.json(
        { error: "entity_type, entity_id, reviewer_name, and rating (1-5) are required." },
        { status: 400 }
      );
    }

    const numRating = Math.min(5, Math.max(1, Number(rating)));

    const result = await db.query(
      `
      INSERT INTO entity_reviews (
        entity_type,
        entity_id,
        reviewer_name,
        reviewer_role,
        is_verified_user,
        rating,
        title,
        comment
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        entity_type,
        Number(entity_id),
        reviewer_name.trim(),
        reviewer_role || "Student",
        Boolean(is_verified),
        numRating,
        title?.trim() || "",
        comment?.trim() || "",
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Thank you! Your feedback has been published.",
      review: result.rows[0],
    });
  } catch (err: any) {
    console.error("POST /api/public/reviews error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit review" }, { status: 500 });
  }
}
