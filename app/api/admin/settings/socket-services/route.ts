import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import {
  checkSocketServerHealth,
  getSocketServerSettings,
  toPublicSocketServerSettings,
  updateSocketServerSettings,
} from "@/lib/socket-server-settings";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Only platform admin can manage socket services." }, { status: 403 });
    }

    const settings = await getSocketServerSettings();
    const health = await checkSocketServerHealth(settings);

    return NextResponse.json({
      data: {
        settings: toPublicSocketServerSettings(settings),
        health,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Unauthorized" || message === "User not found" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Only platform admin can manage socket services." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const settings = await updateSocketServerSettings(body, user.id);
    const health = await checkSocketServerHealth(settings);

    return NextResponse.json({
      data: {
        settings: toPublicSocketServerSettings(settings),
        health,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Unauthorized" || message === "User not found" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
