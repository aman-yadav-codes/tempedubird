// /lib/queries/user.ts
import type { AdminCreateUserInput } from "@/lib/validations";
import { isPermissionAssignableToRole, type PermissionUser } from "@/lib/auth/permissions";
import { closeMembershipLifecycle, recordMembershipLifecycle } from "@/lib/queries/lifecycle";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { ensureUserPasswordsTable } from "./user-passwords";

type Queryable = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[]
  ) => Promise<{ rows: T[] }>;
};

type RoleRow = {
  id: number;
  name: string;
  code: string | null;
  scope_code: string | null;
};

let userProfileCompleteSchemaReady: Promise<void> | null = null;
let institutionRolePermissionDenialsSchemaReady: Promise<void> | null = null;
let institutionUserPermissionsSchemaReady: Promise<void> | null = null;
let userDocumentsSchemaReady: Promise<void> | null = null;
let staffSalaryStructureSchemaReady: Promise<void> | null = null;

async function ensureUserProfileCompleteSchema(db: Queryable) {
  if (!userProfileCompleteSchemaReady) {
    userProfileCompleteSchemaReady = (async () => {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE
      `);
      await db.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_marketplace_enabled BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS show_in_team BOOLEAN DEFAULT FALSE
      `);
      await db.query(`
        ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS is_marketplace_enabled BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS show_in_team BOOLEAN DEFAULT FALSE
      `);
      await db.query(`
        ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS joining_date DATE,
        ADD COLUMN IF NOT EXISTS date_of_birth DATE,
        ADD COLUMN IF NOT EXISTS shift_timing VARCHAR(100),
        ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50) DEFAULT 'ACTIVE',
        ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50),
        ADD COLUMN IF NOT EXISTS bank_name VARCHAR(120),
        ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(150),
        ADD COLUMN IF NOT EXISTS account_number VARCHAR(60),
        ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(30),
        ADD COLUMN IF NOT EXISTS branch_name VARCHAR(120),
        ADD COLUMN IF NOT EXISTS account_type VARCHAR(30),
        ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS pan_number VARCHAR(30),
        ADD COLUMN IF NOT EXISTS uan_number VARCHAR(50),
        ADD COLUMN IF NOT EXISTS esi_number VARCHAR(50),
        ADD COLUMN IF NOT EXISTS salary_frequency VARCHAR(30),
        ADD COLUMN IF NOT EXISTS salary_notes TEXT
      `);
    })().catch((error) => {
      userProfileCompleteSchemaReady = null;
      throw error;
    });
  }
  return userProfileCompleteSchemaReady;
}

async function ensureInstitutionRolePermissionDenialsSchema(db: Queryable) {
  if (!institutionRolePermissionDenialsSchemaReady) {
    institutionRolePermissionDenialsSchemaReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS institution_role_permission_denials (
          institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
          role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
          permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (institution_id, role_id, permission_id)
        )
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_irpd_institution_role
        ON institution_role_permission_denials(institution_id, role_id)
      `);
    })().catch((error) => {
      institutionRolePermissionDenialsSchemaReady = null;
      throw error;
    });
  }
  return institutionRolePermissionDenialsSchemaReady;
}

async function ensureInstitutionUserPermissionsSchema(db: Queryable) {
  if (!institutionUserPermissionsSchemaReady) {
    institutionUserPermissionsSchemaReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS institution_user_permissions (
          institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
          created_by INTEGER REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (institution_id, user_id, permission_id)
        )
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_iup_institution_user
        ON institution_user_permissions(institution_id, user_id)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_iup_user
        ON institution_user_permissions(user_id)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_iup_permission
        ON institution_user_permissions(permission_id)
      `);
    })().catch((error) => {
      institutionUserPermissionsSchemaReady = null;
      throw error;
    });
  }
  return institutionUserPermissionsSchemaReady;
}

async function ensureUserDocumentsSchema(db: Queryable) {
  if (!userDocumentsSchemaReady) {
    userDocumentsSchemaReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS user_documents (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          document_type VARCHAR(50) NOT NULL,
          document_number VARCHAR(100),
          file_url TEXT NOT NULL,
          public_id TEXT,
          resource_type VARCHAR(50),
          is_verified BOOLEAN DEFAULT FALSE NOT NULL,
          verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_user_documents_user
        ON user_documents(user_id)
      `);
    })().catch((error) => {
      userDocumentsSchemaReady = null;
      throw error;
    });
  }
  return userDocumentsSchemaReady;
}

export async function ensureStaffSalaryStructureSchema(db: Queryable) {
  if (!staffSalaryStructureSchemaReady) {
    staffSalaryStructureSchemaReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS staff_salary_components (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          label VARCHAR(120) NOT NULL,
          amount NUMERIC(12,2) NOT NULL DEFAULT 0,
          component_type VARCHAR(20) DEFAULT 'EARNING',
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          CONSTRAINT staff_salary_components_amount_check CHECK (amount >= 0)
        );
        ALTER TABLE staff_salary_components ADD COLUMN IF NOT EXISTS component_type VARCHAR(20) DEFAULT 'EARNING';
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_staff_salary_components_user
        ON staff_salary_components(user_id, sort_order, id)
      `);
    })().catch((error) => {
      staffSalaryStructureSchemaReady = null;
      throw error;
    });
  }
  return staffSalaryStructureSchemaReady;
}

type RoleScopeRow = {
  id: number;
  code: string;
  scope_code: string | null;
};

type CountRow = {
  count: string;
};

type LocationIdRow = {
  id: number;
};

type InsertedUserRow = QueryResultRow & {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  password: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_profile_complete: boolean;
  created_at: string;
};

type UserRecordRow = QueryResultRow & {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  password: string | null;
  is_active: boolean;
};

export type AdminUserDetails = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  login_provider: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_profile_complete: boolean;
  created_at: string;
  updated_at: string;
  role_id: number | null;
  roles: string[];
  profile: {
    about: string | null;
    gender: string | null;
    hourly_charges: string | null;
    is_teacher: boolean;
    teacher_type: string | null;
    under_institution_id: number | null;
    under_institution_name: string | null;
      institution_logo_url: string | null;
    under_institution_board_id: number | null;
    designation_id: number | null;
    designation_name: string | null;
    membership_role_id?: number | null;
  };
  institutions: {
    id: number;
    name: string;
    role_id: number | null;
    role_name: string | null;
    role_code: string | null;
    is_active: boolean;
  }[];
  location: {
    country: string | null;
    state: string | null;
    city: string | null;
    area: string | null;
    full_address: string | null;
    formatted_address: string | null;
    latitude: string | null;
    longitude: string | null;
    pincode: string | null;
    place_id: string | null;
  } | null;
  experiences: {
    id: number;
    job_title: string;
    company_name: string;
    from_month: number;
    from_year: number;
    to_month: number | null;
    to_year: number | null;
    is_current: boolean;
  }[];
  education: {
    id: number;
    qualification: string;
    institution_id: number | null;
    institution_name: string;
    from_year: number;
    to_year: number;
  }[];
  certifications: {
    id: number;
    name: string;
    issued_authority: string | null;
    duration: string | null;
  }[];
  documents: {
    id: number;
    document_type: string;
    document_number: string | null;
    file_url: string;
    public_id: string | null;
    resource_type: string | null;
    is_verified: boolean;
    verified_by: number | null;
    created_at: string;
    updated_at: string;
  }[];
  salary_components: {
    id: number;
    label: string;
    amount: string;
    sort_order: number;
  }[];
  teaching_categories: {
    id: number;
    name: string;
    slug: string;
    depth: number;
  }[];
  teaching_subjects: {
    id: number;
    name: string;
    slug: string;
    category_id: number;
    board_id: number;
    category_name: string;
    board_name: string | null;
    breadcrumb: string | null;
  }[];
  commission?: {
    commission_type: string;
    commission_rate: string;
    commission_trigger: string;
    minimum_threshold: string | null;
    payout_frequency: string;
    notes: string | null;
    rules: Array<{
      id?: string;
      condition_trigger: string;
      condition_label: string;
      reward_type: "PERCENTAGE" | "FIXED_AMOUNT";
      rate: string;
      minimum_threshold?: string | null;
      payout_frequency?: string;
      notes?: string | null;
    }>;
  } | null;
};

export const getUserById = async (
  db: Queryable,
  id: number
): Promise<PermissionUser | null> => {
  await ensureInstitutionRolePermissionDenialsSchema(db);
  await ensureInstitutionUserPermissionsSchema(db);
  const [userResult, platformResult, membershipResult] = await Promise.all([
    db.query<QueryResultRow & {
      id: number;
      full_name: string;
      email: string;
      phone: string | null;
      is_active: boolean;
      is_verified: boolean;
    }>(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.is_active,
        u.is_verified,
        up.under_institution_id
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id = $1
      AND COALESCE(u.is_deleted, FALSE) = FALSE
    `, [id]),
    db.query<QueryResultRow & {
      role_name: string;
      role_code: string;
      permission_code: string | null;
    }>(`
      SELECT
        r.name AS role_name,
        r.code AS role_code,
        p.code AS permission_code
      FROM user_roles ur
      INNER JOIN roles r
        ON r.id = ur.role_id
        AND COALESCE(r.is_deleted, FALSE) = FALSE
      INNER JOIN scope_types st ON st.id = r.scope_id
      LEFT JOIN role_permissions rp
        ON rp.role_id = r.id
      LEFT JOIN permissions p
        ON p.id = rp.permission_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
      WHERE ur.user_id = $1
    `, [id]),
    db.query<QueryResultRow & {
      id: number;
      institution_id: number;
      institution_name: string | null;
      institution_board_id: number | null;
      institution_board_name: string | null;
      role_id: number;
      role_code: string;
      role_name: string;
      permission_code: string | null;
    }>(`
      WITH scoped_memberships AS (
        SELECT
          im.id,
          im.institution_id,
          im.role_id
        FROM institution_memberships im
        WHERE im.user_id = $1
          AND im.is_active = TRUE
          AND COALESCE(im.is_deleted, FALSE) = FALSE
      )
      SELECT
        sm.id,
        sm.institution_id,
        ip.name AS institution_name,
        ip.logo_url AS institution_logo_url,
        ip.board_id AS institution_board_id,
        b.name AS institution_board_name,
        r.id AS role_id,
        r.code AS role_code,
        r.name AS role_name,
        permission_codes.permission_code
      FROM scoped_memberships sm
      INNER JOIN roles r
        ON r.id = sm.role_id
        AND COALESCE(r.is_deleted, FALSE) = FALSE
      INNER JOIN scope_types st ON st.id = r.scope_id
      INNER JOIN institution_profiles ip
        ON ip.id = sm.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
        AND EXISTS (
          SELECT 1
          FROM institution_memberships admin_im
          INNER JOIN roles admin_role
            ON admin_role.id = admin_im.role_id
            AND admin_role.code = 'institution_admin'
          INNER JOIN users admin_user
            ON admin_user.id = admin_im.user_id
            AND admin_user.is_active = TRUE
            AND COALESCE(admin_user.is_deleted, FALSE) = FALSE
          WHERE admin_im.institution_id = ip.id
            AND admin_im.is_active = TRUE
            AND COALESCE(admin_im.is_deleted, FALSE) = FALSE
        )
      LEFT JOIN boards b
        ON b.id = ip.board_id
        AND COALESCE(b.is_deleted, FALSE) = FALSE
      LEFT JOIN LATERAL (
        SELECT p.code AS permission_code
        FROM role_permissions rp
        INNER JOIN permissions p
          ON p.id = rp.permission_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
        WHERE rp.role_id = sm.role_id
          AND NOT EXISTS (
            SELECT 1
            FROM institution_role_permission_denials denied
            WHERE denied.institution_id = sm.institution_id
              AND denied.role_id = sm.role_id
              AND denied.permission_id = rp.permission_id
          )
        UNION
        SELECT p.code AS permission_code
        FROM institution_role_permissions irp
        INNER JOIN permissions p
          ON p.id = irp.permission_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
        INNER JOIN roles override_role ON override_role.id = sm.role_id
        WHERE irp.institution_id = sm.institution_id
          AND irp.role_id = sm.role_id
          AND override_role.code <> 'institution_admin'
        UNION
        SELECT p.code AS permission_code
        FROM institution_user_permissions iup
        INNER JOIN permissions p
          ON p.id = iup.permission_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
        WHERE iup.institution_id = sm.institution_id
          AND iup.user_id = $1
      ) permission_codes ON TRUE
      WHERE st.code = 'institution'
    `, [id]),
  ]);

  const user = userResult.rows[0];
  if (!user) return null;

  const roles = Array.from(new Set([
    ...platformResult.rows.map((row) => row.role_name),
    ...membershipResult.rows.map((row) => row.role_name),
  ]));
  const roleCodes = Array.from(new Set([
    ...platformResult.rows.map((row) => row.role_code),
    ...membershipResult.rows.map((row) => row.role_code),
  ]));
  const permissions = Array.from(
    new Set(
      platformResult.rows
        .map((row) => row.permission_code)
        .filter((code): code is string => Boolean(code))
    )
  );

  const membershipMap = new Map<number, PermissionUser["memberships"][number]>();
  for (const row of membershipResult.rows) {
    const permissionAllowedForRole =
      row.permission_code && isPermissionAssignableToRole(row.permission_code, row.role_code);
    const existing = membershipMap.get(row.id);
    if (existing) {
      if (
        row.permission_code &&
        permissionAllowedForRole &&
        !existing.permissions.includes(row.permission_code)
      ) {
        existing.permissions.push(row.permission_code);
      }
      continue;
    }

    membershipMap.set(row.id, {
      id: row.id,
      institution_id: row.institution_id,
      institution_name: row.institution_name,
      institution_logo_url: row.institution_logo_url,
      institution_board_id: row.institution_board_id,
      institution_board_name: row.institution_board_name,
      role_id: row.role_id,
      role_code: row.role_code,
      role_name: row.role_name,
      permissions: row.permission_code && permissionAllowedForRole ? [row.permission_code] : [],
    });
  }

  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    is_active: user.is_active,
    is_verified: user.is_verified,
    roles,
    role_codes: roleCodes,
    permissions,
    memberships: Array.from(membershipMap.values()),
    under_institution_id: user.under_institution_id ? Number(user.under_institution_id) : null,
  };
};

export const getUsersPaginatedQuery = async (
  db: Queryable,
  currentUserId: number,
  limit: number,
  offset: number,
  institutionIds: number[] | null = null,
  filters: {
    search?: string | null;
    institutionId?: number | null;
    roleId?: number | null;
    roleCode?: string | null;
    roleCodes?: string[] | null;
    isActive?: boolean | null;
    includeCurrentUser?: boolean;
    includePlatformAdmins?: boolean;
    staffScope?: "all" | "institution_staff" | "teacher_driver" | null;
  } = {}
) => {
  await ensureUserProfileCompleteSchema(db);
  await ensureUserPasswordsTable(db);
  const filtersWhere: string[] = [
    "COALESCE(u.is_deleted, FALSE) = FALSE",
  ];
  const filterParams: unknown[] = [];
  let institutionFilterIndex: number | null = null;

  if (!filters.includeCurrentUser) {
    filterParams.push(currentUserId);
    filtersWhere.unshift(`u.id != $${filterParams.length}`);
  }

  const platformAdminRoleExists = `
    EXISTS (
      SELECT 1
      FROM user_roles global_role
      INNER JOIN roles global_role_meta ON global_role_meta.id = global_role.role_id
      WHERE global_role.user_id = u.id
        AND global_role_meta.code = 'platform_admin'
    )
  `;

  const userInstitutionExists = (predicate: string) => `
    EXISTS (
      SELECT 1
      FROM (
        SELECT scoped_im.institution_id
        FROM institution_memberships scoped_im
        WHERE scoped_im.user_id = u.id
          AND scoped_im.is_active = TRUE
          AND COALESCE(scoped_im.is_deleted, FALSE) = FALSE
        UNION
        SELECT scoped_up.under_institution_id AS institution_id
        FROM user_profiles scoped_up
        WHERE scoped_up.user_id = u.id
          AND scoped_up.under_institution_id IS NOT NULL
      ) scoped_user_institutions
      WHERE ${predicate}
    )
  `;
  const userInstitutionOrPlatformAdminExists = (predicate: string) => {
    const institutionExists = userInstitutionExists(predicate);
    return filters.includePlatformAdmins
      ? `(${institutionExists} OR ${platformAdminRoleExists})`
      : institutionExists;
  };

  if (filters.search) {
    filterParams.push(`%${filters.search}%`);
    filtersWhere.push(`(
      u.full_name ILIKE $${filterParams.length}
      OR u.email ILIKE $${filterParams.length}
      OR COALESCE(u.phone, '') ILIKE $${filterParams.length}
      OR CAST(u.id AS TEXT) ILIKE $${filterParams.length}
    )`);
  }

  if (institutionIds !== null) {
    if (institutionIds.length === 0) {
      filtersWhere.push("FALSE");
    } else {
      filterParams.push(institutionIds);
      filtersWhere.push(userInstitutionOrPlatformAdminExists(`scoped_user_institutions.institution_id = ANY($${filterParams.length}::int[])`));
    }
  }

  if (filters.institutionId) {
    filterParams.push(filters.institutionId);
    institutionFilterIndex = filterParams.length;
    filtersWhere.push(userInstitutionOrPlatformAdminExists(`scoped_user_institutions.institution_id = $${institutionFilterIndex}`));
  }

  if (filters.roleId) {
    filterParams.push(filters.roleId);
    const roleIdIndex = filterParams.length;
    filtersWhere.push(institutionFilterIndex
      ? `(
          EXISTS (
            SELECT 1
            FROM institution_memberships member_role
            WHERE member_role.user_id = u.id
              AND member_role.institution_id = $${institutionFilterIndex}
              AND member_role.role_id = $${roleIdIndex}
              AND member_role.is_active = TRUE
              AND COALESCE(member_role.is_deleted, FALSE) = FALSE
          )
          OR EXISTS (
            SELECT 1
            FROM user_roles user_role
            INNER JOIN user_profiles scoped_profile ON scoped_profile.user_id = u.id
            WHERE user_role.user_id = u.id
              AND user_role.role_id = $${roleIdIndex}
              AND scoped_profile.under_institution_id = $${institutionFilterIndex}
          )
        )`
      : `
        EXISTS (
          SELECT 1
          FROM (
            SELECT user_role.role_id
            FROM user_roles user_role
            WHERE user_role.user_id = u.id
            UNION
            SELECT member_role.role_id
            FROM institution_memberships member_role
            WHERE member_role.user_id = u.id
              AND member_role.is_active = TRUE
              AND COALESCE(member_role.is_deleted, FALSE) = FALSE
          ) user_roles_scope
          WHERE user_roles_scope.role_id = $${roleIdIndex}
        )
      `);
  }

  if (filters.roleCode) {
    filterParams.push(filters.roleCode);
    const roleCodeIndex = filterParams.length;
    filtersWhere.push(institutionFilterIndex
      ? `(
          EXISTS (
            SELECT 1
            FROM institution_memberships member_role
            INNER JOIN roles role_by_membership ON role_by_membership.id = member_role.role_id
            WHERE member_role.user_id = u.id
              AND member_role.institution_id = $${institutionFilterIndex}
              AND member_role.is_active = TRUE
              AND COALESCE(member_role.is_deleted, FALSE) = FALSE
              AND role_by_membership.code = $${roleCodeIndex}
          )
          OR EXISTS (
            SELECT 1
            FROM user_roles user_role
            INNER JOIN roles role_by_user ON role_by_user.id = user_role.role_id
            INNER JOIN user_profiles scoped_profile ON scoped_profile.user_id = u.id
            WHERE role_by_user.code = $${roleCodeIndex}
              AND scoped_profile.under_institution_id = $${institutionFilterIndex}
          )
          ${filters.includePlatformAdmins ? `OR (
            ${platformAdminRoleExists}
            AND EXISTS (
              SELECT 1
              FROM roles requested_global_role
              WHERE requested_global_role.code = $${roleCodeIndex}
                AND requested_global_role.code = 'platform_admin'
            )
          )` : ""}
        )`
      : `
        EXISTS (
          SELECT 1
          FROM (
            SELECT role_by_user.code
            FROM user_roles user_role
            INNER JOIN roles role_by_user ON role_by_user.id = user_role.role_id
            WHERE user_role.user_id = u.id
            UNION
            SELECT role_by_membership.code
            FROM institution_memberships member_role
            INNER JOIN roles role_by_membership ON role_by_membership.id = member_role.role_id
            WHERE member_role.user_id = u.id
              AND member_role.is_active = TRUE
              AND COALESCE(member_role.is_deleted, FALSE) = FALSE
          ) user_role_codes
          WHERE user_role_codes.code = $${roleCodeIndex}
        )
      `);
  }

  if (filters.roleCodes?.length) {
    filterParams.push(Array.from(new Set(filters.roleCodes)));
    const roleCodesIndex = filterParams.length;
    filtersWhere.push(institutionFilterIndex
      ? `(
          EXISTS (
            SELECT 1
            FROM institution_memberships member_role
            INNER JOIN roles role_by_membership ON role_by_membership.id = member_role.role_id
            WHERE member_role.user_id = u.id
              AND member_role.institution_id = $${institutionFilterIndex}
              AND member_role.is_active = TRUE
              AND COALESCE(member_role.is_deleted, FALSE) = FALSE
              AND role_by_membership.code = ANY($${roleCodesIndex}::text[])
          )
          OR EXISTS (
            SELECT 1
            FROM user_roles user_role
            INNER JOIN roles role_by_user ON role_by_user.id = user_role.role_id
            INNER JOIN user_profiles scoped_profile ON scoped_profile.user_id = u.id
            WHERE role_by_user.code = ANY($${roleCodesIndex}::text[])
              AND scoped_profile.under_institution_id = $${institutionFilterIndex}
          )
          ${filters.includePlatformAdmins ? `OR (
            ${platformAdminRoleExists}
            AND 'platform_admin' = ANY($${roleCodesIndex}::text[])
          )` : ""}
        )`
      : `
        EXISTS (
          SELECT 1
          FROM (
            SELECT role_by_user.code
            FROM user_roles user_role
            INNER JOIN roles role_by_user ON role_by_user.id = user_role.role_id
            WHERE user_role.user_id = u.id
            UNION
            SELECT role_by_membership.code
            FROM institution_memberships member_role
            INNER JOIN roles role_by_membership ON role_by_membership.id = member_role.role_id
            WHERE member_role.user_id = u.id
              AND member_role.is_active = TRUE
              AND COALESCE(member_role.is_deleted, FALSE) = FALSE
          ) user_role_codes
          WHERE user_role_codes.code = ANY($${roleCodesIndex}::text[])
        )
      `);
  }

  if (filters.staffScope === "all" || filters.staffScope === "institution_staff") {
    if (institutionFilterIndex) {
      filtersWhere.push(`
        (
          EXISTS (
            SELECT 1
            FROM institution_memberships staff_member
            INNER JOIN roles staff_role ON staff_role.id = staff_member.role_id
            WHERE staff_member.user_id = u.id
              AND staff_member.institution_id = $${institutionFilterIndex}
              AND staff_member.is_active = TRUE
              AND COALESCE(staff_member.is_deleted, FALSE) = FALSE
              AND staff_role.code NOT IN ('student', 'guardian', 'parent')
          )
          OR EXISTS (
            SELECT 1
            FROM user_profiles scoped_up
            JOIN user_roles scoped_ur ON scoped_ur.user_id = u.id
            JOIN roles scoped_r ON scoped_r.id = scoped_ur.role_id
            WHERE scoped_up.user_id = u.id
              AND scoped_up.under_institution_id = $${institutionFilterIndex}
              AND scoped_r.code NOT IN ('student', 'guardian', 'parent')
          )
        )
      `);
    } else {
      filtersWhere.push(`
        (
          (
            EXISTS (
              SELECT 1
              FROM institution_memberships staff_member
              INNER JOIN roles staff_role ON staff_role.id = staff_member.role_id
              WHERE staff_member.user_id = u.id
                AND staff_member.is_active = TRUE
                AND COALESCE(staff_member.is_deleted, FALSE) = FALSE
                AND staff_role.code NOT IN ('student', 'guardian', 'parent')
            )
            OR EXISTS (
              SELECT 1
              FROM user_profiles scoped_up
              JOIN user_roles scoped_ur ON scoped_ur.user_id = u.id
              JOIN roles scoped_r ON scoped_r.id = scoped_ur.role_id
              WHERE scoped_up.user_id = u.id
                AND scoped_r.code NOT IN ('student', 'guardian', 'parent')
            )
            OR EXISTS (
              SELECT 1
              FROM user_roles global_ur
              JOIN roles global_r ON global_r.id = global_ur.role_id
              WHERE global_ur.user_id = u.id
                AND global_r.code NOT IN ('student', 'guardian', 'parent')
            )
          )
          AND (
            u.created_by = 1
            OR EXISTS (
              SELECT 1
              FROM user_roles cr_ur
              JOIN roles cr_r ON cr_r.id = cr_ur.role_id
              WHERE cr_ur.user_id = u.created_by
                AND cr_r.code IN ('platform_admin', 'super_admin')
            )
            OR (
              u.created_by IS NULL
              AND EXISTS (
                SELECT 1
                FROM user_roles global_ur
                JOIN roles global_r ON global_r.id = global_ur.role_id
                LEFT JOIN scope_types global_st ON global_st.id = global_r.scope_id
                WHERE global_ur.user_id = u.id
                  AND (global_st.code = 'platform' OR global_r.code IN ('platform_admin', 'super_admin'))
              )
            )
          )
        )
      `);
    }
  } else if (filters.staffScope === "teacher_driver") {
    if (institutionFilterIndex) {
      filtersWhere.push(`
        (
          EXISTS (
            SELECT 1
            FROM institution_memberships staff_member
            INNER JOIN roles staff_role ON staff_role.id = staff_member.role_id
            WHERE staff_member.user_id = u.id
              AND staff_member.institution_id = $${institutionFilterIndex}
              AND staff_member.is_active = TRUE
              AND COALESCE(staff_member.is_deleted, FALSE) = FALSE
              AND staff_role.code IN ('teacher', 'driver')
          )
          OR EXISTS (
            SELECT 1
            FROM user_profiles scoped_up
            JOIN user_roles scoped_ur ON scoped_ur.user_id = u.id
            JOIN roles scoped_r ON scoped_r.id = scoped_ur.role_id
            WHERE scoped_up.user_id = u.id
              AND scoped_up.under_institution_id = $${institutionFilterIndex}
              AND scoped_r.code IN ('teacher', 'driver')
          )
        )
      `);
    } else {
      filtersWhere.push(`
        (
          (
            EXISTS (
              SELECT 1
              FROM institution_memberships staff_member
              INNER JOIN roles staff_role ON staff_role.id = staff_member.role_id
              WHERE staff_member.user_id = u.id
                AND staff_member.is_active = TRUE
                AND COALESCE(staff_member.is_deleted, FALSE) = FALSE
                AND staff_role.code IN ('teacher', 'driver')
            )
            OR EXISTS (
              SELECT 1
              FROM user_profiles scoped_up
              JOIN user_roles scoped_ur ON scoped_ur.user_id = u.id
              JOIN roles scoped_r ON scoped_r.id = scoped_ur.role_id
              WHERE scoped_up.user_id = u.id
                AND scoped_r.code IN ('teacher', 'driver')
            )
            OR EXISTS (
              SELECT 1
              FROM user_roles global_ur
              JOIN roles global_r ON global_r.id = global_ur.role_id
              WHERE global_ur.user_id = u.id
                AND global_r.code IN ('teacher', 'driver')
            )
          )
          AND (
            u.created_by = 1
            OR EXISTS (
              SELECT 1
              FROM user_roles cr_ur
              JOIN roles cr_r ON cr_r.id = cr_ur.role_id
              WHERE cr_ur.user_id = u.created_by
                AND cr_r.code IN ('platform_admin', 'super_admin')
            )
            OR (
              u.created_by IS NULL
              AND EXISTS (
                SELECT 1
                FROM user_roles global_ur
                JOIN roles global_r ON global_r.id = global_ur.role_id
                LEFT JOIN scope_types global_st ON global_st.id = global_r.scope_id
                WHERE global_ur.user_id = u.id
                  AND (global_st.code = 'platform' OR global_r.code IN ('platform_admin', 'super_admin'))
              )
            )
          )
        )
      `);
    }
  }

  if (typeof filters.isActive === "boolean") {
    filterParams.push(filters.isActive);
    filtersWhere.push(`u.is_active = $${filterParams.length}`);
  }

  const where = `WHERE ${filtersWhere.join(" AND ")}`;
  const params = [...filterParams, limit, offset];

  const [usersResult, countResult] = await Promise.all([
    db.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.avatar_url,
        u.login_provider,
        u.is_active,
        u.is_verified,
        u.is_profile_complete,
        u.created_at,
        ugp.plain_password AS generated_password,
        COALESCE(up.employment_status, 'ACTIVE') AS employment_status,
        COALESCE(up.show_in_team, u.show_in_team, FALSE) AS show_in_team,
        COALESCE(role_names.roles, '{}') AS roles
      FROM users u
      LEFT JOIN user_generated_passwords ugp ON ugp.user_id = u.id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT array_agg(DISTINCT role_name ORDER BY role_name) AS roles
        FROM (
          SELECT r.name AS role_name
          FROM user_roles ur
          INNER JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = u.id
          UNION ALL
          SELECT r.name AS role_name
          FROM institution_memberships im
          INNER JOIN roles r ON r.id = im.role_id
          WHERE im.user_id = u.id
            AND im.is_active = TRUE
            AND NOT EXISTS (
              SELECT 1
              FROM user_roles platform_ur
              INNER JOIN roles platform_role
                ON platform_role.id = platform_ur.role_id
                AND platform_role.code = 'platform_admin'
              WHERE platform_ur.user_id = u.id
            )
        ) combined_roles
      ) role_names ON TRUE
      ${where}
      ORDER BY u.created_at DESC
      LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}
    `, params),
    db.query<CountRow>(
      `
        SELECT COUNT(*)
        FROM users u
        ${where}
      `,
      filterParams
    )
  ]);

  return {
    users: usersResult.rows,
    totalCount: parseInt(countResult.rows[0].count, 10)
  };
};

export const insertUser = async (db: Queryable, data: {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  password: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
  is_profile_complete?: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  login_provider?: string;
}) => {
  const {
    full_name,
    email,
    phone,
    password,
    avatar_url = null,
    is_active = true,
    is_verified = false,
    is_profile_complete = false,
    created_by = null,
    updated_by = null,
    login_provider = "email",
  } = data;

  const res = await db.query<InsertedUserRow>(
    `
      INSERT INTO users (
        full_name,
        email,
        phone,
        password,
        avatar_url,
        is_active,
        is_verified,
        is_profile_complete,
        created_by,
        updated_by,
        login_provider
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id, full_name, email, phone, password, is_active, is_verified, is_profile_complete, created_at
    `,
    [
      full_name,
      email || null,
      phone ?? null,
      password,
      avatar_url,
      is_active,
      is_verified,
      is_profile_complete,
      created_by,
      updated_by,
      login_provider,
    ]
  );

  return res.rows[0];
};

// assign role
export const insertUserRole = async (db: Queryable, userId: number, roleId: number) => {
  await db.query(
    `INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [userId, roleId]
  );
};

export const listRolesQuery = async (db: Queryable, institutionId?: number | null) => {
  const params: unknown[] = [];
  let institutionFilter = "r.institution_id IS NULL";
  if (institutionId) {
    params.push(institutionId);
    institutionFilter = `(r.institution_id IS NULL OR r.institution_id = $${params.length})`;
  }

  const result = await db.query<RoleRow>(`
    SELECT
      r.id,
      r.name,
      r.code,
      st.code AS scope_code
    FROM roles r
    LEFT JOIN scope_types st ON st.id = r.scope_id
    WHERE COALESCE(r.is_deleted, FALSE) = FALSE
      AND ${institutionFilter}
    ORDER BY st.code ASC NULLS LAST, (r.institution_id IS NOT NULL) ASC, r.name ASC
  `, params);

  return result.rows;
};

async function getRoleScope(db: Queryable, roleId: number | null | undefined) {
  if (!roleId) return null;
  const result = await db.query<RoleScopeRow>(`
    SELECT r.id, r.code, st.code AS scope_code
    FROM roles r
    LEFT JOIN scope_types st ON st.id = r.scope_id
    WHERE r.id = $1
    LIMIT 1
  `, [roleId]);
  return result.rows[0] ?? null;
}

export async function getOrCreateEduBirdInstitution(
  db: Queryable
): Promise<{ id: number; name: string }> {
  const existing = await db.query<{ id: number; name: string }>(
    `SELECT id, name FROM institution_profiles 
     WHERE (LOWER(name) = 'edubird' OR slug = 'edubird' OR LOWER(name) LIKE '%edubird%') 
       AND COALESCE(is_deleted, FALSE) = FALSE 
     ORDER BY CASE WHEN LOWER(name) = 'edubird' THEN 0 ELSE 1 END, id ASC LIMIT 1`
  );
  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const typeRes = await db.query<{ id: number }>(
    `SELECT id FROM institution_types WHERE COALESCE(is_deleted, FALSE) = FALSE LIMIT 1`
  );
  let typeId = typeRes.rows[0]?.id;
  if (!typeId) {
    const newType = await db.query<{ id: number }>(
      `INSERT INTO institution_types (name, slug, is_active, created_at, updated_at)
       VALUES ('Platform & Head Office', 'platform-head-office', TRUE, NOW(), NOW())
       RETURNING id`
    );
    typeId = newType.rows[0]?.id;
  }

  const inserted = await db.query<{ id: number; name: string }>(
    `INSERT INTO institution_profiles (name, slug, institution_type_id, is_active, created_at, updated_at)
     VALUES ('EduBird', 'edubird', $1, TRUE, NOW(), NOW())
     RETURNING id, name`,
    [typeId]
  );
  return inserted.rows[0];
}

async function assignScopedRole(
  db: Queryable,
  userId: number,
  roleId: number | null | undefined,
  institutionId: number | null | undefined,
  actorId?: number | null,
  institutionIds: number[] = []
) {
  const role = await getRoleScope(db, roleId);
  if (!role) return;

  if (role.scope_code === "platform") {
    await db.query(
      `DELETE FROM user_roles WHERE user_id = $1 AND role_id <> $2`,
      [userId, role.id]
    );

    const previousMemberships = await db.query<{ id: number }>(
      `
        SELECT id
        FROM institution_memberships
        WHERE user_id = $1
          AND is_active = TRUE
          AND COALESCE(is_deleted, FALSE) = FALSE
      `,
      [userId]
    );
    const membershipIds = previousMemberships.rows.map((row) => row.id);

    if (membershipIds.length) {
      await closeMembershipLifecycle(db, {
        membershipIds,
        status: "LEFT",
        actorId,
        remarks: "Platform role assigned",
      });
      await db.query(
        `
          UPDATE institution_memberships
          SET is_active = FALSE,
              status = 'LEFT',
              is_current = FALSE,
              leave_date = COALESCE(leave_date, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::bigint[])
        `,
        [membershipIds]
      );
    }

    await db.query(
      `
        UPDATE user_profiles
        SET under_institution_id = NULL,
            designation_id = NULL,
            is_teacher = FALSE,
            teacher_type = NULL,
            hourly_charges = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `,
      [userId]
    );
    await insertUserRole(db, userId, role.id);
    return;
  }

  const targetInstitutionIds = Array.from(
    new Set(
      [
        ...institutionIds,
        ...(institutionId ? [institutionId] : []),
      ].filter((id) => Number.isInteger(id) && id > 0)
    )
  );

  // If adding staff with an institution role and no institution was selected (e.g. platform admin staff), default to EduBird
  if (role.scope_code === "institution" && targetInstitutionIds.length === 0) {
    const edubird = await getOrCreateEduBirdInstitution(db);
    targetInstitutionIds.push(edubird.id);
  }

  if (role.scope_code === "institution" && targetInstitutionIds.length > 0) {
    if (role.code === "teacher") {
      if (targetInstitutionIds.length > 1) {
        throw new Error("A teacher can belong to only one institution.");
      }
      const existingTeacherInstitution = await db.query<{ institution_id: number }>(
        `SELECT im.institution_id
           FROM institution_memberships im
           INNER JOIN roles r ON r.id = im.role_id AND r.code = 'teacher'
          WHERE im.user_id = $1
            AND im.is_active = TRUE
            AND im.is_current = TRUE
            AND COALESCE(im.is_deleted, FALSE) = FALSE
            AND im.institution_id <> $2
          LIMIT 1`,
        [userId, targetInstitutionIds[0]]
      );
      if (existingTeacherInstitution.rows[0]) {
        throw new Error("This teacher already belongs to another institution.");
      }
    }
    await db.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);

    for (const targetInstitutionId of targetInstitutionIds) {
      const membership = await db.query<{
        id: number;
        institution_id: number;
        user_id: number;
        role_id: number;
        is_active: boolean | null;
        join_date: string | null;
      }>(
        `
          INSERT INTO institution_memberships (
            institution_id,
            user_id,
            role_id,
            is_active,
            status,
            join_date,
            is_current
          )
          VALUES ($1, $2, $3, TRUE, 'ACTIVE', CURRENT_TIMESTAMP, TRUE)
          ON CONFLICT (institution_id, user_id)
          DO UPDATE SET
            role_id = EXCLUDED.role_id,
            is_active = TRUE,
            status = 'ACTIVE',
            leave_date = NULL,
            is_current = TRUE,
            is_deleted = FALSE,
            deleted_at = NULL,
            deleted_by = NULL,
            updated_at = NOW()
          RETURNING id, institution_id, user_id, role_id, is_active, join_date
        `,
        [targetInstitutionId, userId, role.id]
      );
      const row = membership.rows[0];
      if (row) {
        await recordMembershipLifecycle(db, {
          membershipId: row.id,
          userId: row.user_id,
          institutionId: row.institution_id,
          roleId: row.role_id,
          status: "ACTIVE",
          isCurrent: true,
          joinDate: row.join_date ?? null,
          actorId: actorId ?? null,
          remarks: "Institution role assigned",
        });
      }
    }
    return;
  }

  if (role.scope_code === "institution") {
    if (role.code === "student") {
      await insertUserRole(db, userId, role.id);
      return;
    }
    throw new Error("Select an institution for this institution role");
  }
}

const findOrCreateLocationId = async (
  db: Queryable,
  name: string | null | undefined,
  type: "country" | "state" | "city" | "area",
  parentId: number | null = null
) => {
  if (!name) return null;

  const result = await db.query<LocationIdRow>(
    `
      SELECT id
      FROM locations
      WHERE LOWER(name) = LOWER($1)
      AND LOWER(type::text) = LOWER($2)
      AND COALESCE(is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [name, type]
  );

  if (result.rows.length > 0) {
    return result.rows[0].id;
  }

  // If not found, dynamically create it with scope 'user' and generate slug
  const slugBase = toOrgSlug(name);
  let slug = slugBase;
  let i = 1;
  while (true) {
    const check = await db.query(`SELECT 1 FROM locations WHERE slug = $1 LIMIT 1`, [slug]);
    if (!check.rows.length) break;
    slug = `${slugBase}-${i++}`;
  }

  // Insert location with location_scope = 'user'
  const inserted = await db.query<LocationIdRow>(
    `
      INSERT INTO locations (name, slug, type, parent_id, location_scope)
      VALUES ($1, $2, $3, $4, 'user')
      RETURNING id
    `,
    [name, slug, type, parentId]
  );

  return inserted.rows[0].id;
};

export const getDefaultPlatformRoleId = async (db: Queryable) => {
  const result = await db.query<LocationIdRow>(`
    SELECT id
    FROM roles
    WHERE code = 'platform_viewer'
    ORDER BY id ASC
    LIMIT 1
  `);

  return result.rows[0]?.id ?? null;
};

const getDefaultRoleId = getDefaultPlatformRoleId;

export async function resolvePublicSignupRole(
  db: Queryable,
  input: { roleId?: number | null; roleCode?: string | null }
) {
  const roleId = input.roleId ?? null;
  const rawRoleCode = input.roleCode?.trim() || null;

  if (!roleId && !rawRoleCode) return null;

  const roleCodeAliases: Record<string, string> = {
    professional_organization: "institution_admin",
    school_owner: "institution_admin",
    college_owner: "institution_admin",
    university_owner: "institution_admin",
    library_owner: "institution_admin",
    pg_owner: "institution_admin",
    guardian: "parent",
  };

  const primaryRoleCode = rawRoleCode;
  const fallbackRoleCode = rawRoleCode ? roleCodeAliases[rawRoleCode] ?? null : null;

  const result = await db.query<RoleRow>(
    `
      SELECT
        r.id,
        r.name,
        r.code,
        st.code AS scope_code
      FROM roles r
      LEFT JOIN scope_types st ON st.id = r.scope_id
      WHERE ($1::int IS NOT NULL AND r.id = $1)
         OR ($2::text IS NOT NULL AND r.code = $2)
         OR ($3::text IS NOT NULL AND r.code = $3)
      ORDER BY
        CASE
          WHEN $2::text IS NOT NULL AND r.code = $2 THEN 0
          WHEN $3::text IS NOT NULL AND r.code = $3 THEN 1
          ELSE 2
        END
      LIMIT 1
    `,
    [roleId, primaryRoleCode, fallbackRoleCode]
  );

  const role = result.rows[0];
  if (!role) throw new Error("Invalid signup role");
  if (role.code === "platform_admin" || role.scope_code === "platform") {
    throw new Error("Platform admin role can only be assigned from the admin panel");
  }

  return role;
}

export async function createPublicRegisteredUserProfile(
  db: Queryable,
  userId: number,
  input: {
    roleCode?: string | null;
    designationId?: number | null;
    isTeacher?: boolean;
    teacherType?: "individual_teacher" | "institute_teacher" | null;
    underInstitutionId?: number | null;
  }
) {
  const isTeacher = input.isTeacher ?? input.roleCode === "teacher";
  const allowsDesignation = input.roleCode === "institution_admin";
  const teacherType = isTeacher
    ? input.teacherType ?? (input.underInstitutionId ? "institute_teacher" : "individual_teacher")
    : null;
  const underInstitutionId =
    teacherType === "individual_teacher" ? null : input.underInstitutionId ?? null;

  await db.query(
    `
      INSERT INTO user_profiles (
        user_id,
        is_teacher,
        teacher_type,
        designation_id,
        under_institution_id
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id)
      DO UPDATE SET
        is_teacher = EXCLUDED.is_teacher,
        teacher_type = EXCLUDED.teacher_type,
        designation_id = EXCLUDED.designation_id,
        under_institution_id = EXCLUDED.under_institution_id,
        updated_at = NOW()
    `,
    [
      userId,
      isTeacher,
      teacherType,
      allowsDesignation ? input.designationId ?? null : null,
      underInstitutionId,
    ]
  );
}

function toOrgSlug(text: string | null | undefined) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function resolveEducationInstitutionId(
  _db: Queryable,
  education: {
    institution_id?: number | null;
  },
  _adminId: number
) {
  if (Number.isInteger(education.institution_id) && (education.institution_id ?? 0) > 0) {
    return education.institution_id ?? null;
  }
  return null;
}

const hasLocationData = (
  location: AdminCreateUserInput["location"]
) => {
  if (!location) return false;

  return Boolean(
    location.formatted_address ||
    location.full_address ||
    location.latitude != null ||
    location.longitude != null ||
    location.pincode ||
    location.place_id
  );
};

const replaceUserTeachingSelections = async (
  db: Queryable,
  userId: number,
  teachingCategories: number[] = [],
  teachingSubjects: number[] = []
) => {
  await db.query(`DELETE FROM user_teaching_categories WHERE user_id = $1`, [userId]);
  await db.query(`DELETE FROM user_teaching_subjects WHERE user_id = $1`, [userId]);

  for (const categoryId of teachingCategories) {
    await db.query(
      `INSERT INTO user_teaching_categories (user_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, categoryId]
    );
  }

  for (const subjectId of teachingSubjects) {
    await db.query(
      `INSERT INTO user_teaching_subjects (user_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, subjectId]
    );
  }
};

const replaceUserDocuments = async (
  db: Queryable,
  userId: number,
  documents: AdminCreateUserInput["documents"] = [],
  adminId: number
) => {
  await ensureUserDocumentsSchema(db);
  await db.query(`DELETE FROM user_documents WHERE user_id = $1`, [userId]);

  for (const document of documents) {
    await db.query(
      `
        INSERT INTO user_documents (
          user_id,
          document_type,
          document_number,
          file_url,
          public_id,
          resource_type,
          is_verified,
          verified_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        userId,
        document.document_type,
        document.document_number ?? null,
        document.file_url,
        document.public_id ?? null,
        document.resource_type ?? null,
        document.is_verified,
        document.is_verified ? adminId : null,
      ]
    );
  }
};

const replaceStaffSalaryComponents = async (
  db: Queryable,
  userId: number,
  salaryComponents: AdminCreateUserInput["salary_components"] = []
) => {
  await ensureStaffSalaryStructureSchema(db);
  await db.query(`DELETE FROM staff_salary_components WHERE user_id = $1`, [userId]);

  for (const [index, component] of salaryComponents.entries()) {
    await db.query(
      `
        INSERT INTO staff_salary_components (
          user_id,
          label,
          amount,
          component_type,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
        [
          userId,
          component.label,
          component.amount,
          (component as any).type || "EARNING",
          index,
        ]
      );
    }
  };

const replaceStaffCommissionStructure = async (
  db: Queryable,
  userId: number,
  commission: AdminCreateUserInput["commission"]
) => {
  if (!commission || commission.commission_type === "NONE") {
    await db.query(`DELETE FROM staff_commission_structures WHERE user_id = $1`, [userId]);
    await db.query(`UPDATE user_profiles SET commission_data = NULL WHERE user_id = $1`, [userId]);
    return;
  }

  const rate = Number(commission.commission_rate) || 0;
  const threshold = commission.minimum_threshold ? Number(commission.minimum_threshold) : null;
  const rulesJson = JSON.stringify(commission.rules || []);

  await db.query(
    `
      INSERT INTO staff_commission_structures (
        user_id,
        commission_type,
        commission_rate,
        commission_trigger,
        minimum_threshold,
        payout_frequency,
        notes,
        rules,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        commission_type = EXCLUDED.commission_type,
        commission_rate = EXCLUDED.commission_rate,
        commission_trigger = EXCLUDED.commission_trigger,
        minimum_threshold = EXCLUDED.minimum_threshold,
        payout_frequency = EXCLUDED.payout_frequency,
        notes = EXCLUDED.notes,
        rules = EXCLUDED.rules,
        updated_at = NOW()
    `,
    [
      userId,
      commission.commission_type || "RULES_BASED",
      rate,
      commission.commission_trigger || "course_admission",
      threshold,
      commission.payout_frequency || "MONTHLY",
      commission.notes || null,
      rulesJson,
    ]
  );

  await db.query(
    `UPDATE user_profiles SET commission_data = $2::jsonb WHERE user_id = $1`,
    [userId, JSON.stringify(commission)]
  );
};

export const assertTeachingSubjectsMatchInstitutionBoard = async (
  db: Queryable,
  institutionId: number | null | undefined,
  subjectIds: number[] = []
) => {
  const uniqueSubjectIds = Array.from(new Set(subjectIds));
  if (!institutionId || uniqueSubjectIds.length === 0) return;

  const result = await db.query<{
    board_id: number | null;
    matching_subject_count: number;
  }>(
    `
      SELECT
        ip.board_id,
        COUNT(s.id)::int AS matching_subject_count
      FROM institution_profiles ip
      LEFT JOIN subjects s
        ON s.id = ANY($2::int[])
       AND s.board_id = ip.board_id
       AND COALESCE(s.is_deleted, FALSE) = FALSE
      WHERE ip.id = $1
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      GROUP BY ip.board_id
    `,
    [institutionId, uniqueSubjectIds]
  );

  const institution = result.rows[0];
  if (!institution) throw new Error("Institution not found");
  if (institution.board_id === null) return;

  if (Number(institution.matching_subject_count) !== uniqueSubjectIds.length) {
    throw new Error("Teaching subjects must belong to the selected institution board");
  }
};

export const createAdminUserWithDetails = async (
  db: Pool,
  data: AdminCreateUserInput,
  adminId: number
) => {
  await ensureUserProfileCompleteSchema(db);
  const client: PoolClient = await db.connect();

  try {
    await client.query("BEGIN");

    const roleId = data.role_id ?? (await getDefaultRoleId(client));
    const roleCheck = await client.query<{ code: string }>(
      `SELECT code FROM roles WHERE id = $1 LIMIT 1`,
      [roleId]
    );
    const isStudentRole = roleCheck.rows[0]?.code === "student";
    const existingUser = data.email
      ? await getUserByEmailQuery(client, data.email)
      : (data.phone ? await getUserByPhoneQuery(client, data.phone) : null);
    let user: any;


    if (existingUser) {
      if (isStudentRole) {
        // Students can be enrolled in multiple institutions and courses using the same user account
        user = existingUser;
        if (data.phone || data.full_name || data.avatar_url) {
          await client.query(
            `UPDATE users SET 
              phone = COALESCE($1, phone), 
              full_name = COALESCE($2, full_name),
              avatar_url = COALESCE($3, avatar_url),
              updated_by = $4,
              updated_at = NOW()
             WHERE id = $5`,
            [data.phone || null, data.full_name || null, data.avatar_url || null, adminId, user.id]
          );
        }
      } else {
        throw new Error("A user with that email already exists");
      }
    } else {
      user = await insertUser(client, {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        password: null,
        avatar_url: data.avatar_url,
        is_active: data.is_active,
        is_verified: data.is_verified,
        is_profile_complete: data.is_profile_complete,
        created_by: adminId,
        updated_by: adminId,
        login_provider: "admin_created",
      });
    }

    const roleMeta = await getRoleScope(client, roleId);
    let resolvedInstitutionId = data.profile.under_institution_id ?? null;
    let resolvedInstitutionIds = data.profile.institution_ids ?? [];

    if (!resolvedInstitutionId && resolvedInstitutionIds.length === 0 && roleMeta?.scope_code === "institution") {
      const edubird = await getOrCreateEduBirdInstitution(client);
      resolvedInstitutionId = edubird.id;
      resolvedInstitutionIds = [edubird.id];
    }

    await assignScopedRole(
      client,
      user.id,
      roleId,
      resolvedInstitutionId,
      adminId,
      resolvedInstitutionIds
    );

    await client.query(
      `
        INSERT INTO user_profiles (
          user_id,
          about,
          gender,
          hourly_charges,
          is_teacher,
          teacher_type,
          under_institution_id,
          designation_id,
          joining_date,
          date_of_birth,
          shift_timing,
          employment_status,
          payment_mode,
          bank_name,
          account_holder_name,
          account_number,
          ifsc_code,
          branch_name,
          account_type,
          upi_id,
          pan_number,
          uan_number,
          esi_number,
          salary_frequency,
          salary_notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        ON CONFLICT (user_id) DO UPDATE SET
          about = COALESCE(EXCLUDED.about, user_profiles.about),
          gender = COALESCE(EXCLUDED.gender, user_profiles.gender),
          hourly_charges = COALESCE(EXCLUDED.hourly_charges, user_profiles.hourly_charges),
          is_teacher = user_profiles.is_teacher OR EXCLUDED.is_teacher,
          teacher_type = COALESCE(EXCLUDED.teacher_type, user_profiles.teacher_type),
          under_institution_id = COALESCE(user_profiles.under_institution_id, EXCLUDED.under_institution_id),
          designation_id = COALESCE(EXCLUDED.designation_id, user_profiles.designation_id),
          joining_date = COALESCE(EXCLUDED.joining_date, user_profiles.joining_date),
          date_of_birth = COALESCE(EXCLUDED.date_of_birth, user_profiles.date_of_birth),
          shift_timing = COALESCE(EXCLUDED.shift_timing, user_profiles.shift_timing),
          employment_status = COALESCE(EXCLUDED.employment_status, user_profiles.employment_status),
          payment_mode = COALESCE(EXCLUDED.payment_mode, user_profiles.payment_mode),
          bank_name = COALESCE(EXCLUDED.bank_name, user_profiles.bank_name),
          account_holder_name = COALESCE(EXCLUDED.account_holder_name, user_profiles.account_holder_name),
          account_number = COALESCE(EXCLUDED.account_number, user_profiles.account_number),
          ifsc_code = COALESCE(EXCLUDED.ifsc_code, user_profiles.ifsc_code),
          branch_name = COALESCE(EXCLUDED.branch_name, user_profiles.branch_name),
          account_type = COALESCE(EXCLUDED.account_type, user_profiles.account_type),
          upi_id = COALESCE(EXCLUDED.upi_id, user_profiles.upi_id),
          pan_number = COALESCE(EXCLUDED.pan_number, user_profiles.pan_number),
          uan_number = COALESCE(EXCLUDED.uan_number, user_profiles.uan_number),
          esi_number = COALESCE(EXCLUDED.esi_number, user_profiles.esi_number),
          salary_frequency = COALESCE(EXCLUDED.salary_frequency, user_profiles.salary_frequency),
          salary_notes = COALESCE(EXCLUDED.salary_notes, user_profiles.salary_notes)
      `,
      [
        user.id,
        data.profile.about ?? null,
        data.profile.gender ?? null,
        data.profile.hourly_charges ?? null,
        data.profile.is_teacher ?? false,
        data.profile.is_teacher ? data.profile.teacher_type ?? null : null,
        data.profile.under_institution_id ?? null,
        data.profile.designation_id ?? null,
        data.profile.joining_date ? new Date(data.profile.joining_date) : null,
        data.profile.date_of_birth ? new Date(data.profile.date_of_birth) : null,
        data.profile.shift_timing ?? null,
        (data.profile as any).employment_status || "ACTIVE",
        (data as any).salary_account?.payment_mode ?? (data.profile as any)?.payment_mode ?? null,
        (data as any).salary_account?.bank_name ?? (data.profile as any)?.bank_name ?? null,
        (data as any).salary_account?.account_holder_name ?? (data.profile as any)?.account_holder_name ?? null,
        (data as any).salary_account?.account_number ?? (data.profile as any)?.account_number ?? null,
        (data as any).salary_account?.ifsc_code ?? (data.profile as any)?.ifsc_code ?? null,
        (data as any).salary_account?.branch_name ?? (data.profile as any)?.branch_name ?? null,
        (data as any).salary_account?.account_type ?? (data.profile as any)?.account_type ?? null,
        (data as any).salary_account?.upi_id ?? (data.profile as any)?.upi_id ?? null,
        (data as any).salary_account?.pan_number ?? (data.profile as any)?.pan_number ?? null,
        (data as any).salary_account?.uan_number ?? (data.profile as any)?.uan_number ?? null,
        (data as any).salary_account?.esi_number ?? (data.profile as any)?.esi_number ?? null,
        (data as any).salary_frequency ?? (data.profile as any)?.salary_frequency ?? "MONTHLY",
        (data as any).salary_notes ?? (data.profile as any)?.salary_notes ?? null,
      ]
    );

    if (hasLocationData(data.location)) {
      const location = data.location!;
      const countryId = await findOrCreateLocationId(
        client,
        location.country,
        "country"
      );
      const stateId = await findOrCreateLocationId(
        client,
        location.state,
        "state",
        countryId
      );
      const cityId = await findOrCreateLocationId(
        client,
        location.city,
        "city",
        stateId
      );
      const areaId = await findOrCreateLocationId(
        client,
        location.area,
        "area",
        cityId
      );

      await client.query(
        `
          INSERT INTO user_locations (
            user_id,
            country_id,
            state_id,
            city_id,
            area_id,
            full_address,
            formatted_address,
            latitude,
            longitude,
            pincode,
            place_id
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `,
        [
          user.id,
          countryId,
          stateId,
          cityId,
          areaId,
          location.full_address ?? location.formatted_address ?? null,
          location.formatted_address ?? null,
          location.latitude ?? null,
          location.longitude ?? null,
          location.pincode ?? null,
          location.place_id ?? null,
        ]
      );
    }

    for (const experience of data.experiences) {
      if (!experience.job_title && !experience.company_name) continue;
      await client.query(
        `
          INSERT INTO user_experience (
            user_id,
            job_title,
            company_name,
            from_month,
            from_year,
            to_month,
            to_year,
            is_current
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          user.id,
          experience.job_title || "Staff",
          experience.company_name || "",
          experience.from_month ?? null,
          experience.from_year ?? null,
          experience.is_current ? null : experience.to_month ?? null,
          experience.is_current ? null : experience.to_year ?? null,
          Boolean(experience.is_current),
        ]
      );
    }

    for (const education of data.education) {
      if (!education.qualification && !education.institution_name) continue;
      const institutionId = await resolveEducationInstitutionId(client, education, adminId);

      await client.query(
        `
      INSERT INTO user_education (
        user_id,
        qualification,
        institution_id,
        from_year,
        to_year
      )
      VALUES ($1,$2,$3,$4,$5)
    `,
        [
          user.id,
          education.qualification || "Education",
          institutionId,
          education.from_year ?? null,
          education.to_year ?? null,
        ]
      );
    }

    for (const certification of data.certifications) {
      if (!certification.name) continue;
      await client.query(
        `
          INSERT INTO user_certifications (
            user_id,
            name,
            issued_authority,
            duration
          )
          VALUES ($1,$2,$3,$4)
        `,
        [
          user.id,
          certification.name,
          certification.issued_authority ?? null,
          certification.duration ?? null,
        ]
      );
    }

    await replaceUserTeachingSelections(
      client,
      user.id,
      data.teaching_categories,
      data.teaching_subjects
    );
    await replaceUserDocuments(client, user.id, data.documents, adminId);
    await replaceStaffSalaryComponents(client, user.id, data.salary_components);
    await replaceStaffCommissionStructure(client, user.id, data.commission);

    await client.query("COMMIT");

    return getUserById(db, user.id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const getAdminUserDetails = async (
  db: Queryable,
  id: number
): Promise<AdminUserDetails | null> => {
  await ensureUserProfileCompleteSchema(db);
  await ensureUserDocumentsSchema(db);
  await ensureStaffSalaryStructureSchema(db);
  const [
    userResult,
    profileResult,
    institutionsResult,
    locationResult,
    experiencesResult,
    educationResult,
    certificationsResult,
    documentsResult,
    salaryComponentsResult,
    teachingCategoriesResult,
    teachingSubjectsResult,
    commissionResult,
  ] = await Promise.all([
    db.query<QueryResultRow & Omit<AdminUserDetails, "profile" | "institutions" | "location" | "experiences" | "education" | "certifications" | "documents" | "salary_components">>(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.phone,
          u.avatar_url,
          u.login_provider,
          u.is_active,
          u.is_verified,
          u.is_profile_complete,
          u.created_at,
          u.updated_at,
          platform_role.role_id,
          COALESCE(role_names.roles, '{}') AS roles
        FROM users u
        LEFT JOIN LATERAL (
          SELECT MIN(ur.role_id) AS role_id
          FROM user_roles ur
          WHERE ur.user_id = u.id
        ) platform_role ON TRUE
        LEFT JOIN LATERAL (
          SELECT array_agg(DISTINCT role_name ORDER BY role_name) AS roles
          FROM (
            SELECT r.name AS role_name
            FROM user_roles ur2
            INNER JOIN roles r ON r.id = ur2.role_id
            WHERE ur2.user_id = u.id
            UNION ALL
            SELECT r.name AS role_name
            FROM institution_memberships im
            INNER JOIN roles r ON r.id = im.role_id
            WHERE im.user_id = u.id
              AND im.is_active = TRUE
              AND NOT EXISTS (
                SELECT 1
                FROM user_roles platform_ur
                INNER JOIN roles platform_role
                  ON platform_role.id = platform_ur.role_id
                  AND platform_role.code = 'platform_admin'
                WHERE platform_ur.user_id = u.id
              )
          ) combined_roles
        ) role_names ON TRUE
        WHERE u.id = $1
        AND COALESCE(u.is_deleted, FALSE) = FALSE
      `,
      [id]
    ),
    db.query<QueryResultRow & AdminUserDetails["profile"]>(
      `
        SELECT
          up.about,
          up.gender,
          up.hourly_charges,
          up.joining_date,
          up.date_of_birth,
          up.shift_timing,
          COALESCE(up.employment_status, 'ACTIVE') AS employment_status,
          up.payment_mode,
          up.bank_name,
          up.account_holder_name,
          up.account_number,
          up.ifsc_code,
          up.branch_name,
          up.account_type,
          up.upi_id,
          up.pan_number,
          up.uan_number,
          up.esi_number,
          COALESCE(up.salary_frequency, 'MONTHLY') AS salary_frequency,
          up.salary_notes,
          COALESCE(up.is_teacher, FALSE) AS is_teacher,
          up.teacher_type,
          CASE
            WHEN platform_scope.has_platform_role THEN NULL
            ELSE COALESCE(up.under_institution_id, membership.institution_id)
          END AS under_institution_id,
          CASE
            WHEN platform_scope.has_platform_role THEN 'EduBird'
            ELSE COALESCE(ip.name, membership.institution_name, 'EduBird')
          END AS under_institution_name,
          CASE
            WHEN platform_scope.has_platform_role THEN NULL
            ELSE COALESCE(ip.board_id, membership.board_id)
          END AS under_institution_board_id,
          CASE
            WHEN platform_scope.has_platform_role THEN NULL
            ELSE up.designation_id
          END AS designation_id,
          CASE
            WHEN platform_scope.has_platform_role THEN NULL
            ELSE d.name
          END AS designation_name,
          CASE
            WHEN platform_scope.has_platform_role THEN NULL
            ELSE COALESCE(im.role_id, membership.role_id)
          END AS membership_role_id
        FROM users u
        LEFT JOIN LATERAL (
          SELECT EXISTS (
            SELECT 1
            FROM user_roles platform_ur
            INNER JOIN roles platform_role
              ON platform_role.id = platform_ur.role_id
              AND platform_role.code = 'platform_admin'
            WHERE platform_ur.user_id = u.id
          ) AS has_platform_role
        ) platform_scope ON TRUE
        LEFT JOIN user_profiles up
          ON up.user_id = u.id
        LEFT JOIN institution_profiles ip
          ON ip.id = up.under_institution_id
        LEFT JOIN designations d
          ON d.id = up.designation_id
        LEFT JOIN institution_memberships im
          ON im.user_id = u.id
          AND im.institution_id = up.under_institution_id
          AND im.is_active = TRUE
          AND COALESCE(im.is_deleted, FALSE) = FALSE
        LEFT JOIN LATERAL (
          SELECT
            active_im.institution_id,
            active_ip.name AS institution_name,
            active_ip.board_id,
            active_im.role_id
          FROM institution_memberships active_im
          INNER JOIN institution_profiles active_ip
            ON active_ip.id = active_im.institution_id
            AND active_ip.is_active = TRUE
            AND COALESCE(active_ip.is_deleted, FALSE) = FALSE
          WHERE active_im.user_id = u.id
            AND active_im.is_active = TRUE
            AND COALESCE(active_im.is_deleted, FALSE) = FALSE
          ORDER BY active_im.updated_at DESC NULLS LAST, active_im.id DESC
          LIMIT 1
        ) membership ON TRUE
        WHERE u.id = $1
          AND COALESCE(u.is_deleted, FALSE) = FALSE
        ORDER BY im.updated_at DESC NULLS LAST, membership.institution_id DESC NULLS LAST
        LIMIT 1
      `,
      [id]
    ),
    db.query<QueryResultRow & AdminUserDetails["institutions"][number]>(
      `
        SELECT
          ip.id,
          ip.name,
          im.role_id,
          r.name AS role_name,
          r.code AS role_code,
          im.is_active
        FROM institution_memberships im
        INNER JOIN institution_profiles ip
          ON ip.id = im.institution_id
          AND ip.is_active = TRUE
          AND COALESCE(ip.is_deleted, FALSE) = FALSE
        LEFT JOIN roles r
          ON r.id = im.role_id
        WHERE im.user_id = $1
          AND im.is_active = TRUE
          AND COALESCE(im.is_deleted, FALSE) = FALSE
          AND NOT EXISTS (
            SELECT 1
            FROM user_roles platform_ur
            INNER JOIN roles platform_role
              ON platform_role.id = platform_ur.role_id
              AND platform_role.code = 'platform_admin'
            WHERE platform_ur.user_id = im.user_id
          )
        ORDER BY ip.name ASC, ip.id ASC
      `,
      [id]
    ),
    db.query<QueryResultRow & NonNullable<AdminUserDetails["location"]>>(
      `
        SELECT
          country.name AS country,
          state.name AS state,
          city.name AS city,
          area.name AS area,
          ul.full_address,
          ul.formatted_address,
          ul.latitude,
          ul.longitude,
          ul.pincode,
          ul.place_id
        FROM user_locations ul
        LEFT JOIN locations country ON country.id = ul.country_id
        LEFT JOIN locations state ON state.id = ul.state_id
        LEFT JOIN locations city ON city.id = ul.city_id
        LEFT JOIN locations area ON area.id = ul.area_id
        WHERE ul.user_id = $1
      `,
      [id]
    ),
    db.query<QueryResultRow & AdminUserDetails["experiences"][number]>(
      `
     SELECT
  ue.id,
  ue.job_title,
  ue.company_name,
  ue.from_month,
  ue.from_year,
  ue.to_month,
  ue.to_year,
  ue.is_current
FROM user_experience ue
WHERE ue.user_id = $1
ORDER BY ue.is_current DESC, ue.from_year DESC, ue.from_month DESC, ue.id DESC
      `,
      [id]
    ),
    db.query<QueryResultRow & AdminUserDetails["education"][number]>(
      `
       SELECT
  ue.id,
  ue.qualification,
  ue.institution_id,
  ip.name AS institution_name,
  ue.from_year,
  ue.to_year
FROM user_education ue
LEFT JOIN institution_profiles ip
  ON ip.id = ue.institution_id
WHERE ue.user_id = $1
ORDER BY ue.to_year DESC, ue.from_year DESC, ue.id DESC
      `,
      [id]
    ),
    db.query<QueryResultRow & AdminUserDetails["certifications"][number]>(
      `
        SELECT id, name, issued_authority, duration
        FROM user_certifications
        WHERE user_id = $1
        ORDER BY id DESC
      `,
      [id]
    ),
    db.query<QueryResultRow & AdminUserDetails["documents"][number]>(
      `
        SELECT
          id,
          document_type,
          document_number,
          file_url,
          public_id,
          resource_type,
          is_verified,
          verified_by,
          created_at,
          updated_at
        FROM user_documents
        WHERE user_id = $1
        ORDER BY id DESC
      `,
      [id]
    ),
    db.query<QueryResultRow & AdminUserDetails["salary_components"][number]>(
      `
        SELECT
          id,
          label,
          amount::text AS amount,
          COALESCE(component_type, 'EARNING') AS type,
          sort_order
        FROM staff_salary_components
        WHERE user_id = $1
        ORDER BY sort_order ASC, id ASC
      `,
      [id]
    ),
    db.query<QueryResultRow & AdminUserDetails["teaching_categories"][number]>(
      `
        SELECT
          c.id,
          c.name,
          c.slug,
          c.depth
        FROM user_teaching_categories utc
        INNER JOIN categories c
          ON c.id = utc.category_id
        WHERE utc.user_id = $1
          AND c.is_deleted = FALSE
        ORDER BY c.depth ASC, c.name ASC
      `,
      [id]
    ),
    db.query<QueryResultRow & AdminUserDetails["teaching_subjects"][number]>(
      `
        SELECT
          s.id,
          s.name,
          s.slug,
          s.category_id,
          s.board_id,
          c.name AS category_name,
          b.name AS board_name,
          (
            SELECT string_agg(c2.name, ' → ' ORDER BY cc.depth DESC)
            FROM category_closure cc
            INNER JOIN categories c2
              ON c2.id = cc.ancestor_id
            WHERE cc.descendant_id = s.category_id
          ) || ' → ' || b.name || ' → ' || s.name AS breadcrumb
        FROM user_teaching_subjects uts
        INNER JOIN subjects s
          ON s.id = uts.subject_id
        INNER JOIN categories c
          ON c.id = s.category_id
        INNER JOIN boards b
          ON b.id = s.board_id
        WHERE uts.user_id = $1
          AND s.is_deleted = FALSE
        ORDER BY s.name ASC
      `,
      [id]
    ),
    db.query<QueryResultRow>(
      `
        SELECT
          commission_type,
          commission_rate::text AS commission_rate,
          commission_trigger,
          minimum_threshold::text AS minimum_threshold,
          payout_frequency,
          notes,
          COALESCE(rules, '[]'::jsonb) AS rules
        FROM staff_commission_structures
        WHERE user_id = $1
        LIMIT 1
      `,
      [id]
    ),
  ]);

  const user = userResult.rows[0];
  if (!user) return null;

  const commissionRow = (commissionResult as any)?.rows?.[0];

  return {
    ...(user as unknown as Omit<AdminUserDetails, "profile" | "institutions" | "location" | "experiences" | "education" | "certifications" | "documents" | "salary_components">),
    role_id: user.role_id ? Number(user.role_id) : profileResult.rows[0]?.membership_role_id ? Number(profileResult.rows[0].membership_role_id) : null,
    profile: profileResult.rows[0] ?? {
      about: null,
      gender: null,
      hourly_charges: null,
      is_teacher: false,
      teacher_type: null,
      under_institution_id: null,
      under_institution_name: null,
      institution_logo_url: null,
      under_institution_board_id: null,
      designation_id: null,
      designation_name: null,
    },
    institutions: institutionsResult.rows,
    location: locationResult.rows[0] ?? null,
    experiences: experiencesResult.rows,
    education: educationResult.rows,
    certifications: certificationsResult.rows,
    documents: documentsResult.rows,
    salary_components: salaryComponentsResult.rows,
    commission: commissionResult?.rows?.[0]
      ? {
          commission_type: commissionResult.rows[0].commission_type,
          commission_rate: String(commissionResult.rows[0].commission_rate ?? "0"),
          commission_trigger: commissionResult.rows[0].commission_trigger ?? "course_admission",
          minimum_threshold: commissionResult.rows[0].minimum_threshold ? String(commissionResult.rows[0].minimum_threshold) : null,
          payout_frequency: commissionResult.rows[0].payout_frequency ?? "MONTHLY",
          notes: commissionResult.rows[0].notes ?? null,
          rules: Array.isArray(commissionResult.rows[0].rules) ? commissionResult.rows[0].rules : [],
        }
      : ((profileResult.rows[0] as any)?.commission_data ?? null),
    teaching_categories: teachingCategoriesResult.rows,
    teaching_subjects: teachingSubjectsResult.rows,
  };
};

export const updateAdminUserWithDetails = async (
  db: Pool,
  id: number,
  data: AdminCreateUserInput,
  adminId: number
) => {
  await ensureUserProfileCompleteSchema(db);
  const client: PoolClient = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        UPDATE users
        SET
          full_name = $1,
          email = $2,
          phone = $3,
          avatar_url = $4,
          is_active = $5,
          is_verified = $6,
          is_profile_complete = $7,
          updated_by = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        AND COALESCE(is_deleted, FALSE) = FALSE
      `,
      [
        data.full_name,
        data.email,
        data.phone ?? null,
        data.avatar_url ?? null,
        data.is_active,
        data.is_verified,
        data.is_profile_complete,
        adminId,
        id,
      ]
    );

    const roleId = data.role_id ?? (await getDefaultRoleId(client));
    const roleCheck = await client.query<{ code: string; scope_code: string | null }>(
      `SELECT r.code, st.code AS scope_code FROM roles r LEFT JOIN scope_types st ON st.id = r.scope_id WHERE r.id = $1 LIMIT 1`,
      [roleId]
    );
    const isStudentRole = roleCheck.rows[0]?.code === "student";

    if (!isStudentRole) {
      await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [id]);
      const previousMemberships = await client.query<{ id: number }>(
        `SELECT id FROM institution_memberships WHERE user_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE`,
        [id]
      );
      if (previousMemberships.rows.length) {
        const membershipIds = previousMemberships.rows.map((row) => row.id);
        await closeMembershipLifecycle(client, {
          membershipIds,
          status: "LEFT",
          actorId: adminId,
          remarks: "Institution role replaced",
        });
        await client.query(
          `
            UPDATE institution_memberships
            SET is_active = FALSE,
                status = 'LEFT',
                is_current = FALSE,
                leave_date = COALESCE(leave_date, CURRENT_TIMESTAMP),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ANY($1::bigint[])
          `,
          [membershipIds]
        );
      }
    }

    const roleMeta = await getRoleScope(client, roleId);
    let resolvedInstitutionId = data.profile.under_institution_id ?? null;
    let resolvedInstitutionIds = data.profile.institution_ids ?? [];

    if (!resolvedInstitutionId && resolvedInstitutionIds.length === 0 && roleMeta?.scope_code === "institution") {
      const edubird = await getOrCreateEduBirdInstitution(client);
      resolvedInstitutionId = edubird.id;
      resolvedInstitutionIds = [edubird.id];
    }

    await assignScopedRole(
      client,
      id,
      roleId,
      resolvedInstitutionId,
      adminId,
      resolvedInstitutionIds
    );

    await client.query(
      `
        INSERT INTO user_profiles (
          user_id,
          about,
          gender,
          hourly_charges,
          is_teacher,
          teacher_type,
          under_institution_id,
          designation_id,
          joining_date,
          date_of_birth,
          shift_timing,
          employment_status,
          payment_mode,
          bank_name,
          account_holder_name,
          account_number,
          ifsc_code,
          branch_name,
          account_type,
          upi_id,
          pan_number,
          uan_number,
          esi_number,
          salary_frequency,
          salary_notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        ON CONFLICT (user_id)
        DO UPDATE SET
          about = EXCLUDED.about,
          gender = EXCLUDED.gender,
          hourly_charges = EXCLUDED.hourly_charges,
          is_teacher = EXCLUDED.is_teacher,
          teacher_type = EXCLUDED.teacher_type,
          under_institution_id = EXCLUDED.under_institution_id,
          designation_id = EXCLUDED.designation_id,
          joining_date = EXCLUDED.joining_date,
          date_of_birth = EXCLUDED.date_of_birth,
          shift_timing = EXCLUDED.shift_timing,
          employment_status = COALESCE(EXCLUDED.employment_status, user_profiles.employment_status),
          payment_mode = COALESCE(EXCLUDED.payment_mode, user_profiles.payment_mode),
          bank_name = COALESCE(EXCLUDED.bank_name, user_profiles.bank_name),
          account_holder_name = COALESCE(EXCLUDED.account_holder_name, user_profiles.account_holder_name),
          account_number = COALESCE(EXCLUDED.account_number, user_profiles.account_number),
          ifsc_code = COALESCE(EXCLUDED.ifsc_code, user_profiles.ifsc_code),
          branch_name = COALESCE(EXCLUDED.branch_name, user_profiles.branch_name),
          account_type = COALESCE(EXCLUDED.account_type, user_profiles.account_type),
          upi_id = COALESCE(EXCLUDED.upi_id, user_profiles.upi_id),
          pan_number = COALESCE(EXCLUDED.pan_number, user_profiles.pan_number),
          uan_number = COALESCE(EXCLUDED.uan_number, user_profiles.uan_number),
          esi_number = COALESCE(EXCLUDED.esi_number, user_profiles.esi_number),
          salary_frequency = COALESCE(EXCLUDED.salary_frequency, user_profiles.salary_frequency),
          salary_notes = COALESCE(EXCLUDED.salary_notes, user_profiles.salary_notes),
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        id,
        data.profile.about ?? null,
        data.profile.gender ?? null,
        data.profile.hourly_charges ?? null,
        data.profile.is_teacher ?? false,
        data.profile.is_teacher ? data.profile.teacher_type ?? null : null,
        data.profile.under_institution_id ?? null,
        data.profile.designation_id ?? null,
        data.profile.joining_date ? new Date(data.profile.joining_date) : null,
        data.profile.date_of_birth ? new Date(data.profile.date_of_birth) : null,
        data.profile.shift_timing ?? null,
        (data.profile as any).employment_status || "ACTIVE",
        (data as any).salary_account?.payment_mode ?? (data.profile as any)?.payment_mode ?? null,
        (data as any).salary_account?.bank_name ?? (data.profile as any)?.bank_name ?? null,
        (data as any).salary_account?.account_holder_name ?? (data.profile as any)?.account_holder_name ?? null,
        (data as any).salary_account?.account_number ?? (data.profile as any)?.account_number ?? null,
        (data as any).salary_account?.ifsc_code ?? (data.profile as any)?.ifsc_code ?? null,
        (data as any).salary_account?.branch_name ?? (data.profile as any)?.branch_name ?? null,
        (data as any).salary_account?.account_type ?? (data.profile as any)?.account_type ?? null,
        (data as any).salary_account?.upi_id ?? (data.profile as any)?.upi_id ?? null,
        (data as any).salary_account?.pan_number ?? (data.profile as any)?.pan_number ?? null,
        (data as any).salary_account?.uan_number ?? (data.profile as any)?.uan_number ?? null,
        (data as any).salary_account?.esi_number ?? (data.profile as any)?.esi_number ?? null,
        (data as any).salary_frequency ?? (data.profile as any)?.salary_frequency ?? "MONTHLY",
        (data as any).salary_notes ?? (data.profile as any)?.salary_notes ?? null,
      ]
    );

    if (hasLocationData(data.location)) {
      const location = data.location!;
      const countryId = await findOrCreateLocationId(
        client,
        location.country,
        "country"
      );
      const stateId = await findOrCreateLocationId(
        client,
        location.state,
        "state",
        countryId
      );
      const cityId = await findOrCreateLocationId(
        client,
        location.city,
        "city",
        stateId
      );
      const areaId = await findOrCreateLocationId(
        client,
        location.area,
        "area",
        cityId
      );

      await client.query(
        `
          INSERT INTO user_locations (
            user_id,
            country_id,
            state_id,
            city_id,
            area_id,
            full_address,
            formatted_address,
            latitude,
            longitude,
            pincode,
            place_id
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (user_id)
          DO UPDATE SET
            country_id = EXCLUDED.country_id,
            state_id = EXCLUDED.state_id,
            city_id = EXCLUDED.city_id,
            area_id = EXCLUDED.area_id,
            full_address = EXCLUDED.full_address,
            formatted_address = EXCLUDED.formatted_address,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            pincode = EXCLUDED.pincode,
            place_id = EXCLUDED.place_id,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          id,
          countryId,
          stateId,
          cityId,
          areaId,
          location.full_address ?? location.formatted_address ?? null,
          location.formatted_address ?? null,
          location.latitude ?? null,
          location.longitude ?? null,
          location.pincode ?? null,
          location.place_id ?? null,
        ]
      );
    } else {
      await client.query(`DELETE FROM user_locations WHERE user_id = $1`, [id]);
    }

    await client.query(`DELETE FROM user_experience WHERE user_id = $1`, [id]);
    await client.query(`DELETE FROM user_education WHERE user_id = $1`, [id]);
    await client.query(`DELETE FROM user_certifications WHERE user_id = $1`, [id]);

    for (const experience of data.experiences) {
      if (!experience.job_title && !experience.company_name) continue;
      await client.query(
        `
          INSERT INTO user_experience (
            user_id,
            job_title,
            company_name,
            from_month,
            from_year,
            to_month,
            to_year,
            is_current
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          id,
          experience.job_title || "Staff",
          experience.company_name || "",
          experience.from_month ?? null,
          experience.from_year ?? null,
          experience.is_current ? null : experience.to_month ?? null,
          experience.is_current ? null : experience.to_year ?? null,
          Boolean(experience.is_current),
        ]
      );
    }

    for (const education of data.education) {
      if (!education.qualification && !education.institution_name) continue;
      const institutionId = await resolveEducationInstitutionId(client, education, adminId);

      await client.query(
        `
          INSERT INTO user_education (
            user_id,
            qualification,
            institution_id,
            from_year,
            to_year
          )
          VALUES ($1,$2,$3,$4,$5)
        `,
        [
          id,
          education.qualification || "Education",
          institutionId,
          education.from_year ?? null,
          education.to_year ?? null,
        ]
      );
    }

    for (const certification of data.certifications) {
      if (!certification.name) continue;
      await client.query(
        `
          INSERT INTO user_certifications (
            user_id,
            name,
            issued_authority,
            duration
          )
          VALUES ($1,$2,$3,$4)
        `,
        [
          id,
          certification.name,
          certification.issued_authority ?? null,
          certification.duration ?? null,
        ]
      );
    }

    await replaceUserTeachingSelections(
      client,
      id,
      data.teaching_categories,
      data.teaching_subjects
    );
    await replaceUserDocuments(client, id, data.documents, adminId);
    await replaceStaffSalaryComponents(client, id, data.salary_components);
    await replaceStaffCommissionStructure(client, id, data.commission);

    await client.query("COMMIT");

    return getAdminUserDetails(db, id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const softDeleteAdminUser = async (
  db: Queryable,
  userId: number,
  adminId: number
) => {
  const memberships = await db.query<{ id: number }>(
    `
      SELECT id
      FROM institution_memberships
      WHERE user_id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
        AND COALESCE(is_current, TRUE) = TRUE
    `,
    [userId]
  );
  const membershipIds = memberships.rows.map((row) => row.id);

  const result = await db.query<{ id: number }>(
    `
      UPDATE users
      SET
        is_deleted = TRUE,
        is_active = FALSE,
        deleted_at = CURRENT_TIMESTAMP,
        deleted_by = $2,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
      RETURNING id
    `,
    [userId, adminId]
  );

  if (result.rows[0] && membershipIds.length) {
    await closeMembershipLifecycle(db, {
      membershipIds,
      status: "TERMINATED",
      actorId: adminId,
      remarks: "User soft deleted",
    });
    await db.query(
      `
        UPDATE institution_memberships
        SET is_active = FALSE,
            status = 'TERMINATED',
            is_current = FALSE,
            is_deleted = TRUE,
            deleted_at = CURRENT_TIMESTAMP,
            deleted_by = $2,
            leave_date = COALESCE(leave_date, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1::bigint[])
      `,
      [membershipIds, adminId]
    );
  }

  return result.rows[0] ?? null;
};

export const removeUserFromInstitutions = async (
  db: Pool,
  userId: number,
  institutionIds: number[]
) => {
  const scopedInstitutionIds = Array.from(
    new Set(institutionIds.filter((id) => Number.isInteger(id) && id > 0))
  );
  if (!scopedInstitutionIds.length) return { removed: false, affectedInstitutionIds: [] as number[] };

  const client: PoolClient = await db.connect();

  try {
    await client.query("BEGIN");

    const existingMemberships = await client.query<{ id: number; institution_id: number }>(
      `
        SELECT id, institution_id
        FROM institution_memberships
        WHERE user_id = $1
          AND institution_id = ANY($2::int[])
          AND COALESCE(is_deleted, FALSE) = FALSE
      `,
      [userId, scopedInstitutionIds]
    );
    const membershipIds = existingMemberships.rows.map((row) => row.id);

    if (membershipIds.length) {
      await closeMembershipLifecycle(client, {
        membershipIds,
        status: "LEFT",
        remarks: "User removed from institution",
      });
    }

    const membershipResult = await client.query<{ institution_id: number }>(
      `
        UPDATE institution_memberships
        SET is_active = FALSE,
            status = 'LEFT',
            is_current = FALSE,
            leave_date = COALESCE(leave_date, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1::bigint[])
        RETURNING institution_id
      `,
      [membershipIds]
    );

    const profileResult = await client.query<{ institution_id: number }>(
      `
        WITH target_profile AS (
          SELECT user_id, under_institution_id
          FROM user_profiles
          WHERE user_id = $1
            AND under_institution_id = ANY($2::int[])
        )
        UPDATE user_profiles up
        SET under_institution_id = NULL, updated_at = CURRENT_TIMESTAMP
        FROM target_profile
        WHERE up.user_id = target_profile.user_id
        RETURNING target_profile.under_institution_id AS institution_id
      `,
      [userId, scopedInstitutionIds]
    );

    await client.query("COMMIT");

    const affectedInstitutionIds = Array.from(
      new Set([
        ...membershipResult.rows.map((row) => Number(row.institution_id)),
        ...profileResult.rows.map((row) => Number(row.institution_id)),
      ].filter((id) => Number.isInteger(id) && id > 0))
    );

    return {
      removed: affectedInstitutionIds.length > 0,
      affectedInstitutionIds,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// get by email
export const getUserByEmailQuery = async (db: Queryable, emailOrPhone?: string | null) => {
  if (!emailOrPhone) return null;
  const cleanInput = String(emailOrPhone).trim();
  if (!cleanInput) return null;
  const res = await db.query<UserRecordRow>(
    `
      SELECT
        id,
        full_name,
        email,
        phone,
        password,
        is_active
      FROM users
      WHERE (lower(email) = lower($1) OR phone = $1)
        AND COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY is_active DESC, id DESC
      LIMIT 1
    `,
    [cleanInput]
  );
  return res.rows[0] || null;
};

export const getUserByPhoneQuery = async (db: Queryable, phone?: string | null) => {
  if (!phone) return null;
  const cleanPhone = String(phone).trim();
  if (!cleanPhone) return null;
  const res = await db.query<UserRecordRow & { role_names?: string[]; primary_role?: string; avatar_url?: string }>(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.avatar_url,
        u.is_active,
        ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) AS role_names
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.phone = $1
        AND COALESCE(u.is_deleted, FALSE) = FALSE
      GROUP BY u.id, u.full_name, u.email, u.phone, u.avatar_url, u.is_active
      ORDER BY u.is_active DESC, u.id DESC
      LIMIT 1
    `,
    [cleanPhone]
  );
  return res.rows[0] || null;
};

export const resetUserPasswordQuery = async (db: Queryable, identifier?: string | null, hashedPassword?: string) => {
  if (!identifier) return null;
  const cleanInput = String(identifier).trim();
  if (!cleanInput) return null;
  const res = await db.query<{ id: number; full_name: string; email: string | null; phone: string | null }>(
    `
      UPDATE users
      SET password = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE (LOWER(email) = LOWER($1) OR phone = $1)
        AND COALESCE(is_deleted, FALSE) = FALSE
      RETURNING id, full_name, email, phone
    `,
    [cleanInput, hashedPassword]
  );
  return res.rows[0] || null;
};

