import {
  isPlatformFullAccess,
  type PermissionUser,
} from "@/lib/auth/permissions";

type Queryable = {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ) => Promise<{ rows: T[] }>;
};

export function getAllowedInstitutionIds(user: PermissionUser) {
  if (
    user.role_codes.includes("platform_admin") ||
    isPlatformFullAccess(user)
  ) {
    return null;
  }

  return Array.from(
    new Set(
      (user.memberships ?? [])
        .map((membership) => membership.institution_id)
        .filter((id): id is number => Number.isInteger(id) && id > 0),
    ),
  );
}

export function getRequestedInstitutionId(searchParams: URLSearchParams) {
  const institutionId = Number(searchParams.get("institutionId"));
  return Number.isInteger(institutionId) && institutionId > 0
    ? institutionId
    : null;
}

export function getScopedInstitutionIds(
  user: PermissionUser,
  requestedInstitutionId: number | null | undefined,
) {
  const allowedInstitutionIds = getAllowedInstitutionIds(user);
  if (!requestedInstitutionId) return allowedInstitutionIds;
  if (
    allowedInstitutionIds &&
    !allowedInstitutionIds.includes(requestedInstitutionId)
  ) {
    throw new Error("Forbidden: Admin access required");
  }
  return [requestedInstitutionId];
}

export function applyInstitutionScope<
  T extends { institutionId?: number; institutionIds?: number[] },
>(opts: T, user: PermissionUser) {
  const allowedInstitutionIds = getAllowedInstitutionIds(user);

  if (opts.institutionId) {
    if (
      allowedInstitutionIds &&
      !allowedInstitutionIds.includes(opts.institutionId)
    ) {
      throw new Error("Forbidden: Admin access required");
    }

    return {
      ...opts,
      institutionIds: [opts.institutionId],
    };
  }

  if (!allowedInstitutionIds) return opts;

  return {
    ...opts,
    institutionIds: allowedInstitutionIds,
  };
}

export function canAccessInstitution(
  user: PermissionUser,
  institutionId: number | null | undefined,
) {
  const allowedInstitutionIds = getAllowedInstitutionIds(user);
  if (!allowedInstitutionIds) return true;
  return Boolean(
    institutionId && allowedInstitutionIds.includes(institutionId),
  );
}

export function assertCanAccessInstitution(
  user: PermissionUser,
  institutionId: number | null | undefined,
) {
  if (!canAccessInstitution(user, institutionId)) {
    throw new Error("Forbidden: Admin access required");
  }
}

export async function getUserInstitutionIds(db: Queryable, userId: number) {
  const result = await db.query<{ institution_id: number }>(
    `
      SELECT DISTINCT institution_id
      FROM (
        SELECT im.institution_id
        FROM institution_memberships im
        INNER JOIN institution_profiles ip
          ON ip.id = im.institution_id
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
          )
        WHERE im.user_id = $1
          AND im.is_active = TRUE
        UNION
        SELECT up.under_institution_id AS institution_id
        FROM user_profiles up
        INNER JOIN institution_profiles ip
          ON ip.id = up.under_institution_id
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
          )
        WHERE up.user_id = $1
          AND up.under_institution_id IS NOT NULL
        UNION
        SELECT se.institution_id
        FROM student_profiles sp
        INNER JOIN student_enrollments se
          ON se.student_id = sp.id
         AND se.status = 'active'
         AND COALESCE(se.is_deleted, FALSE) = FALSE
        INNER JOIN institution_profiles enrollment_ip
          ON enrollment_ip.id = se.institution_id
          AND enrollment_ip.is_active = TRUE
          AND COALESCE(enrollment_ip.is_deleted, FALSE) = FALSE
        WHERE sp.user_id = $1
      ) scoped_institutions
      WHERE institution_id IS NOT NULL
    `,
    [userId],
  );

  return result.rows
    .map((row) => Number(row.institution_id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export async function assertCanAccessUserWithinInstitutionScope(
  db: Queryable,
  currentUser: PermissionUser,
  targetUserId: number,
) {
  const allowedInstitutionIds = getAllowedInstitutionIds(currentUser);
  if (!allowedInstitutionIds) return;

  const targetInstitutionIds = await getUserInstitutionIds(db, targetUserId);
  const hasSharedInstitution = targetInstitutionIds.some((institutionId) =>
    allowedInstitutionIds.includes(institutionId),
  );

  if (!hasSharedInstitution) {
    throw new Error("Forbidden: Admin access required");
  }
}

export async function assertRowsWithinInstitutionScope(
  db: Queryable,
  user: PermissionUser,
  table: string,
  ids: number[],
  institutionColumn = "institution_id",
) {
  const allowedInstitutionIds = getAllowedInstitutionIds(user);
  if (!allowedInstitutionIds) return;
  if (ids.length === 0) return;

  const result = await db.query(
    `
      SELECT COUNT(*)::int AS count
      FROM ${table}
      WHERE id = ANY($1::int[])
        AND ${institutionColumn} <> ALL($2::int[])
    `,
    [ids, allowedInstitutionIds],
  );

  if (Number(result.rows[0]?.count ?? 0) > 0) {
    throw new Error("Forbidden: Admin access required");
  }
}
