CREATE TABLE IF NOT EXISTS app_migrations (
  key TEXT PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_lower_email_not_deleted
ON users (lower(email), is_active DESC, id DESC)
WHERE COALESCE(is_deleted, FALSE) = FALSE;

INSERT INTO app_migrations (key)
VALUES ('2026-07-25_login_latency_indexes')
ON CONFLICT (key) DO NOTHING;
