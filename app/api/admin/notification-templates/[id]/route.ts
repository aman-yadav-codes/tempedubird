import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  deleteNotificationTemplates,
  updateNotificationTemplate,
} from "@/lib/queries/notifications";

const templatePatchSchema = z
  .object({
    code: z.string().trim().min(3).max(100).optional(),
    title_template: z.string().trim().min(1).optional(),
    body_template: z.string().trim().min(1).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

function getStatus(message: string) {
  if (message.includes("Forbidden")) return 403;
  if (message === "Unauthorized" || message === "User not found") return 401;
  return 400;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const templateId = Number(id);

    if (!Number.isInteger(templateId) || templateId <= 0) {
      return NextResponse.json({ error: "Invalid template id" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = templatePatchSchema.parse(body);
    const template = await updateNotificationTemplate(db, templateId, parsed);

    if (!template) {
      return NextResponse.json({ error: "Notification template not found" }, { status: 404 });
    }

    return NextResponse.json({ data: template });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update notification template";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const templateId = Number(id);

    if (!Number.isInteger(templateId) || templateId <= 0) {
      return NextResponse.json({ error: "Invalid template id" }, { status: 400 });
    }

    const deletedCount = await deleteNotificationTemplates(db, [templateId]);
    if (!deletedCount) {
      return NextResponse.json({ error: "Notification template not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete notification template";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}
