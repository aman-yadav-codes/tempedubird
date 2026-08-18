ALTER TABLE study_notes
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL;

UPDATE study_notes note
SET academic_year_id = institution.default_academic_year_id
FROM institution_profiles institution
WHERE note.academic_year_id IS NULL
  AND institution.id = note.institution_id
  AND institution.default_academic_year_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_notes_session
  ON study_notes(institution_id, academic_year_id, is_deleted, is_active);

ALTER TABLE institution_calendar_events
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL;

UPDATE institution_calendar_events event
SET academic_year_id = academic_year.id
FROM academic_years academic_year
WHERE event.academic_year_id IS NULL
  AND event.institution_id = academic_year.institution_id
  AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
  AND event.start_date::date BETWEEN academic_year.start_date AND academic_year.end_date;

UPDATE institution_calendar_events event
SET academic_year_id = institution.default_academic_year_id
FROM institution_profiles institution
WHERE event.academic_year_id IS NULL
  AND event.institution_id = institution.id
  AND institution.default_academic_year_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_institution_calendar_events_session
  ON institution_calendar_events(institution_id, academic_year_id, is_deleted, start_date);

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
