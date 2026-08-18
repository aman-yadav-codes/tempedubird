import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { cancelScheduledJobsByIds, listScheduledJobs } from "@/lib/scheduled-jobs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const jobs = await listScheduledJobs();

    const institutionIds = new Set(
      user.memberships?.map((membership) => membership.institution_id) ?? [],
    );
    const canSeePlatformJobs = isPlatformAdminUser(user);

    const data = jobs.filter((job) => {
      if (canSeePlatformJobs) return true;
      if (job.scope_type === "platform") return canSeePlatformJobs;
      return job.institution_id ? institutionIds.has(job.institution_id) : canSeePlatformJobs;
    });

    return NextResponse.json({ data });
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
      return NextResponse.json({ error: "Only platform admin can update cron jobs." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const action = typeof body?.action === "string" ? body.action : "";
    const ids = Array.isArray(body?.ids) ? body.ids.map(Number) : [];

    if (action !== "cancel") {
      return NextResponse.json({ error: "Unsupported cron job action." }, { status: 400 });
    }

    const updated = await cancelScheduledJobsByIds(ids);
    return NextResponse.json({ updated, data: await listScheduledJobs() });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Unauthorized" || message === "User not found" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
