CREATE TABLE IF NOT EXISTS staff_generated_letters (
  id BIGSERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
  staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id INTEGER NOT NULL REFERENCES document_templates(id) ON DELETE RESTRICT,
  card_category_id INTEGER REFERENCES card_categories(id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  letter_type VARCHAR(80) NOT NULL DEFAULT 'staff_letter',
  rendered_html TEXT NOT NULL,
  field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT,
  pdf_url TEXT,
  canvas_width INTEGER,
  canvas_height INTEGER,
  generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_staff_generated_letters_institution
  ON staff_generated_letters(institution_id, is_deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_generated_letters_staff
  ON staff_generated_letters(staff_user_id, is_deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_generated_letters_template
  ON staff_generated_letters(template_id);

INSERT INTO permissions (code, name, description)
VALUES
  ('teacher.myinstitution.myletters.view', 'View Teacher My Letters', 'Can view letters generated for the teacher.'),
  ('driver.myinstitution.myletters.view', 'View Driver My Letters', 'Can view letters generated for the driver.')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON (
  (r.code = 'teacher' AND p.code = 'teacher.myinstitution.myletters.view')
  OR (r.code = 'driver' AND p.code = 'driver.myinstitution.myletters.view')
)
ON CONFLICT DO NOTHING;
