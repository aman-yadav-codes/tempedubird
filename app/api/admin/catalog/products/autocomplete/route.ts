import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || searchParams.get("search") || "").trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, suggestions: [] });
    }

    const likeQ = `%${q}%`;
    const res = await db.query(
      `
      SELECT 
        id, 
        name, 
        slug, 
        default_image_url, 
        unit_of_measurement, 
        category_id, 
        subcategory_id, 
        main_category_id,
        suggested_price_inr, 
        description,
        synonyms
      FROM master_products
      WHERE is_active = TRUE
        AND (
          name ILIKE $1 
          OR slug ILIKE $1 
          OR array_to_string(synonyms, ' ') ILIKE $1
        )
      ORDER BY 
        CASE 
          WHEN LOWER(name) = LOWER($2) THEN 0
          WHEN LOWER(name) LIKE LOWER($3) THEN 1
          ELSE 2
        END,
        id DESC
      LIMIT 12
      `,
      [likeQ, q, `${q}%`]
    );

    return NextResponse.json({
      success: true,
      suggestions: res.rows,
    });
  } catch (error: any) {
    console.error("Product autocomplete error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
