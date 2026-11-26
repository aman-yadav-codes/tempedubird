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
  const catName = formatCategorySlug(category) || "Popular Dishes & Food Menu";
  const loc = city ? ` in ${city.charAt(0).toUpperCase() + city.slice(1)}` : "";
  return {
    title: `${catName}${loc} | 143Panda`,
    description: `Discover best dishes, bakery desserts, mocktails, and dining menus${loc}.`,
  };
}

export default async function DishesRootPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const city = typeof sp.city === "string" ? sp.city : typeof sp.location === "string" ? sp.location : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const query = typeof sp.q === "string" ? sp.q : "";

  return (
    <CustomerExplorePage
      initialType="dish"
      initialCategory={category}
      initialCategoryName={formatCategorySlug(category)}
      initialCity={city}
      initialQuery={query}
    />
  );
}
