import type { PoolClient } from "pg";

import { cleanTemplateAddressValue } from "@/lib/card-templates/address";
import {
  generateCertificateNumber,
  readAutoGenerateFields,
} from "@/lib/card-templates/institution-defaults";
import { db } from "@/lib/db/db";

type Queryable = Pick<PoolClient, "query">;

type PromoteCardArgs = {
  studentId: number;
  institutionId: number;
  sourceEnrollmentId: number;
  destinationEnrollmentId: number;
  destinationAcademicYearId: number;
  actorId: number;
};

type SourceCard = {
  template_id: number;
  canvas_width: number | null;
  canvas_height: number | null;
};

type TemplateContext = {
  card_category_id: number;
  html_template: string;
  template_name: string;
};

type EnrollmentContext = {
  student_user_id: number;
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
  institution_established_year: number | string | null;
  institution_website: string | null;
  institution_about: string | null;
  institution_full_address: string | null;
  institution_address: string | null;
  institution_city: string | null;
  institution_area_text: string | null;
  institution_state: string | null;
  institution_country: string | null;
  institution_pincode: string | null;
  institution_latitude: number | string | null;
  institution_longitude: number | string | null;
  program_name: string | null;
  class_category_name: string | null;
  section_name: string | null;
  academic_year: string | null;
  guardian_name: string | null;
  guardian_relation: string | null;
  document_number: string | null;
  logo_url: string | null;
  gallery_image_url: string | null;
};

type TemplateField = {
  field_name: string;
  label: string | null;
  field_type: string | null;
};

type FieldMapping = {
  template_field_name: string;
  source_field_key: string;
  fallback_value: string | null;
};

function value(input: unknown) {
  if (input == null) return "";
  if (input instanceof Date) return input.toISOString().slice(0, 10);
  return String(input);
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isHiddenTemplateValue(input: string) {
  const normalized = input.trim().toLowerCase();
  return normalized === "na" || normalized === "n/a" || normalized === "-";
}

function applyFieldValues(
  html: string,
  fields: TemplateField[],
  fieldValues: Record<string, string>,
) {
  return fields.reduce((result, field) => {
    const rawValue = cleanTemplateAddressValue(
      field.field_name,
      field.label ?? field.field_name,
      fieldValues[field.field_name] ?? "",
    );
    const replacement = isHiddenTemplateValue(rawValue)
      ? ""
      : field.field_type === "image"
        ? rawValue
        : escapeHtml(rawValue);
    return result.replaceAll(`{{${field.field_name}}}`, replacement);
  }, html);
}

export async function ensureStudentIdCardPromotionSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS student_id_cards (
      id BIGSERIAL PRIMARY KEY,
      institution_id INTEGER NOT NULL REFERENCES institution_profiles(id),
      student_id INTEGER NOT NULL REFERENCES student_profiles(id),
      enrollment_id INTEGER REFERENCES student_enrollments(id),
      academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
      template_id INTEGER NOT NULL REFERENCES document_templates(id),
      title VARCHAR(200) NOT NULL,
      rendered_html TEXT NOT NULL,
      field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
      image_url TEXT,
      pdf_url TEXT,
      canvas_width INTEGER,
      canvas_height INTEGER,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      version INTEGER NOT NULL DEFAULT 1,
      generated_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      deleted_at TIMESTAMP,
      deleted_by INTEGER REFERENCES users(id)
    )
  `);
  await db.query(`
    ALTER TABLE student_id_cards
      ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS institution_generated_documents (
      id BIGSERIAL PRIMARY KEY,
      institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      template_id INTEGER NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
      reference_type VARCHAR(50) NOT NULL,
      reference_id INTEGER NOT NULL,
      image_url TEXT,
      pdf_url TEXT,
      generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    ALTER TABLE institution_generated_documents
      ADD COLUMN IF NOT EXISTS card_category_id INTEGER REFERENCES card_categories(id) ON DELETE RESTRICT,
      ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS title VARCHAR(200),
      ADD COLUMN IF NOT EXISTS rendered_html TEXT,
      ADD COLUMN IF NOT EXISTS field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS canvas_width INTEGER,
      ADD COLUMN IF NOT EXISTS canvas_height INTEGER,
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL
  `);
}

async function findSourceIdCard(client: Queryable, args: PromoteCardArgs) {
  const result = await client.query<SourceCard>(
    `
      SELECT card.template_id, card.canvas_width, card.canvas_height
      FROM student_id_cards card
      INNER JOIN document_templates template ON template.id = card.template_id
      INNER JOIN card_categories category ON category.id = template.card_category_id
      WHERE card.student_id = $1
        AND card.institution_id = $2
        AND category.slug = 'id-card'
        AND COALESCE(card.is_deleted, FALSE) = FALSE
      ORDER BY
        CASE WHEN card.enrollment_id = $3 THEN 0 ELSE 1 END,
        card.updated_at DESC NULLS LAST,
        card.created_at DESC,
        card.id DESC
      LIMIT 1
    `,
    [args.studentId, args.institutionId, args.sourceEnrollmentId],
  );
  if (result.rows[0]) return result.rows[0];

  const generatedResult = await client.query<SourceCard>(
    `
      SELECT document.template_id, document.canvas_width, document.canvas_height
      FROM institution_generated_documents document
      INNER JOIN document_templates template ON template.id = document.template_id
      INNER JOIN card_categories category ON category.id = template.card_category_id
      WHERE document.reference_type = 'student_id_card'
        AND document.reference_id = $1
        AND document.institution_id = $2
        AND category.slug = 'id-card'
        AND COALESCE(document.is_deleted, FALSE) = FALSE
      ORDER BY
        CASE WHEN document.enrollment_id = $3 THEN 0 ELSE 1 END,
        document.updated_at DESC NULLS LAST,
        document.created_at DESC,
        document.id DESC
      LIMIT 1
    `,
    [args.studentId, args.institutionId, args.sourceEnrollmentId],
  );
  return generatedResult.rows[0] ?? null;
}

async function getTemplateContext(client: Queryable, templateId: number) {
  const result = await client.query<TemplateContext>(
    `
      SELECT
        template.card_category_id,
        template.html_template,
        template.name AS template_name
      FROM document_templates template
      INNER JOIN card_categories category
        ON category.id = template.card_category_id
       AND category.slug = 'id-card'
      WHERE template.id = $1
        AND COALESCE(template.is_deleted, FALSE) = FALSE
        AND COALESCE(template.is_active, TRUE) = TRUE
      LIMIT 1
    `,
    [templateId],
  );
  return result.rows[0] ?? null;
}

async function getEnrollmentContext(client: Queryable, args: PromoteCardArgs) {
  const result = await client.query<EnrollmentContext>(
    `
      SELECT
        u.id AS student_user_id,
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
        enrollment.roll_number,
        enrollment.admission_date,
        institution.name AS institution_name,
        institution.slug AS institution_slug,
        institution_type.name AS institution_type,
        institution_subtype.name AS institution_subtype,
        board.name AS institution_board_name,
        institution.phone AS institution_phone,
        institution.email AS institution_email,
        institution.established_year AS institution_established_year,
        institution.website AS institution_website,
        institution.about AS institution_about,
        location.name AS institution_area_text,
        location.name AS institution_address,
        location.name AS institution_full_address,
        location.name AS institution_city,
        NULL::text AS institution_state,
        NULL::text AS institution_country,
        NULL::text AS institution_pincode,
        location.latitude AS institution_latitude,
        location.longitude AS institution_longitude,
        program.title AS program_name,
        class_category.name AS class_category_name,
        section.name AS section_name,
        academic_year.name AS academic_year,
        guardian_user.full_name AS guardian_name,
        guardian.relationship AS guardian_relation,
        document.document_number,
        media.logo_url,
        media.gallery_image_url
      FROM student_enrollments enrollment
      INNER JOIN student_profiles sp ON sp.id = enrollment.student_id
      INNER JOIN users u ON u.id = sp.user_id
      INNER JOIN institution_profiles institution ON institution.id = enrollment.institution_id
      INNER JOIN academic_years academic_year ON academic_year.id = enrollment.academic_year_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN user_locations ul ON ul.user_id = u.id
      LEFT JOIN institution_types institution_type ON institution_type.id = institution.institution_type_id
      LEFT JOIN institution_subtypes institution_subtype ON institution_subtype.id = institution.institution_subtype_id
      LEFT JOIN boards board ON board.id = institution.board_id
      LEFT JOIN locations location ON location.id = institution.location_id
      LEFT JOIN institution_programs program ON program.id = enrollment.program_id
      LEFT JOIN categories class_category ON class_category.id = enrollment.class_category_id
      LEFT JOIN sections section ON section.id = enrollment.section_id
      LEFT JOIN LATERAL (
        SELECT guardian.*, guardian_account.full_name
        FROM student_guardians guardian
        INNER JOIN users guardian_account ON guardian_account.id = guardian.guardian_user_id
        WHERE guardian.student_id = sp.id
          AND COALESCE(guardian.is_deleted, FALSE) = FALSE
        ORDER BY guardian.is_primary DESC, guardian.id ASC
        LIMIT 1
      ) guardian ON TRUE
      LEFT JOIN users guardian_user ON guardian_user.id = guardian.guardian_user_id
      LEFT JOIN LATERAL (
        SELECT document_number
        FROM student_documents
        WHERE student_id = sp.id
          AND COALESCE(is_deleted, FALSE) = FALSE
        ORDER BY is_verified DESC, id DESC
        LIMIT 1
      ) document ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          (array_agg(url ORDER BY (media_type = 'logo') DESC, (lower(coalesce(title, '')) LIKE '%logo%') DESC, sort_order ASC, id ASC))[1] AS logo_url,
          (array_agg(url ORDER BY (media_type = 'logo') ASC, sort_order ASC, id ASC))[1] AS gallery_image_url
        FROM institution_media
        WHERE institution_id = institution.id
          AND COALESCE(is_deleted, FALSE) = FALSE
          AND media_type IN ('image', 'logo')
      ) media ON TRUE
      WHERE enrollment.id = $1
        AND enrollment.student_id = $2
        AND enrollment.institution_id = $3
        AND enrollment.academic_year_id = $4
        AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [
      args.destinationEnrollmentId,
      args.studentId,
      args.institutionId,
      args.destinationAcademicYearId,
    ],
  );
  return result.rows[0] ?? null;
}

async function buildFieldValues(
  client: Queryable,
  templateId: number,
  institutionId: number,
  context: EnrollmentContext,
) {
  const [fieldsResult, mappingsResult, defaultsResult] = await Promise.all([
    client.query<TemplateField>(
      `
        SELECT field_name, label, field_type
        FROM document_template_fields
        WHERE template_id = $1
        ORDER BY sort_order, id
      `,
      [templateId],
    ),
    client.query<FieldMapping>(
      `
        SELECT DISTINCT ON (template_field_name)
          template_field_name,
          source_field_key,
          fallback_value
        FROM document_template_field_mappings
        WHERE template_id = $1
          AND (institution_id IS NULL OR institution_id = $2)
        ORDER BY template_field_name, CASE WHEN institution_id = $2 THEN 0 ELSE 1 END
      `,
      [templateId, institutionId],
    ),
    client.query<{ field_values: Record<string, unknown> }>(
      `
        SELECT field_values
        FROM institution_template_defaults
        WHERE institution_id = $1 AND template_id = $2
        LIMIT 1
      `,
      [institutionId, templateId],
    ),
  ]);

  const programName = context.program_name ?? context.class_category_name;
  const sourceValues: Record<string, string> = {
    "user.full_name": value(context.full_name),
    "user.email": value(context.email),
    "user.phone": value(context.phone),
    "user.avatar_url": value(context.avatar_url),
    "profile.about": value(context.profile_about),
    "profile.gender": value(context.profile_gender),
    "profile.full_address": value(context.profile_full_address),
    "student.admission_number": value(context.admission_number),
    "student.apar_id": value(context.apar_id),
    "student.date_of_birth": value(context.date_of_birth),
    "student.blood_group": value(context.blood_group),
    "student.emergency_contact_name": value(context.emergency_contact_name),
    "student.emergency_contact_phone": value(context.emergency_contact_phone),
    "enrollment.institution_name": value(context.institution_name),
    "enrollment.program_name": value(programName),
    "enrollment.section_name": value(context.section_name),
    "enrollment.academic_year": value(context.academic_year),
    "enrollment.roll_number": value(context.roll_number),
    "enrollment.admission_date": value(context.admission_date),
    "guardian.primary_name": value(context.guardian_name),
    "guardian.primary_relation": value(context.guardian_relation),
    "document.primary_number": value(context.document_number),
    "institution.name": value(context.institution_name),
    "institution.type": value(context.institution_type),
    "institution.board_name": value(context.institution_board_name),
    "institution.subtype": value(context.institution_subtype),
    "institution.slug": value(context.institution_slug),
    "institution.phone": value(context.institution_phone),
    "institution.email": value(context.institution_email),
    "institution.established_year": value(context.institution_established_year),
    "institution.website": value(context.institution_website),
    "institution.about": value(context.institution_about),
    "institution.full_address": value(context.institution_full_address),
    "institution.address": value(context.institution_address),
    "institution.city": value(context.institution_city),
    "institution.area": value(context.institution_area_text),
    "institution.state": value(context.institution_state),
    "institution.country": value(context.institution_country),
    "institution.pincode": value(context.institution_pincode),
    "institution.latitude": value(context.institution_latitude),
    "institution.longitude": value(context.institution_longitude),
    "institution.logo_url": value(context.logo_url),
    "institution.gallery_image_url": value(context.gallery_image_url),
  };

  const storedDefaults = defaultsResult.rows[0]?.field_values ?? {};
  const fieldValues = Object.fromEntries(
    fieldsResult.rows.map((field) => [
      field.field_name,
      value(storedDefaults[field.field_name]),
    ]),
  );
  for (const fieldName of readAutoGenerateFields(storedDefaults)) {
    fieldValues[fieldName] = generateCertificateNumber();
  }
  for (const mapping of mappingsResult.rows) {
    fieldValues[mapping.template_field_name] =
      sourceValues[mapping.source_field_key] ?? mapping.fallback_value ?? "";
  }

  return { fields: fieldsResult.rows, fieldValues };
}

export async function createPromotedStudentIdCard(
  client: Queryable,
  args: PromoteCardArgs,
) {
  const sourceCard = await findSourceIdCard(client, args);
  if (!sourceCard) return null;

  const [template, enrollmentContext] = await Promise.all([
    getTemplateContext(client, sourceCard.template_id),
    getEnrollmentContext(client, args),
  ]);
  if (!template || !enrollmentContext) return null;

  const { fields, fieldValues } = await buildFieldValues(
    client,
    sourceCard.template_id,
    args.institutionId,
    enrollmentContext,
  );
  const renderedHtml = applyFieldValues(template.html_template, fields, fieldValues);
  const title = `${enrollmentContext.full_name ?? "Student"} ID Card`;
  const fieldValuesJson = JSON.stringify(fieldValues);

  const existingDocument = await client.query<{ id: string; version: number }>(
    `
      SELECT id, version
      FROM institution_generated_documents
      WHERE reference_type = 'student_id_card'
        AND reference_id = $1
        AND template_id = $2
        AND enrollment_id = $3
        AND academic_year_id = $4
        AND COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
      LIMIT 1
    `,
    [
      args.studentId,
      sourceCard.template_id,
      args.destinationEnrollmentId,
      args.destinationAcademicYearId,
    ],
  );
  const documentVersion = Number(existingDocument.rows[0]?.version ?? 0) + 1;
  const documentResult = existingDocument.rows[0]
    ? await client.query<{ id: string }>(
        `
          UPDATE institution_generated_documents
          SET institution_id = $1,
              card_category_id = $2,
              title = $3,
              rendered_html = $4,
              field_values = $5::jsonb,
              image_url = NULL,
              pdf_url = NULL,
              canvas_width = $6,
              canvas_height = $7,
              version = $8,
              status = 'active',
              generated_by = $9,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $10
          RETURNING id
        `,
        [
          args.institutionId,
          template.card_category_id,
          title,
          renderedHtml,
          fieldValuesJson,
          sourceCard.canvas_width,
          sourceCard.canvas_height,
          documentVersion,
          args.actorId,
          existingDocument.rows[0].id,
        ],
      )
    : await client.query<{ id: string }>(
        `
          INSERT INTO institution_generated_documents (
            institution_id,
            template_id,
            card_category_id,
            reference_type,
            reference_id,
            enrollment_id,
            academic_year_id,
            title,
            rendered_html,
            field_values,
            image_url,
            pdf_url,
            canvas_width,
            canvas_height,
            version,
            generated_by
          )
          VALUES ($1,$2,$3,'student_id_card',$4,$5,$6,$7,$8,$9::jsonb,NULL,NULL,$10,$11,$12,$13)
          RETURNING id
        `,
        [
          args.institutionId,
          sourceCard.template_id,
          template.card_category_id,
          args.studentId,
          args.destinationEnrollmentId,
          args.destinationAcademicYearId,
          title,
          renderedHtml,
          fieldValuesJson,
          sourceCard.canvas_width,
          sourceCard.canvas_height,
          documentVersion,
          args.actorId,
        ],
      );

  const existingLegacyCard = await client.query<{ id: string; version: number }>(
    `
      SELECT id, version
      FROM student_id_cards
      WHERE student_id = $1
        AND template_id = $2
        AND enrollment_id = $3
        AND academic_year_id = $4
        AND COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
      LIMIT 1
    `,
    [
      args.studentId,
      sourceCard.template_id,
      args.destinationEnrollmentId,
      args.destinationAcademicYearId,
    ],
  );
  const legacyVersion = Number(existingLegacyCard.rows[0]?.version ?? 0) + 1;
  const legacyResult = existingLegacyCard.rows[0]
    ? await client.query<{ id: string }>(
        `
          UPDATE student_id_cards
          SET institution_id = $1,
              title = $2,
              rendered_html = $3,
              field_values = $4::jsonb,
              image_url = NULL,
              pdf_url = NULL,
              canvas_width = $5,
              canvas_height = $6,
              version = $7,
              status = 'active',
              generated_by = $8,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $9
          RETURNING id
        `,
        [
          args.institutionId,
          title,
          renderedHtml,
          fieldValuesJson,
          sourceCard.canvas_width,
          sourceCard.canvas_height,
          legacyVersion,
          args.actorId,
          existingLegacyCard.rows[0].id,
        ],
      )
    : await client.query<{ id: string }>(
        `
          INSERT INTO student_id_cards (
            institution_id,
            student_id,
            enrollment_id,
            academic_year_id,
            template_id,
            title,
            rendered_html,
            field_values,
            image_url,
            pdf_url,
            canvas_width,
            canvas_height,
            version,
            generated_by
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NULL,NULL,$9,$10,$11,$12)
          RETURNING id
        `,
        [
          args.institutionId,
          args.studentId,
          args.destinationEnrollmentId,
          args.destinationAcademicYearId,
          sourceCard.template_id,
          title,
          renderedHtml,
          fieldValuesJson,
          sourceCard.canvas_width,
          sourceCard.canvas_height,
          legacyVersion,
          args.actorId,
        ],
      );

  return {
    generatedDocumentId: documentResult.rows[0].id,
    legacyCardId: legacyResult.rows[0].id,
    templateId: sourceCard.template_id,
  };
}
