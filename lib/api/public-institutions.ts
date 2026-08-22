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
    where.push(`(l.name ILIKE $${params.length})`);
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
          ) AS image_url
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

export async function getCurrentPublicInstitutionProfile(host: string | null | undefined) {
  const tenant = await getInstitutionTenantByHost(db, host);
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
        ) AS banner_url
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

  return result.rows[0] ?? null;
}
