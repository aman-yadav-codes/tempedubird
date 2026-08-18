CREATE TABLE IF NOT EXISTS attendance_sessions (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    program_id INTEGER NOT NULL REFERENCES institution_programs(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    attendance_mode VARCHAR(20) NOT NULL CHECK (attendance_mode IN ('FULL_DAY', 'PERIOD_WISE')),
    marked_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_attendance_session UNIQUE (program_id, section_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS student_attendance (
    id SERIAL PRIMARY KEY,
    attendance_session_id INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LEAVE', 'LATE')),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_student_attendance UNIQUE (attendance_session_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_period_attendance (
    id SERIAL PRIMARY KEY,
    attendance_session_id INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    slot_id INTEGER NOT NULL REFERENCES timetable_slots(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LEAVE', 'LATE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_student_period_attendance UNIQUE (attendance_session_id, student_id, slot_id)
);

CREATE INDEX IF NOT EXISTS idx_as_institution ON attendance_sessions(institution_id);
CREATE INDEX IF NOT EXISTS idx_as_academic_year ON attendance_sessions(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_as_program_section ON attendance_sessions(program_id, section_id);
CREATE INDEX IF NOT EXISTS idx_as_date ON attendance_sessions(attendance_date);
CREATE INDEX IF NOT EXISTS idx_as_program_section_date ON attendance_sessions(program_id, section_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_sa_student ON student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_sa_session ON student_attendance(attendance_session_id);
CREATE INDEX IF NOT EXISTS idx_sa_status ON student_attendance(status);
CREATE INDEX IF NOT EXISTS idx_sa_student_session ON student_attendance(student_id, attendance_session_id);
CREATE INDEX IF NOT EXISTS idx_spa_student ON student_period_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_spa_session ON student_period_attendance(attendance_session_id);
CREATE INDEX IF NOT EXISTS idx_spa_slot ON student_period_attendance(slot_id);
CREATE INDEX IF NOT EXISTS idx_spa_student_session ON student_period_attendance(student_id, attendance_session_id);
CREATE INDEX IF NOT EXISTS idx_spa_student_slot ON student_period_attendance(student_id, slot_id);
CREATE INDEX IF NOT EXISTS idx_spa_slot_session ON student_period_attendance(slot_id, attendance_session_id);
