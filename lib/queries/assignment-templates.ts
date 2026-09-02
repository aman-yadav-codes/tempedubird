import type { PoolClient } from "pg";

import { db } from "@/lib/db/db";

type Queryable = Pick<PoolClient, "query">;

let schemaReady: Promise<void> | null = null;

export function ensureAssignmentTemplateSchema() {
  if (!schemaReady) {
    schemaReady = db
      .query(`
        ALTER TABLE assignment_templates
          ADD COLUMN IF NOT EXISTS blocked_by_platform BOOLEAN DEFAULT FALSE NOT NULL,
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
          ADD COLUMN IF NOT EXISTS ai_question_format JSONB DEFAULT '{"enabled":false,"true_false":0,"objective":0,"subjective":0}'::jsonb NOT NULL,
          ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0 NOT NULL,
          ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

        UPDATE assignment_templates
        SET marketplace_requested = TRUE,
            marketplace_approved = TRUE,
            marketplace_approved_at = COALESCE(marketplace_approved_at, updated_at)
        WHERE is_public = TRUE
          AND marketplace_approved = FALSE;

        ALTER TABLE assignments
          ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL;

        UPDATE assignments assignment
        SET academic_year_id = academic_year.id
        FROM academic_years academic_year
        WHERE assignment.academic_year_id IS NULL
          AND academic_year.institution_id = assignment.institution_id
          AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
          AND COALESCE(assignment.issue_date, assignment.created_at::date)
            BETWEEN academic_year.start_date AND academic_year.end_date;

        UPDATE assignments assignment
        SET academic_year_id = institution.default_academic_year_id
        FROM institution_profiles institution
        WHERE assignment.academic_year_id IS NULL
          AND institution.id = assignment.institution_id
          AND institution.default_academic_year_id IS NOT NULL;

        ALTER TABLE student_assignment_answers
          ADD COLUMN IF NOT EXISTS answer_image_url TEXT;

        ALTER TABLE student_assignments
          ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_assignment_templates_blocked
          ON assignment_templates(blocked_by_platform);

        CREATE INDEX IF NOT EXISTS idx_assignment_templates_deleted
          ON assignment_templates(is_deleted);

        CREATE INDEX IF NOT EXISTS idx_assignment_templates_marketplace_review
          ON assignment_templates(marketplace_requested, is_public, blocked_by_platform);

        CREATE INDEX IF NOT EXISTS idx_assignment_templates_parent
          ON assignment_templates(parent_template_id);

        CREATE INDEX IF NOT EXISTS idx_assignments_deleted
          ON assignments(is_deleted);

        CREATE INDEX IF NOT EXISTS idx_assignments_academic_year
          ON assignments(institution_id, academic_year_id);

        CREATE INDEX IF NOT EXISTS idx_student_assignments_enrollment
          ON student_assignments(enrollment_id);

        DROP INDEX IF EXISTS uq_student_assignment;

        CREATE UNIQUE INDEX IF NOT EXISTS uq_student_assignment_enrollment
          ON student_assignments(assignment_id, student_id, enrollment_id);

        ALTER TABLE assignment_targets
          ADD COLUMN IF NOT EXISTS program_id INTEGER;

        CREATE INDEX IF NOT EXISTS idx_assignment_targets_program
          ON assignment_targets(program_id);

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_assignment_templates_blocked_by'
          ) THEN
            ALTER TABLE assignment_templates
              ADD CONSTRAINT fk_assignment_templates_blocked_by
              FOREIGN KEY (blocked_by)
              REFERENCES users(id)
              ON DELETE SET NULL;
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_assignment_templates_marketplace_requested_by'
          ) THEN
            ALTER TABLE assignment_templates
              ADD CONSTRAINT fk_assignment_templates_marketplace_requested_by
              FOREIGN KEY (marketplace_requested_by)
              REFERENCES users(id)
              ON DELETE SET NULL;
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_assignment_templates_marketplace_approved_by'
          ) THEN
            ALTER TABLE assignment_templates
              ADD CONSTRAINT fk_assignment_templates_marketplace_approved_by
              FOREIGN KEY (marketplace_approved_by)
              REFERENCES users(id)
              ON DELETE SET NULL;
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_assignment_templates_parent_template'
          ) THEN
            ALTER TABLE assignment_templates
              ADD CONSTRAINT fk_assignment_templates_parent_template
              FOREIGN KEY (parent_template_id)
              REFERENCES assignment_templates(id)
              ON DELETE SET NULL;
          END IF;
        END
        $$;

        CREATE TABLE IF NOT EXISTS assignment_syllabus_nodes (
          id SERIAL PRIMARY KEY,
          assignment_id INTEGER NOT NULL,
          syllabus_node_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          CONSTRAINT uq_assignment_syllabus_node UNIQUE (assignment_id, syllabus_node_id)
        );

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_asn_assignment'
          ) THEN
            ALTER TABLE assignment_syllabus_nodes
              ADD CONSTRAINT fk_asn_assignment
              FOREIGN KEY (assignment_id)
              REFERENCES assignments(id)
              ON DELETE CASCADE;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_asn_syllabus_node'
          ) THEN
            ALTER TABLE assignment_syllabus_nodes
              ADD CONSTRAINT fk_asn_syllabus_node
              FOREIGN KEY (syllabus_node_id)
              REFERENCES syllabus_nodes(id)
              ON DELETE CASCADE;
          END IF;
        END
        $$;

        CREATE INDEX IF NOT EXISTS idx_asn_assignment
          ON assignment_syllabus_nodes(assignment_id);

        CREATE INDEX IF NOT EXISTS idx_asn_node
          ON assignment_syllabus_nodes(syllabus_node_id);
      `)
      .then(() => undefined)
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  return schemaReady;
}

export async function replaceAssignmentSyllabusNodes(
  client: Queryable,
  assignmentId: number,
  nodeIds: number[]
) {
  await client.query(`DELETE FROM assignment_syllabus_nodes WHERE assignment_id = $1`, [
    assignmentId,
  ]);

  if (nodeIds.length === 0) return;

  await client.query(
    `
      INSERT INTO assignment_syllabus_nodes (assignment_id, syllabus_node_id)
      SELECT $1, node_id
      FROM unnest($2::int[]) AS selected(node_id)
      ON CONFLICT DO NOTHING
    `,
    [assignmentId, nodeIds]
  );
}

export async function replaceAssignmentTemplateQuestions(
  client: Queryable,
  templateId: number,
  questions: Array<{
    question_text: string;
    question_type: string;
    marks: number;
    display_order: number;
    options: Array<{ text: string; is_correct: boolean; display_order: number }>;
    files: Array<{ url: string; sort_order: number }>;
  }>
) {
  await client.query(
    `DELETE FROM assignment_template_questions WHERE template_id = $1`,
    [templateId]
  );

  if (questions.length === 0) return;

  const inserted = await client.query<{ id: number; display_order: number }>(
    `
      INSERT INTO assignment_template_questions
        (template_id, question_text, question_type, marks, display_order)
      SELECT
        $1,
        question_text,
        question_type,
        marks,
        display_order
      FROM jsonb_to_recordset($2::jsonb) AS questions(
        question_text text,
        question_type text,
        marks numeric,
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
        INSERT INTO assignment_template_question_options
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
        INSERT INTO assignment_template_question_files
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

export async function replaceAssignmentQuestionsFromTemplate(
  client: Queryable,
  assignmentId: number,
  templateId: number
) {
  await client.query(`DELETE FROM assignment_questions WHERE assignment_id = $1`, [
    assignmentId,
  ]);

  const inserted = await client.query<{ id: number; template_question_id: number }>(
    `
      INSERT INTO assignment_questions
        (assignment_id, question_text, question_type, marks, display_order)
      SELECT $1, question_text, question_type, marks, display_order
      FROM assignment_template_questions
      WHERE template_id = $2
      ORDER BY display_order, id
      RETURNING id, display_order
    `,
    [assignmentId, templateId]
  );

  if (inserted.rows.length === 0) return;

  await client.query(
    `
      WITH question_map AS (
        SELECT aq.id AS assignment_question_id, atq.id AS template_question_id
        FROM assignment_questions aq
        INNER JOIN assignment_template_questions atq
          ON atq.template_id = $2
         AND atq.display_order = aq.display_order
        WHERE aq.assignment_id = $1
      )
      INSERT INTO assignment_question_options
        (question_id, option_text, is_correct, display_order)
      SELECT
        question_map.assignment_question_id,
        atqo.option_text,
        atqo.is_correct,
        atqo.display_order
      FROM assignment_template_question_options atqo
      INNER JOIN question_map
        ON question_map.template_question_id = atqo.question_id
      ORDER BY question_map.assignment_question_id, atqo.display_order, atqo.id
    `,
    [assignmentId, templateId]
  );

  await client.query(
    `
      WITH question_map AS (
        SELECT aq.id AS assignment_question_id, atq.id AS template_question_id
        FROM assignment_questions aq
        INNER JOIN assignment_template_questions atq
          ON atq.template_id = $2
         AND atq.display_order = aq.display_order
        WHERE aq.assignment_id = $1
      )
      INSERT INTO assignment_question_files
        (question_id, file_url, sort_order)
      SELECT
        question_map.assignment_question_id,
        atqf.file_url,
        COALESCE(atqf.sort_order, 0)
      FROM assignment_template_question_files atqf
      INNER JOIN question_map
        ON question_map.template_question_id = atqf.question_id
      ORDER BY question_map.assignment_question_id, atqf.sort_order, atqf.id
    `,
    [assignmentId, templateId]
  );
}
