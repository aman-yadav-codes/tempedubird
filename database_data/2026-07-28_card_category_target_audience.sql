BEGIN;

ALTER TABLE card_categories
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(20) NOT NULL DEFAULT 'student';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'card_categories_target_audience_check'
  ) THEN
    ALTER TABLE card_categories
      ADD CONSTRAINT card_categories_target_audience_check
      CHECK (target_audience IN ('student', 'staff'));
  END IF;
END $$;

UPDATE card_categories
SET
  target_audience = CASE
    WHEN slug IN ('offer-letter', 'joining-letter', 'experience-letter', 'salary-slip') THEN 'staff'
    ELSE 'student'
  END,
  name = CASE
    WHEN slug = 'offer-letter' AND name NOT ILIKE '%staff%' THEN 'Offer Letter - Staff'
    WHEN slug = 'joining-letter' AND name NOT ILIKE '%staff%' THEN 'Joining Letter - Staff'
    WHEN slug = 'experience-letter' AND name NOT ILIKE '%staff%' THEN 'Experience Letter - Staff'
    WHEN slug = 'salary-slip' AND name NOT ILIKE '%staff%' THEN 'Salary Slip - Staff'
    WHEN slug = 'achievement-certificate' AND name NOT ILIKE '%student%' THEN 'Achievement Certificate - Student'
    ELSE name
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE slug IN ('offer-letter', 'joining-letter', 'experience-letter', 'salary-slip', 'achievement-certificate');

INSERT INTO card_categories (name, slug, description, target_audience)
VALUES
  ('Offer Letter - Staff', 'offer-letter', 'Staff offer and appointment letters for teachers and drivers', 'staff'),
  ('Offer Letter - Student', 'offer-letter-student', 'Student offer or admission letters', 'student'),
  ('Joining Letter - Staff', 'joining-letter-staff', 'Staff joining letters for teachers and drivers', 'staff'),
  ('Achievement Certificate - Staff', 'achievement-certificate-staff', 'Staff achievement certificates', 'staff'),
  ('Achievement Certificate - Student', 'achievement-certificate', 'Student achievement certificates', 'student')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  target_audience = EXCLUDED.target_audience,
  updated_at = CURRENT_TIMESTAMP;

COMMIT;
