ALTER TABLE student_achievements
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL;

UPDATE student_achievements achievement
SET academic_year_id = enrollment.academic_year_id
FROM student_profiles profile
INNER JOIN student_enrollments enrollment
  ON enrollment.student_id = profile.id
 AND enrollment.status = 'active'
 AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
INNER JOIN academic_years academic_year
  ON academic_year.id = enrollment.academic_year_id
 AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
WHERE achievement.student_id = profile.user_id
  AND achievement.institution_id = enrollment.institution_id
  AND achievement.academic_year_id IS NULL
  AND COALESCE(achievement.is_deleted, FALSE) = FALSE
  AND COALESCE(achievement.achievement_date, achievement.created_at::date)
    BETWEEN academic_year.start_date AND academic_year.end_date;

CREATE INDEX IF NOT EXISTS idx_student_achievements_session
  ON student_achievements(institution_id, academic_year_id, is_deleted, achievement_date DESC);
