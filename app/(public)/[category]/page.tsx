import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCountryConfig, formatCountryCurrency } from "@/lib/config/country-config";
import { db } from "@/lib/db/db";
import { buildDiscoverySeoUrl } from "@/lib/utils/seo-slug";
import { Search, MapPin, Building2, Briefcase, Star, Phone, MessageSquare, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  const upper = category.toUpperCase();
  if (upper === "IN" || upper === "US") {
    const config = getCountryConfig(upper);
    return {
      title: config.seoMetadata.title,
      description: config.seoMetadata.description,
      keywords: config.seoMetadata.keywords,
    };
  }

  const catRes = await db.query(
    `SELECT id, name, slug FROM categories WHERE slug = $1 OR name ILIKE $2 LIMIT 1`,
    [category.toLowerCase(), `%${category.replace(/-/g, " ")}%`]
  );

  if (catRes.rows.length > 0) {
    const cat = catRes.rows[0];
    return {
      title: `${cat.name} Listings & Services | EduBird Marketplace`,
      description: `Explore top-rated businesses, professionals, products, and services in ${cat.name}. Verified local providers with authentic reviews.`,
    };
  }

  return {
    title: "Marketplace Directory | EduBird",
    description: "Explore top verified local businesses, products, and services.",
  };
}

export default async function CategoryOrCountryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const upper = category.toUpperCase();

  if (upper !== "IN" && upper !== "US") {
    const rawCat = (category || "").toLowerCase().trim();
    const catRes = await db.query(
      `SELECT id, name, slug, category_type FROM categories WHERE slug = $1 OR name ILIKE $2 LIMIT 1`,
      [rawCat, `%${rawCat.replace(/-/g, " ")}%`]
    );

    const sp = await searchParams;
    const loc =
      sp?.city && typeof sp.city === "string"
        ? sp.city
        : sp?.location && typeof sp.location === "string"
        ? sp.location
        : null;

    if (catRes.rows.length > 0) {
      const cat = catRes.rows[0];
      const targetType =
        sp?.type && typeof sp.type === "string"
          ? sp.type
          : cat.category_type || "business";
      const dest = buildDiscoverySeoUrl({
        type: targetType,
        category: cat.slug || cat.name,
        location: loc,
      });
      redirect(dest);
    }

    // Default fallback to businesses/{slug}
    redirect(
      buildDiscoverySeoUrl({
        type: sp?.type && typeof sp.type === "string" ? sp.type : "business",
        category: rawCat,
        location: loc,
      })
    );
  }

  const country = upper;
  const config = getCountryConfig(country);

  // Fetch top categories
  const catRes = await db.query(
    `SELECT id, name, slug, icon, type FROM categories WHERE parent_id IS NULL AND is_active = true ORDER BY name ASC LIMIT 12`
  );

  // Fetch featured / top verified listings in this country
  const businessRes = await db.query(
    `SELECT 
       bp.id, bp.name, bp.slug, bp.business_type, bp.city, bp.state, bp.phone, bp.whatsapp, bp.logo_url,
       c.name AS category_name,
       (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 5.0) FROM platform_reviews WHERE business_id = bp.id) AS avg_rating,
       (SELECT COUNT(*)::INT FROM platform_reviews WHERE business_id = bp.id) AS reviews_count
     FROM business_profiles bp
     LEFT JOIN categories c ON c.id = bp.category_id
     WHERE bp.country_code = $1 AND bp.is_active = true
     ORDER BY bp.is_featured DESC, bp.id DESC LIMIT 6`,
    [upper]
  );

  const profRes = await db.query(
    `SELECT 
       pp.id, pp.name, pp.slug, pp.professional_title, pp.profession_type, pp.city, pp.state, pp.phone, pp.whatsapp, pp.avatar_url,
       c.name AS category_name,
       (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 5.0) FROM platform_reviews WHERE professional_id = pp.id) AS avg_rating,
       (SELECT COUNT(*)::INT FROM platform_reviews WHERE professional_id = pp.id) AS reviews_count
     FROM professional_profiles pp
     LEFT JOIN categories c ON c.id = pp.category_id
     WHERE pp.country_code = $1 AND pp.is_active = true
     ORDER BY pp.is_featured DESC, pp.id DESC LIMIT 6`,
    [upper]
  );

  return (
    <div className="min-h-screen bg-background text-foreground space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background py-16 sm:py-24 border-b">
        <div className="container mx-auto px-4 max-w-5xl text-center space-y-6">
          <Badge variant="outline" className="text-xs px-3 py-1 font-semibold border-primary/30 text-primary">
            {config.countryName} Edition • {config.currencyCode} ({config.currencySymbol})
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            {config.seoMetadata.title}
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            {config.seoMetadata.description}
          </p>

          {/* Search box linking to explore */}
          <div className="max-w-2xl mx-auto pt-4">
            <form action={`/explore`} method="GET" className="flex flex-col sm:flex-row gap-2">
              <input type="hidden" name="country" value={upper} />
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <input
                  name="q"
                  placeholder={`Search businesses, professionals, services in ${config.countryName}...`}
                  className="w-full h-11 pl-10 pr-4 text-sm rounded-lg border bg-background shadow-xs focus:outline-primary"
                />
              </div>
              <div className="relative sm:w-48">
                <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <input
                  name="city"
                  placeholder={`City / ${config.postalCodeLabel}...`}
                  className="w-full h-11 pl-10 pr-4 text-sm rounded-lg border bg-background shadow-xs focus:outline-primary"
                />
              </div>
              <Button type="submit" className="h-11 px-6 font-semibold">
                Explore
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="container mx-auto px-4 max-w-6xl space-y-6">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Browse by Category</h2>
            <p className="text-xs text-muted-foreground">Discover verified listings by industry</p>
          </div>
          <Link href={`/${country}/restaurants`} className="text-xs font-semibold text-primary hover:underline">
            View All Categories →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {catRes.rows.map((cat: any) => (
            <Link
              key={cat.id}
              href={`/${country}/${cat.slug}`}
              className="p-3.5 rounded-xl border bg-card hover:bg-muted/30 hover:border-primary/40 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                {cat.type === "business" ? <Building2 className="size-5" /> : <Briefcase className="size-5" />}
              </div>
              <span className="text-xs font-semibold text-foreground line-clamp-1">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Businesses in Country */}
      <section className="container mx-auto px-4 max-w-6xl space-y-6">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Top Businesses in {config.countryName}</h2>
            <p className="text-xs text-muted-foreground">Local retailers, stores, clinics, and firms</p>
          </div>
          <Link href={`/explore?country=${upper}&type=business`} className="text-xs font-semibold text-primary hover:underline">
            View All Businesses →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {businessRes.rows.map((b: any) => {
            const citySlug = (b.city || "local").toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const businessSlug = b.slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

            return (
              <div key={b.id} className="rounded-xl border bg-card p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={b.logo_url || "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=100"}
                      alt={b.name}
                      className="size-12 rounded-lg object-cover border"
                    />
                    <div>
                      <Link href={`/${country}/${citySlug}/${businessSlug}`} className="font-bold text-sm text-foreground hover:text-primary transition-colors">
                        {b.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{b.category_name || b.business_type}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Star className="size-3 fill-amber-400 text-amber-400" /> {b.avg_rating}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 text-primary" />
                  <span>{b.city || "City"}, {b.state || config.countryName}</span>
                </div>

                <div className="flex items-center justify-between border-t pt-2.5 text-xs">
                  {b.whatsapp ? (
                    <a
                      href={`https://wa.me/${b.whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <MessageSquare className="size-3" /> WhatsApp
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Local Listing</span>
                  )}
                  <Link href={`/${country}/${citySlug}/${businessSlug}`}>
                    <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold">
                      Details →
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured Professionals in Country */}
      <section className="container mx-auto px-4 max-w-6xl space-y-6">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Certified Professionals in {config.countryName}</h2>
            <p className="text-xs text-muted-foreground">Lawyers, accountants, engineers, tutors, and consultants</p>
          </div>
          <Link href={`/explore?country=${upper}&type=professional`} className="text-xs font-semibold text-primary hover:underline">
            View All Professionals →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profRes.rows.map((p: any) => {
            const citySlug = (p.city || "local").toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const proSlug = p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

            return (
              <div key={p.id} className="rounded-xl border bg-card p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={p.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                      alt={p.name}
                      className="size-12 rounded-full object-cover border"
                    />
                    <div>
                      <Link href={`/${country}/${citySlug}/${proSlug}`} className="font-bold text-sm text-foreground hover:text-primary transition-colors">
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{p.professional_title || p.category_name}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Star className="size-3 fill-amber-400 text-amber-400" /> {p.avg_rating}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 text-purple-600" />
                  <span>{p.city || "City"}, {p.state || config.countryName}</span>
                </div>

                <div className="flex items-center justify-between border-t pt-2.5 text-xs">
                  {p.phone ? (
                    <a href={`tel:${p.phone}`} className="text-primary hover:underline flex items-center gap-1">
                      <Phone className="size-3" /> Call {p.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Verified Pro</span>
                  )}
                  <Link href={`/${country}/${citySlug}/${proSlug}`}>
                    <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold">
                      Consult →
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

