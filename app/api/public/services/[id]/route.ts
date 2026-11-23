import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rawId = decodeURIComponent(id || "").trim().toLowerCase();
    let withoutLocation = rawId;
    const lastInIndex = rawId.lastIndexOf("-in-");
    if (lastInIndex !== -1) {
      withoutLocation = rawId.substring(0, lastInIndex);
    }
    const numId = Number(rawId) || Number(withoutLocation) || -1;

    // 1. Check services table first
    const sRes = await db.query(
      `SELECT
        s.id,
        s.title AS name,
        s.slug,
        s.description,
        s.image_url AS default_image_url,
        '{}'::text[] AS additional_images,
        COALESCE(s.pricing_model, 'fixed_price') AS pricing_model,
        COALESCE(s.duration_minutes, 60) AS duration_minutes,
        COALESCE(s.duration_unit, 'minutes') AS duration_unit,
        COALESCE(s.attributes, '{}'::jsonb) AS attributes,
        '{"IN", "US"}'::text[] AS countries,
        COALESCE(s.price, 0) AS price,
        COALESCE(s.price, 0) AS suggested_price_inr,
        COALESCE(s.price, 0) AS regular_price,
        s.business_profile_id,
        bp.name AS business_name,
        bp.slug AS business_slug,
        bp.logo_url AS business_logo_url,
        bp.address AS business_address,
        bp.city AS business_city,
        bp.state AS business_state,
        bp.phone AS business_phone,
        bp.institution_profile_id,
        s.professional_profile_id,
        pp.name AS professional_name,
        pp.slug AS professional_slug,
        COALESCE(c.name, s.category, 'General') AS category_name,
        COALESCE(c.slug, 'general') AS category_slug
      FROM services s
      LEFT JOIN categories c ON c.id = s.category_id
      LEFT JOIN business_profiles bp ON bp.id = s.business_profile_id
      LEFT JOIN professional_profiles pp ON pp.id = s.professional_profile_id
      WHERE (s.id = $1 AND $1 > 0)
         OR s.slug = $2
         OR s.slug = $3
         OR s.slug ILIKE $2
         OR s.slug ILIKE $3
         OR $2 ILIKE '%' || s.slug || '%'
         OR s.slug ILIKE '%' || $3 || '%'
         OR (s.master_service_id = $1 AND $1 > 0)
      LIMIT 1`,
      [isNaN(numId) ? -1 : numId, rawId, withoutLocation]
    );

    if (sRes.rows.length > 0) {
      return NextResponse.json({ success: true, service: sRes.rows[0] });
    }

    // 2. Fallback to master_services table
    const srvRes = await db.query(
      `SELECT
        ms.id,
        ms.name,
        ms.slug,
        ms.description,
        ms.default_image_url,
        COALESCE(ms.additional_images, '{}') AS additional_images,
        ms.pricing_model,
        ms.duration_minutes,
        ms.duration_unit,
        COALESCE(ms.attributes, '{}'::jsonb) AS attributes,
        COALESCE(ms.countries, '{"IN", "US"}') AS countries,
        COALESCE(ms.suggested_price, ms.suggested_price_inr, 0) AS price,
        COALESCE(ms.suggested_price_inr, 0) AS suggested_price_inr,
        COALESCE(ms.suggested_max_price, 0) AS regular_price,
        ms.business_profile_id,
        bp.name AS business_name,
        bp.slug AS business_slug,
        bp.logo_url AS business_logo_url,
        bp.address AS business_address,
        bp.city AS business_city,
        bp.state AS business_state,
        bp.phone AS business_phone,
        bp.institution_profile_id,
        ms.professional_profile_id,
        pp.name AS professional_name,
        pp.slug AS professional_slug,
        c.name AS category_name,
        c.slug AS category_slug
      FROM master_services ms
      LEFT JOIN categories c ON c.id = COALESCE(ms.main_category_id, ms.category_id)
      LEFT JOIN business_profiles bp ON bp.id = ms.business_profile_id
      LEFT JOIN professional_profiles pp ON pp.id = ms.professional_profile_id
      WHERE ms.id = $1 OR ms.slug = $2
      LIMIT 1`,
      [isNaN(numId) ? -1 : numId, rawId, withoutLocation]
    );

    if (srvRes.rows.length > 0) {
      return NextResponse.json({ success: true, service: srvRes.rows[0] });
    }

    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
