-- Multi-tenant deployment support for shared Neon/Postgres database.
-- Use this once in production, or let runtime schema guards create it.

CREATE TABLE IF NOT EXISTS institution_domains (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (domain)
);

CREATE INDEX IF NOT EXISTS idx_institution_domains_institution
ON institution_domains (institution_id, is_active);

-- Example:
-- INSERT INTO institution_domains (institution_id, domain, is_primary, verified_at)
-- VALUES (12, 'school1.edubird.com', TRUE, CURRENT_TIMESTAMP)
-- ON CONFLICT (domain) DO UPDATE
-- SET institution_id = EXCLUDED.institution_id,
--     is_primary = EXCLUDED.is_primary,
--     is_active = TRUE,
--     updated_at = CURRENT_TIMESTAMP;
