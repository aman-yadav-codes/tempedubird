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
)
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
  deleted_by = NULL;

WITH legacy_map(legacy_code, current_code) AS (
  VALUES
    ('managestaff.teachers.view', 'managestaff.allstaff.view'),
    ('managestaff.teachers.create', 'managestaff.allstaff.create'),
    ('managestaff.teachers.edit', 'managestaff.allstaff.edit'),
    ('managestaff.teachers.delete', 'managestaff.allstaff.delete'),
    ('managestaff.drivers.view', 'managestaff.allstaff.view'),
    ('managestaff.drivers.create', 'managestaff.allstaff.create'),
    ('managestaff.drivers.edit', 'managestaff.allstaff.edit'),
    ('managestaff.drivers.delete', 'managestaff.allstaff.delete'),
    ('managestaff.parents.view', 'managestaff.allstaff.view'),
    ('managestaff.parents.create', 'managestaff.allstaff.create'),
    ('managestaff.parents.edit', 'managestaff.allstaff.edit'),
    ('managestaff.parents.delete', 'managestaff.allstaff.delete')
),
permission_pairs AS (
  SELECT
    legacy_permission.id AS legacy_id,
    current_permission.id AS current_id
  FROM legacy_map
  INNER JOIN permissions legacy_permission
    ON legacy_permission.code = legacy_map.legacy_code
  INNER JOIN permissions current_permission
    ON current_permission.code = legacy_map.current_code
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, permission_pairs.current_id
FROM role_permissions rp
INNER JOIN permission_pairs
  ON permission_pairs.legacy_id = rp.permission_id
ON CONFLICT DO NOTHING;

WITH legacy_map(legacy_code, current_code) AS (
  VALUES
    ('managestaff.teachers.view', 'managestaff.allstaff.view'),
    ('managestaff.teachers.create', 'managestaff.allstaff.create'),
    ('managestaff.teachers.edit', 'managestaff.allstaff.edit'),
    ('managestaff.teachers.delete', 'managestaff.allstaff.delete'),
    ('managestaff.drivers.view', 'managestaff.allstaff.view'),
    ('managestaff.drivers.create', 'managestaff.allstaff.create'),
    ('managestaff.drivers.edit', 'managestaff.allstaff.edit'),
    ('managestaff.drivers.delete', 'managestaff.allstaff.delete'),
    ('managestaff.parents.view', 'managestaff.allstaff.view'),
    ('managestaff.parents.create', 'managestaff.allstaff.create'),
    ('managestaff.parents.edit', 'managestaff.allstaff.edit'),
    ('managestaff.parents.delete', 'managestaff.allstaff.delete')
),
permission_pairs AS (
  SELECT
    legacy_permission.id AS legacy_id,
    current_permission.id AS current_id
  FROM legacy_map
  INNER JOIN permissions legacy_permission
    ON legacy_permission.code = legacy_map.legacy_code
  INNER JOIN permissions current_permission
    ON current_permission.code = legacy_map.current_code
)
INSERT INTO institution_role_permissions (institution_id, role_id, permission_id)
SELECT irp.institution_id, irp.role_id, permission_pairs.current_id
FROM institution_role_permissions irp
INNER JOIN permission_pairs
  ON permission_pairs.legacy_id = irp.permission_id
ON CONFLICT DO NOTHING;

WITH legacy_map(legacy_code, current_code) AS (
  VALUES
    ('managestaff.teachers.view', 'managestaff.allstaff.view'),
    ('managestaff.teachers.create', 'managestaff.allstaff.create'),
    ('managestaff.teachers.edit', 'managestaff.allstaff.edit'),
    ('managestaff.teachers.delete', 'managestaff.allstaff.delete'),
    ('managestaff.drivers.view', 'managestaff.allstaff.view'),
    ('managestaff.drivers.create', 'managestaff.allstaff.create'),
    ('managestaff.drivers.edit', 'managestaff.allstaff.edit'),
    ('managestaff.drivers.delete', 'managestaff.allstaff.delete'),
    ('managestaff.parents.view', 'managestaff.allstaff.view'),
    ('managestaff.parents.create', 'managestaff.allstaff.create'),
    ('managestaff.parents.edit', 'managestaff.allstaff.edit'),
    ('managestaff.parents.delete', 'managestaff.allstaff.delete')
),
permission_pairs AS (
  SELECT
    legacy_permission.id AS legacy_id,
    current_permission.id AS current_id
  FROM legacy_map
  INNER JOIN permissions legacy_permission
    ON legacy_permission.code = legacy_map.legacy_code
  INNER JOIN permissions current_permission
    ON current_permission.code = legacy_map.current_code
)
INSERT INTO institution_role_permission_denials (institution_id, role_id, permission_id)
SELECT irpd.institution_id, irpd.role_id, permission_pairs.current_id
FROM institution_role_permission_denials irpd
INNER JOIN permission_pairs
  ON permission_pairs.legacy_id = irpd.permission_id
ON CONFLICT DO NOTHING;

WITH legacy_map(legacy_code, current_code) AS (
  VALUES
    ('managestaff.teachers.view', 'managestaff.allstaff.view'),
    ('managestaff.teachers.create', 'managestaff.allstaff.create'),
    ('managestaff.teachers.edit', 'managestaff.allstaff.edit'),
    ('managestaff.teachers.delete', 'managestaff.allstaff.delete'),
    ('managestaff.drivers.view', 'managestaff.allstaff.view'),
    ('managestaff.drivers.create', 'managestaff.allstaff.create'),
    ('managestaff.drivers.edit', 'managestaff.allstaff.edit'),
    ('managestaff.drivers.delete', 'managestaff.allstaff.delete'),
    ('managestaff.parents.view', 'managestaff.allstaff.view'),
    ('managestaff.parents.create', 'managestaff.allstaff.create'),
    ('managestaff.parents.edit', 'managestaff.allstaff.edit'),
    ('managestaff.parents.delete', 'managestaff.allstaff.delete')
),
permission_pairs AS (
  SELECT
    legacy_permission.id AS legacy_id,
    current_permission.id AS current_id
  FROM legacy_map
  INNER JOIN permissions legacy_permission
    ON legacy_permission.code = legacy_map.legacy_code
  INNER JOIN permissions current_permission
    ON current_permission.code = legacy_map.current_code
)
INSERT INTO institution_user_permissions (
  institution_id,
  user_id,
  permission_id,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  iup.institution_id,
  iup.user_id,
  permission_pairs.current_id,
  iup.created_by,
  iup.updated_by,
  iup.created_at,
  iup.updated_at
FROM institution_user_permissions iup
INNER JOIN permission_pairs
  ON permission_pairs.legacy_id = iup.permission_id
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'institution_admin'
  AND p.code IN (
    'managestaff.allstaff.view',
    'managestaff.allstaff.create',
    'managestaff.allstaff.edit',
    'managestaff.allstaff.delete'
  )
ON CONFLICT DO NOTHING;

DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT id
  FROM permissions
  WHERE code ~ '^managestaff\.(teachers|drivers|parents)\.(view|create|edit|delete)$'
);

DELETE FROM institution_role_permissions
WHERE permission_id IN (
  SELECT id
  FROM permissions
  WHERE code ~ '^managestaff\.(teachers|drivers|parents)\.(view|create|edit|delete)$'
);

DELETE FROM institution_role_permission_denials
WHERE permission_id IN (
  SELECT id
  FROM permissions
  WHERE code ~ '^managestaff\.(teachers|drivers|parents)\.(view|create|edit|delete)$'
);

DELETE FROM institution_user_permissions
WHERE permission_id IN (
  SELECT id
  FROM permissions
  WHERE code ~ '^managestaff\.(teachers|drivers|parents)\.(view|create|edit|delete)$'
);

UPDATE permissions
SET is_deleted = TRUE,
    deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
WHERE code ~ '^managestaff\.(teachers|drivers|parents)\.(view|create|edit|delete)$';

COMMIT;
