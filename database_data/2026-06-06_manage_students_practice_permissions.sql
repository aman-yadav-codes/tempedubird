BEGIN;

WITH permission_rows(code, name, description) AS (
  VALUES
    ('manage_students.practice.view', 'View Practice', 'Can view student practice exams.'),
    ('manage_students.practice.create', 'Create Practice', 'Can create student practice exams.'),
    ('manage_students.practice.edit', 'Edit Practice', 'Can edit student practice exams.'),
    ('manage_students.practice.delete', 'Delete Practice', 'Can delete student practice exams.')
)
INSERT INTO permissions (code, name, description)
SELECT code, name, description
FROM permission_rows
ON CONFLICT (code)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p
  ON p.code IN (
    'manage_students.practice.view',
    'manage_students.practice.create',
    'manage_students.practice.edit',
    'manage_students.practice.delete'
  )
WHERE r.code = 'institution_admin'
ON CONFLICT DO NOTHING;

COMMIT;
