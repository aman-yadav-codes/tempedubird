BEGIN;

DROP INDEX IF EXISTS uq_student_active_enrollment;

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_active_program_enrollment
  ON student_enrollments (student_id, institution_id, program_id, academic_year_id)
  WHERE status = 'active' AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_student_active_enrollment_context
  ON student_enrollments (student_id, id)
  WHERE status = 'active' AND COALESCE(is_deleted, FALSE) = FALSE;

COMMIT;
