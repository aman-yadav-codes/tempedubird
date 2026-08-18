ALTER TABLE attendance_sessions
  ALTER COLUMN section_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_session_program_no_section_date
ON attendance_sessions (program_id, attendance_date)
WHERE section_id IS NULL;
