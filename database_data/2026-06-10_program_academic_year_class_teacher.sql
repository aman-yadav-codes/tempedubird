ALTER TABLE institution_programs
ADD COLUMN IF NOT EXISTS academic_year_id INTEGER,
ADD COLUMN IF NOT EXISTS class_teacher_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_program_academic_year'
      AND conrelid = 'institution_programs'::regclass
  ) THEN
    ALTER TABLE institution_programs
    ADD CONSTRAINT fk_program_academic_year
    FOREIGN KEY (academic_year_id)
    REFERENCES academic_years(id)
    ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_program_class_teacher'
      AND conrelid = 'institution_programs'::regclass
  ) THEN
    ALTER TABLE institution_programs
    ADD CONSTRAINT fk_program_class_teacher
    FOREIGN KEY (class_teacher_id)
    REFERENCES users(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_program_academic_year
ON institution_programs(academic_year_id);

CREATE INDEX IF NOT EXISTS idx_program_class_teacher
ON institution_programs(class_teacher_id);
