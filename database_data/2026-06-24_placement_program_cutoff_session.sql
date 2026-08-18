BEGIN;

ALTER TABLE institution_placements
  ADD COLUMN IF NOT EXISTS program_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_institution_placements_program'
  ) THEN
    ALTER TABLE institution_placements
      ADD CONSTRAINT fk_institution_placements_program
      FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_institution_placements_program
ON institution_placements(program_id);

ALTER TABLE institution_cutoffs
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_institution_cutoffs_academic_year'
  ) THEN
    ALTER TABLE institution_cutoffs
      ADD CONSTRAINT fk_institution_cutoffs_academic_year
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_institution_cutoffs_academic_year
ON institution_cutoffs(academic_year_id);

COMMIT;
