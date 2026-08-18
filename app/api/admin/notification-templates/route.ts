import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  deleteNotificationTemplates,
  listNotificationTemplates,
  updateNotificationTemplate,
} from "@/lib/queries/notifications";

function getStatus(message: string) {
  if (message.includes("Forbidden")) return 403;
  if (message === "Unauthorized" || message === "User not found") return 401;
  return 400;
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const templates = await listNotificationTemplates(db);

    return NextResponse.json({ data: templates });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load notification templates";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const ids = Array.isArray(body?.ids)
      ? body.ids.map(Number).filter((id: number) => Number.isInteger(id) && id > 0)
      : [];

    if (!ids.length) {
      return NextResponse.json({ error: "ids are required" }, { status: 400 });
    }

    if (typeof body?.is_active !== "boolean") {
      return NextResponse.json({ error: "is_active must be a boolean" }, { status: 400 });
    }

    const updated = await Promise.all(
      ids.map((id: number) =>
        updateNotificationTemplate(db, id, { is_active: body.is_active })
      )
    );

    return NextResponse.json({ data: updated.filter(Boolean) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update notification templates";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const ids = Array.isArray(body?.ids)
      ? body.ids.map(Number).filter((id: number) => Number.isInteger(id) && id > 0)
      : [];

    if (!ids.length) {
      return NextResponse.json({ error: "ids are required" }, { status: 400 });
    }

    const deletedCount = await deleteNotificationTemplates(db, ids);
    return NextResponse.json({ deletedCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete notification templates";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}
