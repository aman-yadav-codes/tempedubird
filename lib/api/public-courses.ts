import { NextResponse } from "next/server";

import { db } from "@/lib/db/db";
import { getInstitutionTenantByHost, getRequestHost } from "@/lib/tenancy/institution-domain";

function getPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function formatPrice(amount: number | null) {
  if (amount === null || !Number.isFinite(amount)) return "Contact";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDuration(value: number | null, unit: string | null) {
  if (!value) return "Regular Duration";

  const u = unit ? unit.trim() : "Months";
  return `${value} ${u}`;
}

let feeUnitColumnReady = false;

async function ensureProgramFeeComponentUnitColumn() {
  if (feeUnitColumnReady) return;
  try {
    feeUnitColumnReady = true;
    await db.query(`
      ALTER TABLE program_fee_components
        ADD COLUMN IF NOT EXISTS fee_unit TEXT NULL
    `);
  } catch {
    // ignore if column already exists or under read-only mode
  }
}

function mapPublicCourseRow(row: Record<string, unknown>) {
  const categoryNames = Array.isArray(row.category_names)
    ? row.category_names.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
  const rootCategoryNames = Array.isArray(row.root_category_names)
    ? row.root_category_names.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
  const languageNames = Array.isArray(row.language_names)
    ? row.language_names.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
  const subjectNames = Array.isArray(row.subject_names)
    ? row.subject_names.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
  const sectionNames = Array.isArray(row.section_names)
    ? row.section_names.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
  const tags = Array.from(
    new Set([
      ...rootCategoryNames,
      ...categoryNames,
      typeof row.program_type_name === "string" ? row.program_type_name : null,
    ].filter(Boolean)),
  );
  const category =
    typeof row.root_category_name === "string"
      ? row.root_category_name
      : typeof row.category_name === "string"
        ? row.category_name
        : "Course";
  const images = Array.isArray(row.images)
    ? row.images.filter(
        (image): image is { id: number; url: string; mediaType?: "image" | "video" } =>
          Boolean(image) &&
          typeof image === "object" &&
          typeof (image as { id?: unknown }).id === "number" &&
          typeof (image as { url?: unknown }).url === "string",
      )
    : [];
  const feeComponents = Array.isArray(row.fee_components)
    ? row.fee_components.filter(
        (fee): fee is {
          id?: number;
          title?: string;
          amount?: unknown;
          unit?: string | null;
          payment_mode?: "one_time" | "installment" | string | null;
          discount_type?: "percentage" | "fixed" | string | null;
          discount_value?: unknown;
          final_amount?: unknown;
          installments_count?: number | null;
        } => Boolean(fee) && typeof fee === "object",
      )
    : [];

  const rawDurationValue = row.duration_value ? Number(row.duration_value) : null;
  const rawDurationUnit = typeof row.duration_unit === "string" && row.duration_unit.trim() ? row.duration_unit.trim() : null;

  const institution = {
    id: row.institution_id ? Number(row.institution_id) : 1,
    name: typeof row.institution_name === "string" ? row.institution_name : "Partner Institution",
    slug: typeof row.institution_slug === "string" ? row.institution_slug : null,
    city: typeof row.institution_city === "string" ? row.institution_city : null,
    location: typeof row.institution_location === "string" ? row.institution_location : (typeof row.institution_city === "string" ? row.institution_city : "India"),
    logo_url: typeof row.institution_logo_url === "string" ? row.institution_logo_url : null,
    rating: row.institution_rating ? Number(row.institution_rating) : 4.8,
    reviews_count: row.institution_reviews_count ? Number(row.institution_reviews_count) : 24,
    verified: true,
  };

  const reviewsList = Array.isArray(row.course_reviews) ? row.course_reviews : [];
  const rating = row.course_avg_rating != null ? Number(row.course_avg_rating) : (reviewsList.length > 0 ? Number((reviewsList.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0) / reviewsList.length).toFixed(1)) : 4.8);
  const reviewsCount = row.course_reviews_count != null ? Number(row.course_reviews_count) : (reviewsList.length || 4);
  const detailedSubjects = Array.isArray(row.detailed_subjects) ? row.detailed_subjects : [];

  return {
    id: Number(row.id),
    slug: typeof row.slug === "string" ? row.slug : String(row.id),
    title: typeof row.title === "string" ? row.title : "Untitled Program",
    shortDescription: typeof row.about === "string" ? row.about : "",
    description: typeof row.about === "string" ? row.about : "",
    institute: typeof row.institution_name === "string" ? row.institution_name : "Institute",
    institution,
    detailedSubjects,
    rating,
    reviews: reviewsCount,
    reviewsCount,
    reviews_count: reviewsCount,
    reviewsList,
    category,
    categoryId: row.root_category_id ? Number(row.root_category_id) : null,
    selectedCategory: typeof row.category_name === "string" ? row.category_name : null,
    selectedCategoryId: row.category_id ? Number(row.category_id) : null,
    duration: formatDuration(rawDurationValue, rawDurationUnit),
    durationValue: rawDurationValue,
    durationUnit: rawDurationUnit,
    level:
      typeof row.category_name === "string"
        ? row.category_name
        : typeof row.program_type_name === "string"
          ? row.program_type_name
          : "Course",
    price: formatPrice(row.min_amount === null ? (row.fee_amount ? Number(row.fee_amount) : null) : Number(row.min_amount)),
    fee_amount: row.fee_amount ?? row.min_amount ?? null,
    institutionId: row.institution_id ? Number(row.institution_id) : undefined,
    institution_id: row.institution_id ? Number(row.institution_id) : undefined,
    boardName: typeof row.board_name === "string" ? row.board_name : null,
    universityName: typeof row.university_name === "string" ? row.university_name : null,
    verified: true,
    students: row.seats_available ? `${row.seats_available} seats` : "Open seats",
    seatsAvailable: row.seats_available ? Number(row.seats_available) : null,
    teachingMethod: typeof row.teaching_method === "string" ? row.teaching_method : null,
    programType: typeof row.program_type_name === "string" ? row.program_type_name : null,
    languages: languageNames,
    subjects: subjectNames,
    sections: sectionNames,
    images,
    feeComponents,
    tags,
    iconUrl: typeof row.icon_url === "string" && row.icon_url ? row.icon_url : (images[0]?.url || null),
  };
}

export async function handlePublicCoursesGet(req: Request) {
  const url = new URL(req.url);
  const page = getPositiveInt(url.searchParams.get("page"), 1);
  const limit = Math.min(getPositiveInt(url.searchParams.get("limit"), 50), 100);
  const offset = (page - 1) * limit;
  const search = url.searchParams.get("search")?.trim() || "";
  const categoryId = url.searchParams.get("categoryId")
    ? Number(url.searchParams.get("categoryId"))
    : null;
  const tenant = await getInstitutionTenantByHost(db, getRequestHost(req));
  const requestedInstitutionId = url.searchParams.get("institutionId")
    ? Number(url.searchParams.get("institutionId"))
    : null;

  const where = [
    "COALESCE(ip.is_deleted, FALSE) = FALSE",
    "ip.is_active = TRUE",
    "COALESCE(inst.is_deleted, FALSE) = FALSE",
    "inst.is_active = TRUE",
  ];
  const params: unknown[] = [];

  if (requestedInstitutionId && Number.isInteger(requestedInstitutionId) && requestedInstitutionId > 0) {
    params.push(requestedInstitutionId);
    where.push(`ip.institution_id = $${params.length}`);
  } else if (tenant) {
    params.push(tenant.institution_id);
    where.push(`ip.institution_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    where.push(`(
      ip.title ILIKE $${params.length}
      OR ip.slug ILIKE $${params.length}
      OR inst.name ILIKE $${params.length}
      OR EXISTS (
        SELECT 1
        FROM program_categories search_pc
        JOIN categories search_c
          ON search_c.id = search_pc.category_id
        WHERE search_pc.program_id = ip.id
          AND search_c.name ILIKE $${params.length}
      )
    )`);
  }

  if (categoryId && Number.isInteger(categoryId)) {
    params.push(categoryId);
    where.push(`EXISTS (
      SELECT 1
      FROM program_categories filter_pc
      JOIN categories filter_category
        ON filter_category.id = filter_pc.category_id
       AND COALESCE(filter_category.is_deleted, FALSE) = FALSE
       AND filter_category.is_active = TRUE
      LEFT JOIN category_closure filter_closure
        ON filter_closure.descendant_id = filter_category.id
      LEFT JOIN categories filter_root
        ON filter_root.id = filter_closure.ancestor_id
       AND filter_root.depth = 1
       AND COALESCE(filter_root.is_deleted, FALSE) = FALSE
       AND filter_root.is_active = TRUE
      WHERE filter_pc.program_id = ip.id
        AND COALESCE(filter_root.id, CASE WHEN filter_category.depth = 1 THEN filter_category.id END) = $${params.length}
    )`);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const query = `
    WITH category_candidates AS (
      SELECT
        pc.program_id,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        c.depth AS category_depth,
        COALESCE(MAX(root.id), CASE WHEN c.depth = 1 THEN c.id END) AS root_category_id,
        COALESCE(MAX(root.name), CASE WHEN c.depth = 1 THEN c.name END) AS root_category_name,
        COALESCE(MAX(root.slug), CASE WHEN c.depth = 1 THEN c.slug END) AS root_category_slug
      FROM program_categories pc
      JOIN categories c
        ON c.id = pc.category_id
       AND COALESCE(c.is_deleted, FALSE) = FALSE
       AND c.is_active = TRUE
      LEFT JOIN category_closure cc
        ON cc.descendant_id = c.id
      LEFT JOIN categories root
        ON root.id = cc.ancestor_id
       AND root.depth = 1
       AND COALESCE(root.is_deleted, FALSE) = FALSE
       AND root.is_active = TRUE
      GROUP BY pc.program_id, c.id, c.name, c.slug, c.depth
    ),
    primary_categories AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY program_id
          ORDER BY category_depth ASC, category_name ASC, category_id ASC
        ) AS row_number
      FROM category_candidates
    ),
    category_rollup AS (
      SELECT
        pc.program_id,
        ARRAY_AGG(DISTINCT c.name ORDER BY c.name) AS category_names,
        ARRAY_AGG(DISTINCT COALESCE(root.name, CASE WHEN c.depth = 1 THEN c.name END) ORDER BY COALESCE(root.name, CASE WHEN c.depth = 1 THEN c.name END)) AS root_category_names
      FROM program_categories pc
      JOIN categories c
        ON c.id = pc.category_id
       AND COALESCE(c.is_deleted, FALSE) = FALSE
       AND c.is_active = TRUE
      LEFT JOIN category_closure cc
        ON cc.descendant_id = c.id
      LEFT JOIN categories root
        ON root.id = cc.ancestor_id
       AND root.depth = 1
       AND COALESCE(root.is_deleted, FALSE) = FALSE
       AND root.is_active = TRUE
      GROUP BY pc.program_id
    ),
    language_rollup AS (
      SELECT
        pl.program_id,
        ARRAY_AGG(DISTINCT l.name ORDER BY l.name) AS language_names
      FROM program_languages pl
      JOIN languages l
        ON l.id = pl.language_id
       AND COALESCE(l.is_deleted, FALSE) = FALSE
       AND l.is_active = TRUE
      GROUP BY pl.program_id
    ),
    subject_rollup AS (
      SELECT
        ps.program_id,
        ARRAY_AGG(DISTINCT s.name ORDER BY s.name) AS subject_names
      FROM program_subjects ps
      JOIN subjects s
        ON s.id = ps.subject_id
       AND COALESCE(s.is_deleted, FALSE) = FALSE
       AND s.is_active = TRUE
      GROUP BY ps.program_id
    ),
    section_rollup AS (
      SELECT
        ps.program_id,
        ARRAY_AGG(DISTINCT section.name ORDER BY section.name) AS section_names
      FROM program_sections ps
      JOIN sections section
        ON section.id = ps.section_id
       AND COALESCE(section.is_deleted, FALSE) = FALSE
       AND section.is_active = TRUE
      GROUP BY ps.program_id
    ),
    media_rollup AS (
      SELECT
        pm.program_id,
        json_agg(
          json_build_object('id', pm.id, 'url', pm.url, 'mediaType', pm.media_type)
          ORDER BY pm.sort_order ASC, pm.id ASC
        ) FILTER (WHERE pm.url IS NOT NULL AND pm.url <> '') AS images
      FROM program_media pm
      WHERE LOWER(pm.media_type) IN ('image', 'photo', 'thumbnail', 'video')
      GROUP BY pm.program_id
    ),
    fee_rollup AS (
      SELECT
        program_id,
        MIN(amount)::numeric AS min_amount
      FROM program_fee_components
      GROUP BY program_id
    ),
    reviews_rollup AS (
      SELECT
        entity_id,
        ROUND(AVG(rating), 1)::numeric(3,1) AS course_avg_rating,
        COUNT(*)::int AS course_reviews_count
      FROM entity_reviews
      WHERE entity_type IN ('course', 'program')
      GROUP BY entity_id
    )
    SELECT
      ip.id,
      ip.slug,
      ip.title,
      ip.about,
      ip.duration_value,
      ip.duration_unit,
      ip.seats_available,
      ip.teaching_method,
      ip.fee_amount,
      ip.institution_id,
      ip.updated_at,
      pt.name AS program_type_name,
      COALESCE(inst.name, inst.slug) AS institution_name,
      primary_category.category_id,
      primary_category.category_name,
      primary_category.root_category_id,
      primary_category.root_category_name,
      COALESCE(category_rollup.category_names, ARRAY[]::text[]) AS category_names,
      COALESCE(category_rollup.root_category_names, ARRAY[]::text[]) AS root_category_names,
      COALESCE(language_rollup.language_names, ARRAY[]::text[]) AS language_names,
      COALESCE(subject_rollup.subject_names, ARRAY[]::text[]) AS subject_names,
      COALESCE(section_rollup.section_names, ARRAY[]::text[]) AS section_names,
      COALESCE(media_rollup.images, '[]'::json) AS images,
      fee_rollup.min_amount,
      COALESCE(reviews_rollup.course_avg_rating, 4.8) AS course_avg_rating,
      COALESCE(reviews_rollup.course_reviews_count, 0) AS course_reviews_count
    FROM institution_programs ip
    INNER JOIN institution_profiles inst
      ON inst.id = ip.institution_id
    LEFT JOIN program_types pt
      ON pt.id = ip.program_type_id
    LEFT JOIN primary_categories primary_category
      ON primary_category.program_id = ip.id
     AND primary_category.row_number = 1
    LEFT JOIN category_rollup
      ON category_rollup.program_id = ip.id
    LEFT JOIN language_rollup
      ON language_rollup.program_id = ip.id
    LEFT JOIN subject_rollup
      ON subject_rollup.program_id = ip.id
    LEFT JOIN section_rollup
      ON section_rollup.program_id = ip.id
    LEFT JOIN media_rollup
      ON media_rollup.program_id = ip.id
    LEFT JOIN fee_rollup
      ON fee_rollup.program_id = ip.id
    LEFT JOIN reviews_rollup
      ON reviews_rollup.entity_id = ip.id
    ${whereSql}
    ORDER BY ip.updated_at DESC, ip.created_at DESC, ip.id DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const [dataResult, countResult] = await Promise.all([
    db.query(query, [...params, limit, offset]),
    db.query<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM institution_programs ip
        INNER JOIN institution_profiles inst
          ON inst.id = ip.institution_id
        ${whereSql}
      `,
      params,
    ),
  ]);

  const data = dataResult.rows.map(mapPublicCourseRow);

  const total = Number(countResult.rows[0]?.count ?? 0);

  return NextResponse.json({
    data,
    pageCount: Math.ceil(total / limit),
    total,
  });
}

import { extractIdFromSlug } from "@/lib/utils/seo-slug";

export async function getPublicCourseById(idOrSlug: number | string, opts: { host?: string | null } = {}) {
  const { id } = extractIdFromSlug(idOrSlug);
  if (!Number.isInteger(id) || id <= 0) return null;
  await ensureProgramFeeComponentUnitColumn();
  const tenant = await getInstitutionTenantByHost(db, opts.host ?? null);
  const params: unknown[] = [id];
  const tenantSql = tenant ? `AND ip.institution_id = $2` : "";
  if (tenant) params.push(tenant.institution_id);

  const result = await db.query(
    `
      WITH category_candidates AS (
        SELECT
          pc.program_id,
          c.id AS category_id,
          c.name AS category_name,
          c.depth AS category_depth,
          COALESCE(MAX(root.id), CASE WHEN c.depth = 1 THEN c.id END) AS root_category_id,
          COALESCE(MAX(root.name), CASE WHEN c.depth = 1 THEN c.name END) AS root_category_name
        FROM program_categories pc
        JOIN categories c
          ON c.id = pc.category_id
         AND COALESCE(c.is_deleted, FALSE) = FALSE
         AND c.is_active = TRUE
        LEFT JOIN category_closure cc
          ON cc.descendant_id = c.id
        LEFT JOIN categories root
          ON root.id = cc.ancestor_id
         AND root.depth = 1
         AND COALESCE(root.is_deleted, FALSE) = FALSE
         AND root.is_active = TRUE
        WHERE pc.program_id = $1
        GROUP BY pc.program_id, c.id, c.name, c.depth
      ),
      primary_category AS (
        SELECT *
        FROM category_candidates
        ORDER BY category_depth ASC, category_name ASC, category_id ASC
        LIMIT 1
      ),
      category_rollup AS (
        SELECT
          ARRAY_AGG(DISTINCT c.name ORDER BY c.name) AS category_names,
          ARRAY_AGG(DISTINCT COALESCE(root.name, CASE WHEN c.depth = 1 THEN c.name END) ORDER BY COALESCE(root.name, CASE WHEN c.depth = 1 THEN c.name END)) AS root_category_names
        FROM program_categories pc
        JOIN categories c
          ON c.id = pc.category_id
         AND COALESCE(c.is_deleted, FALSE) = FALSE
         AND c.is_active = TRUE
        LEFT JOIN category_closure cc
          ON cc.descendant_id = c.id
        LEFT JOIN categories root
          ON root.id = cc.ancestor_id
         AND root.depth = 1
         AND COALESCE(root.is_deleted, FALSE) = FALSE
         AND root.is_active = TRUE
        WHERE pc.program_id = $1
      ),
      language_rollup AS (
        SELECT ARRAY_AGG(DISTINCT l.name ORDER BY l.name) AS language_names
        FROM program_languages pl
        JOIN languages l
          ON l.id = pl.language_id
         AND COALESCE(l.is_deleted, FALSE) = FALSE
         AND l.is_active = TRUE
        WHERE pl.program_id = $1
      ),
      subject_rollup AS (
        SELECT ARRAY_AGG(DISTINCT s.name ORDER BY s.name) AS subject_names
        FROM program_subjects ps
        JOIN subjects s
          ON s.id = ps.subject_id
         AND COALESCE(s.is_deleted, FALSE) = FALSE
         AND s.is_active = TRUE
        WHERE ps.program_id = $1
      ),
      subject_detailed_rollup AS (
        SELECT
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name,
              'code', s.code,
              'slug', s.slug,
              'syllabi', (
                SELECT json_agg(
                  json_build_object(
                    'id', syl.id,
                    'title', syl.title,
                    'description', syl.description,
                    'nodes_count', (
                      SELECT COUNT(*)::int FROM syllabus_nodes sn WHERE sn.syllabus_id = syl.id AND COALESCE(sn.is_active, TRUE) = TRUE
                    ),
                    'topics', (
                      SELECT json_agg(
                        json_build_object(
                          'id', sn.id,
                          'title', sn.title,
                          'node_type', sn.node_type,
                          'estimated_hours', sn.estimated_hours,
                          'learning_outcomes', sn.learning_outcomes
                        )
                        ORDER BY sn.sort_order ASC, sn.id ASC
                      )
                      FROM syllabus_nodes sn
                      WHERE sn.syllabus_id = syl.id AND COALESCE(sn.is_active, TRUE) = TRUE
                    )
                  )
                )
                FROM syllabi syl
                WHERE syl.subject_id = s.id
                  AND COALESCE(syl.is_active, TRUE) = TRUE
              )
            )
            ORDER BY s.name ASC
          ) AS detailed_subjects
        FROM program_subjects ps
        JOIN subjects s
          ON s.id = ps.subject_id
         AND COALESCE(s.is_deleted, FALSE) = FALSE
         AND s.is_active = TRUE
        WHERE ps.program_id = $1
      ),
      section_rollup AS (
        SELECT ARRAY_AGG(DISTINCT section.name ORDER BY section.name) AS section_names
        FROM program_sections ps
        JOIN sections section
          ON section.id = ps.section_id
         AND COALESCE(section.is_deleted, FALSE) = FALSE
         AND section.is_active = TRUE
        WHERE ps.program_id = $1
      ),
      media_rollup AS (
        SELECT
          json_agg(
            json_build_object('id', pm.id, 'url', pm.url, 'mediaType', pm.media_type)
            ORDER BY pm.sort_order ASC, pm.id ASC
          ) FILTER (WHERE pm.url IS NOT NULL AND pm.url <> '') AS images
        FROM program_media pm
        WHERE pm.program_id = $1
      ),
      fee_rollup AS (
        SELECT
          MIN(amount)::numeric AS min_amount,
          json_agg(
            json_build_object(
              'id', id,
              'title', title,
              'amount', amount,
              'unit', fee_unit,
              'payment_mode', payment_mode,
              'discount_type', discount_type,
              'discount_value', discount_value,
              'final_amount', final_amount,
              'installments_count', installments_count
            )
            ORDER BY sort_order ASC, id ASC
          ) AS fee_components
        FROM program_fee_components
        WHERE program_id = $1
      )
      SELECT
        ip.id,
        ip.slug,
        ip.title,
        ip.about,
        ip.duration_value,
        ip.duration_unit,
        ip.seats_available,
        ip.teaching_method,
        ip.fee_amount,
        ip.institution_id,
        COALESCE(b.name, inst_b.name) AS board_name,
        COALESCE(u.name, inst_u.name) AS university_name,
        pt.name AS program_type_name,
        COALESCE(inst.name, inst.slug) AS institution_name,
        inst.slug AS institution_slug,
        inst_loc.name AS institution_city,
        inst_loc.name AS institution_location,
        (
          SELECT media.url
          FROM institution_media media
          WHERE media.institution_id = inst.id
            AND COALESCE(media.is_deleted, FALSE) = FALSE
            AND media.url IS NOT NULL AND media.url <> ''
            AND (lower(COALESCE(media.media_type, '')) = 'logo' OR lower(COALESCE(media.title, '')) LIKE '%logo%')
          ORDER BY media.sort_order ASC, media.id ASC
          LIMIT 1
        ) AS institution_logo_url,
        COALESCE((
          SELECT ROUND(AVG(rating), 1)
          FROM entity_reviews
          WHERE entity_type = 'institution' AND entity_id = inst.id
        ), 4.9) AS institution_rating,
        COALESCE((
          SELECT COUNT(*)::int
          FROM entity_reviews
          WHERE entity_type = 'institution' AND entity_id = inst.id
        ), 42) AS institution_reviews_count,
        (
          SELECT ROUND(AVG(rating), 1)
          FROM entity_reviews
          WHERE entity_type IN ('course', 'program') AND entity_id = ip.id
        ) AS course_avg_rating,
        COALESCE((
          SELECT COUNT(*)::int
          FROM entity_reviews
          WHERE entity_type IN ('course', 'program') AND entity_id = ip.id
        ), 0) AS course_reviews_count,
        (
          SELECT json_agg(
            json_build_object(
              'id', r.id,
              'reviewer_name', r.reviewer_name,
              'reviewer_role', r.reviewer_role,
              'rating', r.rating,
              'title', r.title,
              'comment', r.comment,
              'is_verified_user', r.is_verified_user,
              'created_at', r.created_at
            )
            ORDER BY r.created_at DESC
          )
          FROM entity_reviews r
          WHERE r.entity_type IN ('course', 'program') AND r.entity_id = ip.id
        ) AS course_reviews,
        primary_category.category_id,
        primary_category.category_name,
        primary_category.root_category_id,
        primary_category.root_category_name,
        COALESCE(category_rollup.category_names, ARRAY[]::text[]) AS category_names,
        COALESCE(category_rollup.root_category_names, ARRAY[]::text[]) AS root_category_names,
        COALESCE(language_rollup.language_names, ARRAY[]::text[]) AS language_names,
        COALESCE(subject_rollup.subject_names, ARRAY[]::text[]) AS subject_names,
        COALESCE(subject_detailed_rollup.detailed_subjects, '[]'::json) AS detailed_subjects,
        COALESCE(section_rollup.section_names, ARRAY[]::text[]) AS section_names,
        COALESCE(media_rollup.images, '[]'::json) AS images,
        COALESCE(fee_rollup.fee_components, '[]'::json) AS fee_components,
        fee_rollup.min_amount
      FROM institution_programs ip
      INNER JOIN institution_profiles inst
        ON inst.id = ip.institution_id
       AND COALESCE(inst.is_deleted, FALSE) = FALSE
       AND inst.is_active = TRUE
      LEFT JOIN locations inst_loc
        ON inst_loc.id = inst.location_id
      LEFT JOIN program_types pt
        ON pt.id = ip.program_type_id
      LEFT JOIN boards b
        ON b.id = ip.board_id
      LEFT JOIN boards inst_b
        ON inst_b.id = inst.board_id
      LEFT JOIN institution_profiles u
        ON u.id = ip.university_id
      LEFT JOIN institution_profiles inst_u
        ON inst_u.id = inst.parent_university_id
      LEFT JOIN primary_category ON TRUE
      LEFT JOIN category_rollup ON TRUE
      LEFT JOIN language_rollup ON TRUE
      LEFT JOIN subject_rollup ON TRUE
      LEFT JOIN subject_detailed_rollup ON TRUE
      LEFT JOIN section_rollup ON TRUE
      LEFT JOIN media_rollup ON TRUE
      LEFT JOIN fee_rollup ON TRUE
      WHERE ip.id = $1
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
        AND ip.is_active = TRUE
        ${tenantSql}
      LIMIT 1
    `,
    params,
  );

  return result.rows[0] ? mapPublicCourseRow(result.rows[0]) : null;
}
