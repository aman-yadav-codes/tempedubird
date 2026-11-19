import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

const PUBLIC_VERTICALS = new Set(["vehicles", "properties", "restaurants", "hotels", "events"]);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const vertical = url.searchParams.get("vertical")?.trim().toLowerCase();
    const slug = url.searchParams.get("slug")?.trim();
    const search = url.searchParams.get("search")?.trim();
    const city = url.searchParams.get("city")?.trim();
    const minPrice = url.searchParams.get("min_price");
    const maxPrice = url.searchParams.get("max_price");
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 12)));
    const offset = (page - 1) * limit;

    // Strict privacy rule: Student and Patient records must never be exposed publicly
    if (vertical && !PUBLIC_VERTICALS.has(vertical)) {
      return NextResponse.json({
        error: "This record vertical is private and cannot be displayed in public directories.",
      }, { status: 403 });
    }

    const conditions: string[] = [
      "br.is_deleted = FALSE",
      "br.is_active = TRUE",
      "br.status = 'published'",
      "br.vertical_code = ANY($1::text[])",
    ];
    const params: any[] = [vertical ? [vertical] : Array.from(PUBLIC_VERTICALS)];

    if (slug) {
      params.push(slug);
      conditions.push(`br.slug = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(br.title ILIKE $${params.length} OR br.description ILIKE $${params.length})`);
    }

    if (minPrice && !isNaN(Number(minPrice))) {
      params.push(Number(minPrice));
      conditions.push(`br.price >= $${params.length}`);
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      params.push(Number(maxPrice));
      conditions.push(`br.price <= $${params.length}`);
    }

    const whereSql = `WHERE ${conditions.join(" AND ")}`;

    // Total count
    const countRes = await db.query(`SELECT COUNT(*)::int as count FROM business_records br ${whereSql}`, params);
    const total = countRes.rows[0]?.count || 0;

    const detailSelect = `
      CASE br.vertical_code
        WHEN 'vehicles' THEN row_to_json(vd)
        WHEN 'properties' THEN row_to_json(pd)
        WHEN 'restaurants' THEN json_build_object(
          'id', d.id,
          'discounted_price', d.discounted_price,
          'spice_level', d.spice_level,
          'prep_time_minutes', d.prep_time_minutes,
          'variants', (SELECT json_agg(dv) FROM dish_variants dv WHERE dv.dish_id = d.id)
        )
        WHEN 'hotels' THEN row_to_json(hr)
        WHEN 'events' THEN json_build_object(
          'id', ev.id,
          'start_date', ev.start_date,
          'end_date', ev.end_date,
          'venue_name', ev.venue_name,
          'city', ev.city,
          'tickets', (SELECT json_agg(et) FROM event_tickets et WHERE et.event_id = ev.id)
        )
        ELSE NULL
      END as details
    `;

    const queryParams = [...params, limit, offset];
    const recordsRes = await db.query(`
      SELECT
        br.id,
        br.business_id,
        bp.name as business_name,
        bp.logo_url as business_logo,
        bp.phone as business_phone,
        br.vertical_code,
        br.title,
        br.slug,
        br.description,
        br.price,
        br.currency,
        br.featured_image,
        br.created_at,
        cat.name as category_name,
        (
          SELECT json_agg(brm.url ORDER BY brm.display_order ASC)
          FROM business_record_media brm
          WHERE brm.record_id = br.id
        ) as gallery,
        ${detailSelect}
      FROM business_records br
      JOIN business_profiles bp ON bp.id = br.business_id
      LEFT JOIN master_records cat ON cat.id = br.category_id
      LEFT JOIN vehicle_details vd ON vd.record_id = br.id
      LEFT JOIN property_details pd ON pd.record_id = br.id
      LEFT JOIN dishes d ON d.record_id = br.id
      LEFT JOIN hotel_rooms hr ON hr.record_id = br.id
      LEFT JOIN events ev ON ev.record_id = br.id
      ${whereSql}
      ORDER BY br.is_featured DESC, br.id DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `, queryParams);

    return NextResponse.json({
      success: true,
      data: recordsRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      }
    });
  } catch (err: any) {
    console.error("[Public Records GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch public records" }, { status: 500 });
  }
}
