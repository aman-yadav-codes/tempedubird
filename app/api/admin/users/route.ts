import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireAdmin } from "@/lib/auth/auth";
import {
  assertTeachingSubjectsMatchInstitutionBoard,
  createAdminUserWithDetails,
  getOrCreateEduBirdInstitution,
  getUsersPaginatedQuery,
  removeUserFromInstitutions,
  softDeleteAdminUser,
} from "@/lib/queries/user";
import { db } from "@/lib/db/db";
import { adminCreateUserSchema, type AdminCreateUserInput } from "@/lib/validations";
import {
  assertCanAccessUserWithinInstitutionScope,
  canAccessInstitution,
  getAllowedInstitutionIds,
  getRequestedInstitutionId,
  getScopedInstitutionIds,
  getUserInstitutionIds,
} from "@/lib/auth/institution-scope";
import { getStaffPermissionModule, hasPermission, isPlatformAdminUser, type PermissionUser } from "@/lib/auth/permissions";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function getErrorCode(err: unknown) {
  if (!err || typeof err !== "object" || !("code" in err)) return undefined;

  return String((err as { code?: unknown }).code);
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
    [roleId]
  );

  return result.rows[0] ?? null;
}

function roleAllowsDesignation(roleCode: string | null | undefined, isPlatformActor = false) {
  return (
    roleCode === "institution_admin" ||
    roleCode === "teacher" ||
    isPlatformActor ||
    !roleCode ||
    roleCode === "administrative_staff" ||
    roleCode === "staff" ||
    roleCode === "faculty"
  );
}

function getProfileRoleError(
  data: AdminCreateUserInput,
  roleCode: string | null | undefined,
  isPlatformActor = false
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

  if (data.profile.designation_id && !roleAllowsDesignation(roleCode, isPlatformActor)) {
    return "Designation is only allowed for Institution Admin, Teacher, or Platform Staff role";
  }

  if (roleCode === "institution_admin" && !data.profile.designation_id) {
    return "Select a designation for this role";
  }

  return null;
}

function normalizeRoleProfile(
  data: AdminCreateUserInput,
  roleMeta: { code: string; scope_code: string | null } | null
): AdminCreateUserInput {
  const roleCode = roleMeta?.code;
  const isTeacher = roleCode === "teacher";
  const isPlatformScopedRole = roleMeta?.scope_code === "platform";
  const institutionIds = Array.from(
    new Set(
      [
        ...(data.profile.institution_ids ?? []),
        ...(data.profile.under_institution_id ? [data.profile.under_institution_id] : []),
      ].filter((id) => Number.isInteger(id) && id > 0)
    )
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
      under_institution_id: isPlatformScopedRole ? null : scopedInstitutionIds[0] ?? null,
      designation_id: roleAllowsDesignation(roleCode) ? data.profile.designation_id ?? null : null,
    },
  };
}

function getTargetInstitutionIds(data: AdminCreateUserInput) {
  return Array.from(
    new Set(
      [
        ...(data.profile.institution_ids ?? []),
        ...(data.profile.under_institution_id ? [data.profile.under_institution_id] : []),
      ].filter((id) => Number.isInteger(id) && id > 0)
    )
  );
}

function getRoleAssignmentError(
  currentUser: PermissionUser,
  roleMeta: { code: string; scope_code: string | null } | null
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

function parseBulkIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
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
    [userId]
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
    [userId]
  );

  return result.rows.map((row) => row.code);
}

async function getTargetPermissionModule(userId: number) {
  if (await isStudentUser(userId)) return "managestudents.allstudents";

  const roleCodes = await getTargetRoleCodes(userId);
  for (const roleCode of roleCodes) {
    const module = getStaffPermissionModule(roleCode);
    if (module) return module;
  }

  return "users.allusers";
}

async function getTargetPermission(action: "edit" | "delete", targetUserId: number) {
  const permissionModule = await getTargetPermissionModule(targetUserId);
  return `${permissionModule}.${action}`;
}

function getCreatePermissionModule(roleCode: string | null | undefined) {
  if (roleCode === "student") return "managestudents.allstudents";
  return getStaffPermissionModule(roleCode ?? "") ?? "users.allusers";
}

function canCreateRoleInTargetInstitutions(
  currentUser: Awaited<ReturnType<typeof requireAdmin>>,
  roleCode: string | null | undefined,
  targetInstitutionIds: number[]
) {
  if (isPlatformAdminUser(currentUser)) return true;

  const isGuardianOrParent =
    currentUser.role_codes.includes("guardian") ||
    currentUser.role_codes.includes("parent") ||
    currentUser.roles?.includes("Guardian") ||
    currentUser.roles?.includes("Parent");

  if (roleCode === "student" && isGuardianOrParent) {
    return true;
  }

  const requiredModule = getCreatePermissionModule(roleCode);
  const requiredPermission = `${requiredModule}.create`;

  if (!targetInstitutionIds.length) {
    return (
      hasPermission(currentUser, requiredPermission) ||
      hasPermission(currentUser, "managestaff.allstaff.create")
    );
  }

  return targetInstitutionIds.every(
    (institutionId) =>
      hasPermission(currentUser, requiredPermission, { institutionId }) ||
      hasPermission(currentUser, "managestaff.allstaff.create", { institutionId })
  );
}

async function assertCanBulkManageUser(
  currentUser: Awaited<ReturnType<typeof requireAdmin>>,
  targetUserId: number,
  action: "edit" | "delete"
) {
  await assertCanAccessUserWithinInstitutionScope(db, currentUser, targetUserId);

  const permission = await getTargetPermission(action, targetUserId);
  const targetInstitutionIds = await getUserInstitutionIds(db, targetUserId);
  const allowed =
    targetInstitutionIds.length > 0
      ? targetInstitutionIds.some((institutionId) =>
          hasPermission(currentUser, permission, { institutionId })
        )
      : hasPermission(currentUser, permission);

  if (!allowed) {
    throw new Error("Forbidden: Admin access required");
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 10;
    const offset = (page - 1) * limit;
    const search = url.searchParams.get("search")?.trim() || null;
    const institutionId = getRequestedInstitutionId(url.searchParams);
    const roleId = url.searchParams.get("roleId") ? Number(url.searchParams.get("roleId")) : null;
    const roleCode = url.searchParams.get("roleCode")?.trim() || null;
    const roleCodes = url.searchParams
      .get("roleCodes")
      ?.split(",")
      .map((code) => code.trim())
      .filter(Boolean) ?? null;
    const status = url.searchParams.get("status");
    const isActive =
      status === "active" ? true :
        status === "inactive" ? false :
          null;
    const includeCurrentUser = url.searchParams.get("includeCurrentUser") === "true";
    const includePlatformAdmins = url.searchParams.get("includePlatformAdmins") === "true";
    const rawStaffScope = url.searchParams.get("staffScope");
    const staffScope =
      rawStaffScope === "teacher_driver"
        ? "teacher_driver"
        : rawStaffScope === "institution_staff"
          ? "institution_staff"
          : rawStaffScope === "all"
            ? "all"
            : null;

    const currentUser = await requireAdmin(req);
    if (institutionId && !canAccessInstitution(currentUser, institutionId)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { users, totalCount } = await getUsersPaginatedQuery(
      db,
      currentUser.id,
      limit,
      offset,
      getScopedInstitutionIds(currentUser, institutionId),
      {
        search,
        institutionId,
        roleId,
        roleCode,
        roleCodes,
        isActive,
        includeCurrentUser,
        includePlatformAdmins,
        staffScope,
      }
    );

    return NextResponse.json({
      data: users,
      pageCount: Math.ceil(totalCount / limit),
      total: totalCount
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

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const staffRole = url.searchParams.get("staffRole")?.trim() || null;
    const currentUser = await getAuthenticatedUser(req);
    const body = await req.json();

    const parsed = adminCreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    let roleMeta = await getRoleMeta(parsed.data.role_id ?? null);
    if (!roleMeta && parsed.data.role_id) {
      // Check if role_id refers to a designation in designations table
      const desigRes = await db.query<{ id: number; name: string; slug: string }>(
        `SELECT id, name, slug FROM designations WHERE id = $1 LIMIT 1`,
        [parsed.data.role_id]
      ).catch(() => ({ rows: [] }));
      if (desigRes.rows[0]) {
        parsed.data.profile.designation_id = desigRes.rows[0].id;
        // Assign default staff/administrative_staff role for this designation
        const staffRoleRes = await db.query<{ id: number; code: string; scope_code: string | null }>(
          `SELECT r.id, r.code, st.code AS scope_code
           FROM roles r
           LEFT JOIN scope_types st ON st.id = r.scope_id
           WHERE r.code IN ('administrative_staff', 'staff', 'faculty')
           ORDER BY CASE WHEN r.code = 'administrative_staff' THEN 1 ELSE 2 END
           LIMIT 1`
        ).catch(() => ({ rows: [] }));
        if (staffRoleRes.rows[0]) {
          parsed.data.role_id = staffRoleRes.rows[0].id;
          roleMeta = staffRoleRes.rows[0];
        }
      }
    }

    if (!roleMeta) {
      const defaultStudentRoleRes = await db.query<{ id: number; code: string; scope_code: string | null }>(
        `SELECT r.id, r.code, st.code AS scope_code
         FROM roles r
         LEFT JOIN scope_types st ON st.id = r.scope_id
         WHERE r.code = 'student' OR r.name ILIKE '%student%'
         LIMIT 1`
      );
      if (defaultStudentRoleRes.rows[0]) {
        parsed.data.role_id = defaultStudentRoleRes.rows[0].id;
        roleMeta = defaultStudentRoleRes.rows[0];
      }
    }

    if (staffRole && roleMeta?.code !== staffRole) {
      return NextResponse.json(
        { error: `This endpoint can only create ${staffRole} profiles` },
        { status: 403 }
      );
    }

    const isGuardianOrParent =
      Boolean(currentUser.role_codes?.some((c) => c.toLowerCase().includes("parent") || c.toLowerCase().includes("guardian"))) ||
      Boolean(currentUser.roles?.some((r) => r.toLowerCase().includes("parent") || r.toLowerCase().includes("guardian")));

    const isGuardianCreatingStudent =
      isGuardianOrParent && (roleMeta?.code === "student" || !roleMeta);

    const roleAssignmentError = getRoleAssignmentError(currentUser, roleMeta);
    if (roleAssignmentError) {
      return NextResponse.json({ error: roleAssignmentError }, { status: 403 });
    }

    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const profileRoleError = getProfileRoleError(parsed.data, roleMeta?.code, isPlatformAdmin);
    if (profileRoleError) {
      return NextResponse.json({ error: profileRoleError }, { status: 422 });
    }

    const userData = normalizeRoleProfile(parsed.data, roleMeta);
    const allowedInstitutionIds = getAllowedInstitutionIds(currentUser);
    let targetInstitutionIds = getTargetInstitutionIds(userData);

    if (
      targetInstitutionIds.length === 0 &&
      allowedInstitutionIds &&
      allowedInstitutionIds.length > 0 &&
      roleMeta?.scope_code === "institution"
    ) {
      userData.profile.under_institution_id = allowedInstitutionIds[0];
      userData.profile.institution_ids = [allowedInstitutionIds[0]];
      targetInstitutionIds = [allowedInstitutionIds[0]];
    }

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

    if (!isGuardianCreatingStudent && !canCreateRoleInTargetInstitutions(currentUser, roleMeta?.code, targetInstitutionIds)) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }
    if (allowedInstitutionIds && !isGuardianCreatingStudent) {
      if (
        roleMeta?.scope_code !== "institution" ||
        targetInstitutionIds.length === 0 ||
        !targetInstitutionIds.every((institutionId) => canAccessInstitution(currentUser, institutionId))
      ) {
        return NextResponse.json(
          { error: "Forbidden: Admin access required" },
          { status: 403 }
        );
      }
    }
    await assertTeachingSubjectsMatchInstitutionBoard(
      db,
      userData.profile.under_institution_id,
      userData.teaching_subjects
    );

    const user = await createAdminUserWithDetails(db, userData, currentUser.id);

    if (isGuardianCreatingStudent) {
      try {
        const sp = await db.query<{ id: number }>(
          `INSERT INTO student_profiles (user_id, created_by, updated_by, created_at, updated_at)
           VALUES ($1, $2, $2, NOW(), NOW())
           ON CONFLICT (user_id) DO UPDATE SET updated_by = EXCLUDED.updated_by
           RETURNING id`,
          [user.id, currentUser.id]
        );
        if (sp.rows[0]) {
          const checkGuardian = await db.query<{ id: number }>(
            `SELECT id FROM student_guardians WHERE student_id = $1 AND guardian_user_id = $2 LIMIT 1`,
            [sp.rows[0].id, currentUser.id]
          );
          if (checkGuardian.rows[0]) {
            await db.query(
              `UPDATE student_guardians SET is_deleted = FALSE, deleted_at = NULL, updated_at = NOW() WHERE id = $1`,
              [checkGuardian.rows[0].id]
            );
          } else {
            await db.query(
              `INSERT INTO student_guardians (student_id, guardian_user_id, relationship, is_primary, is_deleted)
               VALUES ($1, $2, 'Parent', TRUE, FALSE)`,
              [sp.rows[0].id, currentUser.id]
            );
          }
        }
      } catch (linkErr) {
        console.error("Auto linking guardian student error:", linkErr);
      }
    }

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (err: unknown) {
    const message = getErrorMessage(err);

    if (getErrorCode(err) === "23505") {
      return NextResponse.json(
        { error: "A user with that email already exists" },
        { status: 409 }
      );
    }

    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const ids = parseBulkIds(body?.ids);
    const isActive = body?.isActive;

    if (!ids.length) {
      return NextResponse.json({ error: "Select at least one user" }, { status: 400 });
    }
    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Invalid status value" }, { status: 422 });
    }
    if (!isActive && ids.includes(currentUser.id)) {
      return NextResponse.json({ error: "You cannot disable your own account" }, { status: 400 });
    }

    for (const id of ids) {
      await assertCanBulkManageUser(currentUser, id, "edit");
    }

    const result = await db.query<{ id: number }>(
      `
        UPDATE users
        SET
          is_active = $1,
          updated_by = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($3::int[])
          AND COALESCE(is_deleted, FALSE) = FALSE
        RETURNING id
      `,
      [isActive, currentUser.id, ids]
    );

    return NextResponse.json({
      data: {
        ids: result.rows.map((row) => row.id),
        isActive,
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

export async function DELETE(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const ids = parseBulkIds(body?.ids);

    if (!ids.length) {
      return NextResponse.json({ error: "Select at least one user" }, { status: 400 });
    }
    if (ids.includes(currentUser.id)) {
      return NextResponse.json({ error: "You cannot remove your own account" }, { status: 400 });
    }

    for (const id of ids) {
      await assertCanBulkManageUser(currentUser, id, "delete");
    }

    const allowedInstitutionIds = getAllowedInstitutionIds(currentUser);
    if (!allowedInstitutionIds) {
      const deletedIds: number[] = [];
      for (const id of ids) {
        const deleted = await softDeleteAdminUser(db, id, currentUser.id);
        if (deleted) deletedIds.push(deleted.id);
      }

      return NextResponse.json({
        data: {
          ids: deletedIds,
          action: "soft_deleted",
        },
      });
    }

    const removedIds: number[] = [];
    const institutionIds = new Set<number>();
    for (const id of ids) {
      const removal = await removeUserFromInstitutions(db, id, allowedInstitutionIds);
      if (removal.removed) {
        removedIds.push(id);
        removal.affectedInstitutionIds.forEach((institutionId) => institutionIds.add(institutionId));
      }
    }

    return NextResponse.json({
      data: {
        ids: removedIds,
        action: "removed_from_institution",
        institution_ids: Array.from(institutionIds),
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
