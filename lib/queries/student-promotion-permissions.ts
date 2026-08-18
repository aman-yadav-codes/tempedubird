import type { Pool, PoolClient } from "pg";

import { isPlatformFullAccess, type PermissionUser } from "@/lib/auth/permissions";

type Queryable = Pick<Pool | PoolClient, "query">;

type PromotionPermissionUser = PermissionUser & { is_super_admin?: boolean };

export function hasInstitutionPromotionAccess(user: PromotionPermissionUser) {
  return Boolean(
    user.is_super_admin ||
      isPlatformFullAccess(user) ||
      user.role_codes.includes("platform_admin") ||
      user.role_codes.includes("institution_admin"),
  );
}

export async function canPromoteEnrollment(
  db: Queryable,
  user: PromotionPermissionUser,
  enrollment: {
    institution_id: number;
    program_id: number | null;
    section_id: number | null;
    academic_year_id: number;
  },
) {
  if (hasInstitutionPromotionAccess(user)) return true;
  if (!user.role_codes.includes("teacher") || !enrollment.program_id) return false;

  const result = await db.query<{ allowed: number }>(
    `
      SELECT 1 AS allowed
      FROM program_section_class_teachers
      WHERE program_id = $1
        AND section_id IS NOT DISTINCT FROM $2::int
        AND academic_year_id = $3
        AND teacher_id = $4
      LIMIT 1
    `,
    [
      enrollment.program_id,
      enrollment.section_id ?? null,
      enrollment.academic_year_id,
      user.id,
    ],
  );

  return Boolean(result.rows[0]);
}

export async function assertCanPromoteEnrollment(
  db: Queryable,
  user: PromotionPermissionUser,
  enrollment: {
    institution_id: number;
    program_id: number | null;
    section_id: number | null;
    academic_year_id: number;
  },
) {
  if (await canPromoteEnrollment(db, user, enrollment)) return;
  throw new Error("Only institution admins or the assigned class teacher can promote this class");
}
