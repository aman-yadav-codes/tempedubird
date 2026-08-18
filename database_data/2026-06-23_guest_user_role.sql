BEGIN;

INSERT INTO roles (
  name,
  code,
  scope_id,
  is_deleted,
  deleted_at,
  deleted_by
)
SELECT
  'Guest',
  'guest',
  scope.id,
  FALSE,
  NULL,
  NULL
FROM scope_types scope
WHERE scope.code = 'platform'
ON CONFLICT (code)
DO UPDATE SET
  name = EXCLUDED.name,
  scope_id = EXCLUDED.scope_id,
  is_deleted = FALSE,
  deleted_at = NULL,
  deleted_by = NULL;

COMMIT;
