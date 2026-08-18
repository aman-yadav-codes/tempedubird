import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  try {
    const examsRes = await db.query(`
      SELECT
        e.id,
        e.institution_id,
        e.exam_name,
        e.category,
        e.exam_date,
        e.eligibility,
        e.application_fee,
        e.website_url,
        e.description,
        e.created_at,
        p.name AS institution_name,
        p.city AS institution_city
      FROM entrance_exams e
      LEFT JOIN user_profiles p ON p.id = e.institution_id
      ORDER BY e.id DESC
    `);

    return NextResponse.json({
      success: true,
      exams: examsRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/public/exams error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch exams" }, { status: 500 });
  }
}
