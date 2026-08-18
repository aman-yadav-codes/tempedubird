ALTER TABLE institution_profiles
ADD COLUMN IF NOT EXISTS board_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_institution_profiles_board'
      AND conrelid = 'institution_profiles'::regclass
  ) THEN
    ALTER TABLE institution_profiles
    ADD CONSTRAINT fk_institution_profiles_board
    FOREIGN KEY (board_id)
    REFERENCES boards(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_institution_profiles_board
ON institution_profiles(board_id);
