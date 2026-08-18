BEGIN;

WITH modules(code, label, description) AS (
  VALUES
    ('managestaff.allstaff', 'All Staff', 'teacher, driver, and parent profiles')
),
actions(code, label, description_prefix) AS (
  VALUES
    ('view', 'View', 'Can view '),
    ('create', 'Create', 'Can create '),
    ('edit', 'Edit', 'Can edit '),
    ('delete', 'Delete', 'Can delete ')
),
upserted AS (
  INSERT INTO permissions (code, name, description, is_deleted, deleted_at, deleted_by)
  SELECT
    modules.code || '.' || actions.code,
    actions.label || ' ' || modules.label,
    actions.description_prefix || modules.description || '.',
    FALSE,
    NULL,
    NULL
  FROM modules
  CROSS JOIN actions
  ON CONFLICT (code)
  DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_deleted = FALSE,
    deleted_at = NULL,
    deleted_by = NULL
  RETURNING id, code
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, upserted.id
FROM roles r
CROSS JOIN upserted
WHERE r.code = 'institution_admin'
ON CONFLICT DO NOTHING;

COMMIT;
