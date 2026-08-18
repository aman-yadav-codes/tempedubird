import { db } from "@/lib/db/db";

export async function ensureInstitutionGeneratedDocumentsTable() {
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
    CREATE INDEX IF NOT EXISTS idx_institution_generated_documents_reference
    ON institution_generated_documents (reference_type, reference_id)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_institution_generated_documents_session
    ON institution_generated_documents (institution_id, academic_year_id, reference_type, is_deleted, created_at DESC)
  `);
}
