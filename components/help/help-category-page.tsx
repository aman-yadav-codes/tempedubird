import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";

import { helpIcons } from "@/components/help/help-content";
import type { HelpArticleRow, HelpCategoryRow } from "@/lib/queries/help-center";

export function HelpCategoryPage({
  category,
  articles,
}: {
  category: HelpCategoryRow;
  articles: HelpArticleRow[];
}) {
  const Icon = helpIcons[(category.icon ?? "docs") as keyof typeof helpIcons] ?? helpIcons.docs;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full max-w-none space-y-6">
        <Link href="/help" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Help Center
        </Link>
        <section className="rounded-lg border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-500">
              <Icon className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{category.name}</h1>
              <p className="mt-2 text-muted-foreground">{category.description}</p>
            </div>
          </div>
        </section>
        <section className="rounded-lg border bg-card">
          {articles.length ? articles.map((article) => (
            <Link
              key={article.id}
              href={`/help/${category.slug}/${article.slug}`}
              className="flex items-center gap-4 border-b p-5 transition last:border-b-0 hover:bg-muted/50"
            >
              <FileText className="size-5 text-red-500" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{article.title}</span>
                <span className="mt-1 block truncate text-sm text-muted-foreground">{article.summary ?? "Open help article."}</span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          )) : (
            <div className="p-6 text-sm text-muted-foreground">No published articles are available in this category yet.</div>
          )}
        </section>
      </div>
    </main>
  );
}
