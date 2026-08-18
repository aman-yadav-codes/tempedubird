import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const isNumeric = /^\d+$/.test(id);
    const instIdNum = isNumeric ? Number(id) : null;

    // 1. Fetch Profile
    const profileRes = await db.query(
      `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.email,
        p.phone,
        p.about,
        p.established_year,
        p.website,
        p.is_active,
        it.name AS type_name,
        ist.name AS subtype_name,
        l.name AS location_name,
        b.name AS board_name,
        pu.name AS parent_university_name,
        COALESCE((
          SELECT COUNT(*)::int
          FROM student_enrollments se
          WHERE se.institution_id = p.id AND COALESCE(se.is_deleted, FALSE) = FALSE
        ), 0) AS student_count,
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
        ) AS banner_url
      FROM institution_profiles p
      LEFT JOIN institution_types it ON it.id = p.institution_type_id
      LEFT JOIN institution_subtypes ist ON ist.id = p.institution_subtype_id
      LEFT JOIN locations l ON l.id = p.location_id
      LEFT JOIN boards b ON b.id = p.board_id
      LEFT JOIN institution_profiles pu ON pu.id = p.parent_university_id
      WHERE (p.id = $1 OR p.slug = $2)
        AND COALESCE(p.is_deleted, FALSE) = FALSE
      LIMIT 1
      `,
      [instIdNum || -1, id]
    );

    if (profileRes.rows.length === 0) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    const profile = profileRes.rows[0];
    const institutionId = profile.id;

    // 2. Fetch Programs
    const programsRes = await db.query(
      `
      SELECT
        ip.id,
        ip.title,
        ip.slug,
        ip.about,
        ip.duration_value,
        ip.duration_unit,
        ip.fee_amount,
        ip.fee_unit,
        ip.admission_fee,
        ip.teaching_method,
        ip.seats_available,
        pt.name AS program_type_name
      FROM institution_programs ip
      LEFT JOIN program_types pt ON pt.id = ip.program_type_id
      WHERE ip.institution_id = $1
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      ORDER BY ip.id ASC
      `,
      [institutionId]
    );

    // 3. Fetch Facilities
    const facilitiesRes = await db.query(
      `
      SELECT
        f.id,
        f.title,
        f.description,
        f.display_order,
        ft.name AS facility_type_name
      FROM institution_facilities f
      LEFT JOIN facility_types ft ON ft.id = f.facility_type_id
      WHERE f.institution_id = $1
        AND COALESCE(f.is_active, TRUE) = TRUE
      ORDER BY f.display_order ASC, f.id ASC
      `,
      [institutionId]
    );

    // 4. Fetch Placements
    const placementsRes = await db.query(
      `
      SELECT
        id,
        year,
        total_students,
        placed_students,
        placement_percentage,
        average_package,
        highest_package,
        lowest_package
      FROM institution_placements
      WHERE institution_id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY year DESC
      `,
      [institutionId]
    );

    // 5. Fetch Cutoffs
    const cutoffsRes = await db.query(
      `
      SELECT
        c.id,
        c.exam_name,
        c.ai_response,
        ip.title AS program_title
      FROM institution_cutoffs c
      LEFT JOIN institution_programs ip ON ip.id = c.program_id
      WHERE c.institution_id = $1
        AND COALESCE(c.is_deleted, FALSE) = FALSE
      ORDER BY c.id DESC
      `,
      [institutionId]
    );

    // 6. Fetch Scholarships
    const scholarshipsRes = await db.query(
      `
      SELECT
        s.id,
        s.ai_response
      FROM institution_scholarships s
      WHERE s.institution_id = $1
        AND COALESCE(s.is_deleted, FALSE) = FALSE
      ORDER BY s.id DESC
      `,
      [institutionId]
    );

    return NextResponse.json({
      profile,
      programs: programsRes.rows,
      facilities: facilitiesRes.rows,
      placements: placementsRes.rows,
      cutoffs: cutoffsRes.rows,
      scholarships: scholarshipsRes.rows,
    });
  } catch (err: any) {
    console.error("Error fetching institution details:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch details" }, { status: 500 });
  }
}
