import Link from "next/link";
import { ArrowLeft, ArrowRight, Megaphone } from "lucide-react";

import { db } from "@/lib/db/db";
import { listHelpRecentUpdates } from "@/lib/queries/help-center";

export default async function HelpRecentUpdatesPage() {
  const updates = await listHelpRecentUpdates(db, { limit: 100 });

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full max-w-none space-y-6">
        <Link href="/help" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Help Center
        </Link>

        <section className="rounded-lg border bg-card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-500">
              <Megaphone className="size-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Recent Updates</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Latest EduBird Help Center notes, workflow updates, and documentation changes.
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border bg-card">
          {updates.map((update) => (
            <Link
              key={update.id}
              href={update.href || "/help/recent-updates"}
              className="group flex items-start gap-4 border-b p-5 transition last:border-b-0 hover:bg-muted/50"
            >
              <span className="mt-2 size-2 rounded-full bg-red-500" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{update.title}</span>
                  <span className="text-xs text-muted-foreground">{formatUpdateDate(update.update_date)}</span>
                </span>
                {update.description ? (
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">{update.description}</span>
                ) : null}
              </span>
              <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-red-500" />
            </Link>
          ))}
          {!updates.length ? (
            <div className="p-8 text-sm text-muted-foreground">No recent updates are published yet.</div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function formatUpdateDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
