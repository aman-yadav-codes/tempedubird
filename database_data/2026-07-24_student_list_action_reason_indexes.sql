CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id_id
  ON student_profiles(user_id, id);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_action_lookup
  ON student_enrollments(student_id, institution_id, academic_year_id, status)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_student_enrollments_filter_lookup
  ON student_enrollments(student_id, program_id, section_id, academic_year_id, status)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;
