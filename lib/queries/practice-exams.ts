import type { PoolClient } from "pg";

import { db } from "@/lib/db/db";

type Queryable = Pick<PoolClient, "query">;

let schemaReady: Promise<void> | null = null;

export function ensurePracticeExamSchema() {
  if (!schemaReady) {
    schemaReady = db
      .query(`
        ALTER TABLE practice_exam_templates
          ADD COLUMN IF NOT EXISTS blocked_by_platform BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN IF NOT EXISTS exam_kind TEXT DEFAULT 'practice' NOT NULL,
          ADD COLUMN IF NOT EXISTS exam_series_id INTEGER,
          ADD COLUMN IF NOT EXISTS exam_date DATE,
          ADD COLUMN IF NOT EXISTS exam_time TIME,
          ADD COLUMN IF NOT EXISTS exam_place TEXT,
          ADD COLUMN IF NOT EXISTS exam_mode TEXT DEFAULT 'offline' NOT NULL,
          ADD COLUMN IF NOT EXISTS result_date DATE,
          ADD COLUMN IF NOT EXISTS instant_result BOOLEAN DEFAULT TRUE NOT NULL,
          ADD COLUMN IF NOT EXISTS blocked_by INTEGER,
          ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS block_reason TEXT,
          ADD COLUMN IF NOT EXISTS marketplace_requested BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN IF NOT EXISTS marketplace_requested_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS marketplace_requested_by INTEGER,
          ADD COLUMN IF NOT EXISTS marketplace_approved BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN IF NOT EXISTS marketplace_approved_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS marketplace_approved_by INTEGER,
          ADD COLUMN IF NOT EXISTS parent_template_id INTEGER,
          ADD COLUMN IF NOT EXISTS ai_question_format JSONB DEFAULT '{"enabled":false,"true_false":0,"objective":0}'::jsonb NOT NULL,
          ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0 NOT NULL,
          ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

        UPDATE practice_exam_templates
        SET marketplace_requested = TRUE,
            marketplace_approved = TRUE,
            marketplace_approved_at = COALESCE(marketplace_approved_at, updated_at)
        WHERE is_public = TRUE
          AND marketplace_approved = FALSE;

        ALTER TABLE practice_exams
          ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS exam_kind TEXT DEFAULT 'practice' NOT NULL,
          ADD COLUMN IF NOT EXISTS exam_date DATE,
          ADD COLUMN IF NOT EXISTS exam_time TIME,
          ADD COLUMN IF NOT EXISTS exam_place TEXT,
          ADD COLUMN IF NOT EXISTS exam_mode TEXT DEFAULT 'offline' NOT NULL,
          ADD COLUMN IF NOT EXISTS result_date DATE,
          ADD COLUMN IF NOT EXISTS instant_result BOOLEAN DEFAULT TRUE NOT NULL,
          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

        UPDATE practice_exams exam
        SET academic_year_id = academic_year.id
        FROM academic_years academic_year
        WHERE exam.academic_year_id IS NULL
          AND academic_year.institution_id = exam.institution_id
          AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
          AND COALESCE(exam.exam_date, exam.created_at::date)
            BETWEEN academic_year.start_date AND academic_year.end_date;

        UPDATE practice_exams exam
        SET academic_year_id = institution.default_academic_year_id
        FROM institution_profiles institution
        WHERE exam.academic_year_id IS NULL
          AND institution.id = exam.institution_id
          AND institution.default_academic_year_id IS NOT NULL;

        UPDATE practice_exam_templates
        SET exam_kind = COALESCE(NULLIF(exam_kind, ''), 'practice'),
            exam_mode = COALESCE(NULLIF(exam_mode, ''), 'offline'),
            instant_result = COALESCE(instant_result, TRUE);

        UPDATE practice_exams exam
        SET exam_kind = template.exam_kind,
            exam_date = template.exam_date,
            exam_time = template.exam_time,
            exam_place = template.exam_place,
            exam_mode = template.exam_mode,
            result_date = template.result_date,
            instant_result = template.instant_result
        FROM practice_exam_templates template
        WHERE exam.template_id = template.id;

        CREATE INDEX IF NOT EXISTS idx_practice_exam_templates_blocked
          ON practice_exam_templates(blocked_by_platform);

        CREATE INDEX IF NOT EXISTS idx_practice_exam_templates_deleted
          ON practice_exam_templates(is_deleted);

        CREATE INDEX IF NOT EXISTS idx_practice_exam_templates_kind
          ON practice_exam_templates(exam_kind);

        CREATE INDEX IF NOT EXISTS idx_practice_exam_templates_series
          ON practice_exam_templates(exam_series_id);

        CREATE INDEX IF NOT EXISTS idx_practice_exam_templates_marketplace_review
          ON practice_exam_templates(marketplace_requested, is_public, blocked_by_platform);

        CREATE INDEX IF NOT EXISTS idx_practice_exam_templates_parent
          ON practice_exam_templates(parent_template_id);

        CREATE INDEX IF NOT EXISTS idx_practice_exams_deleted
          ON practice_exams(is_deleted);

        CREATE INDEX IF NOT EXISTS idx_practice_exams_kind
          ON practice_exams(exam_kind);

        CREATE INDEX IF NOT EXISTS idx_practice_exams_academic_year
          ON practice_exams(institution_id, academic_year_id, exam_kind);

        ALTER TABLE practice_exam_targets
          ADD COLUMN IF NOT EXISTS program_id INTEGER;

        CREATE INDEX IF NOT EXISTS idx_practice_exam_targets_program
          ON practice_exam_targets(program_id);

        ALTER TABLE practice_exams
          ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

        ALTER TABLE student_practice_exam_attempts
          ADD COLUMN IF NOT EXISTS exam_version INTEGER DEFAULT 1 NOT NULL,
          ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL;

        ALTER TABLE student_practice_exam_results
          ADD COLUMN IF NOT EXISTS exam_version INTEGER DEFAULT 1 NOT NULL,
          ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL;

        ALTER TABLE student_practice_exam_answers
          ADD COLUMN IF NOT EXISTS answer_image_url TEXT;

        CREATE INDEX IF NOT EXISTS idx_spea_exam_version
          ON student_practice_exam_attempts(practice_exam_id, student_id, exam_version);

        CREATE INDEX IF NOT EXISTS idx_spea_enrollment
          ON student_practice_exam_attempts(enrollment_id);

        CREATE INDEX IF NOT EXISTS idx_sper_exam_version
          ON student_practice_exam_results(practice_exam_id, student_id, exam_version);

        CREATE INDEX IF NOT EXISTS idx_sper_enrollment
          ON student_practice_exam_results(enrollment_id);

        UPDATE practice_exams exam
        SET version = template.version
        FROM practice_exam_templates template
        WHERE exam.template_id = template.id
          AND COALESCE(exam.version, 1) <> template.version;

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_practice_exam_templates_blocked_by'
          ) THEN
            ALTER TABLE practice_exam_templates
              ADD CONSTRAINT fk_practice_exam_templates_blocked_by
              FOREIGN KEY (blocked_by)
              REFERENCES users(id)
              ON DELETE SET NULL;
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_practice_exam_templates_marketplace_requested_by'
          ) THEN
            ALTER TABLE practice_exam_templates
              ADD CONSTRAINT fk_practice_exam_templates_marketplace_requested_by
              FOREIGN KEY (marketplace_requested_by)
              REFERENCES users(id)
              ON DELETE SET NULL;
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_practice_exam_templates_marketplace_approved_by'
          ) THEN
            ALTER TABLE practice_exam_templates
              ADD CONSTRAINT fk_practice_exam_templates_marketplace_approved_by
              FOREIGN KEY (marketplace_approved_by)
              REFERENCES users(id)
              ON DELETE SET NULL;
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_practice_exam_templates_parent_template'
          ) THEN
            ALTER TABLE practice_exam_templates
              ADD CONSTRAINT fk_practice_exam_templates_parent_template
              FOREIGN KEY (parent_template_id)
              REFERENCES practice_exam_templates(id)
              ON DELETE SET NULL;
          END IF;
        END
        $$;

        CREATE TABLE IF NOT EXISTS exam_series (
          id SERIAL PRIMARY KEY,
          source_institution_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          slug TEXT NOT NULL,
          description TEXT,
          from_date DATE NOT NULL,
          to_date DATE NOT NULL,
          target_type TEXT DEFAULT 'INSTITUTION' NOT NULL,
          target_id INTEGER,
          target_program_id INTEGER,
          result_date DATE,
          instant_result BOOLEAN DEFAULT TRUE NOT NULL,
          marketplace_requested BOOLEAN DEFAULT FALSE NOT NULL,
          marketplace_requested_at TIMESTAMP,
          marketplace_requested_by INTEGER,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
          deleted_at TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          CONSTRAINT uq_exam_series_institution_slug UNIQUE (source_institution_id, slug)
        );

        ALTER TABLE exam_series
          ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'INSTITUTION' NOT NULL,
          ADD COLUMN IF NOT EXISTS target_id INTEGER,
          ADD COLUMN IF NOT EXISTS target_program_id INTEGER,
          ADD COLUMN IF NOT EXISTS result_date DATE,
          ADD COLUMN IF NOT EXISTS instant_result BOOLEAN DEFAULT TRUE NOT NULL,
          ADD COLUMN IF NOT EXISTS marketplace_requested BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN IF NOT EXISTS marketplace_requested_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS marketplace_requested_by INTEGER;

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_exam_series_institution'
          ) THEN
            ALTER TABLE exam_series
              ADD CONSTRAINT fk_exam_series_institution
              FOREIGN KEY (source_institution_id)
              REFERENCES institution_profiles(id)
              ON DELETE CASCADE;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_pet_exam_series'
          ) THEN
            ALTER TABLE practice_exam_templates
              ADD CONSTRAINT fk_pet_exam_series
              FOREIGN KEY (exam_series_id)
              REFERENCES exam_series(id)
              ON DELETE SET NULL;
          END IF;
        END
        $$;

        CREATE INDEX IF NOT EXISTS idx_exam_series_institution
          ON exam_series(source_institution_id);

        CREATE INDEX IF NOT EXISTS idx_exam_series_dates
          ON exam_series(from_date, to_date);

        UPDATE practice_exam_templates
        SET is_deleted = TRUE,
            deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
            is_active = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE COALESCE(exam_kind, 'practice') = 'exam'
          AND exam_series_id IS NULL
          AND COALESCE(is_deleted, FALSE) = FALSE;

        UPDATE practice_exams exam
        SET is_deleted = TRUE,
            deleted_at = COALESCE(exam.deleted_at, CURRENT_TIMESTAMP),
            status = 'deleted',
            updated_at = CURRENT_TIMESTAMP
        FROM practice_exam_templates template
        WHERE exam.template_id = template.id
          AND COALESCE(exam.exam_kind, 'practice') = 'exam'
          AND template.exam_series_id IS NULL
          AND COALESCE(exam.is_deleted, FALSE) = FALSE;

        CREATE TABLE IF NOT EXISTS practice_exam_syllabus_nodes (
          id SERIAL PRIMARY KEY,
          practice_exam_id INTEGER NOT NULL,
          syllabus_node_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          CONSTRAINT uq_practice_exam_syllabus_node UNIQUE (practice_exam_id, syllabus_node_id)
        );

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_pesn_exam'
          ) THEN
            ALTER TABLE practice_exam_syllabus_nodes
              ADD CONSTRAINT fk_pesn_exam
              FOREIGN KEY (practice_exam_id)
              REFERENCES practice_exams(id)
              ON DELETE CASCADE;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_asn_syllabus_node'
          ) THEN
            ALTER TABLE practice_exam_syllabus_nodes
              ADD CONSTRAINT fk_asn_syllabus_node
              FOREIGN KEY (syllabus_node_id)
              REFERENCES syllabus_nodes(id)
              ON DELETE CASCADE;
          END IF;
        END
        $$;

        CREATE INDEX IF NOT EXISTS idx_pesn_exam
          ON practice_exam_syllabus_nodes(practice_exam_id);

        CREATE INDEX IF NOT EXISTS idx_asn_node
          ON practice_exam_syllabus_nodes(syllabus_node_id);
      `)
      .then(() => undefined)
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  return schemaReady;
}

export async function replacePracticeExamSyllabusNodes(
  client: Queryable,
  practiceExamId: number,
  nodeIds: number[]
) {
  await client.query(`DELETE FROM practice_exam_syllabus_nodes WHERE practice_exam_id = $1`, [
    practiceExamId,
  ]);

  if (nodeIds.length === 0) return;

  await client.query(
    `
      INSERT INTO practice_exam_syllabus_nodes (practice_exam_id, syllabus_node_id)
      SELECT $1, node_id
      FROM unnest($2::int[]) AS selected(node_id)
      ON CONFLICT DO NOTHING
    `,
    [practiceExamId, nodeIds]
  );
}

export async function replacePracticeExamQuestions(
  client: Queryable,
  templateId: number,
  questions: Array<{
    question_text: string;
    question_type: string;
    marks: number;
    display_order: number;
    explanation?: string | null;
    options: Array<{ text: string; is_correct: boolean; display_order: number }>;
    files: Array<{ url: string; sort_order: number }>;
  }>
) {
  await client.query(
    `DELETE FROM practice_exam_template_questions WHERE template_id = $1`,
    [templateId]
  );

  if (questions.length === 0) return;

  const inserted = await client.query<{ id: number; display_order: number }>(
    `
      INSERT INTO practice_exam_template_questions
        (template_id, question_text, question_type, marks, explanation, display_order)
      SELECT
        $1,
        question_text,
        question_type,
        marks,
        explanation,
        display_order
      FROM jsonb_to_recordset($2::jsonb) AS questions(
        question_text text,
        question_type text,
        marks numeric,
        explanation text,
        display_order int
      )
      ORDER BY display_order
      RETURNING id, display_order
    `,
    [templateId, JSON.stringify(questions)]
  );

  const questionIds = new Map(
    inserted.rows.map((question) => [question.display_order, question.id])
  );
  const options = questions.flatMap((question) =>
    question.options.map((option) => ({
      question_id: questionIds.get(question.display_order),
      option_text: option.text,
      is_correct: option.is_correct,
      display_order: option.display_order,
    }))
  );
  const files = questions.flatMap((question) =>
    question.files.map((file) => ({
      question_id: questionIds.get(question.display_order),
      file_url: file.url,
      sort_order: file.sort_order,
    }))
  );

  if (options.length > 0) {
    await client.query(
      `
        INSERT INTO practice_exam_template_question_options
          (question_id, option_text, is_correct, display_order)
        SELECT question_id, option_text, is_correct, display_order
        FROM jsonb_to_recordset($1::jsonb) AS options(
          question_id int,
          option_text text,
          is_correct boolean,
          display_order int
        )
      `,
      [JSON.stringify(options)]
    );
  }

  if (files.length > 0) {
    await client.query(
      `
        INSERT INTO practice_exam_template_question_files
          (question_id, file_url, sort_order)
        SELECT question_id, file_url, sort_order
        FROM jsonb_to_recordset($1::jsonb) AS files(
          question_id int,
          file_url text,
          sort_order int
        )
      `,
      [JSON.stringify(files)]
    );
  }
}

export async function replacePracticeExamQuestionsFromTemplate(
  client: Queryable,
  practiceExamId: number,
  templateId: number
) {
  await client.query(`DELETE FROM practice_exam_questions WHERE practice_exam_id = $1`, [
    practiceExamId,
  ]);

  const inserted = await client.query<{ id: number; template_question_id: number }>(
    `
      INSERT INTO practice_exam_questions
        (practice_exam_id, question_text, question_type, marks, explanation, display_order)
      SELECT $1, question_text, question_type, marks, explanation, display_order
      FROM practice_exam_template_questions
      WHERE template_id = $2
      ORDER BY display_order, id
      RETURNING id, display_order
    `,
    [practiceExamId, templateId]
  );

  if (inserted.rows.length === 0) return;

  await client.query(
    `
      WITH question_map AS (
        SELECT aq.id AS practice_exam_question_id, atq.id AS template_question_id
        FROM practice_exam_questions aq
        INNER JOIN practice_exam_template_questions atq
          ON atq.template_id = $2
         AND atq.display_order = aq.display_order
        WHERE aq.practice_exam_id = $1
      )
      INSERT INTO practice_exam_question_options
        (question_id, option_text, is_correct, display_order)
      SELECT
        question_map.practice_exam_question_id,
        atqo.option_text,
        atqo.is_correct,
        atqo.display_order
      FROM practice_exam_template_question_options atqo
      INNER JOIN question_map
        ON question_map.template_question_id = atqo.question_id
      ORDER BY question_map.practice_exam_question_id, atqo.display_order, atqo.id
    `,
    [practiceExamId, templateId]
  );

  await client.query(
    `
      WITH question_map AS (
        SELECT aq.id AS practice_exam_question_id, atq.id AS template_question_id
        FROM practice_exam_questions aq
        INNER JOIN practice_exam_template_questions atq
          ON atq.template_id = $2
         AND atq.display_order = aq.display_order
        WHERE aq.practice_exam_id = $1
      )
      INSERT INTO practice_exam_question_files
        (question_id, file_url, sort_order)
      SELECT
        question_map.practice_exam_question_id,
        atqf.file_url,
        COALESCE(atqf.sort_order, 0)
      FROM practice_exam_template_question_files atqf
      INNER JOIN question_map
        ON question_map.template_question_id = atqf.question_id
      ORDER BY question_map.practice_exam_question_id, atqf.sort_order, atqf.id
    `,
    [practiceExamId, templateId]
  );
}



