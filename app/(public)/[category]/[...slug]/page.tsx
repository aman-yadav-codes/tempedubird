import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/db";
import { extractIdFromSlug, buildBusinessSeoUrl, buildProfessionalSeoUrl } from "@/lib/utils/seo-slug";
import { PublicBusinessProfileClient } from "@/components/profile/public-business-profile-client";
import { PublicProfessionalProfileClient } from "@/components/profile/public-professional-profile-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ category: string; slug: string[] }> | { category: string; slug: string[] };
}

/**
 * Concurrently resolves business or professional entity from SEO category & slug path
 */
const fetchSeoProfileData = cache(async (categoryParam: string, slugSegments: string[]) => {
  try {
    const rawCategory = categoryParam.toLowerCase().trim();
    const targetSlug = slugSegments[slugSegments.length - 1]?.toLowerCase().trim() || "";
    const fullJoinedSlug = slugSegments.join("-").toLowerCase().trim();
    const withoutLocation = targetSlug.includes("-in-") ? targetSlug.split("-in-")[0] : targetSlug;
    const { id: numId } = extractIdFromSlug(targetSlug);

    // 1. Try finding matching Business Profile
    const bizRes = await db.query(
      `SELECT
        bp.*,
        c.name AS category_name,
        c.slug AS category_slug,
        sc.name AS subcategory_name,
        sc.slug AS subcategory_slug
      FROM business_profiles bp
      LEFT JOIN categories c ON c.id = bp.category_id
      LEFT JOIN categories sc ON sc.id = bp.subcategory_id
      WHERE COALESCE(bp.is_active, TRUE) = TRUE
        AND (
          bp.slug = $1
          OR bp.slug = $2
          OR (bp.id = $3 AND $3 > 0)
          OR $1 LIKE '%' || bp.slug || '%'
          OR $2 LIKE '%' || bp.slug || '%'
          OR $4 LIKE '%' || bp.slug || '%'
        )
      ORDER BY (CASE WHEN bp.slug = $1 THEN 0 WHEN bp.slug = $2 THEN 1 ELSE 2 END), LENGTH(bp.slug) DESC
      LIMIT 1`,
      [targetSlug, withoutLocation, numId || -1, fullJoinedSlug]
    );

    if (bizRes.rows.length > 0) {
      const business = bizRes.rows[0];
      const bizId = business.id;
      const instId = business.institution_profile_id || -1;

      const [productsSettled, servicesSettled, professionalsSettled, reviewsSettled] = await Promise.allSettled([
        // Products
        db.query(
          `SELECT
            mp.id,
            mp.name,
            mp.slug,
            mp.brand,
            b.name AS brand_name,
            mp.regular_price,
            mp.discounted_price,
            COALESCE(mp.discounted_price, mp.regular_price, mp.suggested_price, 0) AS price,
            mp.currency,
            mp.default_image_url,
            mp.images,
            mp.description,
            mp.unit_of_measurement,
            COALESCE(mp.unit, mp.unit_of_measurement, u.short_symbol, 'piece') AS unit,
            COALESCE(mp.unit_quantity, 1) AS unit_quantity,
            c.name AS category_name,
            sc.name AS subcategory_name
          FROM master_products mp
          LEFT JOIN brands b ON b.id = mp.brand_id
          LEFT JOIN units u ON u.id = mp.unit_id
          LEFT JOIN categories c ON c.id = mp.category_id
          LEFT JOIN categories sc ON sc.id = mp.subcategory_id
          WHERE (mp.business_profile_id = $1 OR (mp.institution_id = $2 AND mp.profile_type = 'business'))
            AND COALESCE(mp.is_active, TRUE) = TRUE
          ORDER BY mp.id DESC`,
          [bizId, instId]
        ),

        // Services
        db.query(
          `SELECT
            ms.id,
            ms.name,
            ms.slug,
            ms.pricing_model,
            ms.regular_price,
            ms.discounted_price,
            COALESCE(ms.discounted_price, ms.regular_price, ms.suggested_price, 0) AS price,
            ms.currency,
            ms.default_image_url,
            ms.images,
            ms.description,
            ms.estimated_duration,
            ms.service_location,
            c.name AS category_name,
            sc.name AS subcategory_name
          FROM master_services ms
          LEFT JOIN categories c ON c.id = ms.category_id
          LEFT JOIN categories sc ON sc.id = ms.subcategory_id
          WHERE (ms.business_profile_id = $1 OR (ms.institution_id = $2 AND ms.profile_type = 'business'))
            AND COALESCE(ms.is_active, TRUE) = TRUE
          ORDER BY ms.id DESC`,
          [bizId, instId]
        ),

        // Professionals associated
        db.query(
          `SELECT
            pp.id,
            pp.name,
            pp.slug,
            pp.designation,
            pp.professional_title,
            pp.profession_type,
            pp.avatar_url,
            pp.experience_years,
            pp.city,
            pp.state
          FROM professional_profiles pp
          WHERE (pp.business_profile_id = $1 OR pp.institution_profile_id = $2)
            AND COALESCE(pp.is_active, TRUE) = TRUE
          ORDER BY pp.id DESC`,
          [bizId, instId]
        ),

        // Reviews
        db.query(
          `SELECT
            pr.id,
            pr.rating,
            pr.title,
            pr.review,
            pr.created_at,
            u.full_name AS user_name,
            u.avatar_url AS user_avatar
          FROM platform_reviews pr
          LEFT JOIN users u ON u.id = pr.user_id
          WHERE pr.business_id = $1
            AND COALESCE(pr.is_approved, TRUE) = TRUE
          ORDER BY pr.id DESC LIMIT 20`,
          [bizId]
        ),
      ]);

      const products = productsSettled.status === "fulfilled" ? productsSettled.value.rows : [];
      const services = servicesSettled.status === "fulfilled" ? servicesSettled.value.rows : [];
      const professionals = professionalsSettled.status === "fulfilled" ? professionalsSettled.value.rows : [];
      const reviews = reviewsSettled.status === "fulfilled" ? reviewsSettled.value.rows : [];

      return {
        type: "business" as const,
        business,
        products,
        services,
        professionals,
        reviews,
      };
    }

    // 2. Try finding matching Professional Profile
    const profRes = await db.query(
      `SELECT
        pp.*,
        c.name AS category_name,
        c.slug AS category_slug,
        sc.name AS subcategory_name,
        sc.slug AS subcategory_slug
      FROM professional_profiles pp
      LEFT JOIN categories c ON c.id = pp.category_id
      LEFT JOIN categories sc ON sc.id = pp.subcategory_id
      WHERE COALESCE(pp.is_active, TRUE) = TRUE
        AND (
          pp.slug = $1
          OR pp.slug = $2
          OR (pp.id = $3 AND $3 > 0)
          OR $1 LIKE '%' || pp.slug || '%'
          OR $2 LIKE '%' || pp.slug || '%'
          OR $4 LIKE '%' || pp.slug || '%'
        )
      ORDER BY (CASE WHEN pp.slug = $1 THEN 0 WHEN pp.slug = $2 THEN 1 ELSE 2 END), LENGTH(pp.slug) DESC
      LIMIT 1`,
      [targetSlug, withoutLocation, numId || -1, fullJoinedSlug]
    );

    if (profRes.rows.length > 0) {
      const professional = profRes.rows[0];
      const profId = professional.id;
      const bizId = professional.business_profile_id || null;

      const [bizSettled, servicesSettled, productsSettled, reviewsSettled] = await Promise.allSettled([
        bizId
          ? db.query(`SELECT id, name, slug, logo_url, city, state FROM business_profiles WHERE id = $1 LIMIT 1`, [bizId])
          : Promise.resolve({ rows: [] } as any),

        db.query(
          `SELECT ms.*, c.name AS category_name, sc.name AS subcategory_name
           FROM master_services ms
           LEFT JOIN categories c ON c.id = ms.category_id
           LEFT JOIN categories sc ON sc.id = ms.subcategory_id
           WHERE ms.professional_profile_id = $1 AND COALESCE(ms.is_active, TRUE) = TRUE
           ORDER BY ms.id DESC`,
          [profId]
        ),

        db.query(
          `SELECT mp.*, c.name AS category_name, sc.name AS subcategory_name
           FROM master_products mp
           LEFT JOIN categories c ON c.id = mp.category_id
           LEFT JOIN categories sc ON sc.id = mp.subcategory_id
           WHERE mp.professional_profile_id = $1 AND COALESCE(mp.is_active, TRUE) = TRUE
           ORDER BY mp.id DESC`,
          [profId]
        ),

        db.query(
          `SELECT pr.*, u.full_name AS user_name, u.avatar_url AS user_avatar
           FROM platform_reviews pr
           LEFT JOIN users u ON u.id = pr.user_id
           WHERE pr.professional_id = $1 AND COALESCE(pr.is_approved, TRUE) = TRUE
           ORDER BY pr.id DESC LIMIT 20`,
          [profId]
        ),
      ]);

      const associatedBusiness =
        bizSettled.status === "fulfilled" && bizSettled.value.rows.length > 0
          ? bizSettled.value.rows[0]
          : null;
      const services = servicesSettled.status === "fulfilled" ? servicesSettled.value.rows : [];
      const products = productsSettled.status === "fulfilled" ? productsSettled.value.rows : [];
      const reviews = reviewsSettled.status === "fulfilled" ? reviewsSettled.value.rows : [];

      return {
        type: "professional" as const,
        professional,
        associatedBusiness,
        services,
        products,
        reviews,
      };
    }

    return null;
  } catch (error) {
    console.error("fetchSeoProfileData error:", error);
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const data = await fetchSeoProfileData(resolved.category, resolved.slug);

  if (!data) {
    return {
      title: "Listing Not Found | EduBird Marketplace",
      description: "The requested business or professional profile could not be found.",
    };
  }

  if (data.type === "business") {
    const biz = data.business;
    const locationStr = [biz.locality, biz.city, biz.state].filter(Boolean).join(", ") || "India";
    const subcatOrCat = biz.subcategory_name || biz.category_name || "Services";
    const title = `${biz.name} - ${subcatOrCat} in ${locationStr} | Verified Business`;
    const description = `Contact ${biz.name} in ${locationStr}. Top rated ${subcatOrCat} offering quality products, professional services, customer reviews, and online appointments.`;
    const canonical = buildBusinessSeoUrl(biz);

    return {
      title,
      description,
      keywords: [
        biz.name,
        biz.subcategory_name,
        biz.category_name,
        locationStr,
        `best ${subcatOrCat} in ${locationStr}`,
        `top business in ${biz.city || locationStr}`,
        "verified local business",
      ].filter(Boolean),
      alternates: {
        canonical,
      },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: "EduBird Local Business Marketplace",
        type: "website",
        images: biz.banner_url || biz.logo_url ? [{ url: biz.banner_url || biz.logo_url }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: biz.banner_url || biz.logo_url ? [biz.banner_url || biz.logo_url] : [],
      },
    };
  } else {
    const prof = data.professional;
    const locationStr = [prof.locality, prof.city, prof.state].filter(Boolean).join(", ") || "India";
    const title = `${prof.name} - ${prof.designation || prof.profession_type || "Professional Consultant"} in ${locationStr}`;
    const description = `Consult with ${prof.name} in ${locationStr}. Verified expert specializing in ${prof.designation || "consultancy"}. View certifications, pricing, and book consultations online.`;
    const canonical = buildProfessionalSeoUrl(prof);

    return {
      title,
      description,
      keywords: [
        prof.name,
        prof.designation,
        prof.profession_type,
        locationStr,
        `consultant in ${locationStr}`,
        "verified professional expert",
      ].filter(Boolean),
      alternates: {
        canonical,
      },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "profile",
        images: prof.avatar_url || prof.banner_url ? [{ url: prof.avatar_url || prof.banner_url }] : [],
      },
    };
  }
}

export default async function SeoCategoryProfilePage({ params }: Props) {
  const resolved = await params;
  const data = await fetchSeoProfileData(resolved.category, resolved.slug);

  if (!data) {
    notFound();
  }

  if (data.type === "business") {
    const biz = data.business;
    const locationStr = [biz.locality, biz.city, biz.state].filter(Boolean).join(", ");
    const canonicalUrl = buildBusinessSeoUrl(biz);

    // JSON-LD LocalBusiness Structured Schema for Google Ranking
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: biz.name,
      description: biz.about || `Verified business offering top products and services in ${locationStr}`,
      image: biz.logo_url || biz.banner_url || undefined,
      telephone: biz.phone || undefined,
      email: biz.email || undefined,
      address: {
        "@type": "PostalAddress",
        streetAddress: biz.address || undefined,
        addressLocality: biz.locality || biz.city || undefined,
        addressRegion: biz.state || undefined,
        postalCode: biz.postal_code || undefined,
        addressCountry: biz.country_code || "IN",
      },
      aggregateRating: biz.avg_rating
        ? {
            "@type": "AggregateRating",
            ratingValue: String(biz.avg_rating),
            reviewCount: String(biz.review_count || data.reviews.length || 1),
          }
        : undefined,
      url: canonicalUrl,
    };

    return (
      <>
        {/* Local SEO JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Suspense fallback={<div className="min-h-screen bg-background p-8 text-center text-sm">Loading business profile...</div>}>
          <PublicBusinessProfileClient
            business={biz}
            products={data.products}
            services={data.services}
            professionals={data.professionals}
            reviews={data.reviews}
          />
        </Suspense>
      </>
    );
  }

  // Professional Profile
  const prof = data.professional;
  const canonicalUrl = buildProfessionalSeoUrl(prof);
  const locationStr = [prof.locality, prof.city, prof.state].filter(Boolean).join(", ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: prof.name,
    jobTitle: prof.designation || prof.profession_type || "Professional",
    description: prof.about || `Verified professional expert consultant in ${locationStr}`,
    image: prof.avatar_url || undefined,
    telephone: prof.phone || undefined,
    email: prof.email || undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: prof.locality || prof.city || undefined,
      addressRegion: prof.state || undefined,
      addressCountry: prof.country_code || "IN",
    },
    url: canonicalUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<div className="min-h-screen bg-background p-8 text-center text-sm">Loading professional profile...</div>}>
        <PublicProfessionalProfileClient
          professional={prof}
          services={data.services}
          products={data.products}
          associatedBusiness={data.associatedBusiness}
          reviews={data.reviews}
        />
      </Suspense>
    </>
  );
}
