import { parseDiscoverySeoSlug, KNOWN_CATEGORY_SLUG_LABELS } from "@/lib/utils/seo-slug";
import CustomerExplorePage from "@/app/(public)/explore/page";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const rawId = resolved.id;
  const { city, categorySlug, categoryName } = parseDiscoverySeoSlug(rawId);
  const locationText = city ? ` in ${city.charAt(0).toUpperCase() + city.slice(1)}` : "";
  const catText = categoryName || (categorySlug ? categorySlug.replace(/-/g, " ") : "Dishes & Food Menu");
  return {
    title: `${catText}${locationText} | 143Panda`,
    description: `Discover delicious dishes, restaurant food menus, and culinary specialties${locationText}.`,
  };
}

export default async function DishAliasOrListingPage({
  params,
  searchParams,
}: Props) {
  const resolvedParams = await params;
  const rawId = resolvedParams.id;

  const { categorySlug, categoryName, city } = parseDiscoverySeoSlug(rawId);
  const sp = searchParams ? await searchParams : {};
  const query = typeof sp.q === "string" ? sp.q : "";

  return (
    <CustomerExplorePage
      key={`dish-${rawId}`}
      initialType="dish"
      initialCategory={categorySlug}
      initialCategoryName={categoryName}
      initialCity={city}
      initialQuery={query}
    />
  );
}
