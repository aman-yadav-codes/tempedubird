import { NextResponse } from "next/server";

import { getOptionalAuthenticatedUser } from "@/lib/auth/optional-auth";
import { db } from "@/lib/db/db";
import { hydrateArticle, listHelpArticles, listHelpCategories, logHelpSearch } from "@/lib/queries/help-center";

export async function GET(req: Request) {
  const user = await getOptionalAuthenticatedUser(req);
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const [rawArticles, categories] = await Promise.all([
    listHelpArticles(db, { user, search: q, limit: 25 }),
    listHelpCategories(db),
  ]);
  const articles = await Promise.all(
    rawArticles.map((article) => (article.faqs ? article : hydrateArticle(db, article)))
  );
  const normalized = q.toLowerCase();
  const categoryResults = categories
    .filter((category) =>
      !normalized ||
      `${category.name} ${category.description ?? ""}`.toLowerCase().includes(normalized)
    )
    .slice(0, 8)
    .map((category) => ({
      type: "category",
      title: category.name,
      description: category.description ?? "Browse articles in this category.",
      href: `/help/${category.slug}`,
      icon: category.icon ?? "docs",
    }));
  const articleResults = articles.map((article) => ({
    type: "article",
    title: article.title,
    description: article.summary ?? article.category_name ?? "Help article",
    href: article.category_slug ? `/help/${article.category_slug}/${article.slug}` : `/help/${article.slug}`,
    icon: "docs",
  }));
  const faqResults = articles
    .flatMap((article) =>
      (article.faqs ?? []).map((faq) => ({
        type: "faq",
        title: faq.question,
        description: faq.answer,
        href: article.category_slug ? `/help/${article.category_slug}/${article.slug}#faqs` : `/help/${article.slug}#faqs`,
        icon: "faq",
      }))
    )
    .slice(0, 10);

  const results = [...categoryResults, ...articleResults, ...faqResults];
  await logHelpSearch(db, user?.id ?? null, q, results.length).catch(() => null);
  return NextResponse.json({ data: results });
}
