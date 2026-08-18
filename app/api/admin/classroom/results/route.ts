import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to load results";
  const status =
    message === "Unauthorized" || message === "User not found" ? 401 :
      message === "Forbidden: Admin access required" ||
      message === "Forbidden: Invalid child context" ? 403 :
        400;
  return NextResponse.json({ error: message }, { status });
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

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const canView = hasPermission(currentUser, "student.myclassroom.results.view");
    if (!canView) throw new Error("Forbidden: Admin access required");

    await ensureGeneratedDocumentsTable();
    const enrollment = await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes);
    if (!enrollment) {
      return NextResponse.json({ data: [], pageCount: 0, total: 0 });
    }

    const url = new URL(req.url);
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() ?? "";
    const params: unknown[] = [
      enrollment.student_id,
      enrollment.institution_id,
      enrollment.id,
      limit,
      offset,
      search,
      `%${search}%`,
    ];

    const [cardsResult, countResult] = await Promise.all([
      db.query(
        `
          SELECT
            card.id,
            card.institution_id,
            card.reference_id AS student_id,
            card.enrollment_id,
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
            AND card.reference_id = $1
            AND card.institution_id = $2
            AND card.enrollment_id = $3
            AND COALESCE(card.is_deleted, FALSE) = FALSE
            AND COALESCE(card.status, 'active') = 'active'
            AND (
              $6 = ''
              OR COALESCE(card.title, '') ILIKE $7
              OR COALESCE(dt.name, '') ILIKE $7
              OR COALESCE(prog.title, class_category.name, '') ILIKE $7
            )
          ORDER BY card.created_at DESC, card.id DESC
          LIMIT $4 OFFSET $5
        `,
        params
      ),
      db.query<{ count: string }>(
        `
          SELECT COUNT(*)
          FROM institution_generated_documents card
          INNER JOIN document_templates dt ON dt.id = card.template_id
          LEFT JOIN student_enrollments se ON se.id = card.enrollment_id
          LEFT JOIN institution_programs prog
             ON prog.id = se.program_id
            AND COALESCE(prog.is_deleted, FALSE) = FALSE
          LEFT JOIN categories class_category ON class_category.id = se.class_category_id
          WHERE card.reference_type = 'student_result_card'
            AND card.reference_id = $1
            AND card.institution_id = $2
            AND card.enrollment_id = $3
            AND COALESCE(card.is_deleted, FALSE) = FALSE
            AND COALESCE(card.status, 'active') = 'active'
            AND (
              $4 = ''
              OR COALESCE(card.title, '') ILIKE $5
              OR COALESCE(dt.name, '') ILIKE $5
              OR COALESCE(prog.title, class_category.name, '') ILIKE $5
            )
        `,
        [enrollment.student_id, enrollment.institution_id, enrollment.id, search, `%${search}%`]
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
