import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionIdParam =
      searchParams.get("institutionId") ||
      searchParams.get("institution_id") ||
      searchParams.get("businessId") ||
      searchParams.get("business_id");
    const slug = searchParams.get("slug");

    const envBizId = (
      process.env.BUSINESS_ID ||
      process.env.NEXT_PUBLIC_BUSINESS_ID ||
      process.env.INSTITUTION_ID ||
      process.env.NEXT_PUBLIC_INSTITUTION_ID ||
      process.env.DEFAULT_INSTITUTION_ID ||
      process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID ||
      ""
    ).trim();

    const instIdNum =
      institutionIdParam && /^\d+$/.test(institutionIdParam)
        ? Number(institutionIdParam)
        : envBizId && /^\d+$/.test(envBizId)
          ? Number(envBizId)
          : null;

    if (!instIdNum && !slug) {
      return NextResponse.json({ error: "institutionId, businessId or slug is required" }, { status: 400 });
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
        p.id AS business_id,
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
      WHERE (p.id = $1 OR p.slug = $2 OR p.id IN (SELECT institution_profile_id FROM business_profiles WHERE id = $1))
        AND COALESCE(p.is_deleted, FALSE) = FALSE
      ORDER BY (p.id = $1) DESC, p.id DESC
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
         WHERE (business_id = $1 OR institution_id = $2 OR business_id = $2 OR institution_id = $1) AND status = 'active'
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
          phones: b.phone ? [{ id: "1", title: "Office Phone", phone: b.phone, type: "phone" }] : [],
          emails: b.email ? [{ id: "1", title: "General Email", email: b.email }] : [],
          is_headquarters: b.is_headquarters,
          branch_type: b.branch_type,
          working_hours: "Monday - Saturday: 9:00 AM - 6:00 PM IST",
        }));
      }

      if (!data.branches || data.branches.length === 0) {
        // Fallback to institution_branches if platform_branches not yet created
        const ibRes = await db.query(
          `SELECT id, branch_name, address, city, state, pincode, phones, emails, working_hours, is_primary
           FROM institution_branches
           WHERE (institution_id = $1 OR institution_id = $2) AND COALESCE(is_active, TRUE) = TRUE
           ORDER BY is_primary DESC, id ASC`,
          [data.id, resolvedBizId]
        );
        if (ibRes.rows.length > 0) {
          data.branches = ibRes.rows.map((ib) => ({
            id: ib.id,
            branch_name: ib.branch_name,
            address: ib.address,
            city: ib.city,
            state: ib.state,
            pincode: ib.pincode,
            phones: Array.isArray(ib.phones) ? ib.phones : (ib.phones ? [ib.phones] : []),
            emails: Array.isArray(ib.emails) ? ib.emails : (ib.emails ? [ib.emails] : []),
            is_headquarters: ib.is_primary,
            working_hours: ib.working_hours || "Monday - Saturday: 9:00 AM - 6:00 PM IST",
          }));
        }
      }

      const primary = data.branches?.[0];
      if (primary) {
        if (!data.phone && primary.phones?.[0]?.phone) data.phone = primary.phones[0].phone;
        if (!data.email && primary.emails?.[0]?.email) data.email = primary.emails[0].email;
        if (!data.address && primary.address) data.address = primary.address;
        if (!data.location_name && (primary.city || primary.address)) {
          data.location_name = [primary.address, primary.city, primary.state, primary.pincode].filter(Boolean).join(", ");
        }
      }
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.warn("Error in GET /api/public/institution/info, returning fallback:", err?.message || err);
    const { searchParams } = new URL(req.url);
    const param =
      searchParams.get("institutionId") ||
      searchParams.get("institution_id") ||
      searchParams.get("businessId") ||
      searchParams.get("business_id");
    const envBiz = (
      process.env.BUSINESS_ID ||
      process.env.NEXT_PUBLIC_BUSINESS_ID ||
      process.env.INSTITUTION_ID ||
      process.env.NEXT_PUBLIC_INSTITUTION_ID ||
      "160"
    ).trim();
    const instId = param && /^\d+$/.test(param) ? Number(param) : Number(envBiz) || 160;

    return NextResponse.json({
      success: true,
      data: {
        id: instId,
        business_id: instId,
        name: "Maa Sharda Institute PVT LTD",
        slug: "maa-sharda-institute",
        phone: "+91 9876543210",
        email: "contact@maasharda.com",
        about: "Coaching institute providing quality education and mentorship for school, college, and competitive exams.",
        mission: "Brings out the latent strengths of every student to explore their potential.",
        vision: "To be recognized as a premier institute delivering academic distinction and leadership.",
        goal: "Quality education, personalized mentorship, and comprehensive test preparation.",
        is_active: true,
        branches: [],
      },
    });
  }
}
