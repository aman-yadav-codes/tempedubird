// /models/userModel.ts
import { db } from "@/lib/db/db";
import { User } from "@/types/user";
import {
  insertUser,
  insertUserRole,
  getUserByEmailQuery,
  createPublicRegisteredUserProfile,
  resolvePublicSignupRole,
} from "@/lib/queries/user";
import { syncInstitutionAcademicYearsFromTemplates } from "@/lib/queries/academic-sessions";

export const createUser = async (data: User & {
  role_id?: number | null;
  role_code?: string | null;
  designation_id?: number | null;
  is_teacher?: boolean;
  teacher_type?: "individual_teacher" | "institute_teacher" | null;
  is_active?: boolean;
  institution_id?: number | null;
  under_institution_id?: number | null;
}): Promise<User> => {
  const role = await resolvePublicSignupRole(db, {
    roleId: data.role_id ?? null,
    roleCode: data.role_code ?? null,
  });
  const institutionId = data.institution_id ?? data.under_institution_id ?? null;
  const institutionClaimRoleCodes = ["institution_admin", "teacher", "student", "driver"];
  const designationRoleCodes = ["institution_admin"];
  const hasInstitutionClaim =
    role?.scope_code === "institution" &&
    institutionClaimRoleCodes.includes(role.code) &&
    Boolean(institutionId);

  // Any designation is allowed for any role

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const isInstitutionAdmin = role?.code === "institution_admin";
    const user = await insertUser(client, {
      ...data,
      is_active: isInstitutionAdmin ? true : (hasInstitutionClaim ? false : (data.is_active ?? true)),
    });

    let targetInstitutionId = institutionId;

    if (isInstitutionAdmin) {
      const trimmedName = data.full_name?.trim();
      const institutionName = (trimmedName && trimmedName.length > 0)
        ? `${trimmedName} Institute`
        : `Institute ${data.phone ? data.phone.slice(-4) : Date.now().toString().slice(-4)}`;

      const rawSlug = institutionName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      let candidateSlug = rawSlug || "institute";
      let slugSuffix = 1;
      while (true) {
        const slugCheck = await client.query(
          `SELECT id FROM institution_profiles WHERE slug = $1 LIMIT 1`,
          [candidateSlug]
        );
        if (slugCheck.rows.length === 0) break;
        candidateSlug = `${rawSlug}-${slugSuffix++}`;
      }

      const typeRes = await client.query<{ id: number }>(
        `SELECT id FROM institution_types WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY id ASC LIMIT 1`
      );
      let typeId = typeRes.rows[0]?.id;
      if (!typeId) {
        const newType = await client.query<{ id: number }>(
          `INSERT INTO institution_types (name, slug, is_active, created_at, updated_at)
           VALUES ('Institute', 'institute', TRUE, NOW(), NOW())
           RETURNING id`
        );
        typeId = newType.rows[0]?.id;
      }

      const newInstRes = await client.query<{ id: number; name: string }>(
        `INSERT INTO institution_profiles (
           name, slug, institution_type_id, phone, email, is_active, is_marketplace_enabled, created_by, updated_by, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, $6, $6, NOW(), NOW())
         RETURNING id, name`,
        [institutionName, candidateSlug, typeId, data.phone || null, data.email || null, user.id!]
      );

      targetInstitutionId = newInstRes.rows[0].id;

      try {
        await syncInstitutionAcademicYearsFromTemplates(client, [targetInstitutionId], user.id!);
      } catch (sessionErr) {
        console.error("[createUser] Failed to sync academic sessions for new institution:", sessionErr);
      }

      try {
        const pkgRes = await client.query<{ id: number }>(
          `SELECT id FROM sales_packages WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY id ASC LIMIT 1`
        );
        const packageId = pkgRes.rows[0]?.id || 1;
        await client.query(
          `INSERT INTO institution_subscriptions (
             institution_id, package_id, status, starts_at, expires_at, storage_limit_gb,
             price, price_unit, validity_count, validity_unit, created_by, updated_by
           ) VALUES ($1, $2, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 500, 0, 'year', 1, 'year', $3, $3)
           ON CONFLICT DO NOTHING`,
          [targetInstitutionId, packageId, user.id!]
        );
      } catch (subErr) {
        console.error("[createUser] Failed to create default subscription for new institution:", subErr);
      }
    }

    if (targetInstitutionId && role) {
      await client.query(
        `
          INSERT INTO institution_memberships (institution_id, user_id, role_id, is_active, status, is_current)
          VALUES ($1, $2, $3, TRUE, 'ACTIVE', TRUE)
          ON CONFLICT (institution_id, user_id, role_id)
          WHERE is_active = TRUE
          DO UPDATE SET is_active = TRUE, status = 'ACTIVE', is_current = TRUE, updated_at = NOW()
        `,
        [targetInstitutionId, user.id!, role.id]
      );
      if (isInstitutionAdmin) {
        await insertUserRole(client, user.id!, role.id).catch(() => {});
      }
    } else if (role) {
      await insertUserRole(client, user.id!, role.id);
    }

    await createPublicRegisteredUserProfile(client, user.id!, {
      roleCode: role?.code ?? null,
      designationId: data.designation_id ?? null,
      isTeacher: data.is_teacher,
      teacherType: role?.code === "teacher" ? "institute_teacher" : data.teacher_type ?? null,
      underInstitutionId: targetInstitutionId,
    });

    await client.query("COMMIT");
    return user;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  return getUserByEmailQuery(db, email);
};
