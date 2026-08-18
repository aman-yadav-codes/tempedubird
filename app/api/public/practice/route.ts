import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  try {
    const testsRes = await db.query(`
      SELECT
        t.id,
        t.institution_id,
        t.title,
        t.category,
        t.subject,
        t.questions_count,
        t.time_limit_mins,
        t.difficulty,
        t.attempts_count,
        t.created_by_name,
        t.description,
        t.created_at,
        p.name AS institution_name,
        p.city AS institution_city
      FROM practice_tests t
      LEFT JOIN user_profiles p ON p.id = t.institution_id
      ORDER BY t.id DESC
    `);

    return NextResponse.json({
      success: true,
      practiceTests: testsRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/public/practice error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch practice tests" }, { status: 500 });
  }
}
