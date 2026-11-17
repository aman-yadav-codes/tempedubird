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

  const ids = (user.memberships ?? [])
    .map((membership) => membership.institution_id)
    .filter((id): id is number => Number.isInteger(id) && id > 0);

  if (user.under_institution_id && Number.isInteger(user.under_institution_id)) {
    ids.push(user.under_institution_id);
  }

  return Array.from(new Set(ids));
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
  if (currentUser.id === targetUserId) return;

  const isGuardianOrParent =
    Boolean(currentUser.role_codes?.some((c) => c.toLowerCase().includes("parent") || c.toLowerCase().includes("guardian"))) ||
    Boolean(currentUser.roles?.some((r) => r.toLowerCase().includes("parent") || r.toLowerCase().includes("guardian")));

  if (isGuardianOrParent) {
    return;
  }

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

export type UserCatalogScope = {
  isSuperAdmin: boolean;
  isPureProfessional: boolean;
  businessProfileIds: number[];
  institutionIds: number[];
  professionalProfileIds: number[];
  primaryBusinessId: number | null;
  primaryInstitutionId: number | null;
  primaryProfessionalId: number | null;
};

/**
 * Returns tenant and business ownership scope for products & services catalog.
 * Business owners and staff can only access catalog items belonging to their business/institution/profile.
 * Professional account owners can only access items listed by them.
 */
export async function getUserCatalogScope(
  db: Queryable,
  user: { id: number; is_super_admin?: boolean; role_codes?: string[] }
): Promise<UserCatalogScope> {
  const isSuperAdmin = Boolean(
    user.id === 1 ||
    user.is_super_admin ||
    user.role_codes?.includes("platform_admin")
  );

  if (isSuperAdmin) {
    return {
      isSuperAdmin: true,
      isPureProfessional: false,
      businessProfileIds: [],
      institutionIds: [],
      professionalProfileIds: [],
      primaryBusinessId: null,
      primaryInstitutionId: null,
      primaryProfessionalId: null,
    };
  }

  // 1. Business profiles directly owned by user
  const bizRes = await db.query<{ id: number; institution_profile_id: number | null }>(
    `SELECT id, institution_profile_id FROM business_profiles WHERE user_id = $1 AND COALESCE(is_active, TRUE) = TRUE`,
    [user.id]
  );
  const businessProfileIds = bizRes.rows.map((r) => r.id);
  const bizInstIds = bizRes.rows
    .map((r) => r.institution_profile_id)
    .filter((id): id is number => typeof id === "number" && id > 0);

  // 2. Institution memberships (staff / admin)
  const memRes = await db.query<{ institution_id: number }>(
    `SELECT institution_id FROM institution_memberships WHERE user_id = $1 AND COALESCE(is_active, TRUE) = TRUE`,
    [user.id]
  );
  const institutionIds = Array.from(new Set([...memRes.rows.map((r) => r.institution_id), ...bizInstIds]));

  // Also include business profiles associated with user's institutions
  if (institutionIds.length > 0) {
    const instBizRes = await db.query<{ id: number }>(
      `SELECT id FROM business_profiles WHERE institution_profile_id = ANY($1) AND COALESCE(is_active, TRUE) = TRUE`,
      [institutionIds]
    );
    for (const r of instBizRes.rows) {
      if (!businessProfileIds.includes(r.id)) {
        businessProfileIds.push(r.id);
      }
    }
  }

  // 3. Professional profiles owned by user
  const profRes = await db.query<{ id: number; business_profile_id: number | null }>(
    `SELECT id, business_profile_id FROM professional_profiles WHERE user_id = $1 AND COALESCE(is_active, TRUE) = TRUE`,
    [user.id]
  );
  const professionalProfileIds = profRes.rows.map((r) => r.id);

  // Professional account owners who do not directly own a business or institution are pure professionals
  const isPureProfessional = professionalProfileIds.length > 0 && businessProfileIds.length === 0 && institutionIds.length === 0;

  return {
    isSuperAdmin: false,
    isPureProfessional,
    businessProfileIds,
    institutionIds,
    professionalProfileIds,
    primaryBusinessId: businessProfileIds[0] || null,
    primaryInstitutionId: institutionIds[0] || null,
    primaryProfessionalId: professionalProfileIds[0] || null,
  };
}
