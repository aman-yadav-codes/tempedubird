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

  if (data.designation_id && (!role || !designationRoleCodes.includes(role.code))) {
    throw new Error("Designation is only allowed for Institution Admin role");
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const user = await insertUser(client, {
      ...data,
      is_active: hasInstitutionClaim ? false : (data.is_active ?? true),
    });

    if (hasInstitutionClaim) {
      await client.query(
        `
          INSERT INTO institution_memberships (institution_id, user_id, role_id, is_active)
          VALUES ($1, $2, $3, TRUE)
          ON CONFLICT (institution_id, user_id, role_id)
          WHERE is_active = TRUE
          DO UPDATE SET is_active = TRUE, updated_at = NOW()
        `,
        [institutionId, user.id!, role.id]
      );
    } else if (role) {
      await insertUserRole(client, user.id!, role.id);
    }

    await createPublicRegisteredUserProfile(client, user.id!, {
      roleCode: role?.code ?? null,
      designationId: designationRoleCodes.includes(role?.code ?? "")
        ? data.designation_id ?? null
        : null,
      isTeacher: data.is_teacher,
      teacherType: role?.code === "teacher" ? "institute_teacher" : data.teacher_type ?? null,
      underInstitutionId: institutionId,
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
