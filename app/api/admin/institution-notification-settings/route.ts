import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import {
  assertCanAccessInstitution,
  getAllowedInstitutionIds,
} from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import {
  clearInstitutionNotificationSettings,
  listInstitutionNotificationSettings,
  replaceInstitutionNotificationSettings,
  setAllInstitutionNotificationSettings,
  updateInstitutionNotificationSetting,
} from "@/lib/queries/notifications";

function getStatus(message: string) {
  if (message.includes("Forbidden")) return 403;
  if (message === "Unauthorized" || message === "User not found") return 401;
  return 400;
}

function assertCanManageNotificationControls(currentUser: Awaited<ReturnType<typeof requireAdmin>>) {
  if (
    currentUser.role_codes.includes("platform_admin") ||
    currentUser.role_codes.includes("institution_admin")
  ) {
    return;
  }

  throw new Error("Forbidden: Institution admin access required");
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    assertCanManageNotificationControls(currentUser);
    const allowedInstitutionIds = getAllowedInstitutionIds(currentUser);
    const requestedInstitutionId = Number(new URL(req.url).searchParams.get("institution_id"));
    const scopedInstitutionIds =
      Number.isInteger(requestedInstitutionId) && requestedInstitutionId > 0
        ? [requestedInstitutionId]
        : allowedInstitutionIds;

    if (requestedInstitutionId) {
      assertCanAccessInstitution(currentUser, requestedInstitutionId);
    }

    const settings = await listInstitutionNotificationSettings(db, scopedInstitutionIds);
    return NextResponse.json({ data: settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load institution notification settings";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    assertCanManageNotificationControls(currentUser);
    const body = await req.json();
    const institutionIds = Array.isArray(body?.institution_ids)
      ? body.institution_ids.map(Number).filter((id: number) => Number.isInteger(id) && id > 0)
      : [];
    const action = typeof body?.action === "string" ? body.action : null;

    if (institutionIds.length && action) {
      institutionIds.forEach((id: number) => assertCanAccessInstitution(currentUser, id));

      if (action === "enable_all") {
        await setAllInstitutionNotificationSettings(db, institutionIds, true);
        return NextResponse.json({ ok: true });
      }

      if (action === "disable_all") {
        await setAllInstitutionNotificationSettings(db, institutionIds, false);
        return NextResponse.json({ ok: true });
      }

      if (action === "clear_types") {
        await clearInstitutionNotificationSettings(db, institutionIds);
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ error: "Unsupported bulk action" }, { status: 400 });
    }

    const institutionId = Number(body?.institution_id);
    const notificationType = String(body?.notification_type ?? "").trim();

    if (!Number.isInteger(institutionId) || institutionId <= 0) {
      return NextResponse.json({ error: "institution_id is required" }, { status: 400 });
    }

    if (Array.isArray(body?.enabled_types)) {
      assertCanAccessInstitution(currentUser, institutionId);
      const enabledTypes = body.enabled_types.filter(
        (value: unknown): value is string => typeof value === "string" && value.trim().length > 0
      );
      await replaceInstitutionNotificationSettings(db, institutionId, enabledTypes);
      return NextResponse.json({ ok: true });
    }

    if (!notificationType) {
      return NextResponse.json({ error: "notification_type is required" }, { status: 400 });
    }

    if (typeof body?.is_enabled !== "boolean") {
      return NextResponse.json({ error: "is_enabled must be a boolean" }, { status: 400 });
    }

    assertCanAccessInstitution(currentUser, institutionId);
    const setting = await updateInstitutionNotificationSetting(
      db,
      institutionId,
      notificationType,
      body.is_enabled
    );

    return NextResponse.json({ data: setting });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update institution notification setting";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}
