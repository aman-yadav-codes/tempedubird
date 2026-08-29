import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  Clock,
  Eye,
  Building2,
  Share2,
  ArrowLeft,
  Sparkles,
  Tag,
  Star,
  CheckCircle2,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { db } from "@/lib/db/db";
import { ensureBlogPostsTable } from "@/lib/db/ensure-blog-schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";
import { BlogInteractiveShare } from "./blog-interactive-share";

interface BlogPostProps {
  params: Promise<{ slug: string }>;
}

async function getBlogPost(slug: string) {
  await ensureBlogPostsTable();
  const isNumeric = /^\d+$/.test(slug);

  const query = `
    SELECT 
      bp.*,
      ip.name AS institution_name,
      ip.slug AS institution_slug,
      (
        SELECT media.url
        FROM institution_media media
        WHERE media.institution_id = ip.id
          AND COALESCE(media.is_deleted, FALSE) = FALSE
          AND media.url IS NOT NULL AND media.url <> ''
          AND (lower(COALESCE(media.media_type, '')) = 'logo' OR lower(COALESCE(media.title, '')) LIKE '%logo%')
        ORDER BY media.sort_order ASC, media.id ASC
        LIMIT 1
      ) AS institution_logo
    FROM blog_posts bp
    LEFT JOIN institution_profiles ip ON ip.id = bp.institution_id
    WHERE (bp.slug = $1 ${isNumeric ? "OR bp.id = $2" : ""})
      AND bp.status = 'published'
    LIMIT 1
  `;

  const queryParams = isNumeric ? [slug, Number(slug)] : [slug];
  const result = await db.query(query, queryParams);

  if (result.rows.length === 0) return null;

  const article = result.rows[0];

  // Async views increment
  db.query(`UPDATE blog_posts SET views_count = COALESCE(views_count, 0) + 1 WHERE id = $1`, [article.id]).catch(() => {});

  // Fetch related articles
  const relatedResult = await db.query(
    `
      SELECT 
        bp.id,
        bp.slug,
        bp.title,
        bp.category,
        bp.summary,
        bp.cover_image,
        bp.read_time_mins,
        bp.author_name,
        bp.published_at,
        ip.name AS institution_name
      FROM blog_posts bp
      LEFT JOIN institution_profiles ip ON ip.id = bp.institution_id
      WHERE bp.id <> $1
        AND bp.status = 'published'
        AND (bp.category = $2 OR bp.institution_id = $3)
      ORDER BY bp.published_at DESC
      LIMIT 3
    `,
    [article.id, article.category, article.institution_id]
  );

  return {
    article,
    related: relatedResult.rows,
  };
}

export async function generateMetadata({ params }: BlogPostProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getBlogPost(slug);

  if (!data || !data.article) {
    return {
      title: "Article Not Found | EduBird",
      description: "The requested educational article or blog post could not be found.",
    };
  }

  const { article } = data;
  const title = article.meta_title || article.title;
  const description = article.meta_description || article.summary || "Read educational insights on EduBird";

  return {
    title: `${title} | EduBird Journal`,
    description,
    keywords: article.meta_keywords ? article.meta_keywords.split(",") : [article.category, "Education", "Campus"],
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: article.published_at,
      images: article.cover_image ? [{ url: article.cover_image }] : undefined,
    },
    alternates: {
      canonical: article.canonical_url || `https://edubird.org/blogs/${article.slug || article.id}`,
    },
  };
}

export default async function BlogDetailPage({ params }: BlogPostProps) {
  const { slug } = await params;
  const data = await getBlogPost(slug);

  if (!data || !data.article) {
    notFound();
  }

  const { article, related } = data;

  const tagsList = article.tags
    ? article.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
    : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.summary,
    image: article.cover_image,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: {
      "@type": "Person",
      name: article.author_name || "EduBird Specialist",
      jobTitle: article.author_role,
    },
    publisher: {
      "@type": "Organization",
      name: article.institution_name || "EduBird Platform",
      logo: {
        "@type": "ImageObject",
        url: article.institution_logo || "https://edubird.org/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://edubird.org/blogs/${article.slug || article.id}`,
    },
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-6">
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-4 max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <SeoBreadcrumbs
            items={[
              { label: "Blogs & Articles", href: "/blogs" },
              { label: article.category, href: `/blogs?category=${encodeURIComponent(article.category)}` },
              { label: article.title },
            ]}
          />

          <Button asChild variant="ghost" size="sm" className="text-xs font-bold gap-1 text-muted-foreground hover:text-primary">
            <Link href="/blogs">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Articles
            </Link>
          </Button>
        </div>

        {/* Article Header Card */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-xs">
              {article.category}
            </Badge>
            {article.institution_name && (
              <Badge variant="outline" className="text-xs font-semibold gap-1">
                <Building2 className="h-3 w-3 text-primary" />
                {article.institution_name}
              </Badge>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-b border-border/70 pb-5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/15 text-primary font-black text-xs flex items-center justify-center">
                {(article.author_name || "A").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-foreground">{article.author_name || "EduBird Contributor"}</p>
                <p className="text-[10px] text-muted-foreground">{article.author_role || "Academic Faculty"}</p>
              </div>
            </div>

            <span className="hidden sm:inline">•</span>

            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(article.published_at).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>

            <span>•</span>

            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {article.read_time_mins || 5} min read
            </span>

            <span>•</span>

            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {article.views_count || 1} reads
            </span>
          </div>
        </div>

        {/* Featured Image Banner */}
        {article.cover_image && (
          <div className="relative h-72 sm:h-96 w-full rounded-2xl overflow-hidden shadow-md border border-border bg-muted">
            <img
              src={article.cover_image}
              alt={article.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Excerpt / Summary Box */}
        {article.summary && (
          <div className="p-5 rounded-2xl bg-muted/40 border-l-4 border-primary text-sm sm:text-base font-medium text-foreground leading-relaxed italic">
            "{article.summary}"
          </div>
        )}

        {/* Article Rich HTML Content */}
        <article className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-primary prose-a:font-bold prose-img:rounded-xl leading-relaxed">
          {article.content_html ? (
            <div
              dangerouslySetInnerHTML={{ __html: article.content_html }}
              className="space-y-4 text-foreground/90 leading-relaxed text-sm sm:text-base"
            />
          ) : (
            <p className="text-muted-foreground">{article.summary}</p>
          )}
        </article>

        {/* Tags Row */}
        {tagsList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" /> Tags:
            </span>
            {tagsList.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs font-medium">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Social Share & Interactive Community Feedback */}
        <BlogInteractiveShare
          articleId={article.id}
          title={article.title}
          slug={article.slug || String(article.id)}
          authorName={article.author_name || "EduBird Faculty"}
          instituteName={article.institution_name || "EduBird"}
        />

        {/* Author Bio Card */}
        <Card className="p-6 rounded-2xl border-border/80 bg-card shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 text-primary font-black text-xl flex items-center justify-center shrink-0">
              {(article.author_name || "A").slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-base">
                  {article.author_name || "EduBird Contributor"}
                </h3>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                  Verified Author
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {article.author_role || "Education Specialist & Academic Researcher"} • {article.institution_name || "EduBird Journal"}
              </p>
              <p className="text-xs text-muted-foreground/80 pt-1">
                Committed to delivering transparent educational guides, syllabus blueprints, and campus updates for aspirants.
              </p>
            </div>
          </div>
        </Card>

        {/* Related Articles */}
        {related && related.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Related Articles You Might Like</h2>
              <Button asChild variant="ghost" size="sm" className="text-xs font-bold text-primary">
                <Link href="/blogs">
                  View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((rel: any) => (
                <Card
                  key={rel.id}
                  className="p-4 rounded-xl border-border/80 bg-card hover:border-primary/50 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {rel.category}
                    </Badge>
                    <h4 className="font-bold text-xs text-foreground leading-snug line-clamp-2 hover:text-primary">
                      <Link href={`/blogs/${rel.slug || rel.id}`}>{rel.title}</Link>
                    </h4>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/60">
                    <span>{rel.read_time_mins || 5} min read</span>
                    <Link
                      href={`/blogs/${rel.slug || rel.id}`}
                      className="font-bold text-primary hover:underline"
                    >
                      Read &rarr;
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
