BEGIN;

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'users',
    'scope_types',
    'roles',
    'permissions',
    'categories',
    'boards',
    'subjects',
    'card_categories',
    'document_templates',
    'help_categories',
    'help_articles',
    'help_recent_updates',
    'app_settings',
    'notification_templates',
    'institution_types',
    'institution_subtypes',
    'program_types',
    'facility_types',
    'languages',
    'designations',
    'locations',
    'skills',
    'sections',
    'academic_session_templates',
    'class_timetables',
    'timetable_entries',
    'student_assignment_submission_files',
    'institution_profiles',
    'institution_memberships',
    'institution_programs',
    'institution_academic_classes',
    'institution_class_sections',
    'assignment_templates',
    'assignments',
    'practice_exam_templates',
    'practice_exams',
    'attendance_sessions',
    'student_attendance',
    'student_period_attendance',
    'student_achievements',
    'student_documents',
    'generated_documents',
    'institution_facilities',
    'institution_news',
    'institution_calendar_events',
    'institution_media',
    'institution_placements',
    'institution_cutoffs',
    'institution_scholarships',
    'academic_years',
    'support_tickets',
    'support_ticket_attachments'
  ]
  LOOP
    IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE',
        target_table
      );
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL',
        target_table
      );
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_by INT NULL REFERENCES users(id) ON DELETE SET NULL',
        target_table
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_recycle_bin ON %I(is_deleted, deleted_at DESC)',
        target_table,
        target_table
      );
    END IF;
  END LOOP;
END
$$;

INSERT INTO permissions (code, name, description, is_deleted, deleted_at, deleted_by)
VALUES
  ('settings.recycle_bin.view', 'View Recycle Bin', 'Can view recoverable deleted records within the user''s role and ownership scope.', FALSE, NULL, NULL),
  ('settings.recycle_bin.create', 'Create Recycle Bin', 'Reserved recycle bin create permission.', FALSE, NULL, NULL),
  ('settings.recycle_bin.edit', 'Restore Recycle Bin Records', 'Can restore recoverable deleted records within the user''s role and ownership scope.', FALSE, NULL, NULL),
  ('settings.recycle_bin.delete', 'Permanently Delete Recycle Bin Records', 'Can permanently delete records after role, scope, and super-admin checks.', FALSE, NULL, NULL)
ON CONFLICT (code)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_deleted = FALSE,
  deleted_at = NULL,
  deleted_by = NULL;

INSERT INTO roles (name, code, scope_id, is_deleted, deleted_at, deleted_by)
SELECT
  'Super Admin',
  'super_admin',
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

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
LEFT JOIN scope_types st ON st.id = r.scope_id
WHERE COALESCE(r.is_deleted, FALSE) = FALSE
  AND p.code IN ('settings.recycle_bin.view', 'settings.recycle_bin.edit')
  AND (
    r.code = 'platform_admin'
    OR st.code = 'institution'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON p.code = '*'
WHERE r.code = 'super_admin'
ON CONFLICT DO NOTHING;

COMMIT;
