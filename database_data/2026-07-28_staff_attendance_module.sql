CREATE TABLE IF NOT EXISTS staff_attendance (
  id BIGSERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
  academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
  staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
  check_in_time TIME,
  check_out_time TIME,
  remarks TEXT,
  marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
  updated_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
  CONSTRAINT staff_attendance_status_check
    CHECK (status IN ('PRESENT', 'ABSENT', 'LEAVE', 'LATE', 'HALF_DAY'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_attendance_scope
  ON staff_attendance (institution_id, staff_user_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_institution_date
  ON staff_attendance (institution_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date
  ON staff_attendance (staff_user_id, attendance_date DESC);

CREATE TABLE IF NOT EXISTS staff_leave_requests (
  id BIGSERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
  staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  admin_note TEXT,
  decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
  updated_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
  CONSTRAINT staff_leave_requests_status_check
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  CONSTRAINT staff_leave_requests_date_check CHECK (to_date >= from_date)
);

CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_institution_status
  ON staff_leave_requests (institution_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_staff
  ON staff_leave_requests (staff_user_id, created_at DESC);

INSERT INTO notification_templates (code, title_template, body_template, is_active, updated_at)
VALUES (
  'staff.leave_request.created',
  'New staff leave request',
  '{{staff_name}} ({{staff_role}}) requested leave from {{from_date}} to {{to_date}}: {{message_preview}}',
  TRUE,
  NOW()
)
ON CONFLICT (code) DO NOTHING;
