import { notFound } from "next/navigation";

import { HelpArticlePage } from "@/components/help/help-article-page";
import { HelpCategoryPage } from "@/components/help/help-category-page";
import { db } from "@/lib/db/db";
import {
  getHelpArticleByCategoryAndSlug,
  getHelpArticleBySlug,
  listHelpArticles,
  listHelpCategories,
} from "@/lib/queries/help-center";

type HelpRouteProps = {
  params: Promise<{ slug: string[] }>;
};

export default async function HelpRoute({ params }: HelpRouteProps) {
  const { slug } = await params;
  const [first, second] = slug;
  if (!first) notFound();

  if (first && second) {
    const article = await getHelpArticleByCategoryAndSlug(db, first, second).catch(() => null);
    if (!article) notFound();
    return <HelpArticlePage article={article} />;
  }

  const directArticle = await getHelpArticleBySlug(db, first).catch(() => null);
  if (directArticle) return <HelpArticlePage article={directArticle} />;

  const categories = await listHelpCategories(db);
  const category = categories.find((item) => item.slug === first);
  if (!category) notFound();

  const articles = await listHelpArticles(db, { categorySlug: first, limit: 100 });
  return <HelpCategoryPage category={category} articles={articles} />;
}
