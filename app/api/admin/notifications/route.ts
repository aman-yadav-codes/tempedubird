import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db/db";
import { NotificationService } from "@/services/notificationService";

function getStatus(message: string) {
  if (message.includes("Forbidden")) return 403;
  if (message === "Unauthorized" || message === "User not found") return 401;
  return 500;
}

type AccessTokenPayload = {
  id?: number;
  sub?: string;
  typ?: string;
};

function getNotificationUserId(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) throw new Error("Unauthorized");

  const token = authHeader.split(" ").pop();
  if (!token) throw new Error("Unauthorized");

  const decoded = verifyToken(token) as AccessTokenPayload;
  const userId = decoded.id ?? Number(decoded.sub);
  if (decoded.typ && decoded.typ !== "access") throw new Error("Unauthorized");
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("Unauthorized");

  return userId;
}

export async function GET(req: Request) {
  try {
    const userId = getNotificationUserId(req);
    const url = new URL(req.url);
    const rawLimit = Number(url.searchParams.get("limit") ?? 10);
    const rawPage = Number(url.searchParams.get("page") ?? 1);
    const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 10;
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const offset = (page - 1) * limit;
    const unreadOnly = url.searchParams.get("unread_only") === "true";
    const importantOnly = url.searchParams.get("important_only") === "true";
    const notificationService = new NotificationService(db);
    const data = await notificationService.listForUser(userId, limit, {
      offset,
      unreadOnly,
      importantOnly,
    });
    if (!data.userExists) throw new Error("User not found");

    return NextResponse.json({
      data: data.items,
      total: data.total,
      pageCount: Math.ceil(data.total / limit),
      unreadCount: data.unreadCount,
      importantCount: data.importantCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load notifications";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const body = await req.json();

    if (body?.action === "mark_all_read") {
      const notificationService = new NotificationService(db);
      await notificationService.markAllRead(currentUser.id);
      return NextResponse.json({ ok: true });
    }

    if (body?.action === "mark_read") {
      const notificationId = Number(body.notification_id);
      if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return NextResponse.json({ error: "notification_id is required" }, { status: 400 });
      }

      const notificationService = new NotificationService(db);
      await notificationService.markRead(currentUser.id, notificationId);
      return NextResponse.json({ ok: true });
    }

    if (body?.action === "set_important") {
      const notificationId = Number(body.notification_id);
      if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return NextResponse.json({ error: "notification_id is required" }, { status: 400 });
      }
      if (typeof body.is_important !== "boolean") {
        return NextResponse.json({ error: "is_important must be a boolean" }, { status: 400 });
      }

      const notificationService = new NotificationService(db);
      await notificationService.setImportant(currentUser.id, notificationId, body.is_important);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported notification action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update notification";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}
