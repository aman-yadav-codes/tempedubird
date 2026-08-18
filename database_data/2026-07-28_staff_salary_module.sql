CREATE TABLE IF NOT EXISTS staff_salary_components (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(120) NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT staff_salary_components_amount_check CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_staff_salary_components_user
  ON staff_salary_components(user_id, sort_order, id);

CREATE TABLE IF NOT EXISTS staff_salary_payouts (
  id BIGSERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
  staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  salary_month CHAR(7) NOT NULL,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  deduction_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payable_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PAID',
  paid_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  paid_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
  updated_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
  CONSTRAINT staff_salary_payouts_status_check CHECK (status IN ('PAID')),
  CONSTRAINT uq_staff_salary_payout_month UNIQUE (institution_id, staff_user_id, salary_month)
);

CREATE INDEX IF NOT EXISTS idx_staff_salary_payouts_institution_month
  ON staff_salary_payouts (institution_id, salary_month, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_salary_payouts_staff_month
  ON staff_salary_payouts (staff_user_id, salary_month DESC);

INSERT INTO institution_calendar_events (
  institution_id,
  academic_year_id,
  title,
  description,
  event_type,
  start_date,
  end_date,
  color,
  created_by
)
SELECT
  institution.id,
  institution.default_academic_year_id,
  holiday.title,
  'Default salary holiday',
  'HOLIDAY',
  holiday.holiday_date::timestamp,
  (holiday.holiday_date::timestamp + interval '23 hours 59 minutes 59 seconds'),
  '#ef4444',
  NULL
FROM institution_profiles institution
CROSS JOIN (
  VALUES
    ('Independence Day', DATE '2026-08-15'),
    ('Gandhi Jayanti', DATE '2026-10-02'),
    ('Diwali Holiday', DATE '2026-11-09'),
    ('Christmas Day', DATE '2026-12-25'),
    ('Republic Day', DATE '2027-01-26')
) AS holiday(title, holiday_date)
WHERE LOWER(institution.name) = 'mp english school'
  AND COALESCE(institution.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1
    FROM institution_calendar_events existing
    WHERE existing.institution_id = institution.id
      AND existing.event_type = 'HOLIDAY'
      AND COALESCE(existing.is_deleted, FALSE) = FALSE
      AND existing.start_date::date = holiday.holiday_date
      AND LOWER(existing.title) = LOWER(holiday.title)
  );

INSERT INTO permissions (code, name, description)
VALUES
  ('teacher.myinstitution.mysalary.view', 'View Teacher My Salary', 'Can view teacher own salary records.'),
  ('driver.myinstitution.mysalary.view', 'View Driver My Salary', 'Can view driver own salary records.')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p
  ON (
    (r.code = 'teacher' AND p.code = 'teacher.myinstitution.mysalary.view')
    OR (r.code = 'driver' AND p.code = 'driver.myinstitution.mysalary.view')
  )
ON CONFLICT DO NOTHING;
