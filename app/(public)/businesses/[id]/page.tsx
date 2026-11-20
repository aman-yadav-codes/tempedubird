import { redirect } from "next/navigation";
import { db } from "@/lib/db/db";
import { parseDiscoverySeoSlug } from "@/lib/utils/seo-slug";
import CustomerExplorePage from "@/app/(public)/explore/page";

export default async function BusinessesAliasOrListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const rawId = resolvedParams.id;
  const numId = /^\d+$/.test(rawId) ? parseInt(rawId, 10) : 0;

  if (numId > 0) {
    const bizCheck = await db.query(
      `SELECT id, slug FROM business_profiles WHERE id = $1 AND COALESCE(is_active, TRUE) = TRUE LIMIT 1`,
      [numId]
    );
    if (bizCheck.rows.length > 0) {
      redirect(`/business/${bizCheck.rows[0].slug || bizCheck.rows[0].id}`);
    }
  } else if (!rawId.includes("-in-") && !rawId.startsWith("all-") && !rawId.startsWith("in-")) {
    const bizCheck = await db.query(
      `SELECT id, slug FROM business_profiles WHERE slug = $1 AND COALESCE(is_active, TRUE) = TRUE LIMIT 1`,
      [rawId]
    );
    if (bizCheck.rows.length > 0) {
      redirect(`/business/${bizCheck.rows[0].slug || bizCheck.rows[0].id}`);
    }
  }

  const { categorySlug, city } = parseDiscoverySeoSlug(rawId);
  const sp = searchParams ? await searchParams : {};
  const query = typeof sp.q === "string" ? sp.q : "";

  return (
    <CustomerExplorePage
      initialType="business"
      initialCategory={categorySlug}
      initialCity={city}
      initialQuery={query}
    />
  );
}

