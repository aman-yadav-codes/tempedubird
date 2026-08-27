import {
  FULL_ACCESS_PERMISSION,
  getLegacyPermissionCodeEntries,
  getManagedPermissionCodes,
  getPermissionDescription,
  getPermissionName,
  isPlatformOnlyPermission,
  MANAGED_INSTITUTION_ROLE_CODES,
  MANAGED_PLATFORM_ROLE_CODES,
} from "@/lib/auth/permissions";

type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
};

let lastSyncAt = 0;
let syncPromise: Promise<void> | null = null;
const SYNC_INTERVAL_MS = 10 * 60_000;

export const MANAGED_INSTITUTION_ROLE_NAMES: Record<string, string> = {
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

export async function syncPermissionRegistry(db: Queryable, force = false) {
  const now = Date.now();
  if (!force && now - lastSyncAt < SYNC_INTERVAL_MS) return;
  if (!force && syncPromise) return syncPromise;

  syncPromise = runPermissionRegistrySync(db)
    .then(() => {
      lastSyncAt = Date.now();
    })
    .finally(() => {
      syncPromise = null;
    });

  return syncPromise;
}

async function runPermissionRegistrySync(db: Queryable) {
  // 1. Seed / update managed platform roles
  await db.query(
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

  // 2. Seed / update managed institution roles
  const institutionRoleCodes = [...MANAGED_INSTITUTION_ROLE_CODES];
  const institutionRoleNames = institutionRoleCodes.map(
    (code) => MANAGED_INSTITUTION_ROLE_NAMES[code] ?? code
  );

  await db.query(
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

  // 3. Seed / update managed permissions
  const codes = [
    FULL_ACCESS_PERMISSION,
    ...getManagedPermissionCodes(),
  ];
  const uniqueCodes = Array.from(new Set(codes));
  const names = uniqueCodes.map(getPermissionName);
  const descriptions = uniqueCodes.map(getPermissionDescription);

  await db.query(
    `
      INSERT INTO permissions (code, name, description, is_deleted, deleted_at, deleted_by)
      SELECT code, name, description, FALSE, NULL, NULL
      FROM unnest($1::text[], $2::text[], $3::text[])
        AS managed_permissions(code, name, description)
      ON CONFLICT (code)
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_deleted = FALSE,
        deleted_at = NULL,
        deleted_by = NULL
    `,
    [uniqueCodes, names, descriptions]
  );

  // 4. Handle legacy permissions
  const legacyEntries = getLegacyPermissionCodeEntries();

  if (legacyEntries.length) {
    const legacyCodes = legacyEntries.map(([legacyCode]) => legacyCode);
    const currentCodes = legacyEntries.map(([, currentCode]) => currentCode);

    await db.query(
      `
        WITH legacy_map AS (
          SELECT legacy_code, current_code
          FROM unnest($1::text[], $2::text[]) AS mapped(legacy_code, current_code)
        ),
        permission_pairs AS (
          SELECT
            legacy_permission.id AS legacy_id,
            current_permission.id AS current_id
          FROM legacy_map
          INNER JOIN permissions legacy_permission
            ON legacy_permission.code = legacy_map.legacy_code
          INNER JOIN permissions current_permission
            ON current_permission.code = legacy_map.current_code
        ),
        moved_role_permissions AS (
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT rp.role_id, permission_pairs.current_id
          FROM role_permissions rp
          INNER JOIN permission_pairs
            ON permission_pairs.legacy_id = rp.permission_id
          ON CONFLICT DO NOTHING
        ),
        moved_institution_permissions AS (
          INSERT INTO institution_role_permissions (institution_id, role_id, permission_id)
          SELECT irp.institution_id, irp.role_id, permission_pairs.current_id
          FROM institution_role_permissions irp
          INNER JOIN permission_pairs
            ON permission_pairs.legacy_id = irp.permission_id
          ON CONFLICT DO NOTHING
        ),
        moved_denied_institution_permissions AS (
          INSERT INTO institution_role_permission_denials (institution_id, role_id, permission_id)
          SELECT irpd.institution_id, irpd.role_id, permission_pairs.current_id
          FROM institution_role_permission_denials irpd
          INNER JOIN permission_pairs
            ON permission_pairs.legacy_id = irpd.permission_id
          ON CONFLICT DO NOTHING
        ),
        moved_personal_permissions AS (
          INSERT INTO institution_user_permissions (
            institution_id,
            user_id,
            permission_id,
            created_by,
            updated_by,
            created_at,
            updated_at
          )
          SELECT
            iup.institution_id,
            iup.user_id,
            permission_pairs.current_id,
            iup.created_by,
            iup.updated_by,
            iup.created_at,
            iup.updated_at
          FROM institution_user_permissions iup
          INNER JOIN permission_pairs
            ON permission_pairs.legacy_id = iup.permission_id
          ON CONFLICT DO NOTHING
        ),
        moved_help_article_permissions AS (
          INSERT INTO help_article_permissions (article_id, permission_id)
          SELECT hap.article_id, permission_pairs.current_id
          FROM help_article_permissions hap
          INNER JOIN permission_pairs
            ON permission_pairs.legacy_id = hap.permission_id
          ON CONFLICT DO NOTHING
        )
        DELETE FROM permissions
        WHERE id IN (SELECT legacy_id FROM permission_pairs)
      `,
      [legacyCodes, currentCodes]
    );
  }

  // 5. Clean up deleted / obsolete permissions
  await db.query(`
    WITH removed_permissions AS (
      SELECT id
      FROM permissions
      WHERE NOT (code = ANY($1::text[]))
    ),
    deleted_role_permissions AS (
      DELETE FROM role_permissions
      WHERE permission_id IN (SELECT id FROM removed_permissions)
    ),
    deleted_institution_permissions AS (
      DELETE FROM institution_role_permissions
      WHERE permission_id IN (SELECT id FROM removed_permissions)
    )
    UPDATE permissions
    SET is_deleted = TRUE,
        deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
    WHERE id IN (SELECT id FROM removed_permissions)
  `, [uniqueCodes]);

  const platformOnlyPermissionCodes = [
    FULL_ACCESS_PERMISSION,
    ...getManagedPermissionCodes().filter(isPlatformOnlyPermission),
  ];
  const institutionOnlyPermissionCodes = getManagedPermissionCodes().filter(
    (code) => !isPlatformOnlyPermission(code)
  );

  // Platform roles must not have institution-only permissions
  await db.query(
    `
      DELETE FROM role_permissions rp
      USING roles r, scope_types st, permissions p
      WHERE rp.role_id = r.id
        AND r.scope_id = st.id
        AND rp.permission_id = p.id
        AND st.code = 'platform'
        AND p.code = ANY($1::text[])
    `,
    [institutionOnlyPermissionCodes]
  );

  // Institution roles must not have platform-only permissions
  await db.query(
    `
      DELETE FROM role_permissions rp
      USING roles r, scope_types st, permissions p
      WHERE rp.role_id = r.id
        AND r.scope_id = st.id
        AND rp.permission_id = p.id
        AND st.code = 'institution'
        AND p.code = ANY($1::text[])
    `,
    [platformOnlyPermissionCodes]
  );

  // Clean personal role namespaces (student.*, parent.*, driver.myinstitution.*) from wrong roles
  await db.query(`
    DELETE FROM role_permissions rp
    USING roles r, permissions p
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND (
        (p.code LIKE 'student.%' AND r.code <> 'student')
        OR (p.code LIKE 'parent.%' AND r.code <> 'parent')
        OR (r.code = 'student' AND p.code NOT LIKE 'student.%')
        OR (r.code = 'parent' AND p.code NOT LIKE 'parent.%' AND p.code NOT LIKE 'notifications.%' AND p.code <> 'parents.support.view')
        OR (r.code = 'driver'
            AND p.code NOT IN ('driver.support.view', 'driver.myinstitution.noticeboard.view', 'driver.myinstitution.myattendance.view', 'driver.myinstitution.myattendance.create', 'driver.myinstitution.mysalary.view', 'driver.myinstitution.myletters.view')
            AND p.code NOT LIKE 'driver.myinstitution.complaints.%')
      )
  `);

  // 6. Assign Default Automatic Permissions for Platform Admin
  await db.query(
    `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      INNER JOIN permissions p
        ON p.code = ANY($1::text[])
       AND COALESCE(p.is_deleted, FALSE) = FALSE
      WHERE r.code = 'platform_admin'
      ON CONFLICT DO NOTHING
    `,
    [platformOnlyPermissionCodes]
  );

  // 7. Seed comprehensive default permissions for all standard Institution Roles
  const allManagedPerms = getManagedPermissionCodes();

  const rolePermissionDefinitions: Array<{
    roleCodes: string[];
    permissionFilter: (code: string) => boolean;
  }> = [
    // --- Full Institution Admin ---
    {
      roleCodes: ["institution_admin"],
      permissionFilter: (code) =>
        !isPlatformOnlyPermission(code) &&
        !code.startsWith("student.") &&
        !code.startsWith("parent.") &&
        !code.startsWith("driver.") &&
        !code.startsWith("teacher.myinstitution.myattendance") &&
        !code.startsWith("teacher.myinstitution.mysalary") &&
        !code.startsWith("teacher.myinstitution.myletters"),
    },

    // --- Leadership & Executive Roles (Director, Principal, Vice Principal, Dean, Center Head, Branch Manager, Academic Coordinator) ---
    {
      roleCodes: [
        "director",
        "principal",
        "vice_principal",
        "dean",
        "center_head",
        "branch_manager",
        "academic_coordinator",
      ],
      permissionFilter: (code) =>
        code === "dashboard.view" ||
        code.startsWith("managestudents.") ||
        code.startsWith("managestaff.allstaff.view") ||
        code.startsWith("managestaff.attendance.view") ||
        code.startsWith("content.") ||
        code.startsWith("institution.programs.") ||
        code.startsWith("institution.facilities.view") ||
        code.startsWith("institution.gallery.view") ||
        code.startsWith("institution.hostels.view") ||
        code.startsWith("institution.libraries.view") ||
        code.startsWith("institution.cutoffs.view") ||
        code.startsWith("institution.scholarships.view") ||
        code.startsWith("institution.noticeboard.") ||
        code.startsWith("institution.complaints.view") ||
        code.startsWith("institution.general_settings.view") ||
        code.startsWith("notifications.inbox.") ||
        code.startsWith("support.tickets."),
    },

    // --- Academic & Teaching Roles (HOD, Teacher, Faculty, Tutor, Teaching Assistant, Doubt Expert) ---
    {
      roleCodes: ["hod", "teacher", "faculty", "tutor", "teaching_assistant", "doubt_expert"],
      permissionFilter: (code) =>
        code === "teacher.dashboard.view" ||
        code === "dashboard.view" ||
        code.startsWith("managestudents.allstudents.view") ||
        code.startsWith("managestudents.attendance.") ||
        code.startsWith("managestudents.achievements.") ||
        code.startsWith("managestudents.assignments.") ||
        code.startsWith("managestudents.exams.") ||
        code.startsWith("managestudents.practice.") ||
        code.startsWith("managestudents.result.") ||
        code.startsWith("managestudents.notes.") ||
        code === "content.subjects.view" ||
        code === "content.courses.view" ||
        code === "content.syllabus.view" ||
        code.startsWith("content.assignments.") ||
        code.startsWith("content.exams.") ||
        code.startsWith("content.notes.") ||
        code.startsWith("content.practice_exams.") ||
        code.startsWith("content.institute_calendar.view") ||
        code.startsWith("content.timetable_setup.view") ||
        code === "content.media.view" ||
        code === "institution.noticeboard.view" ||
        code === "institution.programs.view" ||
        code === "teacher.myclassroom.timetable.view" ||
        code === "teacher.myinstitution.noticeboard.view" ||
        code === "teacher.myinstitution.complaints.view" ||
        code === "teacher.myinstitution.complaints.create" ||
        code === "teacher.myinstitution.myattendance.view" ||
        code === "teacher.myinstitution.myattendance.create" ||
        code === "teacher.myinstitution.mysalary.view" ||
        code === "teacher.myinstitution.myletters.view" ||
        code === "teacher.support.view" ||
        code.startsWith("notifications.inbox.view"),
    },

    // --- Admissions, Sales & Counseling (Counselor, Admission Counselor, Telecaller, Marketing Executive) ---
    {
      roleCodes: ["counselor", "admission_counselor", "telecaller", "marketing_executive"],
      permissionFilter: (code) =>
        code === "dashboard.view" ||
        code.startsWith("sales.leads.") ||
        code.startsWith("sales.pipeline.") ||
        code.startsWith("sales.enquiries.") ||
        code.startsWith("sales.enrollments.") ||
        code === "managestudents.allstudents.view" ||
        code === "managestudents.allstudents.create" ||
        code === "content.courses.view" ||
        code === "institution.programs.view" ||
        code === "institution.facilities.view" ||
        code === "institution.gallery.view" ||
        code === "institution.cutoffs.view" ||
        code === "institution.scholarships.view" ||
        code === "institution.noticeboard.view" ||
        code === "notifications.inbox.view",
    },

    // --- Finance & Fee Collection (Institution Accountant, Fee Collector) ---
    {
      roleCodes: ["institution_accountant", "fee_collector"],
      permissionFilter: (code) =>
        code === "dashboard.view" ||
        code === "managestudents.allstudents.view" ||
        code.startsWith("managestudents.fee_management.") ||
        code.startsWith("finance.income.") ||
        code.startsWith("finance.expense.") ||
        code.startsWith("finance.invoice.") ||
        code.startsWith("finance.allowance.") ||
        code.startsWith("finance.recurring_expenses.") ||
        code === "settings.payments.view" ||
        code === "notifications.inbox.view",
    },

    // --- Exam Controller ---
    {
      roleCodes: ["exam_controller"],
      permissionFilter: (code) =>
        code === "dashboard.view" ||
        code === "managestudents.allstudents.view" ||
        code.startsWith("managestudents.exams.") ||
        code.startsWith("managestudents.practice.") ||
        code.startsWith("managestudents.result.") ||
        code.startsWith("content.exams.") ||
        code.startsWith("content.practice_exams.") ||
        code === "content.courses.view" ||
        code === "content.subjects.view" ||
        code === "content.institute_calendar.view" ||
        code === "institution.noticeboard.view" ||
        code === "notifications.inbox.view",
    },

    // --- Curriculum Developer ---
    {
      roleCodes: ["curriculum_developer"],
      permissionFilter: (code) =>
        code === "dashboard.view" ||
        code.startsWith("content.category_tree.") ||
        code.startsWith("content.categories.") ||
        code.startsWith("content.boards.") ||
        code.startsWith("content.universities.") ||
        code.startsWith("content.certifications.") ||
        code.startsWith("content.subjects.") ||
        code.startsWith("content.courses.") ||
        code.startsWith("content.syllabus.") ||
        code.startsWith("content.assignments.") ||
        code.startsWith("content.notes.") ||
        code.startsWith("content.media.") ||
        code === "notifications.inbox.view",
    },

    // --- Librarian ---
    {
      roleCodes: ["librarian"],
      permissionFilter: (code) =>
        code === "dashboard.view" ||
        code.startsWith("institution.libraries.") ||
        code === "content.notes.view" ||
        code === "content.media.view" ||
        code === "institution.noticeboard.view" ||
        code === "notifications.inbox.view",
    },

    // --- Lab Assistant ---
    {
      roleCodes: ["lab_assistant"],
      permissionFilter: (code) =>
        code === "dashboard.view" ||
        code === "institution.facilities.view" ||
        code === "content.media.view" ||
        code === "institution.noticeboard.view" ||
        code === "notifications.inbox.view",
    },

    // --- IT Support ---
    {
      roleCodes: ["it_support"],
      permissionFilter: (code) =>
        code === "dashboard.view" ||
        code === "institution.ai_settings.view" ||
        code.startsWith("content.media.") ||
        code.startsWith("support.tickets.") ||
        code.startsWith("notifications.inbox.") ||
        code === "notifications.controls.view",
    },

    // --- Placement Officer ---
    {
      roleCodes: ["placement_officer"],
      permissionFilter: (code) =>
        code === "dashboard.view" ||
        code.startsWith("institution.placements.") ||
        code === "managestudents.allstudents.view" ||
        code === "institution.noticeboard.view" ||
        code === "notifications.inbox.view",
    },

    // --- Hostel Warden ---
    {
      roleCodes: ["hostel_warden"],
      permissionFilter: (code) =>
        code === "dashboard.view" ||
        code.startsWith("institution.hostels.") ||
        code === "managestudents.allstudents.view" ||
        code.startsWith("institution.complaints.") ||
        code === "institution.noticeboard.view" ||
        code === "notifications.inbox.view",
    },

    // --- Transport Coordinator ---
    {
      roleCodes: ["transport_coordinator"],
      permissionFilter: (code) =>
        code === "dashboard.view" ||
        code === "managestaff.allstaff.view" ||
        code === "institution.complaints.view" ||
        code === "institution.complaints.create" ||
        code === "institution.noticeboard.view" ||
        code === "notifications.inbox.view",
    },

    // --- Driver ---
    {
      roleCodes: ["driver"],
      permissionFilter: (code) =>
        code === "driver.myinstitution.noticeboard.view" ||
        code === "driver.myinstitution.complaints.view" ||
        code === "driver.myinstitution.complaints.create" ||
        code === "driver.myinstitution.myattendance.view" ||
        code === "driver.myinstitution.myattendance.create" ||
        code === "driver.myinstitution.mysalary.view" ||
        code === "driver.myinstitution.myletters.view" ||
        code === "driver.support.view" ||
        code === "notifications.inbox.view",
    },

    // --- Security Guard ---
    {
      roleCodes: ["security_guard"],
      permissionFilter: (code) =>
        code === "institution.noticeboard.view" ||
        code === "institution.complaints.create" ||
        code === "institution.complaints.view" ||
        code === "notifications.inbox.view",
    },

    // --- Administrative Staff ---
    {
      roleCodes: ["administrative_staff"],
      permissionFilter: (code) =>
        code === "dashboard.view" ||
        code.startsWith("managestudents.allstudents.") ||
        code.startsWith("managestudents.attendance.") ||
        code.startsWith("managestudents.tc.") ||
        code.startsWith("managestudents.cards.") ||
        code === "managestudents.notes.view" ||
        code === "managestaff.allstaff.view" ||
        code.startsWith("managestaff.attendance.") ||
        code.startsWith("managestaff.letters.") ||
        code.startsWith("managestaff.salary_slips.") ||
        code.startsWith("institution.noticeboard.") ||
        code.startsWith("content.institute_calendar.") ||
        code === "notifications.inbox.view",
    },

    // --- Sports Coach ---
    {
      roleCodes: ["sports_coach"],
      permissionFilter: (code) =>
        code === "dashboard.view" ||
        code === "managestudents.allstudents.view" ||
        code.startsWith("managestudents.achievements.") ||
        code === "content.institute_calendar.view" ||
        code === "institution.noticeboard.view" ||
        code === "notifications.inbox.view",
    },

    // --- Student ---
    {
      roleCodes: ["student"],
      permissionFilter: (code) =>
        code === "student.dashboard.view" ||
        code === "student.myclassroom.attendance.view" ||
        code === "student.myclassroom.achievements.view" ||
        code === "student.myclassroom.assignments.view" ||
        code === "student.myclassroom.practice_exams.view" ||
        code === "student.myclassroom.exams.view" ||
        code === "student.myclassroom.results.view" ||
        code === "student.myclassroom.timetable.view" ||
        code === "student.myclassroom.idcard.view" ||
        code === "student.myclassroom.notes.view" ||
        code === "student.myclassroom.fees.view" ||
        code === "student.myprogram.view" ||
        code === "student.guardians.view" ||
        code === "student.myinstitution.calendar.view" ||
        code === "student.myinstitution.complaints.view" ||
        code === "student.myinstitution.complaints.create" ||
        code === "student.myinstitution.noticeboard.view" ||
        code === "student.notification.all.view",
    },

    // --- Parent ---
    {
      roleCodes: ["parent"],
      permissionFilter: (code) =>
        code === "parent.dashboard.view" ||
        code === "parent.childclassroom.attendance.view" ||
        code === "parent.childclassroom.assignments.view" ||
        code === "parent.childclassroom.practice_exams.view" ||
        code === "parent.childclassroom.exams.view" ||
        code === "parent.childclassroom.timetable.view" ||
        code === "parent.childclassroom.idcard.view" ||
        code === "parent.childclassroom.fees.view" ||
        code === "parent.childinstitution.calendar.view" ||
        code === "parent.myinstitution.complaints.view" ||
        code === "parent.myinstitution.complaints.create" ||
        code === "parent.myinstitution.noticeboard.view" ||
        code === "notifications.inbox.view" ||
        code === "parents.support.view",
    },
  ];

  for (const def of rolePermissionDefinitions) {
    const matchedPermCodes = allManagedPerms.filter(def.permissionFilter);
    if (matchedPermCodes.length === 0) continue;

    await db.query(
      `
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permissions p
        WHERE r.code = ANY($1::text[])
          AND p.code = ANY($2::text[])
          AND COALESCE(r.is_deleted, FALSE) = FALSE
          AND COALESCE(p.is_deleted, FALSE) = FALSE
        ON CONFLICT DO NOTHING
      `,
      [def.roleCodes, matchedPermCodes]
    );
  }
}
