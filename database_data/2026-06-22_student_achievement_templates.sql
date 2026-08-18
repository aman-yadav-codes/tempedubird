BEGIN;

ALTER TABLE student_achievements
  ADD COLUMN IF NOT EXISTS template_id INTEGER,
  ADD COLUMN IF NOT EXISTS institution_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_achievements_template_id_fkey'
  ) THEN
    ALTER TABLE student_achievements
      ADD CONSTRAINT student_achievements_template_id_fkey
      FOREIGN KEY (template_id)
      REFERENCES document_templates(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_achievements_institution_id_fkey'
  ) THEN
    ALTER TABLE student_achievements
      ADD CONSTRAINT student_achievements_institution_id_fkey
      FOREIGN KEY (institution_id)
      REFERENCES institution_profiles(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_achievements_template_id
  ON student_achievements(template_id);

CREATE INDEX IF NOT EXISTS idx_student_achievements_institution_id
  ON student_achievements(institution_id);

COMMIT;
