ALTER TABLE timetable_entries
ADD COLUMN IF NOT EXISTS teacher_id INTEGER;

UPDATE timetable_entries te
SET teacher_id = pst.teacher_id
FROM program_subject_teachers pst
WHERE te.teacher_id IS NULL
  AND pst.program_id = te.program_id
  AND pst.section_id = te.section_id
  AND pst.subject_id = te.subject_id
  AND pst.academic_year_id = te.academic_year_id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tte_teacher'
    ) THEN
        ALTER TABLE timetable_entries
        ADD CONSTRAINT fk_tte_teacher
        FOREIGN KEY (teacher_id)
        REFERENCES users(id)
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tte_teacher
ON timetable_entries(teacher_id);
