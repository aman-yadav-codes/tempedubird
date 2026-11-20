import CustomerExplorePage from "@/app/(public)/explore/page";

export default async function ServicesRootPage({
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
      initialType="service"
      initialCategory={category}
      initialCity={city}
      initialQuery={query}
    />
  );
}
