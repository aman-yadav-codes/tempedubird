-- Institution lifecycle + CRM soft-delete safety.
-- Run this before deploying the related application changes.

DO $$
DECLARE
  table_name text;
  lifecycle_tables text[] := ARRAY[
    'institution_profiles',
    'institution_programs',
    'institution_facilities',
    'institution_news',
    'institution_cutoffs',
    'institution_scholarships',
    'academic_years',
    'institution_academic_classes',
    'institution_class_sections',
    'assignments',
    'assignment_templates',
    'practice_exams',
    'practice_exam_templates',
    'student_enrollments',
    'student_assignments',
    'student_achievements',
    'student_documents',
    'student_practice_exam_attempts',
    'student_practice_exam_results',
    'student_guardians',
    'document_templates',
    'support_tickets',
    'support_ticket_messages',
    'support_ticket_history',
    'help_articles',
    'help_categories',
    'help_recent_updates',
    'institution_media',
    'institution_calendar_events',
    'institution_placements',
    'generated_documents',
    'attendance_sessions',
    'student_attendance',
    'student_period_attendance'
  ];
BEGIN
  FOREACH table_name IN ARRAY lifecycle_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL',
        table_name
      );
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL',
        table_name
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_deleted ON %I(is_deleted)',
        table_name,
        table_name
      );
    END IF;
  END LOOP;

  IF to_regclass('public.institution_profiles') IS NOT NULL THEN
    ALTER TABLE institution_profiles
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' NOT NULL;

    UPDATE institution_profiles
    SET status = CASE
      WHEN COALESCE(is_deleted, FALSE) = TRUE THEN 'deleted'
      WHEN COALESCE(is_active, TRUE) = FALSE THEN 'suspended'
      ELSE COALESCE(NULLIF(status, ''), 'active')
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'chk_institution_profiles_status'
    ) THEN
      ALTER TABLE institution_profiles
        ADD CONSTRAINT chk_institution_profiles_status
        CHECK (status IN ('active', 'suspended', 'archived', 'deleted'));
    END IF;

    CREATE INDEX IF NOT EXISTS idx_institution_profiles_status
      ON institution_profiles(status);
  END IF;
END
$$;
