import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { getAllowedInstitutionIds } from "@/lib/auth/institution-scope";
import {
  AUTO_GENERATE_FIELDS_KEY,
  findDefaultDate,
  findDefaultTitle,
  generateCertificateNumber,
  readAutoGenerateFields,
} from "@/lib/card-templates/institution-defaults";
import { stripGooglePlusCodeFromAddress } from "@/lib/card-templates/address";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import type { DocumentTemplateField } from "@/lib/types/document-template";
import type { DocumentTemplateFieldMapping } from "@/lib/card-templates/field-mapping";

type CurrentUser = Awaited<ReturnType<typeof requireAdmin>>;

type AchievementTemplate = {
  templateId: number;
  institutionId: number;
  cardCategoryId: number;
  templateName: string;
  title: string;
  defaultDate: string | null;
};

let achievementTemplateSchemaReady: Promise<void> | null = null;

async function ensureAchievementTemplateSchema() {
  if (!achievementTemplateSchemaReady) {
    achievementTemplateSchemaReady = (async () => {
      await db.query(`
        ALTER TABLE card_categories
          ADD COLUMN IF NOT EXISTS target_audience VARCHAR(20) NOT NULL DEFAULT 'student'
      `);
      await db.query(`
        ALTER TABLE student_achievements
          ADD COLUMN IF NOT EXISTS template_id INTEGER,
          ADD COLUMN IF NOT EXISTS institution_id INTEGER,
          ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
      `);
      await db.query(`
        UPDATE student_achievements achievement
        SET academic_year_id = enrollment.academic_year_id
        FROM student_profiles profile
        INNER JOIN student_enrollments enrollment
          ON enrollment.student_id = profile.id
         AND enrollment.status = 'active'
         AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
        INNER JOIN academic_years academic_year
          ON academic_year.id = enrollment.academic_year_id
         AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
        WHERE achievement.student_id = profile.user_id
          AND achievement.institution_id = enrollment.institution_id
          AND achievement.academic_year_id IS NULL
          AND COALESCE(achievement.is_deleted, FALSE) = FALSE
          AND COALESCE(achievement.achievement_date, achievement.created_at::date)
            BETWEEN academic_year.start_date AND academic_year.end_date
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_student_achievements_template_id
        ON student_achievements(template_id)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_student_achievements_institution_id
        ON student_achievements(institution_id)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_student_achievements_session
        ON student_achievements(institution_id, academic_year_id, is_deleted, achievement_date DESC)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_student_achievements_deleted
        ON student_achievements(is_deleted)
      `);
    })().catch((error) => {
      achievementTemplateSchemaReady = null;
      throw error;
    });
  }
  return achievementTemplateSchemaReady;
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function value(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isAchievementDateField(field: DocumentTemplateField) {
  const normalizedName = normalizeFieldName(field.field_name);
  const normalizedLabel = normalizeFieldName(field.label);
  return [
    "achievementdate",
    "issuedate",
    "certificatedate",
    "dateofissue",
    "date",
  ].some((key) => normalizedName === key || normalizedLabel === key);
}

function todayIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function scopedStudentExistsSql(alias: string, paramIndex: number, institutionIds: number[] | null) {
  if (institutionIds === null) return "";
  if (institutionIds.length === 0) return "AND FALSE";

  return `AND EXISTS (
    SELECT 1
    FROM (
      SELECT scoped_im.institution_id
      FROM institution_memberships scoped_im
      INNER JOIN institution_profiles scoped_ip
         ON scoped_ip.id = scoped_im.institution_id
        AND scoped_ip.is_active = TRUE
        AND COALESCE(scoped_ip.is_deleted, FALSE) = FALSE
      WHERE scoped_im.user_id = ${alias}.id
        AND scoped_im.is_active = TRUE
      UNION
      SELECT scoped_up.under_institution_id AS institution_id
      FROM user_profiles scoped_up
      INNER JOIN institution_profiles scoped_profile_ip
         ON scoped_profile_ip.id = scoped_up.under_institution_id
        AND scoped_profile_ip.is_active = TRUE
        AND COALESCE(scoped_profile_ip.is_deleted, FALSE) = FALSE
      WHERE scoped_up.user_id = ${alias}.id
        AND scoped_up.under_institution_id IS NOT NULL
    ) scoped_student_institutions
    WHERE scoped_student_institutions.institution_id = ANY($${paramIndex}::int[])
  )`;
}

function studentRoleSql(alias: string) {
  return `(
    EXISTS (
      SELECT 1
      FROM user_roles student_ur
      INNER JOIN roles student_role ON student_role.id = student_ur.role_id
      WHERE student_ur.user_id = ${alias}.id
        AND student_role.code = 'student'
    )
    OR EXISTS (
      SELECT 1
      FROM institution_memberships student_im
      INNER JOIN roles student_membership_role ON student_membership_role.id = student_im.role_id
      WHERE student_im.user_id = ${alias}.id
        AND student_im.is_active = TRUE
        AND student_membership_role.code = 'student'
    )
  )`;
}

function buildStudentScopeWhere(
  alias: string,
  search: string,
  institutionIds: number[] | null,
  startIndex: number,
  achievementAlias?: string
) {
  const values: unknown[] = [];
  const where: string[] = [
    `COALESCE(${alias}.is_deleted, FALSE) = FALSE`,
    studentRoleSql(alias),
  ];
  let nextIndex = startIndex;

  if (search) {
    values.push(`%${search}%`);
    const searchable = [
      `${alias}.full_name ILIKE $${nextIndex}`,
      `${alias}.email ILIKE $${nextIndex}`,
    ];
    if (achievementAlias) {
      searchable.push(
        `${achievementAlias}.title ILIKE $${nextIndex}`,
        `cc.name ILIKE $${nextIndex}`,
        `COALESCE(${achievementAlias}.remarks, '') ILIKE $${nextIndex}`
      );
    }
    where.push(`(${searchable.join(" OR ")})`);
    nextIndex += 1;
  }

  if (institutionIds !== null) {
    if (institutionIds.length === 0) {
      where.push("FALSE");
    } else {
      values.push(institutionIds);
      where.push(scopedStudentExistsSql(alias, nextIndex, institutionIds).replace(/^AND\s+/, ""));
      nextIndex += 1;
    }
  }

  return { where: where.join("\nAND "), values };
}

async function ensureStudentAllowed(studentId: number, institutionIds: number[] | null) {
  const params: unknown[] = [studentId];
  let scopedWhere = "";
  if (institutionIds !== null) {
    if (institutionIds.length === 0) return false;
    params.push(institutionIds);
    scopedWhere = scopedStudentExistsSql("u", 2, institutionIds);
  }

  const result = await db.query(
    `
      SELECT u.id
      FROM users u
      WHERE u.id = $1
        AND COALESCE(u.is_deleted, FALSE) = FALSE
        AND ${studentRoleSql("u")}
        ${scopedWhere}
      LIMIT 1
    `,
    params
  );

  return result.rowCount > 0;
}

async function listStudents(url: URL, institutionIds: number[] | null) {
  const { page, limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
  const search = (url.searchParams.get("search") || "").trim();
  const academicYearId = Number(url.searchParams.get("academicYearId"));
  const dataScope = buildStudentScopeWhere("u", search, institutionIds, 3);
  const countScope = buildStudentScopeWhere("u", search, institutionIds, 1);
  const hasAcademicYear = Number.isInteger(academicYearId) && academicYearId > 0;
  const dataAcademicYearFilter = hasAcademicYear
    ? `
        AND EXISTS (
          SELECT 1
          FROM student_profiles profile
          INNER JOIN student_enrollments enrollment
            ON enrollment.student_id = profile.id
           AND enrollment.academic_year_id = $${3 + dataScope.values.length}
           AND enrollment.status = 'active'
           AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
          WHERE profile.user_id = u.id
        )
      `
    : "";
  const countAcademicYearFilter = hasAcademicYear
    ? `
        AND EXISTS (
          SELECT 1
          FROM student_profiles profile
          INNER JOIN student_enrollments enrollment
            ON enrollment.student_id = profile.id
           AND enrollment.academic_year_id = $${1 + countScope.values.length}
           AND enrollment.status = 'active'
           AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
          WHERE profile.user_id = u.id
        )
      `
    : "";
  const dataValues = hasAcademicYear ? [...dataScope.values, academicYearId] : dataScope.values;
  const countValues = hasAcademicYear ? [...countScope.values, academicYearId] : countScope.values;

  const [studentsResult, countResult] = await Promise.all([
    db.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          COALESCE(u.is_profile_complete, FALSE) AS is_profile_complete,
          COALESCE(institution_names.institutions, '{}') AS institutions
        FROM users u
        LEFT JOIN LATERAL (
          SELECT array_agg(DISTINCT institution_name ORDER BY institution_name) AS institutions
          FROM (
            SELECT ip.name AS institution_name
            FROM institution_memberships im
            INNER JOIN institution_profiles ip ON ip.id = im.institution_id
            WHERE im.user_id = u.id
              AND im.is_active = TRUE
              AND ip.is_active = TRUE
              AND COALESCE(ip.is_deleted, FALSE) = FALSE
            UNION
            SELECT profile_ip.name AS institution_name
            FROM user_profiles up
            INNER JOIN institution_profiles profile_ip ON profile_ip.id = up.under_institution_id
            WHERE up.user_id = u.id
              AND up.under_institution_id IS NOT NULL
              AND profile_ip.is_active = TRUE
              AND COALESCE(profile_ip.is_deleted, FALSE) = FALSE
          ) institution_scope
        ) institution_names ON TRUE
        WHERE ${dataScope.where}
          ${dataAcademicYearFilter}
        ORDER BY u.full_name ASC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset, ...dataValues]
    ),
    db.query<{ count: string }>(
      `
        SELECT COUNT(*)
        FROM users u
        WHERE ${countScope.where}
          ${countAcademicYearFilter}
      `,
      countValues
    ),
  ]);

  return NextResponse.json({
    data: studentsResult.rows,
    pageCount: getPageCount(Number(countResult.rows[0]?.count || 0), limit),
    page,
  });
}

async function listAchievements(url: URL, institutionIds: number[] | null) {
  await ensureAchievementTemplateSchema();
  const { page, limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
  const search = (url.searchParams.get("search") || "").trim();
  const academicYearId = Number(url.searchParams.get("academicYearId"));
  const dataScope = buildStudentScopeWhere("u", search, institutionIds, 3, "sa");
  const countScope = buildStudentScopeWhere("u", search, institutionIds, 1, "sa");
  const dataAcademicYearFilter = Number.isInteger(academicYearId) && academicYearId > 0
    ? `AND sa.academic_year_id = $${3 + dataScope.values.length}`
    : "";
  const countAcademicYearFilter = Number.isInteger(academicYearId) && academicYearId > 0
    ? `AND sa.academic_year_id = $${1 + countScope.values.length}`
    : "";
  const dataValues = Number.isInteger(academicYearId) && academicYearId > 0
    ? [...dataScope.values, academicYearId]
    : dataScope.values;
  const countValues = Number.isInteger(academicYearId) && academicYearId > 0
    ? [...countScope.values, academicYearId]
    : countScope.values;

  const [achievementsResult, countResult] = await Promise.all([
    db.query(
      `
        SELECT
          sa.id,
          sa.student_id,
          u.full_name AS student_name,
          u.email AS student_email,
          sa.card_category_id,
          cc.name AS category,
          sa.template_id,
          sa.institution_id,
          sa.academic_year_id,
          dt.name AS template_name,
          sa.title,
          sa.achievement_date,
          sa.certificate_url,
          sa.remarks,
          sa.created_by,
          sa.updated_by,
          sa.created_at,
          sa.updated_at
        FROM student_achievements sa
        INNER JOIN users u ON u.id = sa.student_id
        INNER JOIN card_categories cc ON cc.id = sa.card_category_id
        INNER JOIN institution_profiles ip
           ON ip.id = sa.institution_id
          AND ip.is_active = TRUE
          AND COALESCE(ip.is_deleted, FALSE) = FALSE
        LEFT JOIN document_templates dt ON dt.id = sa.template_id
        WHERE ${dataScope.where}
          ${dataAcademicYearFilter}
        ORDER BY COALESCE(sa.achievement_date, sa.created_at::date) DESC, sa.id DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset, ...dataValues]
    ),
    db.query<{ count: string }>(
      `
        SELECT COUNT(*)
        FROM student_achievements sa
        INNER JOIN users u ON u.id = sa.student_id
        INNER JOIN card_categories cc ON cc.id = sa.card_category_id
        INNER JOIN institution_profiles ip
           ON ip.id = sa.institution_id
          AND ip.is_active = TRUE
          AND COALESCE(ip.is_deleted, FALSE) = FALSE
        LEFT JOIN document_templates dt ON dt.id = sa.template_id
        WHERE ${countScope.where}
          ${countAcademicYearFilter}
      `,
      countValues
    ),
  ]);

  return NextResponse.json({
    data: achievementsResult.rows,
    pageCount: getPageCount(Number(countResult.rows[0]?.count || 0), limit),
    page,
  });
}

async function listAchievementTemplates(
  studentId: number,
  institutionIds: number[] | null
) {
  if (!(await ensureStudentAllowed(studentId, institutionIds))) {
    return NextResponse.json(
      { error: "Student is not available in your scope" },
      { status: 403 }
    );
  }

  const params: unknown[] = [studentId];
  let adminScope = "";
  if (institutionIds !== null) {
    if (!institutionIds.length) return NextResponse.json({ data: [] });
    params.push(institutionIds);
    adminScope = `AND it.institution_id = ANY($2::int[])`;
  }

  const result = await db.query<{
    id: number;
    name: string;
    institution_id: number;
    institution_name: string;
    card_category_id: number;
    fields: DocumentTemplateField[];
    field_values: Record<string, unknown> | null;
  }>(
    `
      WITH student_institutions AS (
        SELECT im.institution_id
        FROM institution_memberships im
        WHERE im.user_id = $1 AND im.is_active = TRUE
        UNION
        SELECT up.under_institution_id
        FROM user_profiles up
        WHERE up.user_id = $1 AND up.under_institution_id IS NOT NULL
      )
      SELECT DISTINCT ON (dt.id, it.institution_id)
        dt.id,
        dt.name,
        it.institution_id,
        COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) AS institution_name,
        dt.card_category_id,
        COALESCE(fields.items, '[]'::jsonb) AS fields,
        defaults.field_values
      FROM institution_templates it
      INNER JOIN student_institutions si ON si.institution_id = it.institution_id
      INNER JOIN institution_profiles ip
         ON ip.id = it.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      INNER JOIN document_templates dt
         ON dt.id = it.template_id
        AND COALESCE(dt.is_deleted, FALSE) = FALSE
      INNER JOIN card_categories cc ON cc.id = dt.card_category_id
      LEFT JOIN institution_template_defaults defaults
        ON defaults.institution_id = it.institution_id
       AND defaults.template_id = dt.id
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', dtf.id,
            'field_name', dtf.field_name,
            'label', dtf.label,
            'field_type', dtf.field_type,
            'is_required', dtf.is_required,
            'sort_order', dtf.sort_order
          )
          ORDER BY dtf.sort_order, dtf.id
        ) AS items
        FROM document_template_fields dtf
        WHERE dtf.template_id = dt.id
      ) fields ON TRUE
      WHERE it.is_active = TRUE
        AND dt.is_active = TRUE
        AND cc.slug IN ('achievement-certificate', 'achievement-certificate-student')
        AND COALESCE(cc.target_audience, 'student') = 'student'
        ${adminScope}
      ORDER BY dt.id, it.institution_id, it.is_default DESC, dt.name
    `,
    params
  );

  return NextResponse.json({
    data: result.rows.map((row) => {
      const fields = row.fields ?? [];
      const defaults = row.field_values ?? {};
      return {
        id: row.id,
        name: row.name,
        institution_id: row.institution_id,
        institution_name: row.institution_name,
        card_category_id: row.card_category_id,
        default_date: findDefaultDate(fields, defaults),
        display_title: findDefaultTitle(fields, defaults) ?? row.name,
      };
    }),
  });
}

async function getAchievementPreviewData(
  studentId: number,
  templateId: number,
  institutionId: number,
  achievementDate: string | null,
  academicYearId: number | null,
  institutionIds: number[] | null
) {
  const template = await resolveAchievementTemplate(
    studentId,
    templateId,
    institutionId,
    institutionIds
  );
  if (!template) {
    return NextResponse.json(
      { error: "Select an available achievement template" },
      { status: 400 }
    );
  }

  const params: unknown[] = [studentId, templateId, institutionId, academicYearId];
  let adminScope = "";
  if (institutionIds !== null) {
    if (!institutionIds.length) return NextResponse.json({ error: "Student is not available in your scope" }, { status: 403 });
    params.push(institutionIds);
    adminScope = `AND assignment.institution_id = ANY($5::int[])`;
  }

  const result = await db.query<{
    template_id: number;
    template_name: string;
    card_category_id: number;
    html_template: string | null;
    thumbnail_url: string | null;
    fields: DocumentTemplateField[];
    mappings: DocumentTemplateFieldMapping[];
    field_values: Record<string, unknown> | null;
    institution_id: number;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    profile_about: string | null;
    profile_gender: string | null;
    profile_full_address: string | null;
    admission_number: string | null;
    apar_id: string | null;
    date_of_birth: Date | string | null;
    blood_group: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    roll_number: string | null;
    admission_date: Date | string | null;
    institution_name: string | null;
    institution_slug: string | null;
    institution_type: string | null;
    institution_subtype: string | null;
    institution_board_name: string | null;
    institution_phone: string | null;
    institution_email: string | null;
    institution_established_year: string | number | null;
    institution_website: string | null;
    institution_about: string | null;
    institution_area: string | null;
    institution_latitude: string | number | null;
    institution_longitude: string | number | null;
    program_name: string | null;
    class_category_name: string | null;
    section_name: string | null;
    academic_year: string | null;
    guardian_name: string | null;
    guardian_relation: string | null;
    document_number: string | null;
    institution_full_address: string | null;
    institution_address: string | null;
    institution_city: string | null;
    institution_area_text: string | null;
    institution_state: string | null;
    institution_country: string | null;
    institution_pincode: string | null;
    logo_url: string | null;
    gallery_image_url: string | null;
  }>(
    `
      SELECT
        dt.id AS template_id,
        dt.name AS template_name,
        dt.card_category_id,
        dt.html_template,
        dt.thumbnail_url,
        COALESCE(fields.items, '[]'::jsonb) AS fields,
        COALESCE(mappings.items, '[]'::jsonb) AS mappings,
        defaults.field_values,
        assignment.institution_id,
        u.full_name,
        u.email,
        u.phone,
        u.avatar_url,
        up.about AS profile_about,
        up.gender AS profile_gender,
        ul.full_address AS profile_full_address,
        sp.admission_number,
        sp.apar_id,
        sp.date_of_birth,
        sp.blood_group,
        sp.emergency_contact_name,
        sp.emergency_contact_phone,
        se.roll_number,
        se.admission_date,
        ip.name AS institution_name,
        ip.slug AS institution_slug,
        itype.name AS institution_type,
        isubtype.name AS institution_subtype,
        board.name AS institution_board_name,
        ip.phone AS institution_phone,
        ip.email AS institution_email,
        ip.established_year AS institution_established_year,
        ip.website AS institution_website,
        ip.about AS institution_about,
        iloc.name AS institution_area,
        iloc.latitude AS institution_latitude,
        iloc.longitude AS institution_longitude,
        prog.title AS program_name,
        class_category.name AS class_category_name,
        section.name AS section_name,
        ay.name AS academic_year,
        guardian_user.full_name AS guardian_name,
        sg.relationship AS guardian_relation,
        sd.document_number AS document_number,
        institution_location.full_address AS institution_full_address,
        institution_location.address AS institution_address,
        institution_location.city AS institution_city,
        institution_location.area AS institution_area_text,
        institution_location.state AS institution_state,
        institution_location.country AS institution_country,
        institution_location.pincode AS institution_pincode,
        media.logo_url,
        media.gallery_image_url
      FROM institution_templates assignment
      INNER JOIN document_templates dt
         ON dt.id = assignment.template_id
        AND COALESCE(dt.is_deleted, FALSE) = FALSE
      INNER JOIN card_categories cc ON cc.id = dt.card_category_id
      INNER JOIN institution_profiles ip
         ON ip.id = assignment.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      INNER JOIN users u ON u.id = $1
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN student_enrollments se
        ON se.student_id = sp.id
       AND se.institution_id = assignment.institution_id
       AND se.status = 'active'
       AND COALESCE(se.is_deleted, FALSE) = FALSE
       AND ($4::int IS NULL OR se.academic_year_id = $4)
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN user_locations ul ON ul.user_id = u.id
      LEFT JOIN institution_types itype ON itype.id = ip.institution_type_id
      LEFT JOIN institution_subtypes isubtype ON isubtype.id = ip.institution_subtype_id
      LEFT JOIN boards board ON board.id = ip.board_id
      LEFT JOIN locations iloc ON iloc.id = ip.location_id
      LEFT JOIN institution_programs prog ON prog.id = se.program_id
      LEFT JOIN categories class_category ON class_category.id = se.class_category_id
      LEFT JOIN sections section ON section.id = se.section_id
      LEFT JOIN academic_years ay ON ay.id = se.academic_year_id
      LEFT JOIN LATERAL (
        SELECT
          l.name AS area,
          l.name AS address,
          l.name AS full_address,
          l.name AS city,
          NULL::text AS state,
          NULL::text AS country,
          NULL::text AS pincode
        FROM locations l
        WHERE l.id = ip.location_id
        LIMIT 1
      ) institution_location ON TRUE
      LEFT JOIN LATERAL (
        SELECT sg.*, gu.full_name
        FROM student_guardians sg
        INNER JOIN users gu ON gu.id = sg.guardian_user_id
        WHERE sg.student_id = sp.id
          AND COALESCE(sg.is_deleted, FALSE) = FALSE
        ORDER BY sg.is_primary DESC, sg.id ASC
        LIMIT 1
      ) guardian_join ON TRUE
      LEFT JOIN student_guardians sg ON sg.id = guardian_join.id
      LEFT JOIN users guardian_user ON guardian_user.id = sg.guardian_user_id
      LEFT JOIN LATERAL (
        SELECT document_number
        FROM student_documents
        WHERE student_id = sp.id
          AND COALESCE(is_deleted, FALSE) = FALSE
        ORDER BY is_verified DESC, id DESC
        LIMIT 1
      ) sd ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          (array_agg(url ORDER BY (media_type = 'logo') DESC, (lower(coalesce(title, '')) LIKE '%logo%') DESC, sort_order ASC, id ASC))[1] AS logo_url,
          (array_agg(url ORDER BY (media_type = 'logo') ASC, sort_order ASC, id ASC))[1] AS gallery_image_url
        FROM institution_media
        WHERE institution_id = ip.id
          AND COALESCE(is_deleted, FALSE) = FALSE
          AND media_type IN ('image', 'logo')
      ) media ON TRUE
      LEFT JOIN institution_template_defaults defaults
        ON defaults.institution_id = assignment.institution_id
       AND defaults.template_id = dt.id
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', dtf.id,
            'field_name', dtf.field_name,
            'label', dtf.label,
            'field_type', dtf.field_type,
            'is_required', dtf.is_required,
            'sort_order', dtf.sort_order
          )
          ORDER BY dtf.sort_order, dtf.id
        ) AS items
        FROM document_template_fields dtf
        WHERE dtf.template_id = dt.id
      ) fields ON TRUE
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', dtfm.id,
            'template_id', dtfm.template_id,
            'institution_id', dtfm.institution_id,
            'template_field_id', dtfm.template_field_id,
            'template_field_name', dtfm.template_field_name,
            'source_field_key', dtfm.source_field_key,
            'source_field_label', dtfm.source_field_label,
            'transform', dtfm.transform,
            'fallback_value', dtfm.fallback_value,
            'is_active', dtfm.is_active
          )
          ORDER BY dtfm.template_field_name
        ) AS items
        FROM document_template_field_mappings dtfm
        WHERE dtfm.template_id = dt.id
          AND dtfm.is_active = TRUE
          AND (dtfm.institution_id IS NULL OR dtfm.institution_id = assignment.institution_id)
      ) mappings ON TRUE
      WHERE assignment.template_id = $2
        AND assignment.institution_id = $3
        AND assignment.is_active = TRUE
        AND dt.is_active = TRUE
        AND cc.slug IN ('achievement-certificate', 'achievement-certificate-student')
        AND COALESCE(cc.target_audience, 'student') = 'student'
        AND COALESCE(u.is_deleted, FALSE) = FALSE
        AND ${studentRoleSql("u")}
        ${adminScope}
      ORDER BY se.updated_at DESC NULLS LAST, se.id DESC NULLS LAST
      LIMIT 1
    `,
    params
  );

  const row = result.rows[0];
  if (!row) {
    return NextResponse.json(
      { error: "Student or achievement template is not available" },
      { status: 404 }
    );
  }

  const fields = row.fields ?? [];
  const storedDefaults = row.field_values ?? {};
  const defaults = Object.fromEntries(
    Object.entries(storedDefaults)
      .filter(([key]) => key !== AUTO_GENERATE_FIELDS_KEY)
      .map(([key, entryValue]) => [key, value(entryValue)])
  );
  for (const fieldName of readAutoGenerateFields(storedDefaults)) {
    defaults[fieldName] = generateCertificateNumber();
  }

  const programName = row.program_name ?? row.class_category_name;
  const institutionArea = row.institution_area_text ?? row.institution_area;
  const sourceValues: Record<string, string> = {
    "user.full_name": value(row.full_name),
    "user.email": value(row.email),
    "user.phone": value(row.phone),
    "user.avatar_url": value(row.avatar_url),
    "profile.about": value(row.profile_about),
    "profile.gender": value(row.profile_gender),
    "profile.full_address": stripGooglePlusCodeFromAddress(value(row.profile_full_address)),
    "student.admission_number": value(row.admission_number),
    "student.apar_id": value(row.apar_id),
    "student.date_of_birth": value(row.date_of_birth),
    "student.blood_group": value(row.blood_group),
    "student.emergency_contact_name": value(row.emergency_contact_name),
    "student.emergency_contact_phone": value(row.emergency_contact_phone),
    "enrollment.institution_name": value(row.institution_name),
    "enrollment.program_name": value(programName),
    "enrollment.section_name": value(row.section_name),
    "enrollment.academic_year": value(row.academic_year),
    "enrollment.roll_number": value(row.roll_number),
    "enrollment.admission_date": value(row.admission_date),
    "guardian.primary_name": value(row.guardian_name),
    "guardian.primary_relation": value(row.guardian_relation),
    "document.primary_number": value(row.document_number),
    "institution.name": value(row.institution_name),
    "institution.type": value(row.institution_type),
    "institution.board_name": value(row.institution_board_name),
    "institution.subtype": value(row.institution_subtype),
    "institution.slug": value(row.institution_slug),
    "institution.phone": value(row.institution_phone),
    "institution.email": value(row.institution_email),
    "institution.established_year": value(row.institution_established_year),
    "institution.website": value(row.institution_website),
    "institution.about": value(row.institution_about),
    "institution.full_address": stripGooglePlusCodeFromAddress(value(row.institution_full_address)),
    "institution.address": stripGooglePlusCodeFromAddress(value(row.institution_address)),
    "institution.city": value(row.institution_city),
    "institution.area": value(institutionArea),
    "institution.state": value(row.institution_state),
    "institution.country": value(row.institution_country),
    "institution.pincode": value(row.institution_pincode),
    "institution.latitude": value(row.institution_latitude),
    "institution.longitude": value(row.institution_longitude),
    "institution.logo_url": value(row.logo_url),
    "institution.gallery_image_url": value(row.gallery_image_url),
  };

  const mappings = row.mappings ?? [];
  const mappedFieldNames = new Set(mappings.map((mapping) => mapping.template_field_name));
  const finalDate = achievementDate || template.defaultDate || todayIsoDate();
  const fieldValues = Object.fromEntries(fields.map((field) => [field.field_name, ""]));

  for (const [key, entryValue] of Object.entries(defaults)) {
    if (key in fieldValues) fieldValues[key] = entryValue;
  }
  for (const mapping of mappings) {
    fieldValues[mapping.template_field_name] =
      sourceValues[mapping.source_field_key] ?? mapping.fallback_value ?? "";
  }
  for (const field of fields) {
    if (isAchievementDateField(field)) {
      fieldValues[field.field_name] = finalDate;
    }
  }

  const editableFields = fields.filter((field) => {
    if (mappedFieldNames.has(field.field_name)) return false;
    if (isAchievementDateField(field)) return false;
    return !(fieldValues[field.field_name] ?? "").trim();
  });

  return NextResponse.json({
    data: {
      template: {
        id: row.template_id,
        name: row.template_name,
        card_category_id: row.card_category_id,
        category_name: "Achievement Certificate",
        thumbnail_url: row.thumbnail_url,
        html_template: row.html_template,
      },
      fields,
      values: fieldValues,
      editable_fields: editableFields,
      achievement_date: finalDate,
      title: template.title,
    },
  });
}

function parsePayload(body: Record<string, unknown>) {
  const studentId = Number(body.student_id);
  const templateId = Number(body.template_id);
  const institutionId = Number(body.institution_id);
  const academicYearId = Number(body.academicYearId ?? body.academic_year_id);
  const achievementDate = body.achievement_date ? String(body.achievement_date) : null;
  const certificateUrl = body.certificate_url ? String(body.certificate_url) : null;
  const remarks = body.remarks ? String(body.remarks).trim() : null;

  if (!Number.isInteger(studentId) || studentId <= 0) throw new Error("Student is required");
  if (!Number.isInteger(templateId) || templateId <= 0) throw new Error("Template is required");
  if (!Number.isInteger(institutionId) || institutionId <= 0) throw new Error("Template institution is required");

  return {
    studentId,
    templateId,
    institutionId,
    academicYearId: Number.isInteger(academicYearId) && academicYearId > 0 ? academicYearId : null,
    achievementDate,
    certificateUrl,
    remarks,
  };
}

async function resolveStudentAchievementAcademicYear(
  studentUserId: number,
  institutionId: number,
  requestedAcademicYearId: number | null
) {
  const result = await db.query<{ academic_year_id: number }>(
    `
      SELECT enrollment.academic_year_id
      FROM student_profiles profile
      INNER JOIN student_enrollments enrollment
        ON enrollment.student_id = profile.id
       AND enrollment.institution_id = $2
       AND enrollment.status = 'active'
       AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
      INNER JOIN institution_profiles institution
        ON institution.id = enrollment.institution_id
      WHERE profile.user_id = $1
        AND (
          ($3::int IS NOT NULL AND enrollment.academic_year_id = $3)
          OR ($3::int IS NULL AND enrollment.academic_year_id = institution.default_academic_year_id)
        )
      ORDER BY enrollment.updated_at DESC NULLS LAST, enrollment.id DESC
      LIMIT 1
    `,
    [studentUserId, institutionId, requestedAcademicYearId]
  );
  return result.rows[0]?.academic_year_id ? Number(result.rows[0].academic_year_id) : null;
}

async function resolveAchievementTemplate(
  studentId: number,
  templateId: number,
  requestedInstitutionId: number,
  institutionIds: number[] | null
): Promise<AchievementTemplate | null> {
  const params: unknown[] = [studentId, templateId, requestedInstitutionId];
  let adminScope = "";
  if (institutionIds !== null) {
    if (!institutionIds.length) return null;
    params.push(institutionIds);
    adminScope = `AND it.institution_id = ANY($4::int[])`;
  }
  const result = await db.query<{
    template_id: number;
    institution_id: number;
    card_category_id: number;
    template_name: string;
    fields: DocumentTemplateField[];
    field_values: Record<string, unknown> | null;
  }>(
    `
      SELECT
        dt.id AS template_id,
        it.institution_id,
        dt.card_category_id,
        dt.name AS template_name,
        COALESCE(fields.items, '[]'::jsonb) AS fields,
        defaults.field_values
      FROM institution_templates it
      INNER JOIN document_templates dt ON dt.id = it.template_id
      INNER JOIN card_categories cc ON cc.id = dt.card_category_id
      LEFT JOIN institution_template_defaults defaults
        ON defaults.institution_id = it.institution_id
       AND defaults.template_id = dt.id
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', dtf.id,
            'field_name', dtf.field_name,
            'label', dtf.label,
            'field_type', dtf.field_type,
            'is_required', dtf.is_required,
            'sort_order', dtf.sort_order
          )
          ORDER BY dtf.sort_order, dtf.id
        ) AS items
        FROM document_template_fields dtf
        WHERE dtf.template_id = dt.id
      ) fields ON TRUE
      WHERE dt.id = $2
        AND it.institution_id = $3
        AND it.is_active = TRUE
        AND dt.is_active = TRUE
        AND cc.slug IN ('achievement-certificate', 'achievement-certificate-student')
        AND COALESCE(cc.target_audience, 'student') = 'student'
        AND EXISTS (
          SELECT 1
          FROM (
            SELECT im.institution_id
            FROM institution_memberships im
            WHERE im.user_id = $1 AND im.is_active = TRUE
            UNION
            SELECT up.under_institution_id
            FROM user_profiles up
            WHERE up.user_id = $1 AND up.under_institution_id IS NOT NULL
          ) student_institutions
          WHERE student_institutions.institution_id = it.institution_id
        )
        ${adminScope}
      LIMIT 1
    `,
    params
  );
  const row = result.rows[0];
  if (!row) return null;
  const fields = row.fields ?? [];
  const defaults = row.field_values ?? {};
  return {
    templateId: row.template_id,
    institutionId: row.institution_id,
    cardCategoryId: row.card_category_id,
    templateName: row.template_name,
    title: findDefaultTitle(fields, defaults) ?? row.template_name,
    defaultDate: findDefaultDate(fields, defaults),
  };
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const url = new URL(req.url);
    const institutionIds = getAllowedInstitutionIds(currentUser);

    if (url.searchParams.get("action") === "students") {
      return await listStudents(url, institutionIds);
    }
    if (url.searchParams.get("action") === "templates") {
      const studentId = Number(url.searchParams.get("studentId"));
      if (!Number.isInteger(studentId) || studentId <= 0) {
        return NextResponse.json({ error: "Student is required" }, { status: 400 });
      }
      return await listAchievementTemplates(studentId, institutionIds);
    }
    if (url.searchParams.get("action") === "preview-data") {
      const studentId = Number(url.searchParams.get("studentId"));
      const templateId = Number(url.searchParams.get("templateId"));
      const institutionId = Number(url.searchParams.get("institutionId"));
      const academicYearId = Number(url.searchParams.get("academicYearId"));
      const achievementDate = url.searchParams.get("achievementDate") || null;
      if (!Number.isInteger(studentId) || studentId <= 0) {
        return NextResponse.json({ error: "Student is required" }, { status: 400 });
      }
      if (!Number.isInteger(templateId) || templateId <= 0) {
        return NextResponse.json({ error: "Template is required" }, { status: 400 });
      }
      if (!Number.isInteger(institutionId) || institutionId <= 0) {
        return NextResponse.json({ error: "Template institution is required" }, { status: 400 });
      }
      return await getAchievementPreviewData(
        studentId,
        templateId,
        institutionId,
        achievementDate,
        Number.isInteger(academicYearId) && academicYearId > 0 ? academicYearId : null,
        institutionIds
      );
    }

    return await listAchievements(url, institutionIds);
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    if (message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "Unauthorized" || message === "User not found") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser: CurrentUser = await requireAdmin(req);
    await ensureAchievementTemplateSchema();
    const payload = parsePayload(await req.json());
    const institutionIds = getAllowedInstitutionIds(currentUser);
    const allowed = await ensureStudentAllowed(payload.studentId, institutionIds);
    if (!allowed) return NextResponse.json({ error: "Student is not available in your scope" }, { status: 403 });
    const template = await resolveAchievementTemplate(
      payload.studentId,
      payload.templateId,
      payload.institutionId,
      institutionIds
    );
    if (!template) {
      return NextResponse.json(
        { error: "Select an available achievement template" },
        { status: 400 }
      );
    }
    const academicYearId = await resolveStudentAchievementAcademicYear(
      payload.studentId,
      template.institutionId,
      null
    );
    if (!academicYearId) {
      return NextResponse.json(
        { error: "Student is not enrolled in the selected session" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
        INSERT INTO student_achievements
          (
            student_id,
            card_category_id,
            template_id,
            institution_id,
            academic_year_id,
            title,
            achievement_date,
            certificate_url,
            remarks,
            created_by,
            updated_by
          )
        VALUES (
          $1,$2,$3,$4,$5,$6,
          COALESCE($7::date, $8::date, timezone('Asia/Kolkata', CURRENT_TIMESTAMP)::date),
          $9,$10,$11,$11
        )
        RETURNING *
      `,
      [
        payload.studentId,
        template.cardCategoryId,
        template.templateId,
        template.institutionId,
        academicYearId,
        template.title,
        payload.achievementDate,
        template.defaultDate,
        payload.certificateUrl,
        payload.remarks,
        currentUser.id,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser: CurrentUser = await requireAdmin(req);
    await ensureAchievementTemplateSchema();
    const body = await req.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Achievement id is required" }, { status: 400 });
    }
    const payload = parsePayload(body);
    const institutionIds = getAllowedInstitutionIds(currentUser);
    const allowed = await ensureStudentAllowed(payload.studentId, institutionIds);
    if (!allowed) return NextResponse.json({ error: "Student is not available in your scope" }, { status: 403 });
    const template = await resolveAchievementTemplate(
      payload.studentId,
      payload.templateId,
      payload.institutionId,
      institutionIds
    );
    if (!template) {
      return NextResponse.json(
        { error: "Select an available achievement template" },
        { status: 400 }
      );
    }
    const academicYearId = await resolveStudentAchievementAcademicYear(
      payload.studentId,
      template.institutionId,
      payload.academicYearId
    );
    if (!academicYearId) {
      return NextResponse.json(
        { error: "Student is not enrolled in the selected session" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
        UPDATE student_achievements
        SET student_id = $2,
            card_category_id = $3,
            template_id = $4,
            institution_id = $5,
            academic_year_id = $6,
            title = $7,
            achievement_date = COALESCE(
              $8::date,
              $9::date,
              timezone('Asia/Kolkata', CURRENT_TIMESTAMP)::date
            ),
            certificate_url = $10,
            remarks = $11,
            updated_by = $12,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
      [
        id,
        payload.studentId,
        template.cardCategoryId,
        template.templateId,
        template.institutionId,
        academicYearId,
        template.title,
        payload.achievementDate,
        template.defaultDate,
        payload.certificateUrl,
        payload.remarks,
        currentUser.id,
      ]
    );

    if (!result.rowCount) return NextResponse.json({ error: "Achievement not found" }, { status: 404 });
    return NextResponse.json({ data: result.rows[0] });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids)
      ? body.ids.map(Number).filter((id) => Number.isInteger(id) && id > 0)
      : [Number(body.id)].filter((id) => Number.isInteger(id) && id > 0);
    if (!ids.length) return NextResponse.json({ error: "Select at least one achievement" }, { status: 400 });

    const institutionIds = getAllowedInstitutionIds(currentUser);
    const params: unknown[] = [ids];
    let scopedWhere = "";
    if (institutionIds !== null) {
      if (institutionIds.length === 0) return NextResponse.json({ deleted: 0 });
      params.push(institutionIds);
      scopedWhere = scopedStudentExistsSql("u", 2, institutionIds);
    }

    const result = await db.query(
      `
        UPDATE student_achievements sa
        SET is_deleted = TRUE,
            deleted_at = NOW(),
            updated_by = $${params.length + 1},
            updated_at = NOW()
        FROM users u
        WHERE u.id = sa.student_id
          AND sa.id = ANY($1::int[])
          AND COALESCE(sa.is_deleted, FALSE) = FALSE
          ${scopedWhere}
      `,
      [...params, currentUser.id]
    );

    return NextResponse.json({ deleted: result.rowCount || 0 });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 400 });
  }
}
