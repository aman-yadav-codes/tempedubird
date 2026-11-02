process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const MANAGED_PLATFORM_ROLE_CODES = ["platform_admin", "accountant", "guest"];
const MANAGED_INSTITUTION_ROLE_CODES = [
  "institution_admin",
  "director",
  "principal",
  "vice_principal",
  "dean",
  "center_head",
  "branch_manager",
  "academic_coordinator",
  "hod",
  "teacher",
  "faculty",
  "tutor",
  "teaching_assistant",
  "doubt_expert",
  "student",
  "parent",
  "counselor",
  "admission_counselor",
  "telecaller",
  "marketing_executive",
  "institution_accountant",
  "fee_collector",
  "exam_controller",
  "curriculum_developer",
  "librarian",
  "lab_assistant",
  "it_support",
  "placement_officer",
  "hostel_warden",
  "transport_coordinator",
  "driver",
  "security_guard",
  "administrative_staff",
  "sports_coach",
];

const MANAGED_INSTITUTION_ROLE_NAMES = {
  institution_admin: "Institution Admin",
  director: "Director",
  principal: "Principal",
  vice_principal: "Vice Principal",
  dean: "Dean",
  center_head: "Center Head",
  branch_manager: "Branch Manager",
  academic_coordinator: "Academic Coordinator",
  hod: "Head of Department",
  teacher: "Teacher",
  faculty: "Faculty",
  tutor: "Tutor",
  teaching_assistant: "Teaching Assistant",
  doubt_expert: "Doubt Expert",
  student: "Student",
  parent: "Parent",
  counselor: "Counselor",
  admission_counselor: "Admission Counselor",
  telecaller: "Telecaller",
  marketing_executive: "Marketing Executive",
  institution_accountant: "Institution Accountant",
  fee_collector: "Fee Collector",
  exam_controller: "Exam Controller",
  curriculum_developer: "Curriculum Developer",
  librarian: "Librarian",
  lab_assistant: "Lab Assistant",
  it_support: "IT Support",
  placement_officer: "Placement Officer",
  hostel_warden: "Hostel Warden",
  transport_coordinator: "Transport Coordinator",
  driver: "Driver",
  security_guard: "Security Guard",
  administrative_staff: "Administrative Staff",
  sports_coach: "Sports Coach",
};

async function run() {
  console.log('Testing step 1: platform roles');
  await pool.query(
    `
      INSERT INTO roles (name, code, scope_id, is_system, is_deleted, deleted_at, deleted_by)
      SELECT
        CASE role_code
          WHEN 'accountant' THEN 'Accountant'
          WHEN 'guest' THEN 'Guest'
          ELSE 'Platform Admin'
        END AS name,
        role_code AS code,
        scope.id AS scope_id,
        TRUE,
        FALSE,
        NULL,
        NULL
      FROM unnest($1::text[]) AS managed_roles(role_code)
      CROSS JOIN scope_types scope
      WHERE scope.code = 'platform'
      ON CONFLICT (code)
      DO UPDATE SET
        name = EXCLUDED.name,
        scope_id = EXCLUDED.scope_id,
        is_system = TRUE,
        is_deleted = FALSE,
        deleted_at = NULL,
        deleted_by = NULL
    `,
    [MANAGED_PLATFORM_ROLE_CODES]
  );
  console.log('Step 1 OK');

  console.log('Testing step 2: institution roles');
  const institutionRoleCodes = [...MANAGED_INSTITUTION_ROLE_CODES];
  const institutionRoleNames = institutionRoleCodes.map(
    (code) => MANAGED_INSTITUTION_ROLE_NAMES[code] ?? code
  );

  await pool.query(
    `
      INSERT INTO roles (name, code, scope_id, is_system, is_deleted, deleted_at, deleted_by)
      SELECT
        r.name,
        r.code,
        scope.id AS scope_id,
        TRUE,
        FALSE,
        NULL,
        NULL
      FROM unnest($1::text[], $2::text[]) AS r(code, name)
      CROSS JOIN scope_types scope
      WHERE scope.code = 'institution'
      ON CONFLICT (code)
      DO UPDATE SET
        name = EXCLUDED.name,
        scope_id = EXCLUDED.scope_id,
        is_system = TRUE,
        is_deleted = FALSE,
        deleted_at = NULL,
        deleted_by = NULL
    `,
    [institutionRoleCodes, institutionRoleNames]
  );
  console.log('Step 2 OK');
  await pool.end();
}
run().catch(console.error);
