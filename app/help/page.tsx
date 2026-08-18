import { HelpHome } from "@/components/help/help-home";
import { db } from "@/lib/db/db";
import { listHelpArticles, listHelpCategories, listHelpRecentUpdates } from "@/lib/queries/help-center";

export default async function HelpIndexPage() {
  const [categories, articles, recentUpdates] = await Promise.all([
    listHelpCategories(db),
    listHelpArticles(db, { limit: 100 }),
    listHelpRecentUpdates(db, { limit: 6 }),
  ]);

  return <HelpHome categories={categories} articles={articles} recentUpdates={recentUpdates} />;
}
