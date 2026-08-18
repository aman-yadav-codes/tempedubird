import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import {
  canAccessInstitution,
  getRequestedInstitutionId,
  getScopedInstitutionIds,
} from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

function parseIdList(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Select at least one result");
  return Array.from(
    new Set(
      value.map((item) => {
        const id = Number(item);
        if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid result id");
        return id;
      })
    )
  );
}

function errorStatus(message: string) {
  if (message === "Forbidden: Admin access required") return 403;
  if (message === "Unauthorized" || message === "User not found") return 401;
  return 400;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return NextResponse.json({ error: message }, { status: errorStatus(message) });
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
    CREATE INDEX IF NOT EXISTS idx_institution_generated_documents_result_cards
    ON institution_generated_documents (reference_type, institution_id, is_deleted, created_at DESC)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_institution_generated_documents_result_session
    ON institution_generated_documents (reference_type, institution_id, academic_year_id, is_deleted, created_at DESC)
  `);
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureGeneratedDocumentsTable();

    const url = new URL(req.url);
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const institutionId = getRequestedInstitutionId(url.searchParams);
    if (institutionId && !canAccessInstitution(currentUser, institutionId)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const search = url.searchParams.get("search")?.trim() ?? "";
    const academicYearId = Number(url.searchParams.get("academicYearId"));
    const scopedAcademicYearId = Number.isInteger(academicYearId) && academicYearId > 0 ? academicYearId : null;
    const institutionIds = getScopedInstitutionIds(currentUser, institutionId);
    const params: unknown[] = [limit, offset, search, `%${search}%`];
    const countParams: unknown[] = [search, `%${search}%`];
    const filters: string[] = [];
    const countFilters: string[] = [];
    if (institutionIds !== null && institutionIds.length > 0) {
      params.push(institutionIds);
      countParams.push(institutionIds);
      filters.push(`card.institution_id = ANY($${params.length}::int[])`);
      countFilters.push(`card.institution_id = ANY($${countParams.length}::int[])`);
    } else if (institutionIds !== null) {
      filters.push("FALSE");
      countFilters.push("FALSE");
    }
    if (scopedAcademicYearId) {
      params.push(scopedAcademicYearId);
      countParams.push(scopedAcademicYearId);
      filters.push(`card.academic_year_id = $${params.length}`);
      countFilters.push(`card.academic_year_id = $${countParams.length}`);
    }
    const scopedFilter = filters.length ? `AND ${filters.join(" AND ")}` : "";
    const countScopedFilter = countFilters.length ? `AND ${countFilters.join(" AND ")}` : "";

    const [cardsResult, countResult] = await Promise.all([
      db.query(
        `
          SELECT
            card.id,
            card.institution_id,
            card.reference_id AS student_id,
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
          FROM institution_generated_documents card
          INNER JOIN institution_profiles ip
             ON ip.id = card.institution_id
            AND ip.is_active = TRUE
            AND COALESCE(ip.is_deleted, FALSE) = FALSE
          INNER JOIN document_templates dt ON dt.id = card.template_id
          INNER JOIN student_profiles sp ON sp.id = card.reference_id
          INNER JOIN users u ON u.id = sp.user_id
          LEFT JOIN student_enrollments se ON se.id = card.enrollment_id
          LEFT JOIN institution_programs prog
             ON prog.id = se.program_id
            AND COALESCE(prog.is_deleted, FALSE) = FALSE
          LEFT JOIN categories class_category ON class_category.id = se.class_category_id
          LEFT JOIN sections section ON section.id = se.section_id
          LEFT JOIN users generator ON generator.id = card.generated_by
          WHERE card.reference_type = 'student_result_card'
            AND COALESCE(card.is_deleted, FALSE) = FALSE
            AND (
              $3 = ''
              OR u.full_name ILIKE $4
              OR COALESCE(sp.admission_number, '') ILIKE $4
              OR COALESCE(se.roll_number, '') ILIKE $4
              OR COALESCE(dt.name, '') ILIKE $4
              OR COALESCE(card.title, '') ILIKE $4
            )
            ${scopedFilter}
          ORDER BY card.created_at DESC, card.id DESC
          LIMIT $1 OFFSET $2
        `,
        params
      ),
      db.query<{ count: string }>(
        `
          SELECT COUNT(*)
          FROM institution_generated_documents card
          INNER JOIN document_templates dt ON dt.id = card.template_id
          INNER JOIN student_profiles sp ON sp.id = card.reference_id
          INNER JOIN users u ON u.id = sp.user_id
          LEFT JOIN student_enrollments se ON se.id = card.enrollment_id
          WHERE card.reference_type = 'student_result_card'
            AND COALESCE(card.is_deleted, FALSE) = FALSE
            AND (
              $1 = ''
              OR u.full_name ILIKE $2
              OR COALESCE(sp.admission_number, '') ILIKE $2
              OR COALESCE(se.roll_number, '') ILIKE $2
              OR COALESCE(dt.name, '') ILIKE $2
              OR COALESCE(card.title, '') ILIKE $2
            )
            ${countScopedFilter}
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

export async function DELETE(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureGeneratedDocumentsTable();

    const ids = parseIdList((await req.json()).ids);
    if (!ids.length) throw new Error("Select at least one result");

    const institutionIds = getScopedInstitutionIds(currentUser, null);
    const scopedFilter =
      institutionIds === null
        ? ""
        : institutionIds.length === 0
          ? "AND FALSE"
          : "AND institution_id = ANY($3::int[])";
    const params: unknown[] = [ids, currentUser.id];
    if (institutionIds !== null && institutionIds.length > 0) params.push(institutionIds);

    const result = await db.query(
      `
        UPDATE institution_generated_documents
        SET is_deleted = TRUE,
            deleted_at = CURRENT_TIMESTAMP,
            deleted_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1::bigint[])
          AND reference_type = 'student_result_card'
          AND COALESCE(is_deleted, FALSE) = FALSE
          ${scopedFilter}
        RETURNING id
      `,
      params
    );

    return NextResponse.json({ data: { deleted: result.rowCount ?? 0 } });
  } catch (error) {
    return errorResponse(error);
  }
}
