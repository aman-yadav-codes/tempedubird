import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get("institutionId") ? Number(searchParams.get("institutionId")) : null;
    const search = searchParams.get("search")?.trim() || "";

    const whereConditions: string[] = ["COALESCE(l.is_active, TRUE) = TRUE"];
    const params: unknown[] = [];

    if (institutionId && Number.isInteger(institutionId) && institutionId > 0) {
      params.push(institutionId);
      whereConditions.push(`l.institution_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(l.name ILIKE $${params.length} OR l.librarian_name ILIKE $${params.length} OR ip.name ILIKE $${params.length})`);
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const librariesRes = await db.query(`
      SELECT
        l.id,
        l.institution_id,
        l.name,
        l.total_books,
        l.digital_titles,
        l.journals_subscribed,
        l.seating_capacity,
        l.membership_fee,
        l.reading_hall_available,
        l.e_resources_access,
        l.opening_hours,
        l.borrowing_rules,
        l.features,
        l.available_categories,
        l.librarian_name,
        l.librarian_email,
        l.librarian_phone,
        l.description,
        l.created_at,
        COALESCE(ip.name, ip.slug, 'Institution') AS institution_name,
        ip.slug AS institution_slug
      FROM institution_libraries l
      LEFT JOIN institution_profiles ip ON ip.id = l.institution_id
      ${whereClause}
      ORDER BY l.id DESC
    `, params);

    return NextResponse.json({
      success: true,
      libraries: librariesRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/public/libraries error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch libraries" }, { status: 500 });
  }
}
