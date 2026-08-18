BEGIN;

WITH permission_rows(code, name, description) AS (
  VALUES
    ('myinstitution.institution_calendar.view', 'View Institution Calendar', 'Can view institution calendar events.'),
    ('myinstitution.institution_calendar.create', 'Create Institution Calendar', 'Can create institution calendar events.'),
    ('myinstitution.institution_calendar.edit', 'Edit Institution Calendar', 'Can edit institution calendar events.'),
    ('myinstitution.institution_calendar.delete', 'Delete Institution Calendar', 'Can delete institution calendar events.')
)
INSERT INTO permissions (code, name, description, is_deleted, deleted_at, deleted_by)
SELECT code, name, description, FALSE, NULL, NULL
FROM permission_rows
ON CONFLICT (code)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_deleted = FALSE,
  deleted_at = NULL,
  deleted_by = NULL;

INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, new_permission.id
FROM role_permissions rp
INNER JOIN permissions old_permission
  ON old_permission.id = rp.permission_id
INNER JOIN permissions new_permission
  ON new_permission.code =
    CASE old_permission.code
      WHEN 'classroom.institution_calendar.view' THEN 'myinstitution.institution_calendar.view'
      WHEN 'classroom.institution_calendar.create' THEN 'myinstitution.institution_calendar.create'
      WHEN 'classroom.institution_calendar.edit' THEN 'myinstitution.institution_calendar.edit'
      WHEN 'classroom.institution_calendar.delete' THEN 'myinstitution.institution_calendar.delete'
    END
WHERE old_permission.code IN (
  'classroom.institution_calendar.view',
  'classroom.institution_calendar.create',
  'classroom.institution_calendar.edit',
  'classroom.institution_calendar.delete'
)
ON CONFLICT DO NOTHING;

DELETE FROM role_permissions rp
USING permissions old_permission
WHERE rp.permission_id = old_permission.id
  AND old_permission.code IN (
    'classroom.institution_calendar.view',
    'classroom.institution_calendar.create',
    'classroom.institution_calendar.edit',
    'classroom.institution_calendar.delete'
  );

UPDATE permissions
SET is_deleted = TRUE,
    deleted_at = COALESCE(deleted_at, NOW())
WHERE code IN (
  'classroom.institution_calendar.view',
  'classroom.institution_calendar.create',
  'classroom.institution_calendar.edit',
  'classroom.institution_calendar.delete'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p
  ON p.code = 'myinstitution.institution_calendar.view'
WHERE r.code = 'student'
ON CONFLICT DO NOTHING;

COMMIT;
