import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);

    // 1. Check products table first
    const pRes = await db.query(
      `SELECT
        p.id,
        p.title AS name,
        p.slug,
        p.description,
        p.image_url AS default_image_url,
        COALESCE(p.gallery, '{}') AS additional_images,
        p.brand,
        p.model,
        COALESCE(p.sku, '') AS sku,
        COALESCE(p.unit, 'Piece') AS unit_of_measurement,
        COALESCE(p.unit, 'Piece') AS unit,
        COALESCE(p.attributes, '{}'::jsonb) AS attributes,
        '{"IN", "US"}'::text[] AS countries,
        COALESCE(p.price, 0) AS price,
        COALESCE(p.price, 0) AS suggested_price_inr,
        COALESCE(p.sale_price, p.price, 0) AS regular_price,
        p.business_profile_id,
        bp.name AS business_name,
        bp.slug AS business_slug,
        bp.logo_url AS business_logo_url,
        bp.address AS business_address,
        bp.city AS business_city,
        bp.state AS business_state,
        bp.phone AS business_phone,
        bp.institution_profile_id,
        p.professional_profile_id,
        pp.name AS professional_name,
        pp.slug AS professional_slug,
        COALESCE(c.name, p.category, 'General') AS category_name,
        COALESCE(c.slug, 'general') AS category_slug
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN business_profiles bp ON bp.id = p.business_profile_id
      LEFT JOIN professional_profiles pp ON pp.id = p.professional_profile_id
      WHERE p.id = $1 OR p.slug = $2
      LIMIT 1`,
      [isNaN(numId) ? -1 : numId, id]
    );

    if (pRes.rows.length > 0) {
      return NextResponse.json({ success: true, product: pRes.rows[0] });
    }

    // 2. Fallback to master_products table
    const prodRes = await db.query(
      `SELECT
        mp.id,
        mp.name,
        mp.slug,
        mp.description,
        mp.default_image_url,
        COALESCE(mp.additional_images, '{}') AS additional_images,
        mp.brand,
        mp.model,
        COALESCE(mp.sku, mp.sku_prefix, '') AS sku,
        COALESCE(mp.unit_of_measurement, 'Piece') AS unit_of_measurement,
        COALESCE(mp.unit, mp.unit_of_measurement, 'Piece') AS unit,
        COALESCE(mp.attributes, '{}'::jsonb) AS attributes,
        COALESCE(mp.countries, '{"IN", "US"}') AS countries,
        COALESCE(mp.suggested_price, mp.suggested_price_inr, 0) AS price,
        COALESCE(mp.suggested_price_inr, 0) AS suggested_price_inr,
        COALESCE(mp.suggested_max_price, 0) AS regular_price,
        mp.business_profile_id,
        bp.name AS business_name,
        bp.slug AS business_slug,
        bp.logo_url AS business_logo_url,
        bp.address AS business_address,
        bp.city AS business_city,
        bp.state AS business_state,
        bp.phone AS business_phone,
        bp.institution_profile_id,
        mp.professional_profile_id,
        pp.name AS professional_name,
        pp.slug AS professional_slug,
        c.name AS category_name,
        c.slug AS category_slug
      FROM master_products mp
      LEFT JOIN categories c ON c.id = COALESCE(mp.main_category_id, mp.category_id)
      LEFT JOIN business_profiles bp ON bp.id = mp.business_profile_id
      LEFT JOIN professional_profiles pp ON pp.id = mp.professional_profile_id
      WHERE mp.id = $1 OR mp.slug = $2
      LIMIT 1`,
      [isNaN(numId) ? -1 : numId, id]
    );

    if (prodRes.rows.length > 0) {
      return NextResponse.json({ success: true, product: prodRes.rows[0] });
    }

    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
