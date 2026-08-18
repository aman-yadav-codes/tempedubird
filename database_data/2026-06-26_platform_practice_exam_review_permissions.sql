BEGIN;

WITH permission_rows(code, name, description) AS (
  VALUES
    ('content.practice_exam_reviews.view', 'View Practice Exam Reviews', 'Can view practice exam marketplace reviews.'),
    ('content.practice_exam_reviews.create', 'Create Practice Exam Reviews', 'Can create practice exam marketplace reviews.'),
    ('content.practice_exam_reviews.edit', 'Edit Practice Exam Reviews', 'Can edit practice exam marketplace reviews.'),
    ('content.practice_exam_reviews.delete', 'Delete Practice Exam Reviews', 'Can delete practice exam marketplace reviews.')
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
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p
  ON p.code IN (
    'content.practice_exam_reviews.view',
    'content.practice_exam_reviews.create',
    'content.practice_exam_reviews.edit',
    'content.practice_exam_reviews.delete'
  )
WHERE r.code = 'platform_admin'
ON CONFLICT DO NOTHING;

COMMIT;
