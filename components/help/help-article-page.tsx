import Link from "next/link";
import { ArrowLeft, ArrowRight, ImageIcon, PlayCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { helpIcons } from "@/components/help/help-content";
import { HelpMarkdown } from "@/components/help/help-markdown";
import type { HelpArticleRow } from "@/lib/queries/help-center";

export function HelpArticlePage({ article }: { article: HelpArticleRow }) {
  const Icon = helpIcons.docs;
  const assets = article.assets ?? [];
  const faqs = article.faqs ?? [];
  const related = article.related_articles ?? [];
  const screenshots = assets.filter((asset) => asset.asset_type === "image");
  const videos = assets.filter((asset) => asset.asset_type === "video");

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full max-w-none space-y-6">
        <Link href="/help" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Help Center
        </Link>

        <section className="rounded-lg border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex size-12 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-500">
                <Icon className="size-6" />
              </div>
              <div className="flex flex-wrap gap-2">
                {article.category_name ? <Badge className="bg-red-500 text-white hover:bg-red-500">{article.category_name}</Badge> : null}
                <Badge variant="outline" className="text-muted-foreground">
                  {article.visibility.replaceAll("_", " ")}
                </Badge>
                {article.difficulty_level ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    {article.difficulty_level}
                  </Badge>
                ) : null}
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight">{article.title}</h1>
              {article.summary ? <p className="mt-3 text-muted-foreground">{article.summary}</p> : null}
            </div>
            <div className="rounded-md border bg-background p-4 text-sm">
              <div className="text-muted-foreground">Read time</div>
              <div className="mt-1 font-medium">{article.estimated_read_minutes ?? 3} min</div>
              <div className="mt-4 text-muted-foreground">Last updated</div>
              <div className="mt-1 font-medium">{formatDate(article.updated_at)}</div>
              {article.permissions?.length ? (
                <>
                  <div className="mt-4 text-muted-foreground">Required permissions</div>
                  <div className="mt-2 flex max-w-sm flex-wrap gap-2">
                    {article.permissions.map((permission) => (
                      <Badge key={permission.id} variant="outline" className="text-muted-foreground">
                        {permission.code}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-lg border bg-card p-4 text-sm">
              {["Overview", "Screenshots", "Video Tutorial", "FAQs", "Related Articles"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replaceAll(" ", "-")}`}
                  className="block rounded-md px-3 py-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                >
                  {item}
                </a>
              ))}
            </div>
          </aside>

          <article className="space-y-5">
            <Section id="overview" title="Overview">
              <HelpMarkdown content={article.content_md} />
            </Section>

            <Section id="screenshots" title="Screenshots">
              {screenshots.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {screenshots.map((asset) => (
                    <a key={asset.id ?? asset.file_url} href={asset.file_url} target="_blank" className="overflow-hidden rounded-md border bg-background transition hover:border-red-500/50" rel="noreferrer">
                      <img src={asset.thumbnail_url ?? asset.file_url} alt={asset.title ?? article.title} className="h-52 w-full object-cover" />
                      <div className="p-3 text-sm text-muted-foreground">{asset.title ?? "Screenshot"}</div>
                    </a>
                  ))}
                </div>
              ) : (
                <EmptyAsset icon={ImageIcon} label="No screenshots added yet." />
              )}
            </Section>

            <Section id="video-tutorial" title="Video Tutorial">
              {videos.length ? (
                <div className="grid gap-3">
                  {videos.map((asset) => (
                    <a key={asset.id ?? asset.file_url} href={asset.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-md border bg-background p-4 transition hover:border-red-500/50">
                      <div className="flex size-11 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-500">
                        <PlayCircle className="size-5" />
                      </div>
                      <div>
                        <p className="font-medium">{asset.title ?? "Video tutorial"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{asset.file_url}</p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <EmptyAsset icon={PlayCircle} label="No video tutorial added yet." />
              )}
            </Section>

            <Section id="faqs" title="FAQs">
              <QuestionList
                items={faqs.map((faq) => ({ title: faq.question, answer: faq.answer }))}
                fallback="No FAQs documented yet."
              />
            </Section>

            <Section id="related-articles" title="Related Articles">
              {related.length ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {related.map((item) => (
                    <Link
                      key={item.id}
                      href={item.category_slug ? `/help/${item.category_slug}/${item.slug}` : `/help/${item.slug}`}
                      className="flex items-center justify-between rounded-md border bg-background p-4 text-sm transition hover:border-red-500/50"
                    >
                      <span className="line-clamp-2">{item.title}</span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No related articles linked yet.</p>
              )}
            </Section>
          </article>
        </div>
      </div>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8 rounded-lg border bg-card p-5">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function EmptyAsset({ icon: Icon, label }: { icon: typeof ImageIcon; label: string }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/30 p-5 text-center">
      <Icon className="mx-auto mb-3 size-5 text-red-500" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function QuestionList({ items, fallback }: { items: Array<{ title: string; answer: string }>; fallback: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{fallback}</p>;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.title} className="rounded-md border bg-background p-4">
          <h3 className="font-medium">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not published";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
