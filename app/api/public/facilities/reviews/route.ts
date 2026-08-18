import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

async function ensureFacilityReviewsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS facility_reviews (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER NOT NULL REFERENCES institution_facilities(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewer_name VARCHAR(255) NOT NULL,
      reviewer_role VARCHAR(100) DEFAULT 'Student',
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET(req: NextRequest) {
  try {
    await ensureFacilityReviewsTable();
    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get("facilityId");

    if (!facilityId) {
      return NextResponse.json({ error: "facilityId is required" }, { status: 400 });
    }

    const reviewsRes = await db.query(
      `
      SELECT
        id,
        facility_id,
        reviewer_name,
        reviewer_role,
        rating,
        comment,
        created_at
      FROM facility_reviews
      WHERE facility_id = $1
      ORDER BY created_at DESC
      `,
      [Number(facilityId)]
    );

    const statsRes = await db.query(
      `
      SELECT
        COALESCE(ROUND(AVG(rating), 1), 0) AS avg_rating,
        COUNT(*)::int AS total_reviews
      FROM facility_reviews
      WHERE facility_id = $1
      `,
      [Number(facilityId)]
    );

    return NextResponse.json({
      success: true,
      reviews: reviewsRes.rows,
      stats: statsRes.rows[0] || { avg_rating: 0, total_reviews: 0 },
    });
  } catch (err: any) {
    console.error("GET /api/public/facilities/reviews error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch facility reviews" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureFacilityReviewsTable();
    const body = await req.json();
    const { facility_id, reviewer_name, reviewer_role, rating, comment } = body;

    if (!facility_id || !rating || !reviewer_name?.trim()) {
      return NextResponse.json(
        { error: "Facility ID, Reviewer Name, and Rating (1-5) are required." },
        { status: 400 }
      );
    }

    const numRating = Math.min(5, Math.max(1, Number(rating)));

    const result = await db.query(
      `
      INSERT INTO facility_reviews (facility_id, reviewer_name, reviewer_role, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        Number(facility_id),
        reviewer_name.trim(),
        reviewer_role || "Student",
        numRating,
        comment?.trim() || "",
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Thank you! Your feedback and rating have been submitted successfully.",
      review: result.rows[0],
    });
  } catch (err: any) {
    console.error("POST /api/public/facilities/reviews error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit facility review" }, { status: 500 });
  }
}
