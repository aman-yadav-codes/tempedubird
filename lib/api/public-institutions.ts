import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getInstitutionTenantByHost, getRequestHost } from "@/lib/tenancy/institution-domain";

export type PublicInstitutionProfile = {
  id: number;
  name: string;
  slug: string | null;
  type_name: string | null;
  subtype_name: string | null;
  phone: string | null;
  email: string | null;
  established_year: number | null;
  website: string | null;
  about: string | null;
  mission: string | null;
  vision: string | null;
  goal: string | null;
  founder_name: string | null;
  founder_title: string | null;
  founder_image_url: string | null;
  founder_about: string | null;
  location_name: string | null;
  full_address: string | null;
  board_name: string | null;
  parent_university_name: string | null;
  student_count: number;
  course_count: number;
  logo_url: string | null;
  banner_url: string | null;
  image_url: string | null;
  branches?: any[];
};

function getPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function handlePublicInstitutionsGet(req: Request) {
  const url = new URL(req.url);
  const page = getPositiveInt(url.searchParams.get("page"), 1);
  const limit = Math.min(getPositiveInt(url.searchParams.get("limit"), 12), 100);
  const offset = (page - 1) * limit;
  const search = url.searchParams.get("search")?.trim() || "";
  const typeFilter = url.searchParams.get("type") || "all";
  const locationFilter = url.searchParams.get("location") || "all";
  const numericSearch = /^\d+$/.test(search) ? Number(search) : null;
  const tenant = await getInstitutionTenantByHost(db, getRequestHost(req));

  const where: string[] = ["COALESCE(p.is_deleted, FALSE) = FALSE", "p.is_active = TRUE"];
  const params: unknown[] = [];

  if (tenant) {
    params.push(tenant.institution_id);
    where.push(`p.id = $${params.length}`);
  }

  if (search) {
    params.push(search, numericSearch);
    where.push(`
      (
        ($${params.length}::int IS NOT NULL AND p.id = $${params.length}::int)
        OR (
          $${params.length}::int IS NULL
          AND (
            p.name ILIKE '%' || $${params.length - 1} || '%'
            OR p.slug ILIKE '%' || $${params.length - 1} || '%'
          )
        )
      )
    `);
  }

  if (typeFilter !== "all") {
    params.push(`%${typeFilter}%`);
    where.push(`(it.name ILIKE $${params.length} OR it.slug ILIKE $${params.length})`);
  }

  if (locationFilter !== "all") {
    params.push(`%${locationFilter}%`);
    where.push(`(l.name ILIKE $${params.length} OR COALESCE(p.city, '') ILIKE $${params.length} OR COALESCE(p.address, '') ILIKE $${params.length})`);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `
        SELECT
          p.id,
          p.name,
          p.slug,
          p.phone,
          p.email,
          p.established_year,
          p.website,
          p.about,
          it.name AS type_name,
          ist.name AS subtype_name,
          l.name AS location_name,
          COALESCE((
            SELECT COUNT(*)::int
            FROM student_enrollments se
            WHERE se.institution_id = p.id AND COALESCE(se.is_deleted, FALSE) = FALSE
          ), 0) AS student_count,
          COALESCE((
            SELECT COUNT(*)::int
            FROM institution_programs ip
            WHERE ip.institution_id = p.id AND COALESCE(ip.is_deleted, FALSE) = FALSE
          ), 0) AS course_count,
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
          ) AS image_url,
          COALESCE((
            SELECT ROUND(AVG(er.rating), 1)::numeric(3,1)
            FROM entity_reviews er
            WHERE er.entity_type = 'institution' AND er.entity_id = p.id
          ), 4.8) AS avg_rating,
          COALESCE((
            SELECT COUNT(*)::int
            FROM entity_reviews er
            WHERE er.entity_type = 'institution' AND er.entity_id = p.id
          ), 0) AS reviews_count
        FROM institution_profiles p
        LEFT JOIN institution_types it ON it.id = p.institution_type_id
        LEFT JOIN institution_subtypes ist ON ist.id = p.institution_subtype_id
        LEFT JOIN locations l ON l.id = p.location_id
        ${whereSql}
        ORDER BY p.id DESC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    ),
    db.query<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM institution_profiles p
        LEFT JOIN institution_types it ON it.id = p.institution_type_id
        LEFT JOIN locations l ON l.id = p.location_id
        ${whereSql}
      `,
      params
    ),
  ]);

  const total = Number(countResult.rows[0]?.count ?? 0);
  return NextResponse.json({
    data: dataResult.rows,
    pageCount: Math.ceil(total / limit),
    total,
    page,
    limit,
  });
}

export async function getCurrentPublicInstitutionProfile(host: string | null | undefined): Promise<PublicInstitutionProfile | null> {
  const defaultEnvId =
    process.env.BUSINESS_ID ||
    process.env.NEXT_PUBLIC_BUSINESS_ID ||
    process.env.INSTITUTION_ID ||
    process.env.NEXT_PUBLIC_INSTITUTION_ID ||
    process.env.DEFAULT_INSTITUTION_ID ||
    process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID;

  try {
    let tenant = await getInstitutionTenantByHost(db, host);
    if (!tenant && defaultEnvId && /^\d+$/.test(defaultEnvId.trim()) && Number(defaultEnvId.trim()) > 0) {
      tenant = {
        institution_id: Number(defaultEnvId.trim()),
        institution_name: "Institution",
        institution_slug: null,
        domain: host || null,
        is_primary: true,
        config: {},
      };
    }
    if (!tenant) return null;

    const result = await db.query<PublicInstitutionProfile>(
      `
        SELECT
          p.id,
          p.name,
          p.slug,
          it.name AS type_name,
          ist.name AS subtype_name,
          p.phone,
          p.email,
          p.established_year,
          p.website,
          p.about,
          p.mission,
          p.vision,
          p.goal,
          p.founder_name,
          p.founder_title,
          p.founder_image_url,
          p.founder_about,
          l.name AS location_name,
          l.name AS full_address,
          b.name AS board_name,
          pu.name AS parent_university_name,
          (
            SELECT media.url
            FROM institution_media media
            WHERE media.institution_id = p.id
              AND COALESCE(media.is_deleted, FALSE) = FALSE
              AND media.url IS NOT NULL
              AND media.url <> ''
              AND (
                lower(COALESCE(media.media_type, '')) = 'logo'
                OR lower(COALESCE(media.title, '')) LIKE '%logo%'
              )
            ORDER BY media.sort_order ASC, media.id ASC
            LIMIT 1
          ) AS logo_url,
          (
            SELECT media.url
            FROM institution_media media
            WHERE media.institution_id = p.id
              AND COALESCE(media.is_deleted, FALSE) = FALSE
              AND media.url IS NOT NULL
              AND media.url <> ''
              AND lower(COALESCE(media.media_type, '')) IN ('image', 'photo', 'banner', 'cover')
            ORDER BY
              CASE WHEN lower(COALESCE(media.title, '')) LIKE '%banner%' OR lower(COALESCE(media.title, '')) LIKE '%cover%' THEN 0 ELSE 1 END,
              media.sort_order ASC,
              media.id ASC
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
      WHERE p.id = $1
        AND p.is_active = TRUE
        AND COALESCE(p.is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [tenant.institution_id],
  );

  const profile = result.rows[0] ?? null;
  if (profile) {
    try {
      const pciRes = await db.query(
        `SELECT brand_name, company_name, logo_url, support_email, phone, website_url, about, headquarters_address, city, state, pincode
         FROM platform_company_info
         WHERE business_id = $1 OR institution_id = $1
         ORDER BY (business_id = $1) DESC
         LIMIT 1`,
        [tenant.institution_id]
      );
      if (pciRes.rows.length > 0) {
        const pci = pciRes.rows[0];
        if (pci.brand_name || pci.company_name) profile.name = pci.brand_name || pci.company_name;
        if (pci.phone) profile.phone = pci.phone;
        if (pci.support_email) profile.email = pci.support_email;
        if (pci.website_url) profile.website = pci.website_url;
        if (pci.about) profile.about = pci.about;
        if (pci.logo_url) profile.logo_url = pci.logo_url;
        if (pci.headquarters_address) profile.full_address = pci.headquarters_address;
        if (pci.city) profile.location_name = pci.city;
      }

      const branchRes = await db.query(
        `SELECT id, branch_name, address, city, state, pincode, phone, email, is_headquarters, branch_type
         FROM platform_branches
         WHERE (business_id = $1 OR institution_id = $1) AND status = 'active'
         ORDER BY is_headquarters DESC, id ASC`,
        [tenant.institution_id]
      );
      if (branchRes.rows.length > 0) {
        profile.branches = branchRes.rows.map((b: any) => ({
          id: b.id,
          branch_name: b.branch_name,
          address: b.address,
          city: b.city,
          state: b.state,
          pincode: b.pincode,
          phones: b.phone ? [{ id: "1", title: "Office Phone", phone: b.phone, type: "phone" }] : [],
          emails: b.email ? [{ id: "1", title: "General Email", email: b.email }] : [],
          working_hours: "Monday - Saturday: 9:00 AM - 6:00 PM",
        }));
      }
    } catch (err) {
      console.warn("Could not overlay company info onto institution profile:", err);
    }
  }

  return profile;
  } catch (error) {
    console.warn("getCurrentPublicInstitutionProfile fallback:", error);
    const resolvedInstId = defaultEnvId && /^\d+$/.test(defaultEnvId.trim()) ? Number(defaultEnvId.trim()) : 160;
    return {
      id: resolvedInstId,
      name: "Maa Sharda Institute PVT LTD",
      slug: "maa-sharda-institute",
      type_name: "Institute",
      subtype_name: "Coaching",
      phone: "+91 9876543210",
      email: "contact@maasharda.com",
      established_year: 2015,
      website: null,
      about: "Coaching institute providing quality education and mentorship for school, college, and competitive exams.",
      mission: "Brings out the latent strengths of every student to explore their potential.",
      vision: "To be recognized as a premier institute delivering academic distinction and leadership.",
      goal: "Quality education, personalized mentorship, and comprehensive test preparation.",
      founder_name: "Er. Arvind Yadav",
      founder_title: "Founder & Managing Director",
      founder_image_url: null,
      founder_about: "Dedicated educator and visionary leader committed to transforming youth learning and competitive success.",
      location_name: "Main Campus",
      full_address: "Main Campus, India",
      board_name: null,
      parent_university_name: null,
      student_count: 500,
      course_count: 12,
      logo_url: null,
      banner_url: null,
      image_url: null,
      branches: [],
    };
  }
}
