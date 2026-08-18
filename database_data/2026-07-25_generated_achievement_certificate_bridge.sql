ALTER TABLE student_achievements
  ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES document_templates(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_student_achievements_session
  ON student_achievements(institution_id, academic_year_id, is_deleted, achievement_date DESC);

CREATE INDEX IF NOT EXISTS idx_student_achievements_template_id
  ON student_achievements(template_id);

INSERT INTO student_achievements (
  student_id,
  card_category_id,
  template_id,
  institution_id,
  academic_year_id,
  enrollment_id,
  title,
  achievement_date,
  certificate_url,
  remarks,
  created_by,
  updated_by
)
SELECT
  profile.user_id,
  document.card_category_id,
  document.template_id,
  document.institution_id,
  document.academic_year_id,
  document.enrollment_id,
  COALESCE(template.name, document.title, 'Achievement Certificate'),
  timezone('Asia/Kolkata', document.created_at)::date,
  document.image_url,
  document.title,
  document.generated_by,
  document.generated_by
FROM institution_generated_documents document
INNER JOIN student_profiles profile ON profile.id = document.reference_id
LEFT JOIN document_templates template ON template.id = document.template_id
WHERE document.reference_type = 'student_achievement_certificate'
  AND document.academic_year_id IS NOT NULL
  AND COALESCE(document.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1
    FROM student_achievements achievement
    WHERE achievement.student_id = profile.user_id
      AND achievement.template_id = document.template_id
      AND achievement.institution_id = document.institution_id
      AND achievement.academic_year_id = document.academic_year_id
      AND COALESCE(achievement.is_deleted, FALSE) = FALSE
  );
