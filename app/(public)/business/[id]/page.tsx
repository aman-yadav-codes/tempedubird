import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/db";
import { extractIdFromSlug, buildBusinessSeoUrl } from "@/lib/utils/seo-slug";
import { PublicBusinessProfileClient } from "@/components/profile/public-business-profile-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

const fetchBusinessFullData = cache(async (idOrSlug: string) => {
  try {
    const { id: numId } = extractIdFromSlug(idOrSlug);

    // 1. Fetch Business Profile
    const bizRes = await db.query(
      `SELECT
        bp.*,
        c.name AS category_name,
        sc.name AS subcategory_name
      FROM business_profiles bp
      LEFT JOIN categories c ON c.id = bp.category_id
      LEFT JOIN categories sc ON sc.id = bp.subcategory_id
      WHERE (bp.slug = $1 OR bp.id = $2)
        AND COALESCE(bp.is_active, TRUE) = TRUE
      LIMIT 1`,
      [idOrSlug, numId || -1]
    );

    if (bizRes.rows.length === 0) {
      // Check if it's a professional profile by mistake
      const profCheck = await db.query(
        `SELECT slug, id FROM professional_profiles WHERE (slug = $1 OR id = $2) AND COALESCE(is_active, TRUE) = TRUE LIMIT 1`,
        [idOrSlug, numId || -1]
      );
      if (profCheck.rows.length > 0) {
        return {
          redirectTo: `/professional/${profCheck.rows[0].slug || profCheck.rows[0].id}`,
        };
      }
      return null;
    }

    const business = bizRes.rows[0];
    const bizId = business.id;
    const instId = business.institution_profile_id || -1;

    // 2. Concurrently fetch products, services, professionals, reviews
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

      // Associated Professionals
      db.query(
        `SELECT
          pp.id,
          pp.name,
          pp.slug,
          pp.designation,
          pp.profession_type,
          pp.avatar_url,
          pp.experience_years,
          pp.city,
          pp.state
        FROM professional_profiles pp
        WHERE pp.business_profile_id = $1
          AND COALESCE(pp.is_active, TRUE) = TRUE
        ORDER BY pp.id ASC`,
        [bizId]
      ),

      // Reviews
      db.query(
        `SELECT
          r.id,
          r.title,
          r.review,
          r.rating,
          r.created_at,
          u.full_name AS user_name
        FROM institution_reviews r
        LEFT JOIN users u ON u.id = r.user_id
        WHERE (r.institution_id = $1 OR r.institution_id = $2)
          AND COALESCE(r.is_approved, TRUE) = TRUE
        ORDER BY r.id DESC
        LIMIT 20`,
        [instId, bizId]
      ),
    ]);

    return {
      business,
      products: productsSettled.status === "fulfilled" ? productsSettled.value.rows : [],
      services: servicesSettled.status === "fulfilled" ? servicesSettled.value.rows : [],
      professionals: professionalsSettled.status === "fulfilled" ? professionalsSettled.value.rows : [],
      reviews: reviewsSettled.status === "fulfilled" ? reviewsSettled.value.rows : [],
    };
  } catch (err: any) {
    console.error("fetchBusinessFullData error:", err?.message || err);
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const data = await fetchBusinessFullData(resolvedParams.id);

  if (!data || data.redirectTo || !data.business) {
    return {
      title: "Business Profile | EduBird Marketplace",
    };
  }

  const b = data.business;
  const title = `${b.name} - ${b.category_name || b.business_type || "Business Profile"}`;
  const description = b.about?.slice(0, 160) || `Explore products and services from ${b.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: b.banner_url || b.logo_url ? [{ url: b.banner_url || b.logo_url }] : [],
    },
  };
}

export default async function BusinessProfilePage({ params }: Props) {
  const resolvedParams = await params;
  const data = await fetchBusinessFullData(resolvedParams.id);

  if (data?.redirectTo) {
    redirect(data.redirectTo);
  }

  if (!data || !data.business) {
    notFound();
  }

  // Canonical SEO redirect to category + subcategory + location URL
  const canonicalSeoUrl = buildBusinessSeoUrl(data.business);
  if (canonicalSeoUrl && !canonicalSeoUrl.startsWith("/business/")) {
    redirect(canonicalSeoUrl);
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background animate-pulse" />}>
      <PublicBusinessProfileClient
        business={data.business}
        products={data.products}
        services={data.services}
        professionals={data.professionals}
        reviews={data.reviews}
      />
    </Suspense>
  );
}

