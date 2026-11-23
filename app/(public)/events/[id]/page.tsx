import { parseDiscoverySeoSlug } from "@/lib/utils/seo-slug";
import CustomerExplorePage from "@/app/(public)/explore/page";

export default async function EventAliasOrListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const rawId = resolvedParams.id;
  const { categorySlug, city } = parseDiscoverySeoSlug(rawId);
  const sp = searchParams ? await searchParams : {};
  const query = typeof sp.q === "string" ? sp.q : "";

  return (
    <CustomerExplorePage
      initialType="event"
      initialCategory={categorySlug}
      initialCity={city}
      initialQuery={query}
    />
  );
}
