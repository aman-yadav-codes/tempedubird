BEGIN;

-- Ensure scope 'institution' exists
INSERT INTO scope_types (code, name, is_active)
VALUES ('institution', 'Institution', TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = TRUE;

-- Normalize existing Principal role code if needed
UPDATE roles
SET code = 'principal'
WHERE LOWER(code) = 'principal' AND code <> 'principal';

-- Insert / Update all comprehensive roles applicable for Institutions and Coaching Centers
INSERT INTO roles (name, code, scope_id, is_deleted, deleted_at, deleted_by)
SELECT
  r.name,
  r.code,
  scope.id AS scope_id,
  FALSE,
  NULL,
  NULL
FROM (
  VALUES
    ('Institution Admin', 'institution_admin'),
    ('Director', 'director'),
    ('Principal', 'principal'),
    ('Vice Principal', 'vice_principal'),
    ('Dean', 'dean'),
    ('Center Head', 'center_head'),
    ('Branch Manager', 'branch_manager'),
    ('Academic Coordinator', 'academic_coordinator'),
    ('Head of Department', 'hod'),
    ('Teacher', 'teacher'),
    ('Faculty', 'faculty'),
    ('Tutor', 'tutor'),
    ('Teaching Assistant', 'teaching_assistant'),
    ('Doubt Expert', 'doubt_expert'),
    ('Student', 'student'),
    ('Parent', 'parent'),
    ('Counselor', 'counselor'),
    ('Admission Counselor', 'admission_counselor'),
    ('Telecaller', 'telecaller'),
    ('Marketing Executive', 'marketing_executive'),
    ('Institution Accountant', 'institution_accountant'),
    ('Fee Collector', 'fee_collector'),
    ('Exam Controller', 'exam_controller'),
    ('Curriculum Developer', 'curriculum_developer'),
    ('Librarian', 'librarian'),
    ('Lab Assistant', 'lab_assistant'),
    ('IT Support', 'it_support'),
    ('Placement Officer', 'placement_officer'),
    ('Hostel Warden', 'hostel_warden'),
    ('Transport Coordinator', 'transport_coordinator'),
    ('Driver', 'driver'),
    ('Security Guard', 'security_guard'),
    ('Administrative Staff', 'administrative_staff'),
    ('Sports Coach', 'sports_coach')
) AS r(name, code)
CROSS JOIN scope_types scope
WHERE scope.code = 'institution'
ON CONFLICT (code)
DO UPDATE SET
  name = EXCLUDED.name,
  scope_id = EXCLUDED.scope_id,
  is_deleted = FALSE,
  deleted_at = NULL,
  deleted_by = NULL;

COMMIT;
