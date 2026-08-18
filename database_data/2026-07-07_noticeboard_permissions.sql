INSERT INTO permissions (code, name, description, is_system, created_at, updated_at)
VALUES
  ('institution.noticeboard.view', 'View Noticeboard', 'Can view institution noticeboard notices.', FALSE, NOW(), NOW()),
  ('institution.noticeboard.create', 'Create Noticeboard', 'Can create institution noticeboard notices.', FALSE, NOW(), NOW()),
  ('institution.noticeboard.edit', 'Edit Noticeboard', 'Can edit institution noticeboard notices.', FALSE, NOW(), NOW()),
  ('institution.noticeboard.delete', 'Delete Noticeboard', 'Can delete institution noticeboard notices.', FALSE, NOW(), NOW()),
  ('student.institution.noticeboard.view', 'View Student Noticeboard', 'Can view noticeboard notices for students.', FALSE, NOW(), NOW()),
  ('teachers.institution.noticeboard.view', 'View Teacher Noticeboard', 'Can view noticeboard notices for teachers.', FALSE, NOW(), NOW()),
  ('teachers.institution.noticeboard.create', 'Create Teacher Noticeboard', 'Can create noticeboard notices as a teacher.', FALSE, NOW(), NOW()),
  ('teachers.institution.noticeboard.edit', 'Edit Teacher Noticeboard', 'Can edit noticeboard notices as a teacher.', FALSE, NOW(), NOW()),
  ('teachers.institution.noticeboard.delete', 'Delete Teacher Noticeboard', 'Can delete noticeboard notices as a teacher.', FALSE, NOW(), NOW()),
  ('parent.institution.noticeboard.view', 'View Parent Noticeboard', 'Can view noticeboard notices for parents.', FALSE, NOW(), NOW()),
  ('driver.institution.noticeboard.view', 'View Driver Noticeboard', 'Can view noticeboard notices for drivers.', FALSE, NOW(), NOW())
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_deleted = FALSE,
    updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, new_permission.id
FROM role_permissions rp
INNER JOIN permissions old_permission ON old_permission.id = rp.permission_id
INNER JOIN permissions new_permission ON new_permission.code = CASE old_permission.code
  WHEN 'institution.news.view' THEN 'institution.noticeboard.view'
  WHEN 'institution.news.create' THEN 'institution.noticeboard.create'
  WHEN 'institution.news.edit' THEN 'institution.noticeboard.edit'
  WHEN 'institution.news.delete' THEN 'institution.noticeboard.delete'
  WHEN 'student.institution.news.view' THEN 'student.institution.noticeboard.view'
  WHEN 'teachers.institution.news.view' THEN 'teachers.institution.noticeboard.view'
  WHEN 'teachers.institution.news.create' THEN 'teachers.institution.noticeboard.create'
  WHEN 'teachers.institution.news.edit' THEN 'teachers.institution.noticeboard.edit'
  WHEN 'teachers.institution.news.delete' THEN 'teachers.institution.noticeboard.delete'
  WHEN 'parent.institution.news.view' THEN 'parent.institution.noticeboard.view'
  WHEN 'driver.institution.news.view' THEN 'driver.institution.noticeboard.view'
END
WHERE old_permission.code IN (
  'institution.news.view',
  'institution.news.create',
  'institution.news.edit',
  'institution.news.delete',
  'student.institution.news.view',
  'teachers.institution.news.view',
  'teachers.institution.news.create',
  'teachers.institution.news.edit',
  'teachers.institution.news.delete',
  'parent.institution.news.view',
  'driver.institution.news.view'
)
ON CONFLICT DO NOTHING;

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code = 'platform_admin'
  AND (
    p.code LIKE 'institution.news.%'
    OR p.code LIKE 'student.institution.news.%'
    OR p.code LIKE 'teachers.institution.news.%'
    OR p.code LIKE 'parent.institution.news.%'
    OR p.code LIKE 'driver.institution.news.%'
    OR p.code LIKE 'institution.noticeboard.%'
    OR p.code LIKE 'student.institution.noticeboard.%'
    OR p.code LIKE 'teachers.institution.noticeboard.%'
    OR p.code LIKE 'parent.institution.noticeboard.%'
    OR p.code LIKE 'driver.institution.noticeboard.%'
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p
  ON (
    (r.code = 'institution_admin' AND p.code LIKE 'institution.noticeboard.%')
    OR (r.code = 'teacher' AND p.code LIKE 'teachers.institution.noticeboard.%')
  )
WHERE r.code IN ('institution_admin', 'teacher')
  AND COALESCE(p.is_deleted, FALSE) = FALSE
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p
  ON p.code = CASE r.code
    WHEN 'student' THEN 'student.institution.noticeboard.view'
    WHEN 'teacher' THEN 'teachers.institution.noticeboard.view'
    WHEN 'parent' THEN 'parent.institution.noticeboard.view'
    WHEN 'driver' THEN 'driver.institution.noticeboard.view'
  END
WHERE r.code IN ('student', 'teacher', 'parent', 'driver')
  AND COALESCE(p.is_deleted, FALSE) = FALSE
ON CONFLICT DO NOTHING;
