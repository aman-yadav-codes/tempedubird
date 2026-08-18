INSERT INTO permissions (code, name, description, is_deleted, deleted_at, deleted_by)
VALUES
  ('student.institution.news.view', 'View Student Institution Alerts', 'Can view institution alerts for students.', FALSE, NULL, NULL),
  ('teachers.institution.news.view', 'View Teacher Institution Alerts', 'Can view institution alerts for teachers.', FALSE, NULL, NULL),
  ('teachers.institution.news.create', 'Create Teacher Institution Alerts', 'Can create institution alerts as a teacher.', FALSE, NULL, NULL),
  ('teachers.institution.news.edit', 'Edit Teacher Institution Alerts', 'Can edit institution alerts as a teacher.', FALSE, NULL, NULL),
  ('teachers.institution.news.delete', 'Delete Teacher Institution Alerts', 'Can delete institution alerts as a teacher.', FALSE, NULL, NULL),
  ('parent.institution.news.view', 'View Parent Institution Alerts', 'Can view institution alerts for parents.', FALSE, NULL, NULL),
  ('driver.institution.news.view', 'View Driver Institution Alerts', 'Can view institution alerts for drivers.', FALSE, NULL, NULL)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_deleted = FALSE,
  deleted_at = NULL,
  deleted_by = NULL;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON p.code = CASE r.code
  WHEN 'student' THEN 'student.institution.news.view'
  WHEN 'teacher' THEN 'teachers.institution.news.view'
  WHEN 'parent' THEN 'parent.institution.news.view'
  WHEN 'driver' THEN 'driver.institution.news.view'
END
WHERE r.code IN ('student', 'teacher', 'parent', 'driver')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON
  (r.code = 'teacher' AND p.code LIKE 'teachers.institution.news.%')
  OR (r.code = 'institution_admin' AND p.code LIKE 'institution.news.%')
WHERE r.code IN ('teacher', 'institution_admin')
ON CONFLICT DO NOTHING;
