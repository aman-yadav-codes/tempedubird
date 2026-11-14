import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/db";
import { extractIdFromSlug, buildProfessionalSeoUrl } from "@/lib/utils/seo-slug";
import { PublicProfessionalProfileClient } from "@/components/profile/public-professional-profile-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

const fetchProfessionalFullData = cache(async (idOrSlug: string) => {
  try {
    const { id: numId } = extractIdFromSlug(idOrSlug);

    // 1. Fetch Professional Profile
    const profRes = await db.query(
      `SELECT
        pp.*,
        c.name AS category_name,
        sc.name AS subcategory_name
      FROM professional_profiles pp
      LEFT JOIN categories c ON c.id = pp.category_id
      LEFT JOIN categories sc ON sc.id = pp.subcategory_id
      WHERE (pp.slug = $1 OR pp.id = $2)
        AND COALESCE(pp.is_active, TRUE) = TRUE
      LIMIT 1`,
      [idOrSlug, numId || -1]
    );

    if (profRes.rows.length === 0) {
      // Check if it's a business profile by mistake
      const bizCheck = await db.query(
        `SELECT slug, id FROM business_profiles WHERE (slug = $1 OR id = $2) AND COALESCE(is_active, TRUE) = TRUE LIMIT 1`,
        [idOrSlug, numId || -1]
      );
      if (bizCheck.rows.length > 0) {
        return {
          redirectTo: `/business/${bizCheck.rows[0].slug || bizCheck.rows[0].id}`,
        };
      }
      return null;
    }

    const professional = profRes.rows[0];
    const profId = professional.id;
    const instId = professional.institution_profile_id || -1;
    const bizId = professional.business_profile_id || null;

    // 2. Concurrently fetch associated business, services, products, reviews
    const [bizSettled, servicesSettled, productsSettled, reviewsSettled] = await Promise.allSettled([
      // Associated business
      bizId
        ? db.query(`SELECT id, name, slug, logo_url, city, state FROM business_profiles WHERE id = $1 LIMIT 1`, [bizId])
        : Promise.resolve({ rows: [] } as any),

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
        WHERE ms.professional_profile_id = $1
          AND COALESCE(ms.is_active, TRUE) = TRUE
        ORDER BY ms.id DESC`,
        [profId]
      ),

      // Products (if any)
      db.query(
        `SELECT
          mp.id,
          mp.name,
          mp.slug,
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
        LEFT JOIN units u ON u.id = mp.unit_id
        LEFT JOIN categories c ON c.id = mp.category_id
        LEFT JOIN categories sc ON sc.id = mp.subcategory_id
        WHERE mp.professional_profile_id = $1
          AND COALESCE(mp.is_active, TRUE) = TRUE
        ORDER BY mp.id DESC`,
        [profId]
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
        WHERE (r.institution_id = $1 OR r.teacher_id = $2)
          AND COALESCE(r.is_approved, TRUE) = TRUE
        ORDER BY r.id DESC
        LIMIT 20`,
        [instId, profId]
      ),
    ]);

    return {
      professional,
      associatedBusiness: bizSettled.status === "fulfilled" && bizSettled.value.rows.length > 0 ? bizSettled.value.rows[0] : null,
      services: servicesSettled.status === "fulfilled" ? servicesSettled.value.rows : [],
      products: productsSettled.status === "fulfilled" ? productsSettled.value.rows : [],
      reviews: reviewsSettled.status === "fulfilled" ? reviewsSettled.value.rows : [],
    };
  } catch (err: any) {
    console.error("fetchProfessionalFullData error:", err?.message || err);
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const data = await fetchProfessionalFullData(resolvedParams.id);

  if (!data || data.redirectTo || !data.professional) {
    return {
      title: "Professional Profile | EduBird Marketplace",
    };
  }

  const p = data.professional;
  const title = `${p.name} - ${p.designation || p.profession_type || "Professional Consultant"}`;
  const description = p.about || p.introduction || `Consult with ${p.name} on EduBird.`;

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 160),
      images: p.banner_url || p.avatar_url ? [{ url: p.banner_url || p.avatar_url }] : [],
    },
  };
}

export default async function ProfessionalProfilePage({ params }: Props) {
  const resolvedParams = await params;
  const data = await fetchProfessionalFullData(resolvedParams.id);

  if (data?.redirectTo) {
    redirect(data.redirectTo);
  }

  if (!data || !data.professional) {
    notFound();
  }

  // Canonical SEO redirect to category + subcategory + location URL
  const canonicalSeoUrl = buildProfessionalSeoUrl(data.professional);
  if (canonicalSeoUrl && !canonicalSeoUrl.startsWith("/professional/")) {
    redirect(canonicalSeoUrl);
  }

  return (
    <PublicProfessionalProfileClient
      professional={data.professional}
      services={data.services}
      products={data.products}
      associatedBusiness={data.associatedBusiness}
      reviews={data.reviews}
    />
  );
}

