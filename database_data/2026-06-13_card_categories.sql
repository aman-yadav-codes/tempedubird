BEGIN;

DROP TABLE IF EXISTS achievement_categories CASCADE;

CREATE TABLE IF NOT EXISTS card_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO card_categories (name, slug, description)
VALUES
  ('ID Card', 'id-card', 'Student and staff ID cards'),
  ('Result Card', 'result-card', 'Exam results and report cards'),
  ('Transfer Certificate', 'transfer-certificate', 'Student transfer certificates'),
  ('Achievement Certificate', 'achievement-certificate', 'Student achievement certificates'),
  ('Bonafide Certificate', 'bonafide-certificate', 'Bonafide certificates'),
  ('Hall Ticket', 'hall-ticket', 'Exam hall tickets and admit cards'),
  ('Fee Receipt', 'fee-receipt', 'Fee payment receipts'),
  ('Progress Report', 'progress-report', 'Student progress reports'),
  ('Character Certificate', 'character-certificate', 'Student character certificates')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'student_achievements'
      AND column_name = 'achievement_category_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'student_achievements'
      AND column_name = 'card_category_id'
  ) THEN
    ALTER TABLE student_achievements
      RENAME COLUMN achievement_category_id TO card_category_id;
  END IF;
END $$;

ALTER TABLE student_achievements
  ADD COLUMN IF NOT EXISTS card_category_id INTEGER;

UPDATE student_achievements
SET card_category_id = (
  SELECT id
  FROM card_categories
  WHERE slug = 'achievement-certificate'
)
WHERE card_category_id IS NULL;

ALTER TABLE student_achievements
  ALTER COLUMN card_category_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_achievements_card_category_id_fkey'
  ) THEN
    ALTER TABLE student_achievements
      ADD CONSTRAINT student_achievements_card_category_id_fkey
      FOREIGN KEY (card_category_id)
      REFERENCES card_categories(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_achievements_card_category_id
  ON student_achievements(card_category_id);

COMMIT;
