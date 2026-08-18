ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL;

ALTER TABLE practice_exams
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL;

UPDATE assignments assignment
SET academic_year_id = academic_year.id
FROM academic_years academic_year
WHERE assignment.academic_year_id IS NULL
  AND academic_year.institution_id = assignment.institution_id
  AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
  AND COALESCE(assignment.issue_date, assignment.created_at::date)
    BETWEEN academic_year.start_date AND academic_year.end_date;

UPDATE assignments assignment
SET academic_year_id = institution.default_academic_year_id
FROM institution_profiles institution
WHERE assignment.academic_year_id IS NULL
  AND institution.id = assignment.institution_id
  AND institution.default_academic_year_id IS NOT NULL;

UPDATE practice_exams exam
SET academic_year_id = academic_year.id
FROM academic_years academic_year
WHERE exam.academic_year_id IS NULL
  AND academic_year.institution_id = exam.institution_id
  AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
  AND COALESCE(exam.exam_date, exam.created_at::date)
    BETWEEN academic_year.start_date AND academic_year.end_date;

UPDATE practice_exams exam
SET academic_year_id = institution.default_academic_year_id
FROM institution_profiles institution
WHERE exam.academic_year_id IS NULL
  AND institution.id = exam.institution_id
  AND institution.default_academic_year_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_academic_year
  ON assignments(institution_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_practice_exams_academic_year
  ON practice_exams(institution_id, academic_year_id, exam_kind);
