CREATE TABLE IF NOT EXISTS academic_years (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_academic_year UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    admission_number VARCHAR(100),
    apar_id VARCHAR(100),
    date_of_birth DATE,
    blood_group VARCHAR(10),
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(20),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS student_enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    class_category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
    roll_number VARCHAR(50),
    admission_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    previous_enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL,
    remarks TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_student_status CHECK (
        status IN ('active', 'promoted', 'demoted', 'transferred', 'dropout', 'graduated', 'completed', 'suspended')
    )
);

CREATE INDEX IF NOT EXISTS idx_student_enrollment_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollment_class ON student_enrollments(class_category_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollment_year ON student_enrollments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollment_institution ON student_enrollments(institution_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_active_enrollment ON student_enrollments(student_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS student_guardians (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    guardian_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_guardian_student ON student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardian_user ON student_guardians(guardian_user_id);

CREATE TABLE IF NOT EXISTS student_documents (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100),
    file_url TEXT NOT NULL,
    public_id TEXT,
    resource_type VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO permissions (code, name, description)
VALUES
    ('institutions.academic_years.view', 'View Academic Years', 'Can view institution academic years.'),
    ('institutions.academic_years.create', 'Create Academic Years', 'Can create institution academic years.'),
    ('institutions.academic_years.edit', 'Edit Academic Years', 'Can update institution academic years.'),
    ('institutions.academic_years.delete', 'Delete Academic Years', 'Can delete institution academic years.')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;
