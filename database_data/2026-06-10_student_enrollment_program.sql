ALTER TABLE student_enrollments
ADD COLUMN IF NOT EXISTS program_id INTEGER;

ALTER TABLE student_enrollments
DROP CONSTRAINT IF EXISTS fk_student_enrollment_program;

ALTER TABLE student_enrollments
ADD CONSTRAINT fk_student_enrollment_program
FOREIGN KEY (program_id)
REFERENCES institution_programs(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_enrollment_program
ON student_enrollments(program_id);
