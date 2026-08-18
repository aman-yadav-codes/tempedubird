BEGIN;

WITH permission_rows(code, name, description) AS (
  VALUES
    ('content.exams.view', 'View Exams', 'Can view institution exam templates.'),
    ('content.exams.create', 'Create Exams', 'Can create institution exam templates.'),
    ('content.exams.edit', 'Edit Exams', 'Can edit institution exam templates.'),
    ('content.exams.delete', 'Delete Exams', 'Can delete institution exam templates.'),
    ('content.exam_reviews.view', 'View Exam Reviews', 'Can view exam marketplace reviews.'),
    ('content.exam_reviews.create', 'Create Exam Reviews', 'Can create exam marketplace reviews.'),
    ('content.exam_reviews.edit', 'Edit Exam Reviews', 'Can edit exam marketplace reviews.'),
    ('content.exam_reviews.delete', 'Delete Exam Reviews', 'Can delete exam marketplace reviews.'),
    ('student.myclassroom.exams.view', 'View Student Exams', 'Can view exams targeted to the student.'),
    ('parent.childclassroom.exams.view', 'View Child Exams', 'Can view exams targeted to the selected child.')
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
SELECT role.id, permission.id
FROM roles role
INNER JOIN permissions permission
  ON (
    role.code = 'platform_admin'
    AND permission.code LIKE 'content.exam_reviews.%'
  )
  OR (
    role.code = 'institution_admin'
    AND permission.code LIKE 'content.exams.%'
  )
  OR (
    role.code = 'student'
    AND permission.code = 'student.myclassroom.exams.view'
  )
  OR (
    role.code = 'parent'
    AND permission.code = 'parent.childclassroom.exams.view'
  )
ON CONFLICT DO NOTHING;

COMMIT;
