"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Command, FileText, Flame, Megaphone, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { helpIcons, quickTopics } from "@/components/help/help-content";
import type { HelpArticleRow, HelpCategoryRow, HelpRecentUpdateRow } from "@/lib/queries/help-center";

type HelpHomeProps = {
  categories: HelpCategoryRow[];
  articles: HelpArticleRow[];
  recentUpdates: HelpRecentUpdateRow[];
};

export function HelpHome({ categories, articles, recentUpdates }: HelpHomeProps) {
  const [query, setQuery] = useState("");
  const featuredArticles = useMemo(
    () => articles.filter((article) => article.is_featured).slice(0, 6),
    [articles]
  );
  const filtered = query.trim()
    ? [
        ...categories.map((category) => ({
          title: category.name,
          description: category.description ?? "Browse help category.",
          href: `/help/${category.slug}`,
          badge: "Category",
          icon: category.icon ?? "docs",
        })),
        ...articles.map((article) => ({
          title: article.title,
          description: article.summary ?? article.category_name ?? "Help article",
          href: article.category_slug ? `/help/${article.category_slug}/${article.slug}` : `/help/${article.slug}`,
          badge: "Article",
          icon: "docs",
        })),
      ]
        .filter((entry) =>
          `${entry.title} ${entry.description}`.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8)
    : [];

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full max-w-none space-y-8">
        <section className="relative overflow-hidden rounded-lg border bg-card p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(239,68,68,0.10),transparent_34%)] dark:bg-[radial-gradient(circle_at_20%_0%,rgba(239,68,68,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
          <div className="relative flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-md border bg-background text-red-500">
                  <Search className="size-5" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Help Center</h1>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Find guides, tutorials and setup instructions for EduBird features.
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground sm:flex">
                <kbd className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-600 dark:text-red-400">
                  Ctrl K
                </kbd>
                Search or ask
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search articles, guides, modules and FAQs..."
                className="h-14 w-full rounded-md border bg-background pl-12 pr-24 text-sm outline-none transition placeholder:text-muted-foreground focus:border-red-500/70"
              />
              <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border px-2 py-1 text-xs text-muted-foreground sm:flex">
                <Command className="size-3" /> K
              </div>
              {filtered.length ? (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-2xl">
                  {filtered.map((entry) => {
                    const Icon = helpIcons[entry.icon as keyof typeof helpIcons] ?? helpIcons.docs;
                    return (
                      <Link
                        key={`${entry.badge}-${entry.href}`}
                        href={entry.href}
                        className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/60"
                      >
                        <Icon className="size-4 text-red-500" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{entry.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{entry.description}</span>
                        </span>
                        <Badge variant="outline" className="text-muted-foreground">
                          {entry.badge}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Quick access</p>
              <div className="flex flex-wrap gap-2">
                {quickTopics.map((topic) => (
                  <Link
                    key={topic}
                    href={`/help/${topic.toLowerCase().replaceAll(" ", "-")}`}
                    className="rounded-full border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-red-500/60 hover:text-red-500"
                  >
                    {topic}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const Icon = helpIcons[(category.icon ?? "docs") as keyof typeof helpIcons] ?? helpIcons.docs;
            return (
              <Link
                key={category.slug}
                href={`/help/${category.slug}`}
                className="group rounded-lg border bg-card p-5 transition hover:border-red-500/60 hover:bg-muted/30"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-500">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-semibold">{category.name}</h2>
                      <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-red-500" />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{category.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <Panel title="Popular Articles" icon={Flame} href="/help">
            {(featuredArticles.length ? featuredArticles : articles.slice(0, 6)).map((article) => (
              <Link
                key={article.slug}
                href={article.category_slug ? `/help/${article.category_slug}/${article.slug}` : `/help/${article.slug}`}
                className="flex items-center gap-3 border-b py-3 text-sm last:border-b-0 hover:text-red-500"
              >
                <FileText className="size-4 text-muted-foreground" />
                <span className="flex-1">{article.title}</span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </Panel>

          <Panel title="Recent Updates" icon={Megaphone} href="/help/recent-updates">
            {recentUpdates.map((update) => (
              <Link
                key={update.id}
                href={update.href || "/help/recent-updates"}
                className="flex items-center gap-3 border-b py-3 text-sm last:border-b-0 hover:text-red-500"
              >
                <span className="size-1.5 rounded-full bg-red-500" />
                <span className="flex-1">{update.title}</span>
                <span className="text-xs text-muted-foreground">{formatUpdateDate(update.update_date)}</span>
              </Link>
            ))}
          </Panel>
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

function Panel({
  title,
  icon: Icon,
  href,
  children,
}: {
  title: string;
  icon: typeof Flame;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-red-500" />
          <h2 className="font-semibold">{title}</h2>
        </div>
        <Link href={href} className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300">
          View all
        </Link>
      </div>
      <div>{children}</div>
    </div>
  );
}
