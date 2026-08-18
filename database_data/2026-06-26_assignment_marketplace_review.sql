ALTER TABLE assignment_templates
  ADD COLUMN IF NOT EXISTS marketplace_requested BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS marketplace_requested_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS marketplace_requested_by INTEGER,
  ADD COLUMN IF NOT EXISTS marketplace_approved BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS marketplace_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS marketplace_approved_by INTEGER,
  ADD COLUMN IF NOT EXISTS parent_template_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_assignment_templates_marketplace_review
  ON assignment_templates(marketplace_requested, is_public, blocked_by_platform);

CREATE INDEX IF NOT EXISTS idx_assignment_templates_parent
  ON assignment_templates(parent_template_id);

UPDATE assignment_templates
SET marketplace_requested = TRUE,
    marketplace_approved = TRUE,
    marketplace_approved_at = COALESCE(marketplace_approved_at, updated_at)
WHERE is_public = TRUE
  AND marketplace_approved = FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_assignment_templates_marketplace_requested_by'
  ) THEN
    ALTER TABLE assignment_templates
      ADD CONSTRAINT fk_assignment_templates_marketplace_requested_by
      FOREIGN KEY (marketplace_requested_by)
      REFERENCES users(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_assignment_templates_marketplace_approved_by'
  ) THEN
    ALTER TABLE assignment_templates
      ADD CONSTRAINT fk_assignment_templates_marketplace_approved_by
      FOREIGN KEY (marketplace_approved_by)
      REFERENCES users(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
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
