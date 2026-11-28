import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // country | state | city | area | all
    const parentId = searchParams.get("parentId") || searchParams.get("parent_id");
    const search = searchParams.get("search")?.trim() || "";

    const conditions: string[] = [
      "is_deleted = FALSE",
      "COALESCE(is_seo_active, TRUE) = TRUE",
      "COALESCE(is_active, TRUE) = TRUE",
    ];
    const params: any[] = [];

    if (type && type !== "all") {
      params.push(type.toLowerCase());
      conditions.push(`type = $${params.length}`);
    }

    if (parentId && /^\d+$/.test(parentId)) {
      params.push(Number(parentId));
      conditions.push(`parent_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const sIdx = params.length;
      conditions.push(`(name ILIKE $${sIdx} OR slug ILIKE $${sIdx})`);
    }

    const query = `
      SELECT 
        id, 
        name, 
        slug, 
        type, 
        parent_id,
        latitude,
        longitude
      FROM locations
      WHERE ${conditions.join(" AND ")}
      ORDER BY 
        CASE 
          WHEN type = 'country' THEN 1
          WHEN type = 'state' THEN 2
          WHEN type = 'city' THEN 3
          ELSE 4
        END,
        name ASC
    `;

    let res;
    try {
      res = await db.query(query, params);
    } catch (dbErr: any) {
      if (dbErr?.message && dbErr.message.includes("is_seo_active")) {
        // Auto-migrate column on production/staging DB
        await db.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_seo_active BOOLEAN DEFAULT TRUE`).catch(() => {});
        // Fallback query without is_seo_active
        const fallbackConditions = conditions.filter((c) => !c.includes("is_seo_active"));
        const fallbackQuery = `
          SELECT 
            id, 
            name, 
            slug, 
            type, 
            parent_id,
            latitude,
            longitude
          FROM locations
          WHERE ${fallbackConditions.join(" AND ")}
          ORDER BY 
            CASE 
              WHEN type = 'country' THEN 1
              WHEN type = 'state' THEN 2
              WHEN type = 'city' THEN 3
              ELSE 4
            END,
            name ASC
        `;
        res = await db.query(fallbackQuery, params);
      } else {
        throw dbErr;
      }
    }

    return NextResponse.json({
      success: true,
      data: res.rows,
      total: res.rows.length,
    });
  } catch (err: any) {
    console.error("[public locations GET] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
