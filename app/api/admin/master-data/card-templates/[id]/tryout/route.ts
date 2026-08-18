import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import {
  AUTO_GENERATE_FIELDS_KEY,
  generateCertificateNumber,
  readAutoGenerateFields,
} from "@/lib/card-templates/institution-defaults";
import { stripGooglePlusCodeFromAddress } from "@/lib/card-templates/address";
import { db } from "@/lib/db/db";

type Context = { params: Promise<{ id: string }> };

function parseId(value: string | null | undefined, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`Invalid ${label}`);
  return id;
}

function parseOptionalId(value: string | null | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function assertInstitutionAccess(
  institutionId: number | null,
  isPlatformAdmin: boolean,
  institutionIds: number[]
) {
  if (!institutionId || isPlatformAdmin) return institutionId;
  if (!institutionIds.includes(institutionId)) throw new Error("Forbidden: Admin access required");
  return institutionId;
}

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    message.includes("not found") ? 404 :
    400;
  return NextResponse.json({ error: message }, { status });
}

function allowedInstitutionIds(currentUser: Awaited<ReturnType<typeof requireAdmin>>) {
  if (isPlatformAdminUser(currentUser)) return [];
  return currentUser.memberships
    .filter((membership) =>
      membership.permissions.includes("*") ||
      membership.permissions.includes("content.card_templates.view")
    )
    .map((membership) => membership.institution_id);
}

function value(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

async function ensureTemplateAccess(templateId: number, isPlatformAdmin: boolean, institutionIds: number[]) {
  const result = await db.query(
    `
      SELECT 1
      FROM document_templates dt
      WHERE dt.id = $1
        AND COALESCE(dt.is_deleted, FALSE) = FALSE
        AND (
          $2::boolean
          OR EXISTS (
            SELECT 1
            FROM institution_templates it
            INNER JOIN institution_profiles ip
               ON ip.id = it.institution_id
              AND ip.is_active = TRUE
              AND COALESCE(ip.is_deleted, FALSE) = FALSE
            WHERE it.template_id = dt.id
              AND it.is_active = TRUE
              AND it.institution_id = ANY($3::int[])
          )
        )
      LIMIT 1
    `,
    [templateId, isPlatformAdmin, institutionIds]
  );
  if (!result.rowCount) throw new Error("Template not found");
}

async function getTemplateTargetAudience(templateId: number) {
  const result = await db.query<{ target_audience: "student" | "staff" }>(
    `
      SELECT COALESCE(cc.target_audience, 'student') AS target_audience
      FROM document_templates dt
      INNER JOIN card_categories cc ON cc.id = dt.card_category_id
      WHERE dt.id = $1
      LIMIT 1
    `,
    [templateId]
  );
  return result.rows[0]?.target_audience === "staff" ? "staff" : "student";
}

async function ensureCardCategoryAudienceSchema() {
  await db.query(`
    ALTER TABLE card_categories
      ADD COLUMN IF NOT EXISTS target_audience VARCHAR(20) NOT NULL DEFAULT 'student';
  `);
}

async function resolveTryoutAcademicYearId(
  requestedAcademicYearId: number | null,
  requestedInstitutionId: number | null,
  isPlatformAdmin: boolean,
  institutionIds: number[],
) {
  if (requestedAcademicYearId) return requestedAcademicYearId;
  const institutionId =
    requestedInstitutionId ??
    (!isPlatformAdmin && institutionIds.length === 1 ? institutionIds[0] : null);
  if (!institutionId) return null;

  const result = await db.query<{ id: number }>(
    `
      SELECT ay.id
      FROM academic_years ay
      INNER JOIN institution_profiles institution ON institution.id = ay.institution_id
      WHERE ay.institution_id = $1
        AND COALESCE(ay.is_deleted, FALSE) = FALSE
        AND COALESCE(ay.is_active, TRUE) = TRUE
        AND (
          ay.id = institution.default_academic_year_id
          OR (
            institution.default_academic_year_id IS NULL
            AND CURRENT_DATE BETWEEN ay.start_date AND ay.end_date
          )
          OR (
            institution.default_academic_year_id IS NULL
            AND ay.start_date <= CURRENT_DATE
          )
        )
      ORDER BY
        CASE WHEN ay.id = institution.default_academic_year_id THEN 0 ELSE 1 END,
        CASE WHEN CURRENT_DATE BETWEEN ay.start_date AND ay.end_date THEN 0 ELSE 1 END,
        ay.start_date DESC,
        ay.id DESC
      LIMIT 1
    `,
    [institutionId]
  );
  return Number(result.rows[0]?.id) || null;
}

async function getStudents(
  templateId: number,
  isPlatformAdmin: boolean,
  institutionIds: number[],
  search: string,
  academicYearId: number | null,
  institutionId: number | null,
) {
  const result = await db.query(
    `
      SELECT DISTINCT ON (sp.id)
        sp.id,
        u.full_name AS name,
        u.email,
        sp.admission_number,
        COALESCE(u.is_profile_complete, FALSE) AS is_profile_complete,
        se.institution_id,
        ip.name AS institution_name,
        COALESCE(prog.title, class_category.name) AS program_name,
        section.name AS section_name
      FROM institution_templates it
      INNER JOIN student_enrollments se
        ON se.institution_id = it.institution_id
       AND se.status = 'active'
       AND COALESCE(se.is_deleted, FALSE) = FALSE
      INNER JOIN student_profiles sp ON sp.id = se.student_id
      INNER JOIN users u ON u.id = sp.user_id
      INNER JOIN institution_profiles ip
         ON ip.id = se.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      LEFT JOIN institution_programs prog
         ON prog.id = se.program_id
        AND COALESCE(prog.is_deleted, FALSE) = FALSE
      LEFT JOIN categories class_category ON class_category.id = se.class_category_id
      LEFT JOIN sections section ON section.id = se.section_id
      WHERE it.template_id = $1
        AND it.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
        AND ($2::boolean OR it.institution_id = ANY($3::int[]))
        AND ($6::int IS NULL OR se.academic_year_id = $6)
        AND ($7::int IS NULL OR se.institution_id = $7)
        AND (
          $4 = ''
          OR u.full_name ILIKE $5
          OR u.email ILIKE $5
          OR sp.admission_number ILIKE $5
        )
      ORDER BY sp.id, u.full_name
      LIMIT 25
    `,
    [templateId, isPlatformAdmin, institutionIds, search, `%${search}%`, academicYearId, institutionId]
  );
  return result.rows;
}

async function getStaff(
  templateId: number,
  isPlatformAdmin: boolean,
  institutionIds: number[],
  search: string,
  institutionId: number | null,
) {
  const result = await db.query(
    `
      SELECT DISTINCT ON (u.id)
        u.id,
        u.full_name AS name,
        u.email,
        u.phone,
        COALESCE(u.is_profile_complete, FALSE) AS is_profile_complete,
        im.institution_id,
        ip.name AS institution_name,
        r.code AS role_code,
        initcap(replace(r.code, '_', ' ')) AS role_name
      FROM institution_templates it
      INNER JOIN institution_memberships im
        ON im.institution_id = it.institution_id
       AND im.is_active = TRUE
       AND COALESCE(im.is_deleted, FALSE) = FALSE
      INNER JOIN roles r ON r.id = im.role_id AND r.code IN ('teacher', 'driver')
      INNER JOIN users u ON u.id = im.user_id
      INNER JOIN institution_profiles ip
         ON ip.id = im.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      WHERE it.template_id = $1
        AND it.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
        AND u.is_active = TRUE
        AND ($2::boolean OR it.institution_id = ANY($3::int[]))
        AND ($6::int IS NULL OR im.institution_id = $6)
        AND (
          $4 = ''
          OR u.full_name ILIKE $5
          OR u.email ILIKE $5
          OR u.phone ILIKE $5
          OR r.code ILIKE $5
        )
      ORDER BY u.id, u.full_name
      LIMIT 25
    `,
    [templateId, isPlatformAdmin, institutionIds, search, `%${search}%`, institutionId]
  );
  return result.rows;
}

async function getStudentValues(
  templateId: number,
  studentId: number,
  isPlatformAdmin: boolean,
  institutionIds: number[],
  academicYearId: number | null,
  institutionId: number | null,
) {
  const result = await db.query(
    `
      SELECT
        sp.id AS student_id,
        se.institution_id,
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
        se.program_id,
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
      FROM institution_templates template_assignment
      INNER JOIN student_enrollments se
        ON se.institution_id = template_assignment.institution_id
       AND se.status = 'active'
       AND COALESCE(se.is_deleted, FALSE) = FALSE
      INNER JOIN student_profiles sp ON sp.id = se.student_id
      INNER JOIN users u ON u.id = sp.user_id
      INNER JOIN institution_profiles ip
         ON ip.id = se.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN user_locations ul ON ul.user_id = u.id
      LEFT JOIN institution_types itype ON itype.id = ip.institution_type_id
      LEFT JOIN institution_subtypes isubtype ON isubtype.id = ip.institution_subtype_id
      LEFT JOIN boards board ON board.id = ip.board_id
      LEFT JOIN locations iloc ON iloc.id = ip.location_id
      LEFT JOIN institution_programs prog
         ON prog.id = se.program_id
        AND COALESCE(prog.is_deleted, FALSE) = FALSE
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
      WHERE template_assignment.template_id = $1
        AND template_assignment.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
        AND sp.id = $2
        AND ($3::boolean OR template_assignment.institution_id = ANY($4::int[]))
        AND ($5::int IS NULL OR se.academic_year_id = $5)
        AND ($6::int IS NULL OR se.institution_id = $6)
      ORDER BY se.updated_at DESC, se.id DESC
      LIMIT 1
    `,
    [templateId, studentId, isPlatformAdmin, institutionIds, academicYearId, institutionId]
  );
  const row = result.rows[0];
  if (!row) throw new Error("Student not found");

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
  if (row.program_id) {
    const feeResult = await db.query(
      `
        SELECT title, amount
        FROM program_fee_components
        WHERE program_id = $1
        ORDER BY sort_order ASC, id ASC
        LIMIT 20
      `,
      [row.program_id]
    );
    let totalFee = 0;
    feeResult.rows.forEach((fee, index) => {
      const itemIndex = index + 1;
      const amount = Number(fee.amount ?? 0) || 0;
      totalFee += amount;
      sourceValues[`feeItem${itemIndex}Name`] = value(fee.title);
      sourceValues[`feeItem${itemIndex}Amount`] = amount ? String(amount) : "";
    });
    for (let itemIndex = feeResult.rows.length + 1; itemIndex <= 20; itemIndex += 1) {
      sourceValues[`feeItem${itemIndex}Name`] = "NA";
      sourceValues[`feeItem${itemIndex}Amount`] = "NA";
    }
    sourceValues.totalFee = totalFee ? String(totalFee) : "";
    sourceValues.subtotalAmount = sourceValues.totalFee;
    sourceValues.netAmountPayable = sourceValues.totalFee;
    sourceValues.paymentAmount = sourceValues.totalFee;
  }
  const defaultsResult = await db.query<{ field_values: Record<string, unknown> }>(
    `
      SELECT field_values
      FROM institution_template_defaults
      WHERE institution_id = $1 AND template_id = $2
      LIMIT 1
    `,
    [row.institution_id, templateId]
  );
  const storedDefaults = defaultsResult.rows[0]?.field_values ?? {};
  const institutionDefaults = Object.fromEntries(
    Object.entries(storedDefaults)
      .filter(([key]) => key !== AUTO_GENERATE_FIELDS_KEY)
      .map(([key, entryValue]) => [
      key,
      value(entryValue),
    ])
  );
  for (const fieldName of readAutoGenerateFields(storedDefaults)) {
    institutionDefaults[fieldName] = generateCertificateNumber();
  }
  return { sourceValues, institutionDefaults };
}

async function getStaffValues(
  templateId: number,
  staffUserId: number,
  isPlatformAdmin: boolean,
  institutionIds: number[],
  institutionId: number | null,
) {
  const result = await db.query(
    `
      SELECT DISTINCT ON (u.id)
        u.id AS staff_user_id,
        im.institution_id,
        im.join_date,
        u.full_name,
        u.email,
        u.phone,
        u.avatar_url,
        up.about AS profile_about,
        up.gender AS profile_gender,
        ul.full_address AS profile_full_address,
        r.code AS role_code,
        initcap(replace(r.code, '_', ' ')) AS role_name,
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
        institution_location.full_address AS institution_full_address,
        institution_location.address AS institution_address,
        institution_location.city AS institution_city,
        institution_location.area AS institution_area_text,
        institution_location.state AS institution_state,
        institution_location.country AS institution_country,
        institution_location.pincode AS institution_pincode,
        media.logo_url,
        media.gallery_image_url
      FROM institution_templates template_assignment
      INNER JOIN institution_memberships im
        ON im.institution_id = template_assignment.institution_id
       AND im.is_active = TRUE
       AND COALESCE(im.is_deleted, FALSE) = FALSE
      INNER JOIN roles r ON r.id = im.role_id AND r.code IN ('teacher', 'driver')
      INNER JOIN users u ON u.id = im.user_id
      INNER JOIN institution_profiles ip
         ON ip.id = im.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN user_locations ul ON ul.user_id = u.id
      LEFT JOIN institution_types itype ON itype.id = ip.institution_type_id
      LEFT JOIN institution_subtypes isubtype ON isubtype.id = ip.institution_subtype_id
      LEFT JOIN boards board ON board.id = ip.board_id
      LEFT JOIN locations iloc ON iloc.id = ip.location_id
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
        SELECT
          (array_agg(url ORDER BY (media_type = 'logo') DESC, (lower(coalesce(title, '')) LIKE '%logo%') DESC, sort_order ASC, id ASC))[1] AS logo_url,
          (array_agg(url ORDER BY (media_type = 'logo') ASC, sort_order ASC, id ASC))[1] AS gallery_image_url
        FROM institution_media
        WHERE institution_id = ip.id
          AND COALESCE(is_deleted, FALSE) = FALSE
          AND media_type IN ('image', 'logo')
      ) media ON TRUE
      WHERE template_assignment.template_id = $1
        AND template_assignment.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
        AND u.is_active = TRUE
        AND u.id = $2
        AND ($3::boolean OR template_assignment.institution_id = ANY($4::int[]))
        AND ($5::int IS NULL OR im.institution_id = $5)
      ORDER BY u.id, im.updated_at DESC, im.id DESC
      LIMIT 1
    `,
    [templateId, staffUserId, isPlatformAdmin, institutionIds, institutionId]
  );
  const row = result.rows[0];
  if (!row) throw new Error("Staff member not found");

  const institutionArea = row.institution_area_text ?? row.institution_area;
  const sourceValues = {
    "user.full_name": value(row.full_name),
    "user.email": value(row.email),
    "user.phone": value(row.phone),
    "user.avatar_url": value(row.avatar_url),
    "profile.about": value(row.profile_about),
    "profile.gender": value(row.profile_gender),
    "profile.full_address": stripGooglePlusCodeFromAddress(value(row.profile_full_address)),
    "staff.role_code": value(row.role_code),
    "staff.role_name": value(row.role_name),
    "staff.designation": value(row.role_name),
    "staff.join_date": value(row.join_date),
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
  const defaultsResult = await db.query<{ field_values: Record<string, unknown> }>(
    `
      SELECT field_values
      FROM institution_template_defaults
      WHERE institution_id = $1 AND template_id = $2
      LIMIT 1
    `,
    [row.institution_id, templateId]
  );
  const storedDefaults = defaultsResult.rows[0]?.field_values ?? {};
  const institutionDefaults = Object.fromEntries(
    Object.entries(storedDefaults)
      .filter(([key]) => key !== AUTO_GENERATE_FIELDS_KEY)
      .map(([key, entryValue]) => [
      key,
      value(entryValue),
    ])
  );
  for (const fieldName of readAutoGenerateFields(storedDefaults)) {
    institutionDefaults[fieldName] = generateCertificateNumber();
  }
  return { sourceValues, institutionDefaults };
}

export async function GET(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    const { id } = await context.params;
    const templateId = parseId(id, "template id");
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const institutionIds = allowedInstitutionIds(currentUser);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "students";
    const requestedInstitutionId = assertInstitutionAccess(
      parseOptionalId(url.searchParams.get("institutionId")),
      isPlatformAdmin,
      institutionIds
    );
    const academicYearId = await resolveTryoutAcademicYearId(
      parseOptionalId(url.searchParams.get("academicYearId")),
      requestedInstitutionId,
      isPlatformAdmin,
      institutionIds
    );
    await ensureCardCategoryAudienceSchema();
    await ensureTemplateAccess(templateId, isPlatformAdmin, institutionIds);
    const targetAudience = await getTemplateTargetAudience(templateId);

    if (action === "staff-values") {
      if (targetAudience !== "staff") throw new Error("This template is not for staff");
      const staffUserId = parseId(url.searchParams.get("staffUserId"), "staff member id");
      return NextResponse.json({
        data: await getStaffValues(templateId, staffUserId, isPlatformAdmin, institutionIds, requestedInstitutionId),
      });
    }

    if (action === "student-values") {
      if (targetAudience !== "student") throw new Error("This template is not for students");
      const studentId = parseId(url.searchParams.get("studentId"), "student id");
      return NextResponse.json({
        data: await getStudentValues(templateId, studentId, isPlatformAdmin, institutionIds, academicYearId, requestedInstitutionId),
      });
    }

    const search = url.searchParams.get("search")?.trim() ?? "";
    if (targetAudience === "staff") {
      return NextResponse.json({
        data: await getStaff(templateId, isPlatformAdmin, institutionIds, search, requestedInstitutionId),
        hasMore: false,
      });
    }

    return NextResponse.json({
      data: await getStudents(templateId, isPlatformAdmin, institutionIds, search, academicYearId, requestedInstitutionId),
      hasMore: false,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
