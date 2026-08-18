BEGIN;

CREATE TABLE IF NOT EXISTS document_templates (
  id SERIAL PRIMARY KEY,
  card_category_id INTEGER NOT NULL REFERENCES card_categories(id) ON DELETE RESTRICT,
  name VARCHAR(150) NOT NULL,
  thumbnail_url TEXT,
  html_template TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_template_fields (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  label VARCHAR(150) NOT NULL,
  field_type VARCHAR(30) NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS institution_templates (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
  template_id INTEGER NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (institution_id, template_id)
);

CREATE TABLE IF NOT EXISTS generated_documents (
  id BIGSERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
  template_id INTEGER NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  reference_type VARCHAR(50) NOT NULL,
  reference_id INTEGER NOT NULL,
  image_url TEXT,
  pdf_url TEXT,
  generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_document_templates_category
  ON document_templates(card_category_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_active
  ON document_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_document_templates_public
  ON document_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_document_templates_marketplace
  ON document_templates(card_category_id, is_public, is_active);
CREATE INDEX IF NOT EXISTS idx_document_template_fields_template
  ON document_template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_document_template_fields_sort
  ON document_template_fields(template_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_template_fields_name
  ON document_template_fields(template_id, field_name);
CREATE INDEX IF NOT EXISTS idx_institution_templates_institution
  ON institution_templates(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_templates_template
  ON institution_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_institution
  ON generated_documents(institution_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_template
  ON generated_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_reference
  ON generated_documents(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_created_at
  ON generated_documents(created_at);

COMMIT;
