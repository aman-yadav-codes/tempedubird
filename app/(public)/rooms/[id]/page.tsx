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
  const catText = categoryName || (categorySlug ? categorySlug.replace(/-/g, " ") : "Hotel Rooms & Stays");
  return {
    title: `${catText}${locationText} | 143Panda`,
    description: `Browse verified hotel guest rooms, luxury suites, resort cottages, and backpacker dorms${locationText}.`,
  };
}

export default async function RoomAliasOrListingPage({
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
      key={`room-${rawId}`}
      initialType="room"
      initialCategory={categorySlug}
      initialCategoryName={categoryName}
      initialCity={city}
      initialQuery={query}
    />
  );
}
