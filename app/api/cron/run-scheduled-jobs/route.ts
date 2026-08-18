import { NextResponse } from "next/server";

import { getCronWorkerSettings, isCronWorkerRequestAuthorized } from "@/lib/cron-worker-settings";
import { runDueScheduledJobs, runRecurringExpenseReminderSweep } from "@/lib/scheduled-jobs";

export async function GET(req: Request) {
  if (!(await isCronWorkerRequestAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getCronWorkerSettings();
  if (!settings.enabled) {
    return NextResponse.json({
      disabled: true,
      processed: 0,
      results: [],
    });
  }

  const results = await runDueScheduledJobs();
  const recurringExpenseReminders = await runRecurringExpenseReminderSweep();
  return NextResponse.json({
    processed: results.length + recurringExpenseReminders.length,
    results,
    recurringExpenseReminders,
  });
}
