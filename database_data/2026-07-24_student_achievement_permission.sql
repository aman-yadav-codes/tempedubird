BEGIN;

INSERT INTO permissions (code, name, description, is_deleted, deleted_at, deleted_by)
VALUES (
  'student.myclassroom.achievements.view',
  'View Student Achievements',
  'Can view the signed-in student achievements.',
  FALSE,
  NULL,
  NULL
)
ON CONFLICT (code)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_deleted = FALSE,
  deleted_at = NULL,
  deleted_by = NULL;

INSERT INTO role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM roles role
INNER JOIN permissions permission
  ON permission.code = 'student.myclassroom.achievements.view'
WHERE role.code = 'student'
ON CONFLICT DO NOTHING;

COMMIT;
