import type { QueryResultRow } from "pg";

type Queryable = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[]
  ) => Promise<{ rows: T[] }>;
};

export const ACCOUNT_SUSPENDED_ERROR = "Account suspended";
export const INSTITUTION_SUSPENDED_ERROR = "Institution suspended";

export type SuspensionStatus =
  | { suspended: false }
  | { suspended: true; reason: "account" | "institution"; message: string };

export async function getSuspensionStatus(
  db: Queryable,
  userId: number
): Promise<SuspensionStatus> {
  const userResult = await db.query<{ is_active: boolean }>(
    `
      SELECT is_active
      FROM users
      WHERE id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [userId]
  );

  const user = userResult.rows[0];
  if (!user) {
    return { suspended: true, reason: "account", message: ACCOUNT_SUSPENDED_ERROR };
  }

  if (user.is_active === false) {
    return { suspended: true, reason: "account", message: ACCOUNT_SUSPENDED_ERROR };
  }

  const institutionResult = await db.query<{
    linked_count: number;
    active_count: number;
  }>(
    `
      WITH linked_institutions AS (
        SELECT DISTINCT institution_id
        FROM (
          SELECT im.institution_id
          FROM institution_memberships im
          WHERE im.user_id = $1
            AND im.is_active = TRUE
          UNION
          SELECT up.under_institution_id AS institution_id
          FROM user_profiles up
          WHERE up.user_id = $1
            AND up.under_institution_id IS NOT NULL
        ) user_institutions
        WHERE institution_id IS NOT NULL
      )
      SELECT
        COUNT(*)::int AS linked_count,
        COUNT(*) FILTER (
          WHERE ip.is_active = TRUE
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
              WHERE admin_im.institution_id = linked_institutions.institution_id
                AND admin_im.is_active = TRUE
            )
        )::int AS active_count
      FROM linked_institutions
      LEFT JOIN institution_profiles ip
        ON ip.id = linked_institutions.institution_id
    `,
    [userId]
  );

  const institutionStatus = institutionResult.rows[0];
  const linkedCount = Number(institutionStatus?.linked_count ?? 0);
  const activeCount = Number(institutionStatus?.active_count ?? 0);

  if (linkedCount > 0 && activeCount === 0) {
    return {
      suspended: true,
      reason: "institution",
      message: INSTITUTION_SUSPENDED_ERROR,
    };
  }

  return { suspended: false };
}

export function getSuspensionErrorCode(message: string) {
  if (message === ACCOUNT_SUSPENDED_ERROR) return "ACCOUNT_SUSPENDED";
  if (message === INSTITUTION_SUSPENDED_ERROR) return "INSTITUTION_SUSPENDED";
  return null;
}
