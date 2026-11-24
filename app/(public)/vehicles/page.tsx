import CustomerExplorePage from "@/app/(public)/explore/page";
import { formatCategorySlug } from "@/lib/utils/seo-slug";
import type { Metadata } from "next";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const sp = searchParams ? await searchParams : {};
  const city = typeof sp.city === "string" ? sp.city : typeof sp.location === "string" ? sp.location : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const catName = formatCategorySlug(category) || "Vehicles & Mobility";
  const loc = city ? ` in ${city.charAt(0).toUpperCase() + city.slice(1)}` : "";
  return {
    title: `${catName}${loc} | 143Panda`,
    description: `Discover verified passenger cars, SUVs, bikes, and commercial vehicles${loc}.`,
  };
}

export default async function VehiclesRootPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const city = typeof sp.city === "string" ? sp.city : typeof sp.location === "string" ? sp.location : "";
  const country = typeof sp.country === "string" ? sp.country : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const query = typeof sp.q === "string" ? sp.q : "";

  return (
    <CustomerExplorePage
      initialType="vehicle"
      initialCategory={category}
      initialCategoryName={formatCategorySlug(category)}
      initialCity={city}
      initialQuery={query}
    />
  );
}
