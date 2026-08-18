CREATE TABLE IF NOT EXISTS program_section_class_teachers (
    id SERIAL PRIMARY KEY,
    program_id INTEGER NOT NULL,
    section_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    academic_year_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_psct_program
        FOREIGN KEY (program_id)
        REFERENCES institution_programs(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_psct_section
        FOREIGN KEY (section_id)
        REFERENCES sections(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_psct_teacher
        FOREIGN KEY (teacher_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_psct_year
        FOREIGN KEY (academic_year_id)
        REFERENCES academic_years(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_psct
        UNIQUE (program_id, section_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_psct_teacher
ON program_section_class_teachers(teacher_id);

CREATE INDEX IF NOT EXISTS idx_psct_program_section
ON program_section_class_teachers(program_id, section_id);

INSERT INTO program_section_class_teachers (
    program_id,
    section_id,
    teacher_id,
    academic_year_id
)
SELECT
    ip.id,
    ps.section_id,
    ip.class_teacher_id,
    ip.academic_year_id
FROM institution_programs ip
INNER JOIN program_sections ps ON ps.program_id = ip.id
WHERE ip.class_teacher_id IS NOT NULL
  AND ip.academic_year_id IS NOT NULL
ON CONFLICT (program_id, section_id, academic_year_id) DO NOTHING;

UPDATE institution_programs
SET class_teacher_id = NULL
WHERE class_teacher_id IS NOT NULL;
