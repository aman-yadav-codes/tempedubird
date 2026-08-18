import type { Pool } from "pg";

import { getAllowedInstitutionIds } from "@/lib/auth/institution-scope";
import type { PermissionUser } from "@/lib/auth/permissions";
import { NotificationService } from "@/services/notificationService";

type InstitutionSummary = {
  id: number;
  name: string;
};

type UserSummary = {
  id: number;
  full_name: string;
};

type UserInstitutionSummary = {
  institution_id: number;
  institution_name: string;
};

// Notification event codes follow:
// rootDropdown.module.action
// Examples: users.module.update, institutions.module.update, institutions.profile.activate.
// Keep notification event codes separate from page permission codes such as users.all.view.
function uniqueIds(ids: Array<number | null | undefined>) {
  return Array.from(
    new Set(
      ids
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );
}

function isPlatformActor(actor: PermissionUser) {
  return actor.role_codes.includes("platform_admin") || actor.permissions.length > 0;
}

async function getInstitutionSummary(db: Pool, institutionId: number) {
  const result = await db.query<InstitutionSummary>(
    `SELECT id, name
     FROM institution_profiles
     WHERE id = $1
       AND COALESCE(is_deleted, FALSE) = FALSE
     LIMIT 1`,
    [institutionId]
  );

  return result.rows[0] ?? null;
}

async function getUserSummary(db: Pool, userId: number) {
  const result = await db.query<UserSummary>(
    `SELECT
        u.id,
        u.full_name
     FROM users u
     WHERE u.id = $1
       AND COALESCE(u.is_deleted, FALSE) = FALSE
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

async function getUserInstitutions(db: Pool, userId: number) {
  const result = await db.query<UserInstitutionSummary>(
    `SELECT DISTINCT institution_id, institution_name
     FROM (
       SELECT im.institution_id, ip.name AS institution_name
       FROM institution_memberships im
       INNER JOIN institution_profiles ip ON ip.id = im.institution_id
       WHERE im.user_id = $1
         AND im.is_active = TRUE
         AND COALESCE(ip.is_deleted, FALSE) = FALSE
       UNION
       SELECT up.under_institution_id AS institution_id, ip.name AS institution_name
       FROM user_profiles up
       INNER JOIN institution_profiles ip ON ip.id = up.under_institution_id
       WHERE up.user_id = $1
         AND up.under_institution_id IS NOT NULL
         AND COALESCE(ip.is_deleted, FALSE) = FALSE
     ) user_institutions
     WHERE institution_id IS NOT NULL
     ORDER BY institution_name`,
    [userId]
  );

  return result.rows;
}

function scopeUserInstitutions(
  actor: PermissionUser,
  institutions: UserInstitutionSummary[]
) {
  const allowedInstitutionIds = getAllowedInstitutionIds(actor);
  if (!allowedInstitutionIds) return institutions;

  const allowedSet = new Set(allowedInstitutionIds);
  return institutions.filter((institution) =>
    allowedSet.has(institution.institution_id)
  );
}

async function getInstitutionAdminIds(db: Pool, institutionId: number) {
  const result = await db.query<{ user_id: number }>(
    `SELECT DISTINCT im.user_id
     FROM institution_memberships im
     INNER JOIN roles r ON r.id = im.role_id
     INNER JOIN users u ON u.id = im.user_id
     WHERE im.institution_id = $1
       AND im.is_active = TRUE
       AND r.code = 'institution_admin'
       AND u.is_active = TRUE
       AND COALESCE(u.is_deleted, FALSE) = FALSE`,
    [institutionId]
  );

  return result.rows.map((row) => row.user_id);
}

export async function notifyInstitutionStatusChanged(
  db: Pool,
  input: {
    actor: PermissionUser;
    institutionId: number;
    isActive: boolean;
  }
) {
  const institution = await getInstitutionSummary(db, input.institutionId);
  if (!institution) return;

  const recipients = await getInstitutionAdminIds(db, input.institutionId);
  await new NotificationService(db).create({
    type: input.isActive
      ? "institutions.profile.activate"
      : "institutions.profile.deactivate",
    recipients,
    institutionId: input.institutionId,
    entityType: "institution",
    entityId: input.institutionId,
    createdBy: input.actor.id,
    payload: {
      actor_name: input.actor.full_name,
      institution_name: institution.name,
      status: input.isActive ? "active" : "inactive",
      module_name: "Institution",
    },
  });
}

export async function notifyInstitutionProfileUpdated(
  db: Pool,
  input: {
    actor: PermissionUser;
    institutionId: number;
  }
) {
  const institution = await getInstitutionSummary(db, input.institutionId);
  if (!institution) return;

  const recipients = await getInstitutionAdminIds(db, input.institutionId);
  await new NotificationService(db).create({
    type: "institutions.profile.update",
    recipients,
    institutionId: input.institutionId,
    entityType: "institution",
    entityId: input.institutionId,
    createdBy: input.actor.id,
    payload: {
      actor_name: input.actor.full_name,
      institution_name: institution.name,
      module_name: "Institution profile",
    },
  });
}

export async function notifyInstitutionModuleUpdated(
  db: Pool,
  input: {
    actor: PermissionUser;
    institutionId: number;
    moduleName: string;
    entityType: string;
    entityId?: number | null;
  }
) {
  if (!isPlatformActor(input.actor)) return;
  if (!Number.isInteger(input.institutionId) || input.institutionId <= 0) return;

  const institution = await getInstitutionSummary(db, input.institutionId);
  if (!institution) return;

  const institutionAdminIds = await getInstitutionAdminIds(db, input.institutionId);
  await new NotificationService(db).create({
    type: "institutions.module.update",
    recipients: uniqueIds(institutionAdminIds),
    institutionId: input.institutionId,
    entityType: input.entityType,
    entityId: input.entityId ?? input.institutionId,
    createdBy: input.actor.id,
    payload: {
      actor_name: input.actor.full_name,
      institution_name: institution.name,
      module_name: input.moduleName,
    },
  });
}

export async function notifyAdminUserUpdated(
  db: Pool,
  input: {
    actor: PermissionUser;
    targetUserId: number;
    statusChanged?: boolean;
    isActive?: boolean;
  }
) {
  const targetUser = await getUserSummary(db, input.targetUserId);
  if (!targetUser) return;
  const targetInstitutions = scopeUserInstitutions(
    input.actor,
    await getUserInstitutions(db, input.targetUserId)
  );

  const notificationType = input.statusChanged
    ? input.isActive
      ? "users.module.activate"
      : "users.module.deactivate"
    : "users.module.update";

  const notificationService = new NotificationService(db);

  if (targetInstitutions.length) {
    for (const institution of targetInstitutions) {
      const result = await notificationService.create({
        type: notificationType,
        recipients: [targetUser.id],
        institutionId: institution.institution_id,
        entityType: "user",
        entityId: targetUser.id,
        createdBy: input.actor.id,
        payload: {
          actor_name: input.actor.full_name,
          user_name: targetUser.full_name,
          name: targetUser.full_name,
          institution_name: institution.institution_name,
          module_name: "User account",
          status: input.isActive ? "active" : "inactive",
        },
      });

      if (!result.skipped) break;
    }
  } else {
    await notificationService.create({
      type: notificationType,
      recipients: [targetUser.id],
      institutionId: null,
      entityType: "user",
      entityId: targetUser.id,
      createdBy: input.actor.id,
      payload: {
        actor_name: input.actor.full_name,
        user_name: targetUser.full_name,
        name: targetUser.full_name,
        institution_name: null,
        module_name: "User account",
        status: input.isActive ? "active" : "inactive",
      },
    });
  }

  if (isPlatformActor(input.actor)) {
    for (const institution of targetInstitutions) {
      const institutionAdminIds = await getInstitutionAdminIds(
        db,
        institution.institution_id
      );
      await notificationService.create({
        type: "institutions.module.update",
        recipients: uniqueIds(institutionAdminIds),
        institutionId: institution.institution_id,
        entityType: "user",
        entityId: targetUser.id,
        createdBy: input.actor.id,
        payload: {
          actor_name: input.actor.full_name,
          user_name: targetUser.full_name,
          name: targetUser.full_name,
          institution_name: institution.institution_name,
          module_name: "User account",
        },
      });
    }
  }
}
