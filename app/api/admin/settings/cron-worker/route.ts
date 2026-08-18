import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import {
  getCronWorkerHeartbeat,
  getCronWorkerSettings,
  toPublicCronWorkerSettings,
  updateCronWorkerSettings,
} from "@/lib/cron-worker-settings";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Only platform admin can manage cron worker settings." }, { status: 403 });
    }

    const settings = await getCronWorkerSettings();
    const heartbeat = await getCronWorkerHeartbeat();

    return NextResponse.json({
      data: {
        settings: toPublicCronWorkerSettings(settings),
        heartbeat,
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
      return NextResponse.json({ error: "Only platform admin can manage cron worker settings." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const settings = await updateCronWorkerSettings(body, user.id);

    return NextResponse.json({
      data: {
        settings: toPublicCronWorkerSettings(settings),
        heartbeat: await getCronWorkerHeartbeat(),
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Unauthorized" || message === "User not found" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
