import {
  FULL_ACCESS_PERMISSION,
  getLegacyPermissionCodeEntries,
  getManagedPermissionCodes,
  getPermissionDescription,
  getPermissionName,
  isPlatformOnlyPermission,
  MANAGED_PLATFORM_ROLE_CODES,
} from "@/lib/auth/permissions";

type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
};

let lastSyncAt = 0;
let syncPromise: Promise<void> | null = null;
const SYNC_INTERVAL_MS = 10 * 60_000;

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
  await db.query(
    `
      INSERT INTO roles (name, code, scope_id, is_deleted, deleted_at, deleted_by)
      SELECT
        CASE role_code
          WHEN 'accountant' THEN 'Accountant'
          WHEN 'guest' THEN 'Guest'
          ELSE 'Platform Admin'
        END AS name,
        role_code AS code,
        scope.id AS scope_id,
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
        is_deleted = FALSE,
        deleted_at = NULL,
        deleted_by = NULL
    `,
    [MANAGED_PLATFORM_ROLE_CODES]
  );

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

  await db.query(`
    WITH dashboard_map(role_code, current_code) AS (
      VALUES
        ('student', 'student.dashboard.view'),
        ('parent', 'parent.dashboard.view'),
        ('teacher', 'teacher.dashboard.view')
    ),
    old_permission AS (
      SELECT id FROM permissions WHERE code = 'dashboard.view'
    ),
    moved_defaults AS (
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT rp.role_id, current_permission.id
      FROM role_permissions rp
      INNER JOIN roles r ON r.id = rp.role_id
      INNER JOIN dashboard_map mapped ON mapped.role_code = r.code
      INNER JOIN permissions current_permission ON current_permission.code = mapped.current_code
      WHERE rp.permission_id = (SELECT id FROM old_permission)
      ON CONFLICT DO NOTHING
    ),
    moved_overrides AS (
      INSERT INTO institution_role_permissions (institution_id, role_id, permission_id)
      SELECT irp.institution_id, irp.role_id, current_permission.id
      FROM institution_role_permissions irp
      INNER JOIN roles r ON r.id = irp.role_id
      INNER JOIN dashboard_map mapped ON mapped.role_code = r.code
      INNER JOIN permissions current_permission ON current_permission.code = mapped.current_code
      WHERE irp.permission_id = (SELECT id FROM old_permission)
      ON CONFLICT DO NOTHING
    ),
    moved_denials AS (
      INSERT INTO institution_role_permission_denials (institution_id, role_id, permission_id)
      SELECT denied.institution_id, denied.role_id, current_permission.id
      FROM institution_role_permission_denials denied
      INNER JOIN roles r ON r.id = denied.role_id
      INNER JOIN dashboard_map mapped ON mapped.role_code = r.code
      INNER JOIN permissions current_permission ON current_permission.code = mapped.current_code
      WHERE denied.permission_id = (SELECT id FROM old_permission)
      ON CONFLICT DO NOTHING
    ),
    removed_defaults AS (
      DELETE FROM role_permissions rp
      USING roles r
      WHERE rp.role_id = r.id
        AND rp.permission_id = (SELECT id FROM old_permission)
        AND r.code IN ('student', 'parent', 'teacher')
    ),
    removed_overrides AS (
      DELETE FROM institution_role_permissions irp
      USING roles r
      WHERE irp.role_id = r.id
        AND irp.permission_id = (SELECT id FROM old_permission)
        AND r.code IN ('student', 'parent', 'teacher')
    )
    DELETE FROM institution_role_permission_denials denied
    USING roles r
    WHERE denied.role_id = r.id
      AND denied.permission_id = (SELECT id FROM old_permission)
      AND r.code IN ('student', 'parent', 'teacher')
  `);

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
  const recycleBinPermissionCodes = getManagedPermissionCodes().filter((code) =>
    code.startsWith("settings.recycle_bin.")
  );
  const paymentSettingsPermissionCodes = getManagedPermissionCodes().filter((code) =>
    code.startsWith("settings.payments.")
  );
  const blogPermissionCodes = getManagedPermissionCodes().filter((code) =>
    code.startsWith("content.blog.")
  );
  const institutionFinancePermissionCodes = getManagedPermissionCodes().filter((code) =>
    code.startsWith("finance.") && !code.startsWith("finance.platform.")
  );

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

  await db.query(
    `
      DELETE FROM institution_role_permissions irp
      USING roles r, scope_types st, permissions p
      WHERE irp.role_id = r.id
        AND r.scope_id = st.id
        AND irp.permission_id = p.id
        AND st.code = 'institution'
        AND p.code = ANY($1::text[])
    `,
    [platformOnlyPermissionCodes]
  );

  await db.query(
    `
      DELETE FROM institution_role_permission_denials irpd
      USING roles r, scope_types st, permissions p
      WHERE irpd.role_id = r.id
        AND r.scope_id = st.id
        AND irpd.permission_id = p.id
        AND st.code = 'institution'
        AND p.code = ANY($1::text[])
    `,
    [platformOnlyPermissionCodes]
  );

  await db.query(
    `
      DELETE FROM institution_user_permissions iup
      USING permissions p
      WHERE iup.permission_id = p.id
        AND p.code = ANY($1::text[])
    `,
    [platformOnlyPermissionCodes]
  );

  await db.query(
    `
      DELETE FROM role_permissions rp
      USING roles r, permissions p
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
        AND p.code = ANY($1::text[])
        AND r.code NOT IN ('platform_admin', 'institution_admin')
    `,
    [recycleBinPermissionCodes]
  );

  await db.query(`
    DELETE FROM role_permissions rp
    USING roles r, permissions p
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND (
        (p.code LIKE 'student.%' AND r.code <> 'student')
        OR (p.code LIKE 'teachers.%' AND r.code <> 'teacher')
        OR (p.code LIKE 'parent.%' AND r.code <> 'parent')
        OR (p.code LIKE 'teacher.%' AND r.code <> 'teacher')
        OR (r.code = 'student' AND p.code NOT LIKE 'student.%')
        OR (r.code = 'parent' AND p.code NOT LIKE 'parent.%' AND p.code NOT LIKE 'notifications.%' AND p.code <> 'parents.support.view')
        OR (r.code = 'driver'
            AND p.code NOT IN ('driver.support.view', 'driver.myinstitution.noticeboard.view', 'driver.myinstitution.myattendance.view', 'driver.myinstitution.myattendance.create', 'driver.myinstitution.mysalary.view', 'driver.myinstitution.myletters.view')
            AND p.code NOT LIKE 'driver.myinstitution.complaints.%')
        OR (
          r.code = 'teacher'
          AND p.code NOT LIKE 'teacher.%'
          AND p.code NOT LIKE 'teachers.%'
          AND p.code NOT LIKE 'managestudents.%'
          AND p.code NOT LIKE 'content.%'
          AND p.code NOT LIKE 'notifications.%'
          AND p.code NOT LIKE 'support.%'
          AND p.code NOT LIKE 'settings.payments.%'
        )
      )
  `);

  await db.query(`
    DELETE FROM institution_role_permissions irp
    USING roles r, permissions p
    WHERE irp.role_id = r.id
      AND irp.permission_id = p.id
      AND (
        (p.code LIKE 'student.%' AND r.code <> 'student')
        OR (p.code LIKE 'teachers.%' AND r.code <> 'teacher')
        OR (p.code LIKE 'parent.%' AND r.code <> 'parent')
        OR (p.code LIKE 'teacher.%' AND r.code <> 'teacher')
        OR (r.code = 'student' AND p.code NOT LIKE 'student.%')
        OR (r.code = 'parent' AND p.code NOT LIKE 'parent.%' AND p.code NOT LIKE 'notifications.%' AND p.code <> 'parents.support.view')
        OR (r.code = 'driver'
            AND p.code NOT IN ('driver.support.view', 'driver.myinstitution.noticeboard.view', 'driver.myinstitution.myattendance.view', 'driver.myinstitution.myattendance.create', 'driver.myinstitution.mysalary.view', 'driver.myinstitution.myletters.view')
            AND p.code NOT LIKE 'driver.myinstitution.complaints.%')
        OR (
          r.code = 'teacher'
          AND p.code NOT LIKE 'teacher.%'
          AND p.code NOT LIKE 'teachers.%'
          AND p.code NOT LIKE 'managestudents.%'
          AND p.code NOT LIKE 'content.%'
          AND p.code NOT LIKE 'notifications.%'
          AND p.code NOT LIKE 'support.%'
          AND p.code NOT LIKE 'settings.payments.%'
        )
      )
  `);

  await db.query(`
    DELETE FROM institution_role_permission_denials irpd
    USING roles r, permissions p
    WHERE irpd.role_id = r.id
      AND irpd.permission_id = p.id
      AND (
        (p.code LIKE 'student.%' AND r.code <> 'student')
        OR (p.code LIKE 'teachers.%' AND r.code <> 'teacher')
        OR (p.code LIKE 'parent.%' AND r.code <> 'parent')
        OR (p.code LIKE 'teacher.%' AND r.code <> 'teacher')
        OR (r.code = 'student' AND p.code NOT LIKE 'student.%')
        OR (r.code = 'parent' AND p.code NOT LIKE 'parent.%' AND p.code NOT LIKE 'notifications.%' AND p.code <> 'parents.support.view')
        OR (r.code = 'driver'
            AND p.code NOT IN ('driver.support.view', 'driver.myinstitution.noticeboard.view', 'driver.myinstitution.myattendance.view', 'driver.myinstitution.myattendance.create', 'driver.myinstitution.mysalary.view', 'driver.myinstitution.myletters.view')
            AND p.code NOT LIKE 'driver.myinstitution.complaints.%')
        OR (
          r.code = 'teacher'
          AND p.code NOT LIKE 'teacher.%'
          AND p.code NOT LIKE 'teachers.%'
          AND p.code NOT LIKE 'managestudents.%'
          AND p.code NOT LIKE 'content.%'
          AND p.code NOT LIKE 'notifications.%'
          AND p.code NOT LIKE 'support.%'
          AND p.code NOT LIKE 'settings.payments.%'
        )
      )
  `);

  await db.query(
    `
      DELETE FROM institution_role_permissions irp
      USING roles r, permissions p
      WHERE irp.role_id = r.id
        AND irp.permission_id = p.id
        AND p.code = ANY($1::text[])
        AND r.code NOT IN ('institution_admin')
    `,
    [recycleBinPermissionCodes]
  );

  await db.query(
    `
      DELETE FROM institution_role_permission_denials irpd
      USING roles r, permissions p
      WHERE irpd.role_id = r.id
        AND irpd.permission_id = p.id
        AND p.code = ANY($1::text[])
        AND r.code NOT IN ('institution_admin')
    `,
    [recycleBinPermissionCodes]
  );

  await db.query(
    `
      DELETE FROM institution_user_permissions iup
      USING permissions p
      WHERE iup.permission_id = p.id
        AND p.code = ANY($1::text[])
    `,
    [recycleBinPermissionCodes]
  );

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

  await db.query(
    `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      INNER JOIN permissions p
        ON p.code = ANY($1::text[])
       AND COALESCE(p.is_deleted, FALSE) = FALSE
      WHERE r.code IN ('platform_admin', 'institution_admin')
      ON CONFLICT DO NOTHING
    `,
    [paymentSettingsPermissionCodes]
  );

  await db.query(
    `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      INNER JOIN permissions p
        ON p.code = ANY($1::text[])
       AND COALESCE(p.is_deleted, FALSE) = FALSE
      WHERE r.code = 'institution_admin'
      ON CONFLICT DO NOTHING
    `,
    [blogPermissionCodes]
  );

  await db.query(
    `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      INNER JOIN permissions p
        ON p.code = ANY($1::text[])
       AND COALESCE(p.is_deleted, FALSE) = FALSE
      WHERE r.code = 'institution_admin'
      ON CONFLICT DO NOTHING
    `,
    [institutionFinancePermissionCodes]
  );

  await db.query(
    `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      INNER JOIN permissions p
        ON p.code = ANY($1::text[])
       AND COALESCE(p.is_deleted, FALSE) = FALSE
      WHERE r.code = 'institution_admin'
      ON CONFLICT DO NOTHING
    `,
    [
      getManagedPermissionCodes().filter((code) =>
        code.startsWith("managestaff.allstaff.")
      ),
    ]
  );

  await db.query(
    `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      INNER JOIN permissions p
        ON p.code LIKE 'managestudents.fee_management.%'
       AND COALESCE(p.is_deleted, FALSE) = FALSE
      WHERE r.code = 'institution_admin'
      ON CONFLICT DO NOTHING
    `
  );

  await db.query(
    `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      INNER JOIN permissions p
        ON p.code = ANY($1::text[])
       AND COALESCE(p.is_deleted, FALSE) = FALSE
      WHERE r.code = 'institution_admin'
      ON CONFLICT DO NOTHING
    `,
    [recycleBinPermissionCodes]
  );

  await db.query(
    `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      INNER JOIN permissions p
        ON p.code = 'teacher.myclassroom.timetable.view'
       AND COALESCE(p.is_deleted, FALSE) = FALSE
      WHERE r.code = 'teacher'
      ON CONFLICT DO NOTHING
    `
  );

  await db.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    INNER JOIN permissions p
      ON p.code = CASE r.code
        WHEN 'student' THEN 'student.myclassroom.exams.view'
        WHEN 'parent' THEN 'parent.childclassroom.exams.view'
      END
     AND COALESCE(p.is_deleted, FALSE) = FALSE
    WHERE r.code IN ('student', 'parent')
    ON CONFLICT DO NOTHING
  `);

  await db.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    INNER JOIN permissions p
      ON p.code = CASE r.code
        WHEN 'student' THEN 'student.myclassroom.fees.view'
        WHEN 'parent' THEN 'parent.childclassroom.fees.view'
      END
     AND COALESCE(p.is_deleted, FALSE) = FALSE
    WHERE r.code IN ('student', 'parent')
    ON CONFLICT DO NOTHING
  `);

  await db.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    INNER JOIN permissions p
      ON p.code = 'student.myclassroom.results.view'
     AND COALESCE(p.is_deleted, FALSE) = FALSE
    WHERE r.code = 'student'
    ON CONFLICT DO NOTHING
  `);

  await db.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    INNER JOIN permissions p
      ON p.code = 'student.myclassroom.achievements.view'
     AND COALESCE(p.is_deleted, FALSE) = FALSE
    WHERE r.code = 'student'
    ON CONFLICT DO NOTHING
  `);

  await db.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    INNER JOIN permissions p
      ON p.code = 'student.myclassroom.notes.view'
     AND COALESCE(p.is_deleted, FALSE) = FALSE
    WHERE r.code = 'student'
    ON CONFLICT DO NOTHING
  `);

  await db.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    INNER JOIN permissions p
      ON p.code = CASE r.code
        WHEN 'teacher' THEN 'teacher.support.view'
        WHEN 'driver' THEN 'driver.support.view'
      END
     AND COALESCE(p.is_deleted, FALSE) = FALSE
    WHERE r.code IN ('teacher', 'driver')
    ON CONFLICT DO NOTHING
  `);

  await db.query(`
    DELETE FROM role_permissions rp
    USING roles r, permissions p
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND (
        (r.code = 'student' AND p.code = 'student.support.view')
        OR (r.code = 'parent' AND p.code = 'parents.support.view')
      )
  `);

  await db.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    INNER JOIN permissions p
      ON p.code LIKE CASE r.code
        WHEN 'student' THEN 'student.myinstitution.complaints.%'
        WHEN 'teacher' THEN 'teacher.myinstitution.complaints.%'
        WHEN 'parent' THEN 'parent.myinstitution.complaints.%'
        WHEN 'driver' THEN 'driver.myinstitution.complaints.%'
        WHEN 'institution_admin' THEN 'institution.complaints.%'
      END
     AND COALESCE(p.is_deleted, FALSE) = FALSE
    WHERE r.code IN ('student', 'teacher', 'parent', 'driver', 'institution_admin')
    ON CONFLICT DO NOTHING
  `);

  await db.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    INNER JOIN permissions p
      ON (
        (r.code = 'teacher' AND p.code LIKE 'teacher.myinstitution.noticeboard.%')
        OR (r.code = 'institution_admin' AND p.code LIKE 'institution.noticeboard.%')
      )
     AND COALESCE(p.is_deleted, FALSE) = FALSE
    WHERE r.code IN ('teacher', 'institution_admin')
    ON CONFLICT DO NOTHING
  `);

  await db.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    INNER JOIN permissions p
      ON p.code = CASE r.code
        WHEN 'student' THEN 'student.myinstitution.noticeboard.view'
        WHEN 'teacher' THEN 'teacher.myinstitution.noticeboard.view'
        WHEN 'parent' THEN 'parent.myinstitution.noticeboard.view'
        WHEN 'driver' THEN 'driver.myinstitution.noticeboard.view'
      END
     AND COALESCE(p.is_deleted, FALSE) = FALSE
    WHERE r.code IN ('student', 'teacher', 'parent', 'driver')
    ON CONFLICT DO NOTHING
  `);

  await db.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    INNER JOIN permissions p
      ON p.code LIKE 'support.tickets.%'
     AND COALESCE(p.is_deleted, FALSE) = FALSE
    WHERE r.code = 'institution_admin'
    ON CONFLICT DO NOTHING
  `);

}
