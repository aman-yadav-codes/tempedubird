import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  assertTeachingSubjectsMatchInstitutionBoard,
  getAdminUserDetails,
  getOrCreateEduBirdInstitution,
  removeUserFromInstitutions,
  softDeleteAdminUser,
  updateAdminUserWithDetails,
} from "@/lib/queries/user";
import { readStudentRecords } from "@/lib/queries/student-records";
import { canPromoteEnrollment } from "@/lib/queries/student-promotion-permissions";
import {
  adminCreateUserSchema,
  type AdminCreateUserInput,
} from "@/lib/validations";
import {
  assertCanAccessUserWithinInstitutionScope,
  canAccessInstitution,
  getAllowedInstitutionIds,
  getUserInstitutionIds,
} from "@/lib/auth/institution-scope";
import {
  hasPermission,
  getStaffPermissionModule,
  isPlatformAdminUser,
  type PermissionUser,
} from "@/lib/auth/permissions";
import { notifyAdminUserUpdated } from "@/lib/notifications/admin-events";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function getErrorCode(err: unknown) {
  if (!err || typeof err !== "object" || !("code" in err)) return undefined;

  return String((err as { code?: unknown }).code);
}

async function assertCanAccessUser(
  currentUser: PermissionUser,
  targetUserId: number,
) {
  await assertCanAccessUserWithinInstitutionScope(
    db,
    currentUser,
    targetUserId,
  );
}

async function isStudentUser(userId: number) {
  const result = await db.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM user_roles student_ur
        INNER JOIN roles student_role
          ON student_role.id = student_ur.role_id
        WHERE student_ur.user_id = $1
          AND student_role.code = 'student'
      ) OR EXISTS (
        SELECT 1
        FROM institution_memberships student_im
        INNER JOIN roles student_membership_role
          ON student_membership_role.id = student_im.role_id
        WHERE student_im.user_id = $1
          AND student_im.is_active = TRUE
          AND student_membership_role.code = 'student'
      ) AS exists
    `,
    [userId],
  );

  return Boolean(result.rows[0]?.exists);
}

async function getTargetRoleCodes(userId: number) {
  const result = await db.query<{ code: string }>(
    `
      SELECT DISTINCT role_codes.code
      FROM (
        SELECT role_by_user.code
        FROM user_roles user_role
        INNER JOIN roles role_by_user ON role_by_user.id = user_role.role_id
        WHERE user_role.user_id = $1

        UNION

        SELECT role_by_membership.code
        FROM institution_memberships membership
        INNER JOIN roles role_by_membership ON role_by_membership.id = membership.role_id
        WHERE membership.user_id = $1
          AND membership.is_active = TRUE
      ) role_codes
      WHERE role_codes.code IS NOT NULL
    `,
    [userId],
  );

  return result.rows.map((row) => row.code);
}

async function getTargetPermissionModule(userId: number) {
  if (await isStudentUser(userId)) return "managestudents.allstudents";

  const roleCodes = await getTargetRoleCodes(userId);
  for (const roleCode of roleCodes) {
    const staffModule = getStaffPermissionModule(roleCode);
    if (staffModule) return staffModule;
  }

  return "users.allusers";
}

async function getTargetPermission(method: string, targetUserId: number) {
  const permissionModule = await getTargetPermissionModule(targetUserId);
  const action =
    method === "DELETE" ? "delete" : method === "GET" ? "view" : "edit";

  return `${permissionModule}.${action}`;
}

async function hasLiveInstitutionPermission(
  currentUser: PermissionUser,
  permission: string,
  institutionId: number,
) {
  if (hasPermission(currentUser, permission, { institutionId })) return true;

  const result = await db.query<{ allowed: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM institution_memberships membership
        INNER JOIN permissions permission
          ON permission.code IN ($3, 'full_access')
        WHERE membership.user_id = $1
          AND membership.institution_id = $2
          AND membership.is_active = TRUE
          AND COALESCE(membership.is_deleted, FALSE) = FALSE
          AND (
            EXISTS (
              SELECT 1
              FROM role_permissions role_permission
              WHERE role_permission.role_id = membership.role_id
                AND role_permission.permission_id = permission.id
                AND NOT EXISTS (
                  SELECT 1
                  FROM institution_role_permission_denials denied
                  WHERE denied.institution_id = membership.institution_id
                    AND denied.role_id = membership.role_id
                    AND denied.permission_id = permission.id
                )
            )
            OR EXISTS (
              SELECT 1
              FROM institution_role_permissions override_permission
              WHERE override_permission.institution_id = membership.institution_id
                AND override_permission.role_id = membership.role_id
                AND override_permission.permission_id = permission.id
            )
            OR EXISTS (
              SELECT 1
              FROM institution_user_permissions personal_permission
              WHERE personal_permission.institution_id = membership.institution_id
                AND personal_permission.user_id = membership.user_id
                AND personal_permission.permission_id = permission.id
            )
          )
      ) AS allowed
    `,
    [currentUser.id, institutionId, permission],
  );

  return Boolean(result.rows[0]?.allowed);
}

async function requireTargetUserPermission(req: Request, targetUserId: number) {
  const currentUser = await getAuthenticatedUser(req);
  if (isPlatformAdminUser(currentUser) || currentUser.id === targetUserId) {
    return currentUser;
  }

  const permission = await getTargetPermission(req.method, targetUserId);
  const action = req.method === "DELETE" ? "delete" : req.method === "GET" ? "view" : "edit";
  const targetInstitutionIds = await getUserInstitutionIds(db, targetUserId);
  const currentInstitutionIds = getAllowedInstitutionIds(currentUser);

  const candidateInstitutionIds =
    targetInstitutionIds.length > 0
      ? targetInstitutionIds.filter((instId) => canAccessInstitution(currentUser, instId))
      : currentInstitutionIds;

  const isInstitutionAdmin = Boolean(
    currentUser.role_codes?.includes("institution_admin") ||
    currentUser.role_codes?.includes("school_owner") ||
    currentUser.role_codes?.includes("college_owner") ||
    currentUser.role_codes?.includes("university_owner") ||
    currentUser.roles?.includes("Institution Admin")
  );

  const allowed =
    isInstitutionAdmin ||
    (candidateInstitutionIds && candidateInstitutionIds.length > 0
      ? (
          await Promise.all(
            candidateInstitutionIds.map(async (institutionId) =>
              (await hasLiveInstitutionPermission(currentUser, permission, institutionId)) ||
              (await hasLiveInstitutionPermission(currentUser, `managestaff.allstaff.${action}`, institutionId)) ||
              (await hasLiveInstitutionPermission(currentUser, `managestaff.allstaff.view`, institutionId)) ||
              hasPermission(currentUser, permission, { institutionId }) ||
              hasPermission(currentUser, `managestaff.allstaff.${action}`, { institutionId }) ||
              hasPermission(currentUser, `managestaff.allstaff.view`, { institutionId }) ||
              hasPermission(currentUser, `users.allusers.${action}`, { institutionId })
            ),
          )
        ).some(Boolean)
      : hasPermission(currentUser, permission) ||
        hasPermission(currentUser, `managestaff.allstaff.${action}`) ||
        hasPermission(currentUser, `managestaff.allstaff.view`) ||
        hasPermission(currentUser, `users.allusers.${action}`));

  if (!allowed) {
    throw new Error("Forbidden: Admin access required");
  }

  return currentUser;
}

async function readStudentRecordsForActor(studentUserId: number, actor: PermissionUser) {
  const data = await readStudentRecords(studentUserId);
  const enrollments = await Promise.all(
    data.enrollments.map(async (enrollment) => {
      const normalized = {
        institution_id: Number(enrollment.institution_id),
        program_id: enrollment.program_id == null ? null : Number(enrollment.program_id),
        section_id: enrollment.section_id == null ? null : Number(enrollment.section_id),
        academic_year_id: Number(enrollment.academic_year_id),
      };
      const canPromote =
        Number.isInteger(normalized.institution_id) &&
        normalized.institution_id > 0 &&
        Number.isInteger(normalized.academic_year_id) &&
        normalized.academic_year_id > 0
          ? await canPromoteEnrollment(db, actor, normalized)
          : false;
      return { ...enrollment, can_promote: canPromote };
    }),
  );
  return {
    ...data,
    enrollments,
    enrollment: enrollments[0] ?? data.enrollment,
  };
}

async function getRoleMeta(roleId: number | null | undefined) {
  if (!roleId) return null;
  const result = await db.query<{ code: string; scope_code: string | null }>(
    `
      SELECT r.code, st.code AS scope_code
      FROM roles r
      LEFT JOIN scope_types st ON st.id = r.scope_id
      WHERE r.id = $1
      LIMIT 1
    `,
    [roleId],
  );

  return result.rows[0] ?? null;
}

function roleAllowsDesignation(roleCode: string | null | undefined) {
  return roleCode === "institution_admin" || roleCode === "teacher";
}

function getProfileRoleError(
  data: AdminCreateUserInput,
  roleCode: string | null | undefined,
) {
  const hasTeacherFields =
    data.profile.is_teacher ||
    Boolean(data.profile.teacher_type) ||
    Boolean(data.profile.hourly_charges) ||
    data.teaching_categories.length > 0 ||
    data.teaching_subjects.length > 0;

  if (roleCode !== "teacher" && hasTeacherFields) {
    return "Teacher profile fields are only allowed for Teacher role";
  }

  if (data.profile.designation_id && !roleAllowsDesignation(roleCode)) {
    return "Designation is only allowed for Institution Admin or Teacher role";
  }

  if (roleCode === "institution_admin" && !data.profile.designation_id) {
    return "Select a designation for this role";
  }

  return null;
}

function normalizeRoleProfile(
  data: AdminCreateUserInput,
  roleMeta: { code: string; scope_code: string | null } | null,
): AdminCreateUserInput {
  const roleCode = roleMeta?.code;
  const isTeacher = roleCode === "teacher";
  const isPlatformScopedRole = roleMeta?.scope_code === "platform";
  const institutionIds = Array.from(
    new Set(
      [
        ...(data.profile.institution_ids ?? []),
        ...(data.profile.under_institution_id
          ? [data.profile.under_institution_id]
          : []),
      ].filter((id) => Number.isInteger(id) && id > 0),
    ),
  );
  const scopedInstitutionIds = isPlatformScopedRole ? [] : institutionIds;

  return {
    ...data,
    teaching_categories: isTeacher ? data.teaching_categories : [],
    teaching_subjects: isTeacher ? data.teaching_subjects : [],
    profile: {
      ...data.profile,
      is_teacher: isTeacher,
      teacher_type: isTeacher ? ("institute_teacher" as const) : null,
      hourly_charges: null,
      institution_ids: scopedInstitutionIds,
      under_institution_id: isPlatformScopedRole
        ? null
        : (scopedInstitutionIds[0] ?? null),
      designation_id: roleAllowsDesignation(roleCode)
        ? (data.profile.designation_id ?? null)
        : null,
    },
  };
}

function getTargetInstitutionIds(data: AdminCreateUserInput) {
  return Array.from(
    new Set(
      [
        ...(data.profile.institution_ids ?? []),
        ...(data.profile.under_institution_id
          ? [data.profile.under_institution_id]
          : []),
      ].filter((id) => Number.isInteger(id) && id > 0),
    ),
  );
}

function getRoleAssignmentError(
  currentUser: PermissionUser,
  roleMeta: { code: string; scope_code: string | null } | null,
) {
  if (isPlatformAdminUser(currentUser)) return null;

  const isGuardianOrParent =
    Boolean(currentUser.role_codes?.some((c) => c.toLowerCase().includes("parent") || c.toLowerCase().includes("guardian"))) ||
    Boolean(currentUser.roles?.some((r) => r.toLowerCase().includes("parent") || r.toLowerCase().includes("guardian")));

  if (isGuardianOrParent) {
    if (!roleMeta || roleMeta.code === "student") return null;
  }

  if (!currentUser.role_codes.includes("institution_admin")) {
    return "Only Platform Admin or Institution Admin can manage user admin controls";
  }
  if (!roleMeta) return null;
  if (roleMeta.scope_code !== "institution") {
    return "Only Platform Admin can assign platform roles";
  }
  return null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const currentUser = await requireTargetUserPermission(req, userId);
    await assertCanAccessUser(currentUser, userId);

    const user = await getAdminUserDetails(db, userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const includeStudentRecords =
      new URL(req.url).searchParams.get("includeStudentRecords") === "true";

    if (!includeStudentRecords) {
      return NextResponse.json({ data: user });
    }

    return NextResponse.json({
      data: {
        ...user,
        student_records: await readStudentRecordsForActor(userId, currentUser),
      },
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    if (message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "Unauthorized" || message === "User not found") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const currentUser = await requireTargetUserPermission(req, userId);
    const body = await req.json();
    const parsed = adminCreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    await assertCanAccessUser(currentUser, userId);

    const roleMeta = await getRoleMeta(parsed.data.role_id ?? null);
    const isStudentManagerKeepingStudentRole =
      (await isStudentUser(userId)) && roleMeta?.code === "student";
    const roleAssignmentError = isStudentManagerKeepingStudentRole
      ? null
      : getRoleAssignmentError(currentUser, roleMeta);
    if (roleAssignmentError) {
      return NextResponse.json({ error: roleAssignmentError }, { status: 403 });
    }

    const profileRoleError = getProfileRoleError(parsed.data, roleMeta?.code);
    if (profileRoleError) {
      return NextResponse.json({ error: profileRoleError }, { status: 422 });
    }

    const userData = normalizeRoleProfile(parsed.data, roleMeta);
    let targetInstitutionIds = getTargetInstitutionIds(userData);

    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    if (
      isPlatformAdmin &&
      targetInstitutionIds.length === 0 &&
      roleMeta?.scope_code === "institution"
    ) {
      const edubird = await getOrCreateEduBirdInstitution(db);
      userData.profile.under_institution_id = edubird.id;
      userData.profile.institution_ids = [edubird.id];
      targetInstitutionIds = [edubird.id];
    }
    if (
      targetInstitutionIds.length > 0 &&
      !targetInstitutionIds.every((institutionId) =>
        canAccessInstitution(currentUser, institutionId),
      )
    ) {
      throw new Error("Forbidden: Admin access required");
    }
    await assertTeachingSubjectsMatchInstitutionBoard(
      db,
      userData.profile.under_institution_id,
      userData.teaching_subjects,
    );

    const beforeUser = await getAdminUserDetails(db, userId);

    const user = await updateAdminUserWithDetails(
      db,
      userId,
      userData,
      currentUser.id,
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await notifyAdminUserUpdated(db, {
      actor: currentUser,
      targetUserId: userId,
      statusChanged: beforeUser
        ? beforeUser.is_active !== user.is_active
        : false,
      isActive: user.is_active,
    });

    return NextResponse.json({ data: user });
  } catch (err: unknown) {
    const message = getErrorMessage(err);

    if (getErrorCode(err) === "23505") {
      return NextResponse.json(
        { error: "A user with that email already exists" },
        { status: 409 },
      );
    }

    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const currentUser = await requireTargetUserPermission(req, userId);
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: "You cannot remove your own account" },
        { status: 400 },
      );
    }

    await assertCanAccessUser(currentUser, userId);

    const allowedInstitutionIds = getAllowedInstitutionIds(currentUser);
    if (!allowedInstitutionIds) {
      const deleted = await softDeleteAdminUser(db, userId, currentUser.id);
      if (!deleted) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json({
        data: {
          id: userId,
          action: "soft_deleted",
        },
      });
    }

    const removal = await removeUserFromInstitutions(
      db,
      userId,
      allowedInstitutionIds,
    );
    if (!removal.removed) {
      return NextResponse.json(
        { error: "User is not assigned to your institution" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: {
        id: userId,
        action: "removed_from_institution",
        institution_ids: removal.affectedInstitutionIds,
      },
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    if (message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "Unauthorized" || message === "User not found") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
