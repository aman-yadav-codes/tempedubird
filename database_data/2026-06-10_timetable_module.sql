CREATE TABLE IF NOT EXISTS program_subject_teachers (
    id SERIAL PRIMARY KEY,
    program_id INTEGER NOT NULL,
    section_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    academic_year_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_pst_program FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE CASCADE,
    CONSTRAINT fk_pst_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    CONSTRAINT fk_pst_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    CONSTRAINT fk_pst_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_pst_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    CONSTRAINT uq_pst UNIQUE (program_id, section_id, subject_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS timetable_slots (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    slot_name VARCHAR(50),
    slot_order INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_type VARCHAR(20) NOT NULL DEFAULT 'CLASS',
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_tts_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE,
    CONSTRAINT uq_slot_order UNIQUE (institution_id, slot_order)
);

CREATE TABLE IF NOT EXISTS timetable_entries (
    id SERIAL PRIMARY KEY,
    academic_year_id INTEGER NOT NULL,
    program_id INTEGER NOT NULL,
    section_id INTEGER NOT NULL,
    day_of_week SMALLINT NOT NULL,
    slot_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    teacher_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_tte_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    CONSTRAINT fk_tte_program FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE CASCADE,
    CONSTRAINT fk_tte_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    CONSTRAINT fk_tte_slot FOREIGN KEY (slot_id) REFERENCES timetable_slots(id) ON DELETE CASCADE,
    CONSTRAINT fk_tte_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    CONSTRAINT fk_tte_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_timetable_entry UNIQUE (academic_year_id, program_id, section_id, day_of_week, slot_id)
);

CREATE INDEX IF NOT EXISTS idx_pst_teacher ON program_subject_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_pst_program_section ON program_subject_teachers(program_id, section_id);
CREATE INDEX IF NOT EXISTS idx_tte_program_section ON timetable_entries(program_id, section_id);
CREATE INDEX IF NOT EXISTS idx_tte_day ON timetable_entries(day_of_week);
CREATE INDEX IF NOT EXISTS idx_tte_subject ON timetable_entries(subject_id);
CREATE INDEX IF NOT EXISTS idx_tte_teacher ON timetable_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_slot_institution ON timetable_slots(institution_id);
