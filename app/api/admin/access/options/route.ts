import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  FULL_ACCESS_PERMISSION,
  getManagedPermissionCodes,
  hasPermission,
  isPlatformAdminUser,
  isPlatformOnlyPermission,
  type PermissionUser,
} from "@/lib/auth/permissions";
import { syncPermissionRegistry } from "@/lib/auth/sync-permission-registry";

const optionResources = new Set([
  "scopes",
  "roles",
  "institutionRoles",
  "permissions",
  "institutions",
  "users",
]);

function getOptionQuery(
  type: string,
  search: string,
  selectedInstitutionId: number | null = null,
  context: string | null = null,
) {
  const like = `%${search}%`;
  const membershipOnly = context === "institution-memberships";

  switch (type) {
    case "scopes":
      return {
        sql: `
          SELECT id, name, code
          FROM scope_types
          WHERE is_active = TRUE
            AND ($1 = '' OR name ILIKE $2 OR code ILIKE $2)
          ORDER BY name ASC
          LIMIT $3 OFFSET $4
        `,
        params: [search, like],
      };
    case "roles":
      return {
        sql: `
          SELECT
            r.id,
            r.name,
            r.code,
            r.institution_id,
            COALESCE(r.is_system, r.institution_id IS NULL) AS is_system,
            st.code AS scope_code,
            COALESCE(default_permissions.permission_ids, '[]'::jsonb) AS default_permission_ids
          FROM roles r
          LEFT JOIN scope_types st ON st.id = r.scope_id
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(rp.permission_id ORDER BY p.code ASC) AS permission_ids
            FROM role_permissions rp
            INNER JOIN permissions p ON p.id = rp.permission_id
            WHERE rp.role_id = r.id
              AND COALESCE(p.is_deleted, FALSE) = FALSE
          ) default_permissions ON TRUE
          WHERE COALESCE(r.is_deleted, FALSE) = FALSE
            AND ($3::int IS NULL OR r.institution_id IS NULL OR r.institution_id = $3)
            AND ($1 = '' OR r.name ILIKE $2 OR r.code ILIKE $2 OR st.code ILIKE $2)
          ORDER BY st.code ASC NULLS LAST, (r.institution_id IS NOT NULL) ASC, r.name ASC
          LIMIT $4 OFFSET $5
        `,
        params: [search, like, selectedInstitutionId],
      };
    case "institutionRoles":
      return {
        sql: `
          SELECT
            r.id,
            r.name,
            r.code,
            r.institution_id,
            COALESCE(r.is_system, r.institution_id IS NULL) AS is_system,
            st.code AS scope_code,
            COALESCE(default_permissions.permission_ids, '[]'::jsonb) AS default_permission_ids
          FROM roles r
          INNER JOIN scope_types st ON st.id = r.scope_id
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(rp.permission_id ORDER BY p.code ASC) AS permission_ids
            FROM role_permissions rp
            INNER JOIN permissions p ON p.id = rp.permission_id
            WHERE rp.role_id = r.id
              AND COALESCE(p.is_deleted, FALSE) = FALSE
          ) default_permissions ON TRUE
          WHERE st.code = 'institution'
            AND COALESCE(r.is_deleted, FALSE) = FALSE
            AND ($3::int IS NULL OR r.institution_id IS NULL OR r.institution_id = $3)
            ${membershipOnly ? "AND r.code <> 'institution_admin'" : ""}
            AND ($1 = '' OR r.name ILIKE $2 OR r.code ILIKE $2)
          ORDER BY (r.institution_id IS NOT NULL) ASC, r.name ASC
          LIMIT $4 OFFSET $5
        `,
        params: [search, like, selectedInstitutionId],
      };
    case "permissions":
      return {
        sql: `
          SELECT id, name, code
          FROM permissions
          WHERE COALESCE(is_deleted, FALSE) = FALSE
            AND ($1 = '' OR name ILIKE $2 OR code ILIKE $2)
          ORDER BY code ASC
          LIMIT $3 OFFSET $4
        `,
        params: [search, like],
      };
    case "institutions":
      if (selectedInstitutionId) {
        return {
          sql: `
            SELECT id, name, slug
            FROM institution_profiles
            WHERE COALESCE(is_deleted, FALSE) = FALSE
              AND id = $3
              AND ($1 = '' OR name ILIKE $2 OR slug ILIKE $2)
            ORDER BY name ASC
            LIMIT $4 OFFSET $5
          `,
          params: [search, like, selectedInstitutionId],
        };
      }
      return {
        sql: `
          SELECT id, name, slug
          FROM institution_profiles
          WHERE COALESCE(is_deleted, FALSE) = FALSE
            AND ($1 = '' OR name ILIKE $2 OR slug ILIKE $2)
          ORDER BY name ASC
          LIMIT $3 OFFSET $4
        `,
        params: [search, like],
      };
    case "users":
      if (selectedInstitutionId) {
        return {
          sql: `
            SELECT DISTINCT u.id, u.full_name, u.email
            FROM users u
            INNER JOIN institution_memberships im ON im.user_id = u.id
            INNER JOIN roles r ON r.id = im.role_id
            WHERE COALESCE(u.is_deleted, FALSE) = FALSE
              AND im.is_active = TRUE
              AND im.institution_id = $3
              AND ${membershipOnly ? "r.code <> 'institution_admin'" : "r.code = 'institution_admin'"}
              AND NOT EXISTS (
                SELECT 1
                FROM user_roles platform_ur
                INNER JOIN roles platform_role
                  ON platform_role.id = platform_ur.role_id
                  AND platform_role.code = 'platform_admin'
                WHERE platform_ur.user_id = u.id
              )
              AND ($1 = '' OR u.full_name ILIKE $2 OR u.email ILIKE $2)
            ORDER BY u.full_name ASC
            LIMIT $4 OFFSET $5
          `,
          params: [search, like, selectedInstitutionId],
        };
      }
      return {
        sql: `
          SELECT id, full_name, email
          FROM users u
          WHERE COALESCE(u.is_deleted, FALSE) = FALSE
            AND NOT EXISTS (
              SELECT 1
              FROM user_roles platform_ur
              INNER JOIN roles platform_role
                ON platform_role.id = platform_ur.role_id
                AND platform_role.code = 'platform_admin'
              WHERE platform_ur.user_id = u.id
            )
            AND NOT EXISTS (
              SELECT 1
              FROM institution_memberships admin_im
              INNER JOIN roles admin_role
                ON admin_role.id = admin_im.role_id
                AND admin_role.code = 'institution_admin'
              WHERE admin_im.user_id = u.id
                AND admin_im.is_active = TRUE
                AND COALESCE(admin_im.is_deleted, FALSE) = FALSE
            )
            AND ($1 = '' OR u.full_name ILIKE $2 OR u.email ILIKE $2)
          ORDER BY full_name ASC
          LIMIT $3 OFFSET $4
        `,
        params: [search, like],
      };
    default:
      throw new Error("Unknown options resource");
  }
}

function getInstitutionIds(user: PermissionUser) {
  return Array.from(
    new Set(
      (user.memberships ?? [])
        .map((membership) => Number(membership.institution_id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  );
}

function isInstitutionGrantablePermission(code: string) {
  return (
    !isPlatformOnlyPermission(code) && !code.startsWith("rolespermissions.")
  );
}

function filterPermissionRows<T extends { code?: string | null }>(
  rows: T[],
  canUsePlatformAccess: boolean,
) {
  return canUsePlatformAccess
    ? rows
    : rows.filter((row) =>
        isInstitutionGrantablePermission(String(row.code ?? "")),
      );
}

function canUsePlatformAccessOptions(user: PermissionUser) {
  return (
    isPlatformAdminUser(user) ||
    hasPermission(user, "rolespermissions.scopetypes.view") ||
    hasPermission(user, "rolespermissions.permissions.view") ||
    hasPermission(user, "rolespermissions.roles.view") ||
    hasPermission(user, "rolespermissions.rolepermissions.view")
  );
}

function canUseInstitutionAccessOptions(user: PermissionUser) {
  return (
    hasPermission(user, "rolespermissions.institutionmemberships.view") ||
    hasPermission(user, "rolespermissions.institutionrolepermissions.view") ||
    hasPermission(user, "rolespermissions.personalpermissions.view")
  );
}

function canUseStudentManagementOptions(user: PermissionUser) {
  return (
    hasPermission(user, "managestudents.allstudents.view") ||
    hasPermission(user, "managestudents.allstudents.create") ||
    hasPermission(user, "managestudents.allstudents.edit")
  );
}

function assertCanUseAccessOptions(
  user: PermissionUser,
  canUsePlatformAccess: boolean,
  canUseInstitutionAccess: boolean,
  institutionIds: number[],
  canUseStudentManagement: boolean,
  context: string | null,
  type: string | null,
) {
  if (canUsePlatformAccess) return;
  if (
    context === "student-management" &&
    type === "institutionRoles" &&
    canUseStudentManagement &&
    institutionIds.length > 0
  ) {
    return;
  }
  const canManageInstitutionAccess =
    canUseInstitutionAccess && institutionIds.length > 0;

  if (!canManageInstitutionAccess) {
    throw new Error("Forbidden: Admin access required");
  }
}

function getScopedOptionQuery(
  type: string,
  search: string,
  canUsePlatformAccess: boolean,
  institutionIds: number[],
  selectedInstitutionId: number | null = null,
  context: string | null = null,
) {
  if (canUsePlatformAccess)
    return getOptionQuery(type, search, selectedInstitutionId, context);

  const like = `%${search}%`;
  const membershipOnly = context === "institution-memberships";
  const platformOnlyCodes = [
    FULL_ACCESS_PERMISSION,
    ...getManagedPermissionCodes().filter(isPlatformOnlyPermission),
    ...getManagedPermissionCodes().filter((code) =>
      code.startsWith("rolespermissions."),
    ),
  ];
  switch (type) {
    case "scopes":
      return {
        sql: `
          SELECT id, name, code
          FROM scope_types
          WHERE is_active = TRUE
            AND code = 'institution'
            AND ($1 = '' OR name ILIKE $2 OR code ILIKE $2)
          ORDER BY name ASC
          LIMIT $3 OFFSET $4
        `,
        params: [search, like],
      };
    case "roles":
    case "institutionRoles":
      return {
        sql: `
          SELECT
            r.id,
            r.name,
            r.code,
            st.code AS scope_code,
            COALESCE(default_permissions.permission_ids, '[]'::jsonb) AS default_permission_ids
          FROM roles r
          INNER JOIN scope_types st ON st.id = r.scope_id
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(rp.permission_id ORDER BY p.code ASC) AS permission_ids
            FROM role_permissions rp
            INNER JOIN permissions p ON p.id = rp.permission_id
            WHERE rp.role_id = r.id
              AND COALESCE(p.is_deleted, FALSE) = FALSE
          ) default_permissions ON TRUE
          WHERE st.code = 'institution'
            AND COALESCE(r.is_deleted, FALSE) = FALSE
            ${membershipOnly ? "AND r.code <> 'institution_admin'" : ""}
            AND ($1 = '' OR r.name ILIKE $2 OR r.code ILIKE $2)
          ORDER BY r.name ASC
          LIMIT $3 OFFSET $4
        `,
        params: [search, like],
      };
    case "permissions":
      return {
        sql: `
          SELECT id, name, code
          FROM permissions
          WHERE COALESCE(is_deleted, FALSE) = FALSE
            AND NOT (code = ANY($3::text[]))
            AND ($1 = '' OR name ILIKE $2 OR code ILIKE $2)
          ORDER BY code ASC
          LIMIT $4 OFFSET $5
        `,
        params: [search, like, platformOnlyCodes],
      };
    case "institutions":
      return {
        sql: `
          SELECT id, name, slug
          FROM institution_profiles
          WHERE COALESCE(is_deleted, FALSE) = FALSE
            AND id = ANY($3::int[])
            AND ($1 = '' OR name ILIKE $2 OR slug ILIKE $2)
          ORDER BY name ASC
          LIMIT $4 OFFSET $5
        `,
        params: [search, like, institutionIds],
      };
    case "users":
      if (
        selectedInstitutionId &&
        institutionIds.includes(selectedInstitutionId)
      ) {
        return {
          sql: `
            SELECT DISTINCT u.id, u.full_name, u.email
            FROM users u
            INNER JOIN institution_memberships im ON im.user_id = u.id
            INNER JOIN roles r ON r.id = im.role_id
            WHERE COALESCE(u.is_deleted, FALSE) = FALSE
              AND im.is_active = TRUE
              AND COALESCE(im.is_deleted, FALSE) = FALSE
              AND im.institution_id = $3
              AND ${membershipOnly ? "r.code <> 'institution_admin'" : "r.code = 'institution_admin'"}
              AND NOT EXISTS (
                SELECT 1
                FROM user_roles platform_ur
                INNER JOIN roles platform_role
                  ON platform_role.id = platform_ur.role_id
                  AND platform_role.code = 'platform_admin'
                WHERE platform_ur.user_id = u.id
              )
              AND ($1 = '' OR u.full_name ILIKE $2 OR u.email ILIKE $2)
            ORDER BY u.full_name ASC
            LIMIT $4 OFFSET $5
          `,
          params: [search, like, selectedInstitutionId],
        };
      }
      return {
        sql: `
          SELECT DISTINCT u.id, u.full_name, u.email
          FROM users u
          INNER JOIN institution_memberships im ON im.user_id = u.id
          INNER JOIN roles r ON r.id = im.role_id
          WHERE COALESCE(u.is_deleted, FALSE) = FALSE
            AND im.is_active = TRUE
            AND COALESCE(im.is_deleted, FALSE) = FALSE
            AND im.institution_id = ANY($3::int[])
            AND r.code <> 'institution_admin'
            AND NOT EXISTS (
              SELECT 1
              FROM user_roles platform_ur
              INNER JOIN roles platform_role
                ON platform_role.id = platform_ur.role_id
                AND platform_role.code = 'platform_admin'
              WHERE platform_ur.user_id = u.id
            )
            AND ($1 = '' OR u.full_name ILIKE $2 OR u.email ILIKE $2)
          ORDER BY u.full_name ASC
          LIMIT $4 OFFSET $5
        `,
        params: [search, like, institutionIds],
      };
    default:
      throw new Error("Unknown options resource");
  }
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const canUsePlatformAccess = canUsePlatformAccessOptions(currentUser);
    const canUseInstitutionAccess = canUseInstitutionAccessOptions(currentUser);
    const canUseStudentManagement = canUseStudentManagementOptions(currentUser);
    const institutionIds = getInstitutionIds(currentUser);
    const context = url.searchParams.get("context");
    assertCanUseAccessOptions(
      currentUser,
      canUsePlatformAccess,
      canUseInstitutionAccess,
      institutionIds,
      canUseStudentManagement,
      context,
      type,
    );
    if (url.searchParams.get("sync") === "1" || type === "permissions") {
      await syncPermissionRegistry(db, type === "permissions");
    }

    if (type) {
      if (!optionResources.has(type)) {
        return NextResponse.json(
          { error: "Unknown options resource" },
          { status: 404 },
        );
      }

      const search = url.searchParams.get("search")?.trim() ?? "";
      const selectedInstitutionId =
        Math.max(Number(url.searchParams.get("institutionId")) || 0, 0) || null;
      const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
      const maxLimit = type === "permissions" ? 500 : 50;
      const limit = Math.min(
        Math.max(Number(url.searchParams.get("limit")) || 20, 1),
        maxLimit,
      );
      const offset = (page - 1) * limit;
      const optionQuery = getScopedOptionQuery(
        type,
        search,
        canUsePlatformAccess,
        institutionIds,
        selectedInstitutionId,
        context,
      );
      const result = await db.query(optionQuery.sql, [
        ...optionQuery.params,
        limit + 1,
        offset,
      ]);
      const rows = filterPermissionRows(
        result.rows.slice(0, limit),
        canUsePlatformAccess,
      );

      return NextResponse.json({
        data: rows,
        hasMore: result.rows.length > limit,
      });
    }

    const [scopes, roles, institutionRoles, permissions, institutions, users] =
      await Promise.all([
        db.query(`
          SELECT id, name, code
          FROM scope_types
          WHERE is_active = TRUE
          ORDER BY name ASC
        `),
        db.query(`
          SELECT
            r.id,
            r.name,
            r.code,
            st.code AS scope_code,
            COALESCE(default_permissions.permission_ids, '[]'::jsonb) AS default_permission_ids
          FROM roles r
          LEFT JOIN scope_types st ON st.id = r.scope_id
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(rp.permission_id ORDER BY p.code ASC) AS permission_ids
            FROM role_permissions rp
            INNER JOIN permissions p ON p.id = rp.permission_id
            WHERE rp.role_id = r.id
              AND COALESCE(p.is_deleted, FALSE) = FALSE
          ) default_permissions ON TRUE
          WHERE COALESCE(r.is_deleted, FALSE) = FALSE
          ORDER BY st.code ASC NULLS LAST, r.name ASC
        `),
        db.query(`
          SELECT
            r.id,
            r.name,
            r.code,
            COALESCE(default_permissions.permission_ids, '[]'::jsonb) AS default_permission_ids
          FROM roles r
          INNER JOIN scope_types st ON st.id = r.scope_id
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(rp.permission_id ORDER BY p.code ASC) AS permission_ids
            FROM role_permissions rp
            INNER JOIN permissions p ON p.id = rp.permission_id
            WHERE rp.role_id = r.id
              AND COALESCE(p.is_deleted, FALSE) = FALSE
          ) default_permissions ON TRUE
          WHERE st.code = 'institution'
            AND COALESCE(r.is_deleted, FALSE) = FALSE
          ORDER BY r.name ASC
        `),
        db.query(`
          SELECT id, name, code
          FROM permissions
          WHERE COALESCE(is_deleted, FALSE) = FALSE
          ORDER BY code ASC
          LIMIT 500
        `),
        canUsePlatformAccess
          ? db.query(`
              SELECT id, name, slug
              FROM institution_profiles
              WHERE COALESCE(is_deleted, FALSE) = FALSE
              ORDER BY name ASC
              LIMIT 500
            `)
          : db.query(
              `
              SELECT id, name, slug
              FROM institution_profiles
              WHERE COALESCE(is_deleted, FALSE) = FALSE
                AND id = ANY($1::int[])
              ORDER BY name ASC
              LIMIT 500
            `,
              [institutionIds],
            ),
        canUsePlatformAccess
          ? db.query(`
              SELECT id, full_name, email
              FROM users
              WHERE COALESCE(is_deleted, FALSE) = FALSE
              ORDER BY full_name ASC
              LIMIT 50
            `)
          : db.query(
              `
              SELECT DISTINCT u.id, u.full_name, u.email
              FROM users u
              INNER JOIN institution_memberships im ON im.user_id = u.id
              WHERE COALESCE(u.is_deleted, FALSE) = FALSE
                AND im.is_active = TRUE
                AND im.institution_id = ANY($1::int[])
              ORDER BY u.full_name ASC
              LIMIT 50
            `,
              [institutionIds],
            ),
      ]);

    return NextResponse.json({
      scopes: canUsePlatformAccess
        ? scopes.rows
        : scopes.rows.filter((row) => row.code === "institution"),
      roles: canUsePlatformAccess
        ? roles.rows
        : roles.rows.filter((row) => row.scope_code === "institution"),
      institutionRoles: institutionRoles.rows,
      permissions: filterPermissionRows(permissions.rows, canUsePlatformAccess),
      institutions: institutions.rows,
      users: users.rows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    const status = message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
