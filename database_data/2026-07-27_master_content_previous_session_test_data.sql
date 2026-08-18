ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE assignment_templates
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS marketplace_requested BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS marketplace_approved BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS parent_template_id INTEGER,
  ADD COLUMN IF NOT EXISTS ai_question_format JSONB DEFAULT '{"enabled":false,"true_false":0,"objective":0,"subjective":0}'::jsonb NOT NULL;

ALTER TABLE assignment_targets
  ADD COLUMN IF NOT EXISTS program_id INTEGER;

ALTER TABLE practice_exams
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exam_kind TEXT DEFAULT 'practice' NOT NULL,
  ADD COLUMN IF NOT EXISTS exam_date DATE,
  ADD COLUMN IF NOT EXISTS exam_time TIME,
  ADD COLUMN IF NOT EXISTS exam_place TEXT,
  ADD COLUMN IF NOT EXISTS exam_mode TEXT DEFAULT 'offline' NOT NULL,
  ADD COLUMN IF NOT EXISTS result_date DATE,
  ADD COLUMN IF NOT EXISTS instant_result BOOLEAN DEFAULT TRUE NOT NULL,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE practice_exam_templates
  ADD COLUMN IF NOT EXISTS exam_kind TEXT DEFAULT 'practice' NOT NULL,
  ADD COLUMN IF NOT EXISTS exam_series_id INTEGER,
  ADD COLUMN IF NOT EXISTS exam_date DATE,
  ADD COLUMN IF NOT EXISTS exam_time TIME,
  ADD COLUMN IF NOT EXISTS exam_place TEXT,
  ADD COLUMN IF NOT EXISTS exam_mode TEXT DEFAULT 'offline' NOT NULL,
  ADD COLUMN IF NOT EXISTS result_date DATE,
  ADD COLUMN IF NOT EXISTS instant_result BOOLEAN DEFAULT TRUE NOT NULL,
  ADD COLUMN IF NOT EXISTS marketplace_requested BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS marketplace_approved BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS parent_template_id INTEGER,
  ADD COLUMN IF NOT EXISTS ai_question_format JSONB DEFAULT '{"enabled":false,"true_false":0,"objective":0}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE practice_exam_targets
  ADD COLUMN IF NOT EXISTS program_id INTEGER;

CREATE TABLE IF NOT EXISTS exam_series (
  id SERIAL PRIMARY KEY,
  source_institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
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
  marketplace_requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_exam_series_institution_slug UNIQUE (source_institution_id, slug)
);

ALTER TABLE study_notes
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_note_id INTEGER REFERENCES study_notes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketplace_requested BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketplace_approved BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS study_note_items (
  id SERIAL PRIMARY KEY,
  note_id INTEGER NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
  syllabus_node_id INTEGER REFERENCES syllabus_nodes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,
  deleted_by INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
DECLARE
  v_institution_id INTEGER;
  v_academic_year_id INTEGER;
  v_user_id INTEGER;
  v_program_id INTEGER;
  v_section_id INTEGER;
  v_assignment_template_id INTEGER;
  v_assignment_id INTEGER;
  v_practice_template_id INTEGER;
  v_practice_exam_id INTEGER;
  v_exam_series_id INTEGER;
  v_exam_template_id INTEGER;
  v_exam_id INTEGER;
  v_note_id INTEGER;
BEGIN
  SELECT id INTO v_institution_id
  FROM institution_profiles
  WHERE LOWER(name) = LOWER('MP English School')
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY id
  LIMIT 1;

  IF v_institution_id IS NULL THEN
    RAISE NOTICE 'Skipping previous-session master content fixtures: MP English School not found.';
    RETURN;
  END IF;

  SELECT id INTO v_academic_year_id
  FROM academic_years
  WHERE institution_id = v_institution_id
    AND name = '2024-2025'
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY id
  LIMIT 1;

  SELECT id INTO v_user_id
  FROM users
  WHERE COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY id
  LIMIT 1;

  SELECT id INTO v_program_id
  FROM institution_programs
  WHERE institution_id = v_institution_id
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY CASE WHEN LOWER(title) = LOWER('Class 1') THEN 0 ELSE 1 END, id
  LIMIT 1;

  SELECT section_id INTO v_section_id
  FROM program_sections
  WHERE program_id = v_program_id
  ORDER BY section_id
  LIMIT 1;

  IF v_academic_year_id IS NULL OR v_user_id IS NULL OR v_program_id IS NULL THEN
    RAISE NOTICE 'Skipping previous-session master content fixtures: session, user, or program missing.';
    RETURN;
  END IF;

  SELECT id INTO v_assignment_template_id
  FROM assignment_templates
  WHERE source_institution_id = v_institution_id
    AND title = 'Previous Session Class Assignment'
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY id
  LIMIT 1;

  IF v_assignment_template_id IS NULL THEN
    INSERT INTO assignment_templates
      (title, description, total_marks, is_public, is_active, version, source_institution_id, created_by, updated_by)
    VALUES
      ('Previous Session Class Assignment', 'Fixture assignment for checking 2024-2025 session filtering.', 25, FALSE, FALSE, 1, v_institution_id, v_user_id, v_user_id)
    RETURNING id INTO v_assignment_template_id;
  ELSE
    UPDATE assignment_templates
    SET is_active = FALSE,
        updated_by = v_user_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_assignment_template_id;
  END IF;

  SELECT id INTO v_assignment_id
  FROM assignments
  WHERE institution_id = v_institution_id
    AND academic_year_id = v_academic_year_id
    AND template_id = v_assignment_template_id
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY id
  LIMIT 1;

  IF v_assignment_id IS NULL THEN
    INSERT INTO assignments
      (institution_id, academic_year_id, template_id, title, description, issue_date, submission_date, total_marks, status, created_by, updated_by)
    VALUES
      (v_institution_id, v_academic_year_id, v_assignment_template_id, 'Previous Session Class Assignment', 'Fixture assignment for checking 2024-2025 session filtering.', '2024-08-05', '2024-08-12', 25, 'draft', v_user_id, v_user_id)
    RETURNING id INTO v_assignment_id;
  END IF;

  INSERT INTO assignment_targets (assignment_id, target_type, target_id, program_id)
  SELECT v_assignment_id, CASE WHEN v_section_id IS NULL THEN 'PROGRAM' ELSE 'SECTION' END, COALESCE(v_section_id, v_program_id), CASE WHEN v_section_id IS NULL THEN NULL ELSE v_program_id END
  WHERE NOT EXISTS (SELECT 1 FROM assignment_targets WHERE assignment_id = v_assignment_id);

  SELECT id INTO v_practice_template_id
  FROM practice_exam_templates
  WHERE source_institution_id = v_institution_id
    AND title = 'Previous Session Practice Test'
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY id
  LIMIT 1;

  IF v_practice_template_id IS NULL THEN
    INSERT INTO practice_exam_templates
      (title, description, total_marks, duration_minutes, is_public, is_active, version, source_institution_id, created_by, updated_by, exam_kind)
    VALUES
      ('Previous Session Practice Test', 'Fixture practice exam for checking 2024-2025 session filtering.', 20, 30, FALSE, FALSE, 1, v_institution_id, v_user_id, v_user_id, 'practice')
    RETURNING id INTO v_practice_template_id;
  ELSE
    UPDATE practice_exam_templates
    SET is_active = FALSE,
        updated_by = v_user_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_practice_template_id;
  END IF;

  SELECT id INTO v_practice_exam_id
  FROM practice_exams
  WHERE institution_id = v_institution_id
    AND academic_year_id = v_academic_year_id
    AND template_id = v_practice_template_id
    AND COALESCE(exam_kind, 'practice') = 'practice'
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY id
  LIMIT 1;

  IF v_practice_exam_id IS NULL THEN
    INSERT INTO practice_exams
      (institution_id, academic_year_id, template_id, title, description, duration_minutes, total_marks, status, version, exam_kind, created_by, updated_by)
    VALUES
      (v_institution_id, v_academic_year_id, v_practice_template_id, 'Previous Session Practice Test', 'Fixture practice exam for checking 2024-2025 session filtering.', 30, 20, 'draft', 1, 'practice', v_user_id, v_user_id)
    RETURNING id INTO v_practice_exam_id;
  END IF;

  INSERT INTO practice_exam_targets (practice_exam_id, target_type, target_id, program_id)
  SELECT v_practice_exam_id, CASE WHEN v_section_id IS NULL THEN 'PROGRAM' ELSE 'SECTION' END, COALESCE(v_section_id, v_program_id), CASE WHEN v_section_id IS NULL THEN NULL ELSE v_program_id END
  WHERE NOT EXISTS (SELECT 1 FROM practice_exam_targets WHERE practice_exam_id = v_practice_exam_id);

  SELECT id INTO v_exam_series_id
  FROM exam_series
  WHERE source_institution_id = v_institution_id
    AND slug = 'previous-session-unit-test'
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY id
  LIMIT 1;

  IF v_exam_series_id IS NULL THEN
    INSERT INTO exam_series
      (source_institution_id, title, slug, description, from_date, to_date, is_active, created_by, updated_by)
    VALUES
      (v_institution_id, 'Previous Session Unit Test', 'previous-session-unit-test', 'Fixture exam series for checking 2024-2025 session filtering.', '2024-09-01', '2024-09-10', FALSE, v_user_id, v_user_id)
    RETURNING id INTO v_exam_series_id;
  END IF;

  SELECT id INTO v_exam_template_id
  FROM practice_exam_templates
  WHERE source_institution_id = v_institution_id
    AND title = 'Previous Session Mathematics Exam'
    AND COALESCE(exam_kind, 'practice') = 'exam'
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY id
  LIMIT 1;

  IF v_exam_template_id IS NULL THEN
    INSERT INTO practice_exam_templates
      (title, description, total_marks, duration_minutes, is_public, is_active, version, source_institution_id, created_by, updated_by, exam_kind, exam_series_id, exam_date, exam_time, exam_place, exam_mode, result_date, instant_result)
    VALUES
      ('Previous Session Mathematics Exam', 'Fixture exam for checking 2024-2025 session filtering.', 50, 90, FALSE, FALSE, 1, v_institution_id, v_user_id, v_user_id, 'exam', v_exam_series_id, '2024-09-05', '10:00', 'Room 1', 'offline', '2024-09-12', TRUE)
    RETURNING id INTO v_exam_template_id;
  ELSE
    UPDATE practice_exam_templates
    SET is_active = FALSE,
        exam_series_id = v_exam_series_id,
        updated_by = v_user_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_exam_template_id;
  END IF;

  SELECT id INTO v_exam_id
  FROM practice_exams
  WHERE institution_id = v_institution_id
    AND academic_year_id = v_academic_year_id
    AND template_id = v_exam_template_id
    AND COALESCE(exam_kind, 'practice') = 'exam'
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY id
  LIMIT 1;

  IF v_exam_id IS NULL THEN
    INSERT INTO practice_exams
      (institution_id, academic_year_id, template_id, title, description, duration_minutes, total_marks, status, version, exam_kind, exam_date, exam_time, exam_place, exam_mode, result_date, instant_result, created_by, updated_by)
    VALUES
      (v_institution_id, v_academic_year_id, v_exam_template_id, 'Previous Session Mathematics Exam', 'Fixture exam for checking 2024-2025 session filtering.', 90, 50, 'draft', 1, 'exam', '2024-09-05', '10:00', 'Room 1', 'offline', '2024-09-12', TRUE, v_user_id, v_user_id)
    RETURNING id INTO v_exam_id;
  END IF;

  INSERT INTO practice_exam_targets (practice_exam_id, target_type, target_id, program_id)
  SELECT v_exam_id, CASE WHEN v_section_id IS NULL THEN 'PROGRAM' ELSE 'SECTION' END, COALESCE(v_section_id, v_program_id), CASE WHEN v_section_id IS NULL THEN NULL ELSE v_program_id END
  WHERE NOT EXISTS (SELECT 1 FROM practice_exam_targets WHERE practice_exam_id = v_exam_id);

  SELECT id INTO v_note_id
  FROM study_notes
  WHERE institution_id = v_institution_id
    AND academic_year_id = v_academic_year_id
    AND title = 'Previous Session Class Notes'
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY id
  LIMIT 1;

  IF v_note_id IS NULL THEN
    INSERT INTO study_notes
      (institution_id, academic_year_id, program_id, section_id, title, body, is_active, is_public, created_by, updated_by)
    VALUES
      (v_institution_id, v_academic_year_id, v_program_id, v_section_id, 'Previous Session Class Notes', 'Fixture notes for checking 2024-2025 session filtering.', FALSE, FALSE, v_user_id, v_user_id)
    RETURNING id INTO v_note_id;

    INSERT INTO study_note_items
      (note_id, title, body, is_active, created_by, updated_by, sort_order)
    VALUES
      (v_note_id, 'Previous Session Revision Note', 'Use this row to confirm previous-session notes stay scoped to 2024-2025.', FALSE, v_user_id, v_user_id, 1);
  ELSE
    UPDATE study_notes
    SET is_active = FALSE,
        updated_by = v_user_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_note_id;
  END IF;
END
$$;
