import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  listNotificationPreferences,
  updateNotificationPreference,
} from "@/lib/queries/notifications";

function getStatus(message: string) {
  if (message.includes("Forbidden")) return 403;
  if (message === "Unauthorized" || message === "User not found") return 401;
  return 500;
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const preferences = await listNotificationPreferences(db, currentUser.id);

    return NextResponse.json({ data: preferences });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load notification preferences";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const body = await req.json();
    const notificationType = String(body?.notification_type ?? "").trim();

    if (!notificationType) {
      return NextResponse.json({ error: "notification_type is required" }, { status: 400 });
    }

    if (typeof body?.is_enabled !== "boolean") {
      return NextResponse.json({ error: "is_enabled must be a boolean" }, { status: 400 });
    }

    const preference = await updateNotificationPreference(
      db,
      currentUser.id,
      notificationType,
      body.is_enabled
    );

    return NextResponse.json({ data: preference });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update notification preference";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}
