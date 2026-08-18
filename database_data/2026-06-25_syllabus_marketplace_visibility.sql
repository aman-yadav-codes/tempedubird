CREATE TABLE IF NOT EXISTS app_migrations (
    key TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_migrations WHERE key = '2026-06-25_syllabus_marketplace_visibility'
  ) THEN
    ALTER TABLE syllabi
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_syllabi_public
      ON syllabi(is_public);

    INSERT INTO app_migrations (key)
    VALUES ('2026-06-25_syllabus_marketplace_visibility')
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;
