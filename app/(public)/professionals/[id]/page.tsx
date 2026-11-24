import { redirect } from "next/navigation";
import { db } from "@/lib/db/db";
import { parseDiscoverySeoSlug } from "@/lib/utils/seo-slug";
import CustomerExplorePage from "@/app/(public)/explore/page";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}): Promise<Metadata> {
  const resolved = await params;
  const rawId = resolved.id;
  const { categorySlug, categoryName, city } = parseDiscoverySeoSlug(rawId);
  const locationText = city ? ` in ${city.charAt(0).toUpperCase() + city.slice(1)}` : "";
  const catText = categoryName || (categorySlug ? categorySlug.replace(/-/g, " ") : "Professionals & Consultants");
  return {
    title: `${catText}${locationText} | 143Panda`,
    description: `Discover verified experts, doctors, tutors, and consultants${locationText}.`,
  };
}

export default async function ProfessionalsAliasOrListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const rawId = resolvedParams.id;
  const numId = /^\d+$/.test(rawId) ? parseInt(rawId, 10) : 0;

  // 1. If it's a numeric ID or single-person slug (doesn't contain "-in-" and not a listing category)
  if (numId > 0) {
    const profCheck = await db.query(
      `SELECT id, slug FROM professional_profiles WHERE id = $1 AND COALESCE(is_active, TRUE) = TRUE LIMIT 1`,
      [numId]
    );
    if (profCheck.rows.length > 0) {
      redirect(`/professional/${profCheck.rows[0].slug || profCheck.rows[0].id}`);
    }
  } else if (!rawId.includes("-in-") && !rawId.startsWith("all-") && !rawId.startsWith("in-")) {
    const profCheck = await db.query(
      `SELECT id, slug FROM professional_profiles WHERE slug = $1 AND COALESCE(is_active, TRUE) = TRUE LIMIT 1`,
      [rawId]
    );
    if (profCheck.rows.length > 0) {
      redirect(`/professional/${profCheck.rows[0].slug || profCheck.rows[0].id}`);
    }
  }

  // 2. Otherwise it's a category/location listing SEO URL (e.g. "doctors-and-healthcare-in-varanasi")
  const { categorySlug, categoryName, city } = parseDiscoverySeoSlug(rawId);
  const sp = searchParams ? await searchParams : {};
  const query = typeof sp.q === "string" ? sp.q : "";

  return (
    <CustomerExplorePage
      initialType="professional"
      initialCategory={categorySlug}
      initialCategoryName={categoryName}
      initialCity={city}
      initialQuery={query}
    />
  );
}

