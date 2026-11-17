import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [bizRes, profRes] = await Promise.all([
      db.query(`
        SELECT 
          bp.id, 
          bp.name, 
          bp.slug, 
          bp.business_type, 
          bp.city,
          bp.category_id,
          c.name AS category_name
        FROM business_profiles bp
        LEFT JOIN categories c ON c.id = bp.category_id
        WHERE COALESCE(bp.is_active, TRUE) = TRUE
        ORDER BY bp.name ASC
      `),
      db.query(`
        SELECT 
          pp.id, 
          pp.name, 
          pp.slug, 
          pp.profession_type, 
          pp.designation, 
          pp.city,
          pp.business_profile_id,
          bp.name AS business_name,
          c.name AS category_name
        FROM professional_profiles pp
        LEFT JOIN business_profiles bp ON bp.id = pp.business_profile_id
        LEFT JOIN categories c ON c.id = pp.category_id
        WHERE COALESCE(pp.is_active, TRUE) = TRUE
        ORDER BY pp.name ASC
      `)
    ]);

    return NextResponse.json({
      success: true,
      businesses: bizRes.rows,
      professionals: profRes.rows
    });
  } catch (err: any) {
    console.error("Error fetching catalog assignees:", err);
    return NextResponse.json(
      { error: "Failed to fetch assignees", details: err.message },
      { status: 500 }
    );
  }
}
