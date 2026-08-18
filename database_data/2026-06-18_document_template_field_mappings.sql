CREATE TABLE IF NOT EXISTS document_template_field_mappings (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL
    REFERENCES document_templates(id)
    ON DELETE CASCADE,
  institution_id INTEGER NULL
    REFERENCES institution_profiles(id)
    ON DELETE CASCADE,
  template_field_id INTEGER NULL
    REFERENCES document_template_fields(id)
    ON DELETE CASCADE,
  template_field_name VARCHAR(100) NOT NULL,
  source_field_key VARCHAR(150) NOT NULL,
  source_field_label VARCHAR(200) NOT NULL,
  transform VARCHAR(50) NOT NULL DEFAULT 'text',
  fallback_value TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER NULL
    REFERENCES users(id)
    ON DELETE SET NULL,
  updated_by INTEGER NULL
    REFERENCES users(id)
    ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_document_template_field_mappings_global
  ON document_template_field_mappings(template_id, template_field_name)
  WHERE institution_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_document_template_field_mappings_institution
  ON document_template_field_mappings(template_id, institution_id, template_field_name)
  WHERE institution_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_template_field_mappings_template
  ON document_template_field_mappings(template_id);

CREATE INDEX IF NOT EXISTS idx_document_template_field_mappings_institution
  ON document_template_field_mappings(institution_id);
