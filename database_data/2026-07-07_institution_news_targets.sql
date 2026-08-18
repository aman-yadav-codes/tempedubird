ALTER TABLE institution_news
  ADD COLUMN IF NOT EXISTS target_type varchar(30) NOT NULL DEFAULT 'WHOLE_INSTITUTION',
  ADD COLUMN IF NOT EXISTS target_role_code varchar(20),
  ADD COLUMN IF NOT EXISTS target_id bigint,
  ADD COLUMN IF NOT EXISTS target_program_id bigint,
  ADD COLUMN IF NOT EXISTS target_label text,
  ADD COLUMN IF NOT EXISTS image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'institution_news'
      AND column_name = 'image_url'
  ) THEN
    UPDATE institution_news
    SET image_urls = CASE
      WHEN image_urls IS NULL OR image_urls = '[]'::jsonb
        THEN jsonb_build_array(image_url)
      ELSE image_urls
    END
    WHERE image_url IS NOT NULL
      AND btrim(image_url) <> '';

    ALTER TABLE institution_news DROP COLUMN image_url;
  END IF;
END $$;

ALTER TABLE institution_news DROP CONSTRAINT IF EXISTS chk_institution_news_target_type;
ALTER TABLE institution_news ADD CONSTRAINT chk_institution_news_target_type
CHECK (target_type IN ('WHOLE_INSTITUTION', 'ROLE', 'PROGRAM', 'SECTION', 'USER'));

ALTER TABLE institution_news DROP CONSTRAINT IF EXISTS chk_institution_news_target_role;
ALTER TABLE institution_news ADD CONSTRAINT chk_institution_news_target_role
CHECK (target_role_code IS NULL OR target_role_code IN ('teacher', 'student'));

DROP INDEX IF EXISTS idx_institution_news_target;
CREATE INDEX idx_institution_news_target
ON institution_news(institution_id, target_type, target_role_code, target_id, target_program_id)
WHERE is_deleted = FALSE AND is_active = TRUE;
