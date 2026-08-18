import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  try {
    const librariesRes = await db.query(`
      SELECT
        l.id,
        l.institution_id,
        l.name,
        l.total_books,
        l.digital_titles,
        l.journals_subscribed,
        l.seating_capacity,
        l.reading_hall_available,
        l.e_resources_access,
        l.opening_hours,
        l.borrowing_rules,
        l.librarian_name,
        l.librarian_email,
        l.librarian_phone,
        l.description,
        l.created_at,
        p.name AS institution_name,
        p.city AS institution_city,
        p.logo_url AS institution_logo
      FROM institution_libraries l
      LEFT JOIN user_profiles p ON p.id = l.institution_id
      ORDER BY l.id DESC
    `);

    return NextResponse.json({
      success: true,
      libraries: librariesRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/public/libraries error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch libraries" }, { status: 500 });
  }
}
