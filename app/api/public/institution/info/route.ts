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
        p.business_id,
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
      WHERE (p.business_id = $1 OR p.id = $1 OR p.slug = $2)
        AND COALESCE(p.is_deleted, FALSE) = FALSE
      ORDER BY (p.business_id = $1) DESC, p.id DESC
      LIMIT 1
    `;

    let data: any = null;
    const res = await db.query(query, [instIdNum || -1, slug || ""]);

    if (res.rows.length > 0) {
      data = res.rows[0];
    } else if (instIdNum) {
      // Fallback: check business_profiles directly
      const bpRes = await db.query(
        `SELECT id, name, slug, email, phone, about, website, logo_url, banner_url, city, state, postal_code, address, is_active
         FROM business_profiles WHERE id = $1 LIMIT 1`,
        [instIdNum]
      );
      if (bpRes.rows.length > 0) {
        const bp = bpRes.rows[0];
        data = {
          id: bp.id,
          business_id: bp.id,
          name: bp.name,
          slug: bp.slug,
          email: bp.email,
          phone: bp.phone,
          about: bp.about,
          website: bp.website,
          logo_url: bp.logo_url,
          banner_url: bp.banner_url,
          location_name: bp.city,
          address: bp.address,
          city: bp.city,
          state: bp.state,
          pincode: bp.postal_code,
          is_active: bp.is_active,
        };
      }
    }

    if (!data) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    // Resolve linked business_id
    const resolvedBizId = data.business_id || instIdNum;

    // Overlay with company info configured in workspace/company?tab=contact-branches
    if (resolvedBizId) {
      const pciRes = await db.query(
        `SELECT * FROM platform_company_info WHERE business_id = $1 OR institution_id = $2 ORDER BY (business_id = $1) DESC LIMIT 1`,
        [resolvedBizId, data.id]
      );
      if (pciRes.rows.length > 0) {
        const pci = pciRes.rows[0];
        data.name = pci.brand_name || pci.company_name || data.name;
        if (pci.logo_url) data.logo_url = pci.logo_url;
        if (pci.support_email) data.email = pci.support_email;
        if (pci.phone) data.phone = pci.phone;
        if (pci.website_url) data.website = pci.website_url;
        if (pci.about) data.about = pci.about;
        if (pci.city) data.location_name = pci.city;
        if (pci.headquarters_address) data.address = pci.headquarters_address;
        if (pci.city) data.city = pci.city;
        if (pci.state) data.state = pci.state;
        if (pci.pincode) data.pincode = pci.pincode;
      }

      // Also overlay business_profiles logo / banner if not yet set
      const bpFallback = await db.query(
        `SELECT logo_url, banner_url, name FROM business_profiles WHERE id = $1 LIMIT 1`,
        [resolvedBizId]
      );
      if (bpFallback.rows.length > 0) {
        const bp = bpFallback.rows[0];
        if (!data.logo_url && bp.logo_url) data.logo_url = bp.logo_url;
        if (!data.banner_url && bp.banner_url) data.banner_url = bp.banner_url;
        if (!data.name && bp.name) data.name = bp.name;
      }

      // Query branches configured in workspace/company?tab=contact-branches
      const branchesRes = await db.query(
        `SELECT id, branch_name, address, city, state, pincode, phone, email, is_headquarters, branch_type
         FROM platform_branches
         WHERE (business_id = $1 OR institution_id = $2) AND status = 'active'
         ORDER BY is_headquarters DESC, id ASC`,
        [resolvedBizId, data.id]
      );
      if (branchesRes.rows.length > 0) {
        data.branches = branchesRes.rows.map((b) => ({
          id: b.id,
          branch_name: b.branch_name,
          address: b.address,
          city: b.city,
          state: b.state,
          pincode: b.pincode,
          phones: b.phone ? [{ phone: b.phone }] : [],
          emails: b.email ? [{ email: b.email }] : [],
          is_headquarters: b.is_headquarters,
          branch_type: b.branch_type,
        }));
      }
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("Error in GET /api/public/institution/info:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch institution info" }, { status: 500 });
  }
}
