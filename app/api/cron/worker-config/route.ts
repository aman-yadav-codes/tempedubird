import { NextResponse } from "next/server";

import { getCronWorkerSettings, isCronWorkerRequestAuthorized } from "@/lib/cron-worker-settings";

export async function GET(req: Request) {
  if (!(await isCronWorkerRequestAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getCronWorkerSettings();

  return NextResponse.json({
    data: {
      ...settings,
      secret: settings.secret || process.env.CRON_SECRET || "",
    },
  });
}
