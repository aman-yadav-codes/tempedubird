import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import {
  canAccessInstitution,
  getRequestedInstitutionId,
  getScopedInstitutionIds,
} from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

type CardContext = {
  institution_id: number;
  enrollment_id: number | null;
  academic_year_id: number;
  student_user_id: number;
  student_name: string;
  template_name: string;
  card_category_id: number;
  category_name: string;
  category_slug: string;
  category_target_audience: "student" | "staff";
};

type GeneratedDocumentLookup = {
  id: string;
  version: number;
  title: string | null;
  reference_type: string;
  enrollment_id: number | null;
  academic_year_id: number | null;
  template_id: number;
};

function parsePositiveId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`Invalid ${label}`);
  return id;
}

function parseIdList(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Select at least one card");
  return Array.from(new Set(value.map((item) => parsePositiveId(item, "card id"))));
}

function parseOptionalPositiveId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function errorStatus(message: string) {
  if (message === "Forbidden: Admin access required") return 403;
  if (message === "Unauthorized" || message === "User not found") return 401;
  if (message.includes("not found")) return 404;
  return 400;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return NextResponse.json({ error: message }, { status: errorStatus(message) });
}

async function ensureStudentIdCardsTable() {
  await db.query(`
    ALTER TABLE card_categories
      ADD COLUMN IF NOT EXISTS target_audience VARCHAR(20) NOT NULL DEFAULT 'student';
  `);
  await db.query(`
    ALTER TABLE institution_profiles
      ADD COLUMN IF NOT EXISTS default_academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL
  `);
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
    UPDATE student_id_cards card
    SET academic_year_id = enrollment.academic_year_id
    FROM student_enrollments enrollment
    WHERE card.academic_year_id IS NULL
      AND enrollment.id = card.enrollment_id
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_student_id_cards_institution_active
    ON student_id_cards (institution_id, is_deleted, created_at DESC)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_student_id_cards_student_active
    ON student_id_cards (student_id, is_deleted, created_at DESC)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_student_id_cards_template
    ON student_id_cards (template_id)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_student_id_cards_session
    ON student_id_cards (institution_id, academic_year_id, is_deleted, created_at DESC)
  `);
}

async function ensureGeneratedDocumentsTable() {
  await db.query(`
    DO $$
    BEGIN
      IF to_regclass('public.institution_generated_documents') IS NULL
         AND to_regclass('public.generated_documents') IS NOT NULL THEN
        ALTER TABLE generated_documents RENAME TO institution_generated_documents;
      END IF;
    END $$;
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
  await db.query(`
    UPDATE institution_generated_documents document
    SET academic_year_id = enrollment.academic_year_id
    FROM student_enrollments enrollment
    WHERE document.academic_year_id IS NULL
      AND enrollment.id = document.enrollment_id
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_institution_generated_documents_institution_active
    ON institution_generated_documents (institution_id, is_deleted, created_at DESC)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_institution_generated_documents_template
    ON institution_generated_documents (template_id)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_institution_generated_documents_category
    ON institution_generated_documents (card_category_id)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_institution_generated_documents_reference
    ON institution_generated_documents (reference_type, reference_id)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_institution_generated_documents_student_lookup
    ON institution_generated_documents (reference_id, template_id, reference_type, is_deleted)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_institution_generated_documents_session
    ON institution_generated_documents (institution_id, academic_year_id, reference_type, is_deleted, created_at DESC)
  `);
}

async function ensureStudentAchievementsTable() {
  await db.query(`
    ALTER TABLE student_achievements
      ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES document_templates(id) ON DELETE RESTRICT,
      ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE RESTRICT,
      ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_student_achievements_session
    ON student_achievements(institution_id, academic_year_id, is_deleted, achievement_date DESC)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_student_achievements_template_id
    ON student_achievements(template_id)
  `);
  await db.query(`
    INSERT INTO student_achievements (
      student_id,
      card_category_id,
      template_id,
      institution_id,
      academic_year_id,
      enrollment_id,
      title,
      achievement_date,
      certificate_url,
      remarks,
      created_by,
      updated_by
    )
    SELECT
      profile.user_id,
      document.card_category_id,
      document.template_id,
      document.institution_id,
      document.academic_year_id,
      document.enrollment_id,
      COALESCE(template.name, document.title, 'Achievement Certificate'),
      timezone('Asia/Kolkata', document.created_at)::date,
      document.image_url,
      document.title,
      document.generated_by,
      document.generated_by
    FROM institution_generated_documents document
    INNER JOIN student_profiles profile ON profile.id = document.reference_id
    LEFT JOIN document_templates template ON template.id = document.template_id
    WHERE document.reference_type = 'student_achievement_certificate'
      AND document.academic_year_id IS NOT NULL
      AND COALESCE(document.is_deleted, FALSE) = FALSE
      AND NOT EXISTS (
        SELECT 1
        FROM student_achievements achievement
        WHERE achievement.student_id = profile.user_id
          AND achievement.template_id = document.template_id
          AND achievement.institution_id = document.institution_id
          AND achievement.academic_year_id = document.academic_year_id
          AND COALESCE(achievement.is_deleted, FALSE) = FALSE
      )
  `);
}

async function getInstitutionDefaultAcademicYearId(institutionId: number, requestedAcademicYearId: number | null) {
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
            AND NOT EXISTS (
              SELECT 1
              FROM academic_years current_year
              WHERE current_year.institution_id = $1
                AND COALESCE(current_year.is_deleted, FALSE) = FALSE
                AND COALESCE(current_year.is_active, TRUE) = TRUE
                AND CURRENT_DATE BETWEEN current_year.start_date AND current_year.end_date
            )
          )
        )
        AND ($2::int IS NULL OR ay.id = $2)
      ORDER BY
        CASE WHEN ay.id = institution.default_academic_year_id THEN 0 ELSE 1 END,
        CASE WHEN CURRENT_DATE BETWEEN ay.start_date AND ay.end_date THEN 0 ELSE 1 END,
        ay.start_date DESC,
        ay.id DESC
      LIMIT 1
    `,
    [institutionId, requestedAcademicYearId]
  );
  if (!result.rows[0]) {
    throw new Error("Card generation is only allowed for the institution default session");
  }
  return Number(result.rows[0].id);
}

function getDocumentType(categorySlug: string) {
  if (categorySlug === "id-card") return "student_id_card";
  if (categorySlug === "transfer-certificate") return "student_tc";
  if (categorySlug === "result-card") return "student_result_card";
  if (categorySlug === "achievement-certificate" || categorySlug === "achievement-certificate-student") {
    return "student_achievement_certificate";
  }
  if (categorySlug === "offer-letter-student") return "student_offer_letter";
  return `student_${categorySlug.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "document"}`;
}

function getDocumentLabel(context: Pick<CardContext, "category_name" | "category_slug">) {
  if (context.category_slug === "id-card") return "ID Card";
  if (context.category_slug === "transfer-certificate") return "TC";
  if (context.category_slug === "result-card") return "Result Card";
  return context.category_name || "Document";
}

function getDuplicateDocumentLabel(context: Pick<CardContext, "category_name" | "category_slug">) {
  if (context.category_slug === "id-card") return "ID Card";
  if (context.category_slug === "transfer-certificate") return "Transfer Certificate";
  if (context.category_slug === "result-card") return "Result";
  return context.category_name || "Document";
}

function getDocumentTitle(context: CardContext) {
  return `${context.student_name} ${getDocumentLabel(context)}`;
}

function isClassScopedGeneratedDocument(categorySlug: string) {
  return categorySlug === "id-card" || categorySlug === "result-card";
}

async function findExistingGeneratedDocument(
  queryable: Pick<typeof db, "query">,
  context: CardContext,
  referenceType: string,
  studentId: number,
  templateId: number
) {
  if (context.category_slug === "transfer-certificate") {
    const result = await queryable.query<GeneratedDocumentLookup>(
      `
        SELECT id, version, title, reference_type, enrollment_id, template_id
        FROM institution_generated_documents
        WHERE reference_type = $1
          AND reference_id = $2
          AND academic_year_id = $3
          AND COALESCE(is_deleted, FALSE) = FALSE
        ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
        LIMIT 1
      `,
      [referenceType, studentId, context.academic_year_id]
    );
    return result.rows[0] ?? null;
  }

  const result = await queryable.query<GeneratedDocumentLookup>(
    `
      SELECT id, version, title, reference_type, enrollment_id, template_id
      FROM institution_generated_documents
      WHERE reference_type = $1
        AND reference_id = $2
        AND template_id = $3
        AND enrollment_id IS NOT DISTINCT FROM $4
        AND academic_year_id = $5
        AND COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
      LIMIT 1
    `,
    [referenceType, studentId, templateId, context.enrollment_id, context.academic_year_id]
  );
  return result.rows[0] ?? null;
}

async function getCardContext(
  templateId: number,
  studentId: number,
  institutionIds: number[] | null,
  academicYearId: number | null
) {
  const scopedFilter =
    institutionIds === null
      ? ""
      : institutionIds.length === 0
        ? "AND FALSE"
        : "AND se.institution_id = ANY($3::int[])";
  const params: unknown[] = [templateId, studentId];
  if (institutionIds !== null && institutionIds.length > 0) params.push(institutionIds);
  params.push(academicYearId);
  const academicYearParam = params.length;

  const result = await db.query<CardContext>(
    `
      SELECT
        se.institution_id,
        se.id AS enrollment_id,
        se.academic_year_id,
        u.id AS student_user_id,
        u.full_name AS student_name,
        dt.name AS template_name,
        dt.card_category_id,
        cc.name AS category_name,
        cc.slug AS category_slug,
        COALESCE(cc.target_audience, 'student') AS category_target_audience
      FROM institution_templates it
      INNER JOIN document_templates dt
         ON dt.id = it.template_id
        AND COALESCE(dt.is_deleted, FALSE) = FALSE
      INNER JOIN card_categories cc
         ON cc.id = dt.card_category_id
        AND cc.is_active = TRUE
        AND COALESCE(cc.is_deleted, FALSE) = FALSE
      INNER JOIN student_enrollments se
         ON se.institution_id = it.institution_id
        AND se.status = 'active'
        AND COALESCE(se.is_deleted, FALSE) = FALSE
      INNER JOIN student_profiles sp ON sp.id = se.student_id
      INNER JOIN users u
         ON u.id = sp.user_id
        AND COALESCE(u.is_deleted, FALSE) = FALSE
      WHERE it.template_id = $1
        AND it.is_active = TRUE
        AND sp.id = $2
        AND ($${academicYearParam}::int IS NULL OR se.academic_year_id = $${academicYearParam})
        ${scopedFilter}
      ORDER BY
        CASE WHEN EXISTS (
          SELECT 1
          FROM academic_years ay
          WHERE ay.id = se.academic_year_id
            AND CURRENT_DATE BETWEEN ay.start_date AND ay.end_date
        ) THEN 0 ELSE 1 END,
        se.updated_at DESC,
        se.id DESC
      LIMIT 1
    `,
    params
  );

  const row = result.rows[0];
  if (!row) throw new Error("Student or template not found");
  return row;
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureStudentIdCardsTable();
    await ensureGeneratedDocumentsTable();
    await ensureStudentAchievementsTable();

    const url = new URL(req.url);
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const institutionId = getRequestedInstitutionId(url.searchParams);
    if (institutionId && !canAccessInstitution(currentUser, institutionId)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const institutionIds = getScopedInstitutionIds(currentUser, institutionId);
    const params: unknown[] = [limit, offset];
    const countParams: unknown[] = [];
    const filters: string[] = ["COALESCE(card.is_deleted, FALSE) = FALSE"];
    const countFilters: string[] = ["COALESCE(card.is_deleted, FALSE) = FALSE"];
    if (institutionIds !== null && institutionIds.length > 0) {
      params.push(institutionIds);
      countParams.push(institutionIds);
      filters.push(`card.institution_id = ANY($${params.length}::int[])`);
      countFilters.push(`card.institution_id = ANY($${countParams.length}::int[])`);
    }
    if (institutionIds !== null && institutionIds.length === 0) {
      filters.push("FALSE");
      countFilters.push("FALSE");
    }
    const academicYearId = parseOptionalPositiveId(url.searchParams.get("academicYearId"));
    if (academicYearId) {
      params.push(academicYearId);
      countParams.push(academicYearId);
      filters.push(`card.academic_year_id = $${params.length}`);
      countFilters.push(`card.academic_year_id = $${countParams.length}`);
    }
    const whereSql = filters.join("\n            AND ");
    const countWhereSql = countFilters.join("\n            AND ");

    const [cardsResult, countResult] = await Promise.all([
      db.query(
        `
          SELECT
            card.id,
            card.institution_id,
            card.student_id,
            card.enrollment_id,
            card.academic_year_id,
            card.template_id,
            card.title,
            card.rendered_html,
            card.field_values,
            card.image_url,
            card.pdf_url,
            card.canvas_width,
            card.canvas_height,
            card.status,
            card.version,
            card.created_at,
            card.updated_at,
            ip.name AS institution_name,
            dt.name AS template_name,
            u.full_name AS student_name,
            u.email AS student_email,
            sp.admission_number,
            se.roll_number,
            COALESCE(prog.title, class_category.name) AS program_name,
            section.name AS section_name,
            generator.full_name AS generated_by_name
          FROM student_id_cards card
          INNER JOIN institution_profiles ip
             ON ip.id = card.institution_id
            AND ip.is_active = TRUE
            AND COALESCE(ip.is_deleted, FALSE) = FALSE
          INNER JOIN document_templates dt ON dt.id = card.template_id
          INNER JOIN student_profiles sp ON sp.id = card.student_id
          INNER JOIN users u ON u.id = sp.user_id
          LEFT JOIN student_enrollments se ON se.id = card.enrollment_id
          LEFT JOIN institution_programs prog
             ON prog.id = se.program_id
            AND COALESCE(prog.is_deleted, FALSE) = FALSE
          LEFT JOIN categories class_category ON class_category.id = se.class_category_id
          LEFT JOIN sections section ON section.id = se.section_id
          LEFT JOIN users generator ON generator.id = card.generated_by
          WHERE ${whereSql}
          ORDER BY card.created_at DESC, card.id DESC
          LIMIT $1 OFFSET $2
        `,
        params
      ),
      db.query<{ count: string }>(
        `
          SELECT COUNT(*)
          FROM student_id_cards card
          WHERE ${countWhereSql}
        `,
        countParams
      ),
    ]);

    const total = Number(countResult.rows[0]?.count ?? 0);
    return NextResponse.json({
      data: cardsResult.rows,
      pageCount: getPageCount(total, limit),
      total,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureStudentIdCardsTable();
    await ensureGeneratedDocumentsTable();

    const body = await req.json();
    const templateId = parsePositiveId(body.templateId, "template id");
    const studentId = parsePositiveId(body.studentId, "student id");
    const requestedAcademicYearId = parseOptionalPositiveId(body.academicYearId);
    const confirmUpdate = body.confirmUpdate === true;
    const imageUrl = String(body.imageUrl ?? "").trim();
    const renderedHtml = String(body.renderedHtml ?? "").trim();
    if (!renderedHtml) throw new Error("Generate card code before saving");
    if (!imageUrl.startsWith("data:image/") && !/^https:\/\//i.test(imageUrl)) {
      throw new Error("Generate a valid card image before saving");
    }

    const context = await getCardContext(
      templateId,
      studentId,
      getScopedInstitutionIds(currentUser, null),
      requestedAcademicYearId
    );
    if (context.category_target_audience !== "student") {
      throw new Error("This template is for staff and cannot be saved as a student document");
    }
    const defaultAcademicYearId = await getInstitutionDefaultAcademicYearId(context.institution_id, requestedAcademicYearId);
    if (context.academic_year_id !== defaultAcademicYearId) {
      throw new Error("Card generation is only allowed for the institution default session");
    }
    const referenceType = getDocumentType(context.category_slug);
    const title = getDocumentTitle(context);
    const fieldValues = JSON.stringify(body.fieldValues ?? {});
    const canvasExport = body.canvasExport && typeof body.canvasExport === "object"
      ? body.canvasExport as { width?: unknown; height?: unknown }
      : null;
    const canvasWidth = Number(canvasExport?.width);
    const canvasHeight = Number(canvasExport?.height);
    const normalizedCanvasWidth = Number.isFinite(canvasWidth) ? canvasWidth : null;
    const normalizedCanvasHeight = Number.isFinite(canvasHeight) ? canvasHeight : null;

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const existingDocument = await findExistingGeneratedDocument(
        client,
        context,
        referenceType,
        studentId,
        templateId
      );
      if (existingDocument && !confirmUpdate) {
        await client.query("ROLLBACK");
        const documentLabel = getDuplicateDocumentLabel(context);
        const classScope = isClassScopedGeneratedDocument(context.category_slug)
          ? " for this class"
          : "";
        return NextResponse.json(
          {
            code: "DUPLICATE_GENERATED_DOCUMENT",
            error: `${documentLabel} already exists for this student${classScope}.`,
            message: `${documentLabel} already exists for this student${classScope}.`,
            documentLabel,
            actionLabel: `Update ${documentLabel}`,
            existingId: existingDocument.id,
          },
          { status: 409 }
        );
      }

      const latestGenerated = existingDocument
        ? null
        : await client.query<{ version: number }>(
            `
              SELECT COALESCE(MAX(version), 0) AS version
              FROM institution_generated_documents
              WHERE reference_type = $1
                AND reference_id = $2
                AND template_id = $3
                AND academic_year_id = $4
                AND COALESCE(is_deleted, FALSE) = FALSE
            `,
            [referenceType, studentId, templateId, context.academic_year_id]
          );
      const version = existingDocument
        ? Number(existingDocument.version ?? 0) + 1
        : Number(latestGenerated?.rows[0]?.version ?? 0) + 1;
      const generatedResult = existingDocument
        ? await client.query<{ id: string }>(
            `
              UPDATE institution_generated_documents
              SET institution_id = $1,
                  template_id = $2,
                  card_category_id = $3,
                  reference_type = $4,
                  reference_id = $5,
                  enrollment_id = $6,
                  academic_year_id = $7,
                  title = $8,
                  rendered_html = $9,
                  field_values = $10::jsonb,
                  image_url = $11,
                  canvas_width = $12,
                  canvas_height = $13,
                  version = $14,
                  status = 'active',
                  generated_by = $15,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = $16
              RETURNING id
            `,
            [
              context.institution_id,
              templateId,
              context.card_category_id,
              referenceType,
              studentId,
              context.enrollment_id,
              context.academic_year_id,
              title,
              renderedHtml,
              fieldValues,
              imageUrl,
              normalizedCanvasWidth,
              normalizedCanvasHeight,
              version,
              currentUser.id,
              existingDocument.id,
            ]
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
                canvas_width,
                canvas_height,
                version,
                generated_by
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15)
              RETURNING id
            `,
            [
              context.institution_id,
              templateId,
              context.card_category_id,
              referenceType,
              studentId,
              context.enrollment_id,
              context.academic_year_id,
              title,
              renderedHtml,
              fieldValues,
              imageUrl,
              normalizedCanvasWidth,
              normalizedCanvasHeight,
              version,
              currentUser.id,
            ]
          );

      let legacyCardId: string | null = null;
      let achievementId: string | null = null;
      if (context.category_slug === "achievement-certificate") {
        const existingAchievement = await client.query<{ id: string }>(
          `
            SELECT id
            FROM student_achievements
            WHERE student_id = $1
              AND template_id = $2
              AND institution_id = $3
              AND academic_year_id = $4
              AND COALESCE(is_deleted, FALSE) = FALSE
            ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
            LIMIT 1
          `,
          [context.student_user_id, templateId, context.institution_id, context.academic_year_id]
        );
        const achievementResult = existingAchievement.rows[0]
          ? await client.query<{ id: string }>(
              `
                UPDATE student_achievements
                SET card_category_id = $1,
                    institution_id = $2,
                    academic_year_id = $3,
                    enrollment_id = $4,
                    title = $5,
                    achievement_date = timezone('Asia/Kolkata', CURRENT_TIMESTAMP)::date,
                    certificate_url = $6,
                    remarks = $7,
                    updated_by = $8,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $9
                RETURNING id
              `,
              [
                context.card_category_id,
                context.institution_id,
                context.academic_year_id,
                context.enrollment_id,
                context.template_name,
                imageUrl,
                title,
                currentUser.id,
                existingAchievement.rows[0].id,
              ]
            )
          : await client.query<{ id: string }>(
              `
                INSERT INTO student_achievements (
                  student_id,
                  card_category_id,
                  template_id,
                  institution_id,
                  academic_year_id,
                  enrollment_id,
                  title,
                  achievement_date,
                  certificate_url,
                  remarks,
                  created_by,
                  updated_by
                )
                VALUES (
                  $1, $2, $3, $4, $5, $6, $7,
                  timezone('Asia/Kolkata', CURRENT_TIMESTAMP)::date,
                  $8, $9, $10, $10
                )
                RETURNING id
              `,
              [
                context.student_user_id,
                context.card_category_id,
                templateId,
                context.institution_id,
                context.academic_year_id,
                context.enrollment_id,
                context.template_name,
                imageUrl,
                title,
                currentUser.id,
              ]
            );
        achievementId = achievementResult.rows[0].id;
      }

      if (context.category_slug === "id-card") {
        const existingIdCard = await client.query<{ id: string; version: number }>(
          `
            SELECT id, version
            FROM student_id_cards
            WHERE student_id = $1
              AND template_id = $2
              AND enrollment_id IS NOT DISTINCT FROM $3
              AND academic_year_id = $4
              AND COALESCE(is_deleted, FALSE) = FALSE
            ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
            LIMIT 1
          `,
          [studentId, templateId, context.enrollment_id, context.academic_year_id]
        );
        const idCardVersion = Number(existingIdCard.rows[0]?.version ?? 0) + 1;
        const legacyResult = existingIdCard.rows[0]
          ? await client.query<{ id: string }>(
              `
                UPDATE student_id_cards
                SET institution_id = $1,
                    student_id = $2,
                    enrollment_id = $3,
                    template_id = $4,
                    academic_year_id = $5,
                    title = $6,
                    rendered_html = $7,
                    field_values = $8::jsonb,
                    image_url = $9,
                    canvas_width = $10,
                    canvas_height = $11,
                    version = $12,
                    status = 'active',
                    generated_by = $13,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $14
                RETURNING id
              `,
              [
                context.institution_id,
                studentId,
                context.enrollment_id,
                templateId,
                context.academic_year_id,
                title,
                renderedHtml,
                fieldValues,
                imageUrl,
                normalizedCanvasWidth,
                normalizedCanvasHeight,
                idCardVersion,
                currentUser.id,
                existingIdCard.rows[0].id,
              ]
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
                  canvas_width,
                  canvas_height,
                  version,
                  generated_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13)
                RETURNING id
              `,
              [
                context.institution_id,
                studentId,
                context.enrollment_id,
                context.academic_year_id,
                templateId,
                title,
                renderedHtml,
                fieldValues,
                imageUrl,
                normalizedCanvasWidth,
                normalizedCanvasHeight,
                idCardVersion,
                currentUser.id,
              ]
            );
        legacyCardId = legacyResult.rows[0].id;
      }

      await client.query("COMMIT");
      return NextResponse.json({
        data: {
          id: generatedResult.rows[0].id,
          legacyCardId,
          achievementId,
          referenceType,
          categorySlug: context.category_slug,
          title,
          updated: Boolean(existingDocument),
        },
      }, { status: existingDocument ? 200 : 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureStudentIdCardsTable();

    const ids = parseIdList((await req.json()).ids);
    if (!ids.length) throw new Error("Select at least one card");

    const institutionIds = getScopedInstitutionIds(currentUser, null);
    const scopedFilter =
      institutionIds === null
        ? ""
        : institutionIds.length === 0
          ? "AND FALSE"
          : "AND institution_id = ANY($3::int[])";
    const params: unknown[] = [ids, currentUser.id];
    if (institutionIds !== null && institutionIds.length > 0) params.push(institutionIds);

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{
        id: string;
        institution_id: number;
        student_id: number;
        enrollment_id: number | null;
        academic_year_id: number | null;
        template_id: number;
      }>(
        `
          UPDATE student_id_cards
          SET is_deleted = TRUE,
              deleted_at = CURRENT_TIMESTAMP,
              deleted_by = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::bigint[])
            AND COALESCE(is_deleted, FALSE) = FALSE
            ${scopedFilter}
          RETURNING id, institution_id, student_id, enrollment_id, academic_year_id, template_id
        `,
        params
      );

      if (result.rows.length) {
        await client.query(
          `
            UPDATE institution_generated_documents gd
            SET is_deleted = TRUE,
                deleted_at = CURRENT_TIMESTAMP,
                deleted_by = $2,
                updated_at = CURRENT_TIMESTAMP
            FROM jsonb_to_recordset($1::jsonb) AS deleted_cards(
              institution_id int,
              student_id int,
              enrollment_id int,
              academic_year_id int,
              template_id int
            )
            WHERE gd.reference_type = 'student_id_card'
              AND gd.institution_id = deleted_cards.institution_id
              AND gd.reference_id = deleted_cards.student_id
              AND gd.template_id = deleted_cards.template_id
              AND gd.enrollment_id IS NOT DISTINCT FROM deleted_cards.enrollment_id
              AND gd.academic_year_id IS NOT DISTINCT FROM deleted_cards.academic_year_id
              AND COALESCE(gd.is_deleted, FALSE) = FALSE
          `,
          [JSON.stringify(result.rows), currentUser.id]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ data: { deleted: result.rowCount ?? 0 } });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return errorResponse(error);
  }
}
