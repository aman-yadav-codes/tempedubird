import { NextResponse } from "next/server";

import { isCronWorkerRequestAuthorized, upsertCronWorkerHeartbeat } from "@/lib/cron-worker-settings";

export async function POST(req: Request) {
  if (!(await isCronWorkerRequestAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const heartbeat = await upsertCronWorkerHeartbeat(body);

  return NextResponse.json({ data: heartbeat });
}
