import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPagination, getPageCount } from "@/lib/queries/pagination";
import {
  FULL_ACCESS_PERMISSION,
  getManagedPermissionCodes,
  hasPermission,
  isPlatformAdminUser,
  isPermissionAssignableToRole,
  isPlatformOnlyPermission,
  type PermissionUser,
} from "@/lib/auth/permissions";
import { syncPermissionRegistry } from "@/lib/auth/sync-permission-registry";
import { closeMembershipLifecycle, recordMembershipLifecycle } from "@/lib/queries/lifecycle";

type RouteContext = {
  params: Promise<{ resource: string }>;
};

type Body = Record<string, unknown>;

const resources = new Set([
  "scope-types",
  "permissions",
  "roles",
  "role-permissions",
  "institution-memberships",
  "institution-role-permissions",
  "personal-permissions",
]);

const institutionScopedResources = new Set([
  "institution-memberships",
  "institution-role-permissions",
  "personal-permissions",
]);

const resourcePermissionModules: Record<string, string> = {
  "scope-types": "rolespermissions.scopetypes",
  permissions: "rolespermissions.permissions",
  roles: "rolespermissions.roles",
  "role-permissions": "rolespermissions.rolepermissions",
  "institution-memberships": "rolespermissions.institutionmemberships",
  "institution-role-permissions": "rolespermissions.institutionrolepermissions",
  "personal-permissions": "rolespermissions.personalpermissions",
};

type AccessScope = {
  user: PermissionUser;
  isPlatformAdmin: boolean;
  institutionIds: number[];
};

let institutionRolePermissionDenialsReady: Promise<void> | null = null;
let institutionUserPermissionsReady: Promise<void> | null = null;

class MissingPermissionError extends Error {
  constructor(public readonly permission: string) {
    super(`Missing required permission: ${permission}`);
  }
}

async function ensureInstitutionRolePermissionDenialsSchema() {
  if (!institutionRolePermissionDenialsReady) {
    institutionRolePermissionDenialsReady = (async () => {
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
      institutionRolePermissionDenialsReady = null;
      throw error;
    });
  }
  return institutionRolePermissionDenialsReady;
}

async function ensureInstitutionUserPermissionsSchema() {
  if (!institutionUserPermissionsReady) {
    institutionUserPermissionsReady = (async () => {
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
      institutionUserPermissionsReady = null;
      throw error;
    });
  }
  return institutionUserPermissionsReady;
}

function assertResource(resource: string) {
  if (!resources.has(resource)) {
    throw new Error("Unknown access control resource");
  }
}

function permissionForAction(module: string, method: string) {
  const verb = method.toUpperCase();
  if (verb === "GET") return `${module}.view`;
  if (verb === "POST") return `${module}.create`;
  if (verb === "PATCH" || verb === "PUT") return `${module}.edit`;
  if (verb === "DELETE") return `${module}.delete`;
  return `${module}.view`;
}

function getInstitutionIds(user: PermissionUser) {
  return Array.from(
    new Set(
      (user.memberships ?? [])
        .map((membership) => Number(membership.institution_id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );
}

async function getAccessScope(req: Request, resource: string) {
  const user = await getAuthenticatedUser(req);
  const isPlatformAdmin = isPlatformAdminUser(user);
  const institutionIds = getInstitutionIds(user);
  const permissionModule = resourcePermissionModules[resource];
  const permission = permissionForAction(permissionModule, req.method);

  if (
    isPlatformAdmin &&
    (resource === "institution-memberships" || resource === "institution-role-permissions")
  ) {
    throw new Error("Forbidden: Admin access required");
  }

  if (!hasPermission(user, permission)) {
    throw new MissingPermissionError(permission);
  }

  if (
    !isPlatformAdmin &&
    (resource === "institution-memberships" ||
      resource === "institution-role-permissions" ||
      resource === "personal-permissions") &&
    institutionIds.length === 0
  ) {
    throw new Error("Forbidden: Admin access required");
  }

  return { user, isPlatformAdmin, institutionIds } satisfies AccessScope;
}

function scopedInstitutionFilter(
  scope: AccessScope,
  alias: string,
  paramIndex: number,
  institutionId?: number | null
) {
  if (institutionId) {
    assertInstitutionAllowed(scope, institutionId);
    return { sql: `${alias}.institution_id = $${paramIndex}`, params: [institutionId] as unknown[] };
  }
  if (scope.isPlatformAdmin) return { sql: "", params: [] as unknown[] };
  return {
    sql: `${alias}.institution_id = ANY($${paramIndex}::int[])`,
    params: [scope.institutionIds] as unknown[],
  };
}

function joinWhere(parts: string[]) {
  const filtered = parts.filter(Boolean);
  return filtered.length ? `WHERE ${filtered.join(" AND ")}` : "";
}

function assertInstitutionAllowed(scope: AccessScope, institutionId: number | null) {
  if (!institutionId) throw new Error("Institution is required");
  if (!scope.isPlatformAdmin && !scope.institutionIds.includes(institutionId)) {
    throw new Error("Forbidden: Admin access required");
  }
}

async function assertInstitutionRole(roleId: number | null) {
  if (!roleId) throw new Error("Institution role is required");
  const scopeCode = await getRoleScopeCode(roleId);
  if (scopeCode !== "institution") throw new Error("Select an institution role");
}

async function assertMembershipRole(roleId: number | null) {
  await assertInstitutionRole(roleId);
  const result = await db.query<{ code: string }>(
    `SELECT code FROM roles WHERE id = $1 AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1`,
    [roleId]
  );
  if (result.rows[0]?.code === "institution_admin") {
    throw new Error("Institution Admin institutions are managed from the user profile, not memberships.");
  }
}

async function assertSingleTeacherInstitution(
  userId: number | null,
  roleId: number | null,
  institutionId: number,
  excludeMembershipId?: number | null
) {
  if (!userId || !roleId) return;
  const result = await db.query<{ conflict: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM roles requested_role
       INNER JOIN institution_memberships existing ON existing.user_id = $1
       INNER JOIN roles existing_role ON existing_role.id = existing.role_id
       WHERE requested_role.id = $2
         AND requested_role.code = 'teacher'
         AND existing_role.code = 'teacher'
         AND existing.institution_id <> $3
         AND existing.is_active = TRUE
         AND existing.is_current = TRUE
         AND COALESCE(existing.is_deleted, FALSE) = FALSE
         AND ($4::bigint IS NULL OR existing.id <> $4)
     ) AS conflict`,
    [userId, roleId, institutionId, excludeMembershipId ?? null]
  );
  if (result.rows[0]?.conflict) {
    throw new Error("This teacher already belongs to another institution.");
  }
}

async function assertUserCanReceiveInstitutionMembership(userId: number | null) {
  if (!userId) throw new Error("User is required");
  const result = await db.query<{ blocked: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        INNER JOIN roles r
          ON r.id = ur.role_id
          AND r.code = 'platform_admin'
        WHERE ur.user_id = $1
      ) OR EXISTS (
        SELECT 1
        FROM institution_memberships im
        INNER JOIN roles r
          ON r.id = im.role_id
          AND r.code = 'institution_admin'
        WHERE im.user_id = $1
          AND im.is_active = TRUE
          AND COALESCE(im.is_deleted, FALSE) = FALSE
      ) AS blocked
    `,
    [userId]
  );
  if (result.rows[0]?.blocked) {
    throw new Error("Platform Admin and Institution Admin profiles are not managed from Institution Memberships.");
  }
}

async function assertUserBelongsToInstitution(userId: number | null, institutionId: number) {
  if (!userId) throw new Error("User is required");
  const result = await db.query(
    `SELECT 1
     FROM institution_memberships
     WHERE user_id = $1
       AND institution_id = $2
       AND is_active = TRUE
     LIMIT 1`,
    [userId, institutionId]
  );
  if (result.rowCount === 0) {
    throw new Error("User must belong to this institution");
  }
}

async function assertUserIsInstitutionAdmin(userId: number | null, institutionId: number) {
  if (!userId) throw new Error("User is required");
  const result = await db.query(
    `SELECT 1
     FROM institution_memberships im
     INNER JOIN roles r ON r.id = im.role_id
     WHERE im.user_id = $1
       AND im.institution_id = $2
       AND im.is_active = TRUE
       AND r.code = 'institution_admin'
     LIMIT 1`,
    [userId, institutionId]
  );
  if (result.rowCount === 0) {
    throw new Error("Personal permissions can only be assigned to institution admins");
  }
}

function asNumber(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function asNumberArray(value: unknown) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableText(value: unknown) {
  const text = asText(value);
  return text || null;
}

function asBoolean(value: unknown, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function getIds(body: Body) {
  return Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
}

function requirePermissionIds(body: Body) {
  const permissionIds = asNumberArray(body.permission_ids ?? body.permission_id);
  if (permissionIds.length === 0) throw new Error("Select at least one permission");
  return permissionIds;
}

async function getRoleScopeCode(roleId: number) {
  const result = await db.query<{ scope_code: string | null }>(
    `SELECT st.code AS scope_code
     FROM roles r
     LEFT JOIN scope_types st ON st.id = r.scope_id
     WHERE r.id = $1
     LIMIT 1`,
    [roleId]
  );

  return result.rows[0]?.scope_code ?? null;
}

async function getRoleScopeAndCode(roleId: number) {
  const result = await db.query<{ scope_code: string | null; role_code: string | null }>(
    `SELECT st.code AS scope_code, r.code AS role_code
     FROM roles r
     LEFT JOIN scope_types st ON st.id = r.scope_id
     WHERE r.id = $1
     LIMIT 1`,
    [roleId]
  );

  return {
    scopeCode: result.rows[0]?.scope_code ?? null,
    roleCode: result.rows[0]?.role_code ?? null,
  };
}

async function assertPermissionsAllowedForRole(roleId: number, permissionIds: number[], scope: AccessScope) {
  const { scopeCode: roleScope, roleCode } = await getRoleScopeAndCode(roleId);
  const result = await db.query<{ code: string }>(
    `SELECT code
     FROM permissions
     WHERE id = ANY($1::int[])`,
    [permissionIds]
  );
  const accessControlPermissions = scope.isPlatformAdmin
    ? []
    : result.rows
        .map((row) => row.code)
        .filter((code) => code.startsWith("rolespermissions."));

  if (accessControlPermissions.length) {
    throw new Error(
      `Access-control permissions can only be assigned by platform admins: ${accessControlPermissions.join(", ")}`
    );
  }

  const notAssignable = result.rows
    .map((row) => row.code)
    .filter((code) => !isPermissionAssignableToRole(code, roleCode, roleScope));

  if (notAssignable.length) {
    throw new Error(
      `These permissions cannot be assigned to the ${roleCode ?? "selected"} role: ${notAssignable.join(", ")}`
    );
  }

  const blocked = result.rows
    .map((row) => row.code)
    .filter((code) =>
      roleScope === "institution"
        ? isPlatformOnlyPermission(code)
        : !isPlatformOnlyPermission(code)
    );

  if (blocked.length) {
    throw new Error(
      roleScope === "institution"
        ? `Platform-only permissions cannot be assigned to institution roles: ${blocked.join(", ")}`
        : `Institution permissions cannot be assigned to platform roles: ${blocked.join(", ")}`
    );
  }
}

async function assertInstitutionPermissionsAllowed(permissionIds: number[], scope: AccessScope) {
  if (permissionIds.length === 0) return;
  const result = await db.query<{ code: string }>(
    `SELECT code FROM permissions WHERE id = ANY($1::int[])`,
    [permissionIds]
  );
  const accessControlPermissions = scope.isPlatformAdmin
    ? []
    : result.rows
        .map((row) => row.code)
        .filter((code) => code.startsWith("rolespermissions."));

  if (accessControlPermissions.length) {
    throw new Error(
      `Access-control permissions can only be assigned by platform admins: ${accessControlPermissions.join(", ")}`
    );
  }

  const blocked = result.rows
    .map((row) => row.code)
    .filter(isPlatformOnlyPermission);

  if (blocked.length) {
    throw new Error(
      `Platform-only permissions cannot be assigned as personal institution permissions: ${blocked.join(", ")}`
    );
  }
}

async function getDefaultPermissionIdsForRole(roleId: number) {
  const result = await db.query<{ permission_id: number }>(
    `
      SELECT permission_id
      FROM role_permissions
      WHERE role_id = $1
    `,
    [roleId]
  );
  return new Set(result.rows.map((row) => row.permission_id));
}

async function countAndRows(
  countSql: string,
  rowsSql: string,
  params: unknown[],
  limit: number,
  offset: number
) {
  const [countResult, rowsResult] = await Promise.all([
    db.query(countSql, params),
    db.query(rowsSql, [...params, limit, offset]),
  ]);

  const total = Number(countResult.rows[0]?.count ?? 0);
  return {
    data: rowsResult.rows,
    total,
    pageCount: getPageCount(total, limit),
  };
}

async function listResource(
  resource: string,
  search: string,
  limit: number,
  offset: number,
  scope: AccessScope,
  filters: { institutionId?: number | null; scope?: "platform" | "institution" | null } = {}
) {
  const like = `%${search}%`;
  const searchable = search ? [like] : [];

  switch (resource) {
    case "scope-types": {
      const where = search
        ? "WHERE COALESCE(is_deleted, FALSE) = FALSE AND (code ILIKE $1 OR name ILIKE $1)"
        : "WHERE COALESCE(is_deleted, FALSE) = FALSE";
      return countAndRows(
        `SELECT COUNT(*)::int AS count FROM scope_types ${where}`,
        `
          SELECT id, code, name, is_active, created_at
          FROM scope_types
          ${where}
          ORDER BY created_at DESC, id DESC
          LIMIT $${searchable.length + 1} OFFSET $${searchable.length + 2}
        `,
        searchable,
        limit,
        offset
      );
    }
    case "permissions": {
      const platformPermissionCodes = [
        FULL_ACCESS_PERMISSION,
        ...getManagedPermissionCodes().filter(isPlatformOnlyPermission),
      ];
      const params: unknown[] = [platformPermissionCodes];
      const whereParts = [
        "COALESCE(is_deleted, FALSE) = FALSE",
        "$1::text[] IS NOT NULL",
      ];

      if (search) {
        params.push(like);
        whereParts.push(
          `(code ILIKE $${params.length} OR name ILIKE $${params.length} OR description ILIKE $${params.length})`
        );
      }

      if (filters.scope === "platform") {
        whereParts.push("code = ANY($1::text[])");
      } else if (filters.scope === "institution") {
        whereParts.push("NOT (code = ANY($1::text[]))");
      }

      const where = `WHERE ${whereParts.join(" AND ")}`;
      return countAndRows(
        `SELECT COUNT(*)::int AS count FROM permissions ${where}`,
        `
          SELECT
            id,
            code,
            name,
            description,
            CASE
              WHEN code = ANY($1::text[]) THEN 'platform'
              ELSE 'institution'
            END AS scope_code,
            created_at
          FROM permissions
          ${where}
          ORDER BY code ASC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        params,
        limit,
        offset
      );
    }
    case "roles": {
      const params: unknown[] = [];
      const whereParts = ["COALESCE(r.is_deleted, FALSE) = FALSE"];

      if (!scope.isPlatformAdmin) {
        if (filters.institutionId) {
          assertInstitutionAllowed(scope, filters.institutionId);
          params.push(filters.institutionId);
          whereParts.push(`(r.institution_id IS NULL OR r.institution_id = $${params.length})`);
        } else if (scope.institutionIds.length > 0) {
          params.push(scope.institutionIds);
          whereParts.push(`(r.institution_id IS NULL OR r.institution_id = ANY($${params.length}::int[]))`);
        } else {
          whereParts.push(`r.institution_id IS NULL`);
        }
        whereParts.push(`st.code = 'institution'`);
      } else if (filters.institutionId) {
        params.push(filters.institutionId);
        whereParts.push(`(r.institution_id IS NULL OR r.institution_id = $${params.length})`);
      }

      if (search) {
        params.push(like);
        whereParts.push(`(r.code ILIKE $${params.length} OR r.name ILIKE $${params.length} OR st.name ILIKE $${params.length} OR ip.name ILIKE $${params.length})`);
      }
      if (filters.scope) {
        params.push(filters.scope);
        whereParts.push(`st.code = $${params.length}`);
      }
      const where = `WHERE ${whereParts.join(" AND ")}`;
      return countAndRows(
        `SELECT COUNT(*)::int AS count FROM roles r LEFT JOIN scope_types st ON st.id = r.scope_id LEFT JOIN institution_profiles ip ON ip.id = r.institution_id ${where}`,
        `
          SELECT
            r.id,
            r.name,
            r.code,
            r.scope_id,
            r.institution_id,
            COALESCE(r.is_system, r.institution_id IS NULL) AS is_system,
            ip.name AS institution_name,
            st.name AS scope_name,
            st.code AS scope_code
          FROM roles r
          LEFT JOIN scope_types st ON st.id = r.scope_id
          LEFT JOIN institution_profiles ip ON ip.id = r.institution_id
          ${where}
          ORDER BY st.code ASC NULLS LAST, (r.institution_id IS NOT NULL) ASC, r.name ASC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        params,
        limit,
        offset
      );
    }
    case "role-permissions": {
      const params: unknown[] = [];
      const whereParts = [
        "COALESCE(r.is_deleted, FALSE) = FALSE",
      ];

      if (!scope.isPlatformAdmin) {
        if (filters.institutionId) {
          assertInstitutionAllowed(scope, filters.institutionId);
          params.push(filters.institutionId);
          whereParts.push(`(r.institution_id IS NULL OR r.institution_id = $${params.length})`);
        } else if (scope.institutionIds.length > 0) {
          params.push(scope.institutionIds);
          whereParts.push(`(r.institution_id IS NULL OR r.institution_id = ANY($${params.length}::int[]))`);
        } else {
          whereParts.push(`r.institution_id IS NULL`);
        }
        whereParts.push(`st.code = 'institution'`);
      } else if (filters.institutionId) {
        params.push(filters.institutionId);
        whereParts.push(`(r.institution_id IS NULL OR r.institution_id = $${params.length})`);
      }

      if (search) {
        params.push(like);
        whereParts.push(`
          (
            r.name ILIKE $${params.length}
            OR r.code ILIKE $${params.length}
            OR EXISTS (
              SELECT 1
              FROM role_permissions rp_search
              INNER JOIN permissions p_search
                ON p_search.id = rp_search.permission_id
               AND COALESCE(p_search.is_deleted, FALSE) = FALSE
              WHERE rp_search.role_id = r.id
                AND (p_search.code ILIKE $${params.length} OR p_search.name ILIKE $${params.length})
            )
          )
        `);
      }
      if (filters.scope) {
        params.push(filters.scope);
        whereParts.push(`st.code = $${params.length}`);
      }
      const where = `
        WHERE ${whereParts.join(" AND ")}
      `;
      return countAndRows(
        `
          SELECT COUNT(*)::int AS count
          FROM roles r
          LEFT JOIN scope_types st ON st.id = r.scope_id
          ${where}
        `,
        `
          SELECT
            r.id::text AS id,
            r.id AS role_id,
            r.name AS role_name,
            r.code AS role_code,
            r.institution_id,
            COALESCE(r.is_system, r.institution_id IS NULL) AS is_system,
            st.code AS scope_code,
            COALESCE(permission_summary.permission_count, 0)::int AS permission_count,
            COALESCE(permission_summary.permissions, '[]'::jsonb) AS permissions
          FROM roles r
          LEFT JOIN scope_types st ON st.id = r.scope_id
          LEFT JOIN LATERAL (
            SELECT
              COUNT(p.id)::int AS permission_count,
              jsonb_agg(
                jsonb_build_object(
                  'permission_id', p.id,
                  'permission_code', p.code,
                  'permission_name', p.name
                )
                ORDER BY p.code ASC
              ) AS permissions
            FROM role_permissions rp
            INNER JOIN permissions p
              ON p.id = rp.permission_id
             AND COALESCE(p.is_deleted, FALSE) = FALSE
            WHERE rp.role_id = r.id
              AND (
                r.code <> 'student'
                OR p.code = 'student.dashboard.view'
                OR p.code LIKE 'student.myclassroom.%'
                OR p.code LIKE 'student.myinstitution.%'
              )
          ) permission_summary ON TRUE
          ${where}
          ORDER BY st.code ASC NULLS LAST, (r.institution_id IS NOT NULL) ASC, r.name ASC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        params,
        limit,
        offset
      );
    }
    case "institution-memberships": {
      const scoped = scopedInstitutionFilter(scope, "im", searchable.length + 1, filters.institutionId);
      const searchSql = search ? `(ip.name ILIKE $1 OR u.full_name ILIKE $1 OR u.email ILIKE $1 OR r.name ILIKE $1)` : "";
      const institutionMemberSql = `
        COALESCE(im.is_deleted, FALSE) = FALSE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
        AND r.code <> 'institution_admin'
        AND NOT EXISTS (
          SELECT 1
          FROM user_roles platform_ur
          INNER JOIN roles platform_role
            ON platform_role.id = platform_ur.role_id
            AND platform_role.code = 'platform_admin'
          WHERE platform_ur.user_id = u.id
        )
      `;
      const where = joinWhere([searchSql, scoped.sql, institutionMemberSql]);
      const params = [...searchable, ...scoped.params];
      return countAndRows(
        `SELECT COUNT(*)::int AS count FROM institution_memberships im INNER JOIN institution_profiles ip ON ip.id = im.institution_id INNER JOIN users u ON u.id = im.user_id INNER JOIN roles r ON r.id = im.role_id ${where}`,
        `
          SELECT
            im.id,
            im.institution_id,
            ip.name AS institution_name,
            im.user_id,
            u.full_name AS user_name,
            u.email AS user_email,
            im.role_id,
            r.name AS role_name,
            r.code AS role_code,
            im.is_active,
            im.created_at,
            im.updated_at
          FROM institution_memberships im
          INNER JOIN institution_profiles ip ON ip.id = im.institution_id
          INNER JOIN users u ON u.id = im.user_id
          INNER JOIN roles r ON r.id = im.role_id
          ${where}
          ORDER BY im.updated_at DESC, im.created_at DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        params,
        limit,
        offset
      );
    }
    case "institution-role-permissions": {
      await ensureInstitutionRolePermissionDenialsSchema();
      const params: unknown[] = [...searchable];
      const conditions = [
        "COALESCE(ip.is_deleted, FALSE) = FALSE",
        "st.code = 'institution'",
        "COALESCE(r.is_deleted, FALSE) = FALSE",
        "r.code <> 'institution_admin'",
      ];
      if (filters.institutionId) {
        assertInstitutionAllowed(scope, filters.institutionId);
        params.push(filters.institutionId);
        conditions.push(`ip.id = $${params.length}`);
      } else if (!scope.isPlatformAdmin) {
        params.push(scope.institutionIds);
        conditions.push(`ip.id = ANY($${params.length}::int[])`);
      }
      if (search) {
        conditions.push(`
          (
            ip.name ILIKE $1
            OR r.name ILIKE $1
            OR r.code ILIKE $1
            OR EXISTS (
              SELECT 1
              FROM role_permissions search_rp
              INNER JOIN permissions search_p
                ON search_p.id = search_rp.permission_id
               AND COALESCE(search_p.is_deleted, FALSE) = FALSE
              WHERE search_rp.role_id = r.id
                AND (search_p.code ILIKE $1 OR search_p.name ILIKE $1)
            )
            OR EXISTS (
              SELECT 1
              FROM institution_role_permissions search_irp
              INNER JOIN permissions search_override_p
                ON search_override_p.id = search_irp.permission_id
               AND COALESCE(search_override_p.is_deleted, FALSE) = FALSE
              WHERE search_irp.institution_id = ip.id
                AND search_irp.role_id = r.id
                AND (search_override_p.code ILIKE $1 OR search_override_p.name ILIKE $1)
            )
            OR EXISTS (
              SELECT 1
              FROM institution_role_permission_denials search_irpd
              INNER JOIN permissions search_denied_p
                ON search_denied_p.id = search_irpd.permission_id
               AND COALESCE(search_denied_p.is_deleted, FALSE) = FALSE
              WHERE search_irpd.institution_id = ip.id
                AND search_irpd.role_id = r.id
                AND (search_denied_p.code ILIKE $1 OR search_denied_p.name ILIKE $1)
            )
          )
        `);
      }
      const where = joinWhere(conditions);
      return countAndRows(
        `
          SELECT COUNT(*)::int AS count
          FROM institution_profiles ip
          CROSS JOIN roles r
          INNER JOIN scope_types st ON st.id = r.scope_id
          ${where}
        `,
        `
          SELECT
            (ip.id::text || ':' || r.id::text) AS id,
            ip.id AS institution_id,
            ip.name AS institution_name,
            r.id AS role_id,
            r.name AS role_name,
            r.code AS role_code,
            st.code AS scope_code,
            COALESCE(jsonb_array_length(override_permissions.permissions), 0)::int AS permission_count,
            COALESCE(override_permissions.permissions, '[]'::jsonb) AS permissions,
            COALESCE(default_permissions.permissions, '[]'::jsonb) AS default_permissions,
            COALESCE(denied_permissions.permissions, '[]'::jsonb) AS denied_permissions
          FROM institution_profiles ip
          CROSS JOIN roles r
          INNER JOIN scope_types st ON st.id = r.scope_id
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(
              jsonb_build_object(
                'permission_id', override_p.id,
                'permission_code', override_p.code,
                'permission_name', override_p.name
              )
              ORDER BY override_p.code ASC
            ) AS permissions
            FROM institution_role_permissions override_irp
            INNER JOIN permissions override_p
              ON override_p.id = override_irp.permission_id
             AND COALESCE(override_p.is_deleted, FALSE) = FALSE
            WHERE override_irp.institution_id = ip.id
              AND override_irp.role_id = r.id
          ) override_permissions ON TRUE
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(
              jsonb_build_object(
                'permission_id', default_p.id,
                'permission_code', default_p.code,
                'permission_name', default_p.name
              )
              ORDER BY default_p.code ASC
            ) AS permissions
            FROM role_permissions rp
            INNER JOIN permissions default_p
              ON default_p.id = rp.permission_id
             AND COALESCE(default_p.is_deleted, FALSE) = FALSE
            WHERE rp.role_id = r.id
          ) default_permissions ON TRUE
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(
              jsonb_build_object(
                'permission_id', denied_p.id,
                'permission_code', denied_p.code,
                'permission_name', denied_p.name
              )
              ORDER BY denied_p.code ASC
            ) AS permissions
            FROM institution_role_permission_denials denied_irpd
            INNER JOIN permissions denied_p
              ON denied_p.id = denied_irpd.permission_id
             AND COALESCE(denied_p.is_deleted, FALSE) = FALSE
            WHERE denied_irpd.institution_id = ip.id
              AND denied_irpd.role_id = r.id
          ) denied_permissions ON TRUE
          ${where}
          ORDER BY ip.name ASC, r.name ASC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        params,
        limit,
        offset
      );
    }
    case "personal-permissions": {
      await ensureInstitutionUserPermissionsSchema();
      await ensureInstitutionRolePermissionDenialsSchema();
      const institutionId = filters.institutionId ?? null;
      const personalConditions = [
        "im.is_active = TRUE",
        "r.code = 'institution_admin'",
        "COALESCE(u.is_deleted, FALSE) = FALSE",
        `EXISTS (
          SELECT 1
          FROM institution_user_permissions personal_exists
          WHERE personal_exists.institution_id = im.institution_id
            AND personal_exists.user_id = im.user_id
        )`,
      ];
      const params: unknown[] = [];
      if (institutionId) {
        assertInstitutionAllowed(scope, institutionId);
        params.push(institutionId);
        personalConditions.unshift(`im.institution_id = $${params.length}`);
      } else if (!scope.isPlatformAdmin) {
        params.push(scope.institutionIds);
        personalConditions.unshift(`im.institution_id = ANY($${params.length}::int[])`);
      }
      if (search) {
        params.push(like);
        personalConditions.push(
          `(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR ip.name ILIKE $${params.length} OR r.name ILIKE $${params.length} OR r.code ILIKE $${params.length} OR personal_search.code ILIKE $${params.length} OR personal_search.name ILIKE $${params.length})`
        );
      }
      const where = joinWhere(personalConditions);
      return countAndRows(
        `
          SELECT COUNT(*)::int AS count
          FROM (
            SELECT im.institution_id, im.user_id
            FROM institution_memberships im
            INNER JOIN institution_profiles ip ON ip.id = im.institution_id
            INNER JOIN users u ON u.id = im.user_id
            INNER JOIN roles r ON r.id = im.role_id
            LEFT JOIN institution_user_permissions iup
              ON iup.institution_id = im.institution_id
             AND iup.user_id = im.user_id
            LEFT JOIN permissions personal_search ON personal_search.id = iup.permission_id
            ${where}
            GROUP BY im.institution_id, im.user_id
          ) grouped
        `,
        `
          SELECT
            (im.institution_id::text || ':' || im.user_id::text) AS id,
            im.institution_id,
            ip.name AS institution_name,
            im.user_id,
            u.full_name AS user_name,
            u.email AS user_email,
            string_agg(DISTINCT r.name, ', ' ORDER BY r.name) AS role_name,
            string_agg(DISTINCT r.code, ', ' ORDER BY r.code) AS role_code,
            COALESCE(jsonb_array_length(effective_permissions.permissions), 0)::int AS permission_count,
            COALESCE(jsonb_array_length(personal_permissions.permissions), 0)::int AS personal_permission_count,
            COALESCE(personal_permissions.permissions, '[]'::jsonb) AS permissions,
            COALESCE(default_permissions.permissions, '[]'::jsonb) AS default_permissions
          FROM institution_memberships im
          INNER JOIN institution_profiles ip ON ip.id = im.institution_id
          INNER JOIN users u ON u.id = im.user_id
          INNER JOIN roles r ON r.id = im.role_id
          LEFT JOIN institution_user_permissions iup
            ON iup.institution_id = im.institution_id
           AND iup.user_id = im.user_id
          LEFT JOIN permissions personal_search ON personal_search.id = iup.permission_id
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(
              jsonb_build_object(
                'permission_id', personal_p.id,
                'permission_code', personal_p.code,
                'permission_name', personal_p.name
              )
              ORDER BY personal_p.code ASC
            ) AS permissions
            FROM institution_user_permissions personal_iup
            INNER JOIN permissions personal_p ON personal_p.id = personal_iup.permission_id
            WHERE personal_iup.institution_id = im.institution_id
              AND personal_iup.user_id = im.user_id
          ) personal_permissions ON TRUE
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(
              jsonb_build_object(
                'permission_id', default_p.id,
                'permission_code', default_p.code,
                'permission_name', default_p.name
              )
              ORDER BY default_p.code ASC
            ) AS permissions
            FROM (
              SELECT DISTINCT p.id, p.code, p.name
              FROM institution_memberships default_im
              INNER JOIN role_permissions rp ON rp.role_id = default_im.role_id
              INNER JOIN permissions p ON p.id = rp.permission_id
              WHERE default_im.institution_id = im.institution_id
                AND default_im.user_id = im.user_id
                AND default_im.is_active = TRUE
                AND NOT EXISTS (
                  SELECT 1
                  FROM institution_role_permission_denials denied
                  WHERE denied.institution_id = default_im.institution_id
                    AND denied.role_id = default_im.role_id
                    AND denied.permission_id = rp.permission_id
                )
            ) default_p
          ) default_permissions ON TRUE
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(
              jsonb_build_object(
                'permission_id', effective_p.id,
                'permission_code', effective_p.code,
                'permission_name', effective_p.name
              )
              ORDER BY effective_p.code ASC
            ) AS permissions
            FROM (
              SELECT DISTINCT p.id, p.code, p.name
              FROM institution_memberships default_im
              INNER JOIN role_permissions rp ON rp.role_id = default_im.role_id
              INNER JOIN permissions p ON p.id = rp.permission_id
              WHERE default_im.institution_id = im.institution_id
                AND default_im.user_id = im.user_id
                AND default_im.is_active = TRUE
                AND NOT EXISTS (
                  SELECT 1
                  FROM institution_role_permission_denials denied
                  WHERE denied.institution_id = default_im.institution_id
                    AND denied.role_id = default_im.role_id
                    AND denied.permission_id = rp.permission_id
                )
              UNION
              SELECT DISTINCT p.id, p.code, p.name
              FROM institution_user_permissions personal_iup
              INNER JOIN permissions p ON p.id = personal_iup.permission_id
              WHERE personal_iup.institution_id = im.institution_id
                AND personal_iup.user_id = im.user_id
            ) effective_p
          ) effective_permissions ON TRUE
          ${where}
          GROUP BY
            im.institution_id,
            ip.name,
            im.user_id,
            u.full_name,
            u.email,
            personal_permissions.permissions,
            default_permissions.permissions,
            effective_permissions.permissions
          ORDER BY u.full_name ASC, u.email ASC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        params,
        limit,
        offset
      );
    }
    default:
      throw new Error("Unknown access control resource");
  }
}

async function createResource(resource: string, body: Body, scope: AccessScope) {
  switch (resource) {
    case "scope-types":
      return db.query(
        `INSERT INTO scope_types (code, name, is_active) VALUES ($1,$2,$3) RETURNING *`,
        [asText(body.code), asText(body.name), asBoolean(body.is_active)]
      );
    case "permissions":
      return db.query(
        `INSERT INTO permissions (code, name, description) VALUES ($1,$2,$3) RETURNING *`,
        [asText(body.code), asText(body.name), asNullableText(body.description)]
      );
    case "roles": {
      const name = asText(body.name);
      if (!name) throw new Error("Role name is required");

      let code = asText(body.code).toLowerCase().replace(/[^a-z0-9_]/g, "_");
      if (!code) {
        code = name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      }

      let scopeId = asNumber(body.scope_id);
      let institutionId: number | null = null;
      let isSystem = false;

      if (!scope.isPlatformAdmin) {
        const instScope = await db.query<{ id: number }>(`SELECT id FROM scope_types WHERE code = 'institution' LIMIT 1`);
        scopeId = instScope.rows[0]?.id ?? 2;

        const targetInstId = asNumber(body.institution_id) ?? scope.institutionIds[0];
        assertInstitutionAllowed(scope, targetInstId);
        institutionId = targetInstId;
        isSystem = false;

        if (!code.startsWith(`inst_${institutionId}_`)) {
          code = `inst_${institutionId}_${code}`;
        }
      } else {
        institutionId = asNumber(body.institution_id);
        isSystem = institutionId === null;
        if (!scopeId) {
          const instScope = await db.query<{ id: number }>(`SELECT id FROM scope_types WHERE code = 'institution' LIMIT 1`);
          scopeId = instScope.rows[0]?.id ?? 2;
        }
      }

      return db.query(
        `INSERT INTO roles (name, code, scope_id, institution_id, is_system) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [name, code, scopeId, institutionId, isSystem]
      );
    }
    case "role-permissions": {
      const roleId = asNumber(body.role_id);
      const permissionIds = requirePermissionIds(body);
      if (!roleId) throw new Error("Role is required");
      await assertPermissionsAllowedForRole(roleId, permissionIds, scope);
      return db.query(
        `
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT $1, unnest($2::int[])
          ON CONFLICT DO NOTHING
          RETURNING role_id, permission_id
        `,
        [roleId, permissionIds]
      );
    }
    case "institution-memberships": {
      const institutionId = asNumber(body.institution_id);
      const userId = asNumber(body.user_id);
      const roleId = asNumber(body.role_id);
      assertInstitutionAllowed(scope, institutionId);
      await assertMembershipRole(roleId);
      await assertUserCanReceiveInstitutionMembership(userId);
      await assertSingleTeacherInstitution(userId, roleId, institutionId);
      if (!scope.isPlatformAdmin) await assertUserBelongsToInstitution(userId, institutionId);
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query<{
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
            VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,$6)
            ON CONFLICT (institution_id, user_id)
            DO UPDATE SET
              role_id = EXCLUDED.role_id,
              is_active = EXCLUDED.is_active,
              status = EXCLUDED.status,
              is_current = EXCLUDED.is_current,
              leave_date = CASE WHEN EXCLUDED.is_active THEN NULL ELSE institution_memberships.leave_date END,
              is_deleted = FALSE,
              deleted_at = NULL,
              deleted_by = NULL,
              updated_at = NOW()
            RETURNING *
          `,
          [
            institutionId,
            userId,
            roleId,
            asBoolean(body.is_active),
            asBoolean(body.is_active) ? "ACTIVE" : "SUSPENDED",
            asBoolean(body.is_active),
          ]
        );
        const membership = result.rows[0];
        if (membership) {
          await recordMembershipLifecycle(client, {
            membershipId: membership.id,
            userId: membership.user_id,
            institutionId: membership.institution_id,
            roleId: membership.role_id,
            status: membership.is_active === false ? "SUSPENDED" : "ACTIVE",
            isCurrent: membership.is_active !== false,
            joinDate: membership.join_date ?? null,
            actorId: scope.user.id,
            remarks: "Institution membership saved from access control",
          });
        }
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
    case "institution-role-permissions": {
      await ensureInstitutionRolePermissionDenialsSchema();
      const institutionId = asNumber(body.institution_id);
      const roleId = asNumber(body.role_id);
      const permissionIds = asNumberArray(body.permission_ids ?? body.permission_id);
      assertInstitutionAllowed(scope, institutionId);
      await assertInstitutionRole(roleId);
      await assertPermissionsAllowedForRole(roleId, permissionIds, scope);
      const defaultPermissionIds = await getDefaultPermissionIdsForRole(roleId);
      const selectedPermissionIds = new Set(permissionIds);
      const extraPermissionIds = permissionIds.filter(
        (permissionId) => !defaultPermissionIds.has(permissionId)
      );
      if (extraPermissionIds.length) {
        throw new Error("Institution role overrides can only use the selected role's default permissions.");
      }
      const deniedPermissionIds = Array.from(defaultPermissionIds).filter(
        (permissionId) => !selectedPermissionIds.has(permissionId)
      );
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `DELETE FROM institution_role_permissions WHERE institution_id = $1 AND role_id = $2`,
          [institutionId, roleId]
        );
        await client.query(
          `DELETE FROM institution_role_permission_denials WHERE institution_id = $1 AND role_id = $2`,
          [institutionId, roleId]
        );
        if (deniedPermissionIds.length) {
          await client.query(
            `
              INSERT INTO institution_role_permission_denials (institution_id, role_id, permission_id)
              SELECT $1, $2, unnest($3::int[])
              ON CONFLICT DO NOTHING
            `,
            [institutionId, roleId, deniedPermissionIds]
          );
        }
        await client.query("COMMIT");
        return { rows: [] as unknown[] };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
    case "personal-permissions": {
      await ensureInstitutionUserPermissionsSchema();
      const institutionId = asNumber(body.institution_id);
      const userId = asNumber(body.user_id);
      const permissionIds = asNumberArray(body.permission_ids ?? body.permission_id);
      assertInstitutionAllowed(scope, institutionId);
      if (!institutionId) throw new Error("Institution is required");
      if (!userId) throw new Error("User is required");
      await assertUserIsInstitutionAdmin(userId, institutionId);
      await assertInstitutionPermissionsAllowed(permissionIds, scope);
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `DELETE FROM institution_user_permissions WHERE institution_id = $1 AND user_id = $2`,
          [institutionId, userId]
        );
        let result = { rows: [] as unknown[] };
        if (permissionIds.length) {
          result = await client.query(
            `
              INSERT INTO institution_user_permissions
                (institution_id, user_id, permission_id, created_by, updated_by)
              SELECT $1, $2, unnest($3::int[]), $4, $4
              ON CONFLICT (institution_id, user_id, permission_id)
              DO UPDATE SET updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
              RETURNING institution_id, user_id, permission_id
            `,
            [institutionId, userId, permissionIds, scope.user.id]
          );
        }
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
    default:
      throw new Error("Unknown access control resource");
  }
}

async function updateResource(resource: string, body: Body, scope: AccessScope) {
  if (Array.isArray(body.ids)) {
    const ids = getIds(body);
    if (ids.length === 0) throw new Error("Select at least one row");

    if (resource === "scope-types" && typeof body.is_active === "boolean") {
      await db.query(`UPDATE scope_types SET is_active = $1 WHERE id = ANY($2::int[])`, [body.is_active, ids.map(Number)]);
      return;
    }
    if (resource === "institution-memberships" && typeof body.is_active === "boolean") {
      const scoped = scope.isPlatformAdmin ? "" : "AND institution_id = ANY($3::int[])";
      const params = scope.isPlatformAdmin
        ? [body.is_active, ids.map(Number)]
        : [body.is_active, ids.map(Number), scope.institutionIds];
      const memberships = await db.query<{
        id: number;
        institution_id: number;
        user_id: number;
        role_id: number;
        join_date: string | null;
      }>(
        `
          UPDATE institution_memberships
          SET is_active = $1,
              status = CASE WHEN $1 THEN 'ACTIVE' ELSE 'SUSPENDED' END,
              is_current = $1,
              leave_date = CASE WHEN $1 THEN NULL ELSE COALESCE(leave_date, CURRENT_TIMESTAMP) END,
              updated_at = NOW()
          WHERE id = ANY($2::int[]) ${scoped}
          RETURNING id, institution_id, user_id, role_id, join_date
        `,
        params
      );
      if (body.is_active) {
        for (const membership of memberships.rows) {
          await recordMembershipLifecycle(db, {
            membershipId: membership.id,
            userId: membership.user_id,
            institutionId: membership.institution_id,
            roleId: membership.role_id,
            status: "ACTIVE",
            isCurrent: true,
            joinDate: membership.join_date ?? null,
            actorId: scope.user.id,
            remarks: "Membership activated from access control",
          });
        }
      } else if (memberships.rows.length) {
        await closeMembershipLifecycle(db, {
          membershipIds: memberships.rows.map((membership) => membership.id),
          status: "SUSPENDED",
          actorId: scope.user.id,
          remarks: "Membership suspended from access control",
        });
      }
      return;
    }

    throw new Error("Bulk update is not available for this resource");
  }

  switch (resource) {
    case "scope-types":
      await db.query(`UPDATE scope_types SET code = $1, name = $2, is_active = $3 WHERE id = $4`, [
        asText(body.code),
        asText(body.name),
        asBoolean(body.is_active),
        asNumber(body.id),
      ]);
      return;
    case "permissions":
      await db.query(`UPDATE permissions SET code = $1, name = $2, description = $3 WHERE id = $4`, [
        asText(body.code),
        asText(body.name),
        asNullableText(body.description),
        asNumber(body.id),
      ]);
      return;
    case "roles": {
      const roleId = asNumber(body.id);
      if (!roleId) throw new Error("Role ID is required");

      const existing = await db.query<{ is_system: boolean; institution_id: number | null }>(
        `SELECT is_system, institution_id FROM roles WHERE id = $1`,
        [roleId]
      );
      if (existing.rowCount === 0) throw new Error("Role not found");

      if (!scope.isPlatformAdmin) {
        if (existing.rows[0]?.is_system || !existing.rows[0]?.institution_id) {
          throw new Error("System roles cannot be modified by institutions");
        }
        assertInstitutionAllowed(scope, existing.rows[0]?.institution_id);
      }

      await db.query(`UPDATE roles SET name = $1 WHERE id = $2`, [
        asText(body.name),
        roleId,
      ]);
      return;
    }
    case "role-permissions": {
      const roleId = asNumber(body.role_id ?? body.id);
      const permissionIds = requirePermissionIds(body);
      if (!roleId) throw new Error("Role is required");
      await assertPermissionsAllowedForRole(roleId, permissionIds, scope);

      const client = await db.connect();
      try {
        await client.query("BEGIN");
        await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
        await client.query(
          `
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT $1, unnest($2::int[])
            ON CONFLICT DO NOTHING
          `,
          [roleId, permissionIds]
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
      return;
    }
    case "institution-memberships": {
      const institutionId = asNumber(body.institution_id);
      const userId = asNumber(body.user_id);
      const roleId = asNumber(body.role_id);
      const membershipId = asNumber(body.id);
      assertInstitutionAllowed(scope, institutionId);
      await assertMembershipRole(roleId);
      await assertUserCanReceiveInstitutionMembership(userId);
      await assertSingleTeacherInstitution(userId, roleId, institutionId, membershipId);
      if (!scope.isPlatformAdmin) await assertUserBelongsToInstitution(userId, institutionId);
      const membership = await db.query<{
        id: number;
        institution_id: number;
        user_id: number;
        role_id: number;
        is_active: boolean | null;
        join_date: string | null;
      }>(
        `
          UPDATE institution_memberships
          SET institution_id = $1,
              user_id = $2,
              role_id = $3,
              is_active = $4,
              status = CASE WHEN $4 THEN 'ACTIVE' ELSE 'SUSPENDED' END,
              is_current = $4,
              leave_date = CASE WHEN $4 THEN NULL ELSE COALESCE(leave_date, CURRENT_TIMESTAMP) END,
              updated_at = NOW()
          WHERE id = $5
          RETURNING id, institution_id, user_id, role_id, is_active, join_date
        `,
        [
          institutionId,
          userId,
          roleId,
          asBoolean(body.is_active),
          asNumber(body.id),
        ]
      );
      const row = membership.rows[0];
      if (row?.is_active === false) {
        await closeMembershipLifecycle(db, {
          membershipIds: [row.id],
          status: "SUSPENDED",
          actorId: scope.user.id,
          remarks: "Membership suspended from access control",
        });
      } else if (row) {
        await recordMembershipLifecycle(db, {
          membershipId: row.id,
          userId: row.user_id,
          institutionId: row.institution_id,
          roleId: row.role_id,
          status: "ACTIVE",
          isCurrent: true,
          joinDate: row.join_date ?? null,
          actorId: scope.user.id,
          remarks: "Membership updated from access control",
        });
      }
      return;
    }
    case "institution-role-permissions": {
      await ensureInstitutionRolePermissionDenialsSchema();
      const institutionId = asNumber(body.institution_id);
      const roleId = asNumber(body.role_id);
      const permissionIds = asNumberArray(body.permission_ids ?? body.permission_id);
      assertInstitutionAllowed(scope, institutionId);
      await assertInstitutionRole(roleId);
      await assertPermissionsAllowedForRole(roleId, permissionIds, scope);
      const defaultPermissionIds = await getDefaultPermissionIdsForRole(roleId);
      const selectedPermissionIds = new Set(permissionIds);
      const extraPermissionIds = permissionIds.filter(
        (permissionId) => !defaultPermissionIds.has(permissionId)
      );
      if (extraPermissionIds.length) {
        throw new Error("Institution role overrides can only use the selected role's default permissions.");
      }
      const deniedPermissionIds = Array.from(defaultPermissionIds).filter(
        (permissionId) => !selectedPermissionIds.has(permissionId)
      );

      const client = await db.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `DELETE FROM institution_role_permissions WHERE institution_id = $1 AND role_id = $2`,
          [institutionId, roleId]
        );
        await client.query(
          `DELETE FROM institution_role_permission_denials WHERE institution_id = $1 AND role_id = $2`,
          [institutionId, roleId]
        );
        if (deniedPermissionIds.length) {
          await client.query(
            `
              INSERT INTO institution_role_permission_denials (institution_id, role_id, permission_id)
              SELECT $1, $2, unnest($3::int[])
              ON CONFLICT DO NOTHING
            `,
            [institutionId, roleId, deniedPermissionIds]
          );
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
      return;
    }
    case "personal-permissions": {
      await ensureInstitutionUserPermissionsSchema();
      const institutionId = asNumber(body.institution_id);
      const userId = asNumber(body.user_id);
      const permissionIds = asNumberArray(body.permission_ids ?? body.permission_id);
      assertInstitutionAllowed(scope, institutionId);
      if (!institutionId) throw new Error("Institution is required");
      if (!userId) throw new Error("User is required");
      await assertUserIsInstitutionAdmin(userId, institutionId);
      await assertInstitutionPermissionsAllowed(permissionIds, scope);
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `DELETE FROM institution_user_permissions WHERE institution_id = $1 AND user_id = $2`,
          [institutionId, userId]
        );
        if (permissionIds.length) {
          await client.query(
            `
              INSERT INTO institution_user_permissions
                (institution_id, user_id, permission_id, created_by, updated_by)
              SELECT $1, $2, unnest($3::int[]), $4, $4
              ON CONFLICT (institution_id, user_id, permission_id)
              DO UPDATE SET updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
            `,
            [institutionId, userId, permissionIds, scope.user.id]
          );
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
      return;
    }
    default:
      throw new Error("Edit is not available for this resource");
  }
}

async function deleteResource(resource: string, ids: string[], scope: AccessScope) {
  if (ids.length === 0) throw new Error("Select at least one row");

  switch (resource) {
    case "scope-types":
      await db.query(
        `
          UPDATE scope_types
          SET is_deleted = TRUE,
              deleted_at = CURRENT_TIMESTAMP,
              deleted_by = $2
          WHERE id = ANY($1::int[])
            AND COALESCE(is_deleted, FALSE) = FALSE
        `,
        [ids.map(Number), scope.user.id]
      );
      return;
    case "permissions":
      await db.query(
        `
          UPDATE permissions
          SET is_deleted = TRUE,
              deleted_at = CURRENT_TIMESTAMP,
              deleted_by = $2
          WHERE id = ANY($1::int[])
            AND COALESCE(is_deleted, FALSE) = FALSE
        `,
        [ids.map(Number), scope.user.id]
      );
      return;
    case "roles":
      await db.query(
        `
          UPDATE roles
          SET is_deleted = TRUE,
              deleted_at = CURRENT_TIMESTAMP,
              deleted_by = $2
          WHERE id = ANY($1::int[])
            AND COALESCE(is_deleted, FALSE) = FALSE
        `,
        [ids.map(Number), scope.user.id]
      );
      return;
    case "institution-memberships": {
      const params = scope.isPlatformAdmin
        ? [ids.map(Number)]
        : [ids.map(Number), scope.institutionIds];
      const scoped = scope.isPlatformAdmin ? "" : "AND institution_id = ANY($2::int[])";
      const memberships = await db.query<{ id: number }>(
        `
          UPDATE institution_memberships
          SET is_active = FALSE,
              status = 'LEFT',
              is_current = FALSE,
              is_deleted = TRUE,
              deleted_at = CURRENT_TIMESTAMP,
              deleted_by = $${scope.isPlatformAdmin ? 2 : 3},
              leave_date = COALESCE(leave_date, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[])
            ${scoped}
            AND COALESCE(is_deleted, FALSE) = FALSE
          RETURNING id
        `,
        scope.isPlatformAdmin ? [...params, scope.user.id] : [...params, scope.user.id]
      );
      if (memberships.rows.length) {
        await closeMembershipLifecycle(db, {
          membershipIds: memberships.rows.map((membership) => membership.id),
          status: "LEFT",
          actorId: scope.user.id,
          remarks: "Membership removed from access control",
        });
      }
      return;
    }
    case "roles": {
      const roleIds = ids.map(Number).filter((id) => Number.isInteger(id) && id > 0);
      if (roleIds.length === 0) return;

      const rolesToDelete = await db.query<{ id: number; is_system: boolean; institution_id: number | null }>(
        `SELECT id, is_system, institution_id FROM roles WHERE id = ANY($1::int[])`,
        [roleIds]
      );

      for (const r of rolesToDelete.rows) {
        if (!scope.isPlatformAdmin) {
          if (r.is_system || !r.institution_id) {
            throw new Error("System roles cannot be deleted by institutions");
          }
          assertInstitutionAllowed(scope, r.institution_id);
        } else if (r.is_system) {
          throw new Error("Standard system roles cannot be deleted");
        }
      }

      await db.query(`UPDATE roles SET is_deleted = TRUE, deleted_at = NOW() WHERE id = ANY($1::int[])`, [roleIds]);
      return;
    }
    case "role-permissions":
      await db.query(`DELETE FROM role_permissions WHERE role_id = ANY($1::int[])`, [ids.map(Number)]);
      return;
    case "institution-role-permissions":
      await ensureInstitutionRolePermissionDenialsSchema();
      for (const id of ids) {
        const [institutionId, roleId] = id.split(":").map(Number);
        assertInstitutionAllowed(scope, institutionId);
        await db.query(
          `
            DELETE FROM institution_role_permissions
            WHERE institution_id = $1 AND role_id = $2
          `,
          [institutionId, roleId]
        );
        await db.query(
          `
            DELETE FROM institution_role_permission_denials
            WHERE institution_id = $1 AND role_id = $2
          `,
          [institutionId, roleId]
        );
      }
      return;
    case "personal-permissions":
      await ensureInstitutionUserPermissionsSchema();
      for (const id of ids) {
        const [institutionId, userId] = id.split(":").map(Number);
        assertInstitutionAllowed(scope, institutionId);
        await db.query(
          `DELETE FROM institution_user_permissions WHERE institution_id = $1 AND user_id = $2`,
          [institutionId, userId]
        );
      }
      return;
    default:
      throw new Error("Delete is not available for this resource");
  }
}

function getErrorStatus(message: string) {
  if (message.startsWith("Missing required permission:")) return 403;
  if (message === "Forbidden: Admin access required") return 403;
  if (message === "Unauthorized" || message === "User not found") return 401;
  if (message === "Unknown access control resource") return 404;
  return 400;
}

function getErrorPayload(err: unknown) {
  if (err instanceof MissingPermissionError) {
    return {
      error: err.message,
      requiredPermission: err.permission,
    };
  }

  return {
    error: err instanceof Error ? err.message : "Something went wrong",
  };
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { resource } = await context.params;
    assertResource(resource);
    const scope = await getAccessScope(req, resource);

    const url = new URL(req.url);
    if (url.searchParams.get("sync") === "1") {
      await syncPermissionRegistry(db, true);
    }

    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() ?? "";
    const institutionId = asNumber(url.searchParams.get("institutionId"));
    const scopeFilter = url.searchParams.get("scope");
    const result = await listResource(resource, search, limit, offset, scope, {
      institutionId,
      scope: scopeFilter === "platform" || scopeFilter === "institution" ? scopeFilter : null,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const payload = getErrorPayload(err);
    return NextResponse.json(payload, { status: getErrorStatus(payload.error) });
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { resource } = await context.params;
    assertResource(resource);
    const scope = await getAccessScope(req, resource);
    const result = await createResource(resource, await req.json(), scope);
    return NextResponse.json({ data: result?.rows?.[0] ?? null }, { status: 201 });
  } catch (err: unknown) {
    const payload = getErrorPayload(err);
    return NextResponse.json(payload, { status: getErrorStatus(payload.error) });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { resource } = await context.params;
    assertResource(resource);
    const scope = await getAccessScope(req, resource);
    await updateResource(resource, await req.json(), scope);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const payload = getErrorPayload(err);
    return NextResponse.json(payload, { status: getErrorStatus(payload.error) });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { resource } = await context.params;
    assertResource(resource);
    const scope = await getAccessScope(req, resource);
    const body = await req.json();
    await deleteResource(resource, getIds(body), scope);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const payload = getErrorPayload(err);
    return NextResponse.json(payload, { status: getErrorStatus(payload.error) });
  }
}
