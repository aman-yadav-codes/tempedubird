import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionIdParam = searchParams.get("institutionId");
    const slug = searchParams.get("slug");

    const instIdNum = institutionIdParam && /^\d+$/.test(institutionIdParam) ? Number(institutionIdParam) : null;

    if (!instIdNum && !slug) {
      return NextResponse.json({ error: "institutionId or slug is required" }, { status: 400 });
    }

    const query = `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.email,
        p.phone,
        p.about,
        p.mission,
        p.vision,
        p.goal,
        p.founder_name,
        p.founder_title,
        p.founder_image_url,
        p.founder_about,
        p.established_year,
        p.website,
        p.is_active,
        it.name AS type_name,
        ist.name AS subtype_name,
        l.name AS location_name,
        b.name AS board_name,
        pu.name AS parent_university_name,
        (
          SELECT media.url
          FROM institution_media media
          WHERE media.institution_id = p.id
            AND COALESCE(media.is_deleted, FALSE) = FALSE
            AND media.url IS NOT NULL AND media.url <> ''
            AND (lower(COALESCE(media.media_type, '')) = 'logo' OR lower(COALESCE(media.title, '')) LIKE '%logo%')
          ORDER BY media.sort_order ASC, media.id ASC
          LIMIT 1
        ) AS logo_url,
        (
          SELECT media.url
          FROM institution_media media
          WHERE media.institution_id = p.id
            AND COALESCE(media.is_deleted, FALSE) = FALSE
            AND media.url IS NOT NULL AND media.url <> ''
            AND lower(COALESCE(media.media_type, '')) IN ('image', 'photo', 'banner', 'cover')
          ORDER BY media.sort_order ASC, media.id ASC
          LIMIT 1
        ) AS banner_url,
        (
          SELECT json_agg(
            json_build_object(
              'id', ib.id,
              'branch_name', ib.branch_name,
              'address', ib.address,
              'city', ib.city,
              'state', ib.state,
              'pincode', ib.pincode,
              'phones', ib.phones,
              'emails', ib.emails,
              'working_hours', ib.working_hours
            )
          )
          FROM institution_branches ib
          WHERE ib.institution_id = p.id AND COALESCE(ib.is_active, TRUE) = TRUE
        ) AS branches
      FROM institution_profiles p
      LEFT JOIN institution_types it ON it.id = p.institution_type_id
      LEFT JOIN institution_subtypes ist ON ist.id = p.institution_subtype_id
      LEFT JOIN locations l ON l.id = p.location_id
      LEFT JOIN boards b ON b.id = p.board_id
      LEFT JOIN institution_profiles pu ON pu.id = p.parent_university_id
      WHERE (p.id = $1 OR p.slug = $2)
        AND COALESCE(p.is_deleted, FALSE) = FALSE
      LIMIT 1
    `;

    const res = await db.query(query, [instIdNum || -1, slug || ""]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: res.rows[0],
    });
  } catch (err: any) {
    console.error("Error in GET /api/public/institution/info:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch institution info" }, { status: 500 });
  }
}
