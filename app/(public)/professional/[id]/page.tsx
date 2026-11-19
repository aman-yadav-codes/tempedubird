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

    if (idOrSlug === "5717" || numId === 5717 || idOrSlug.includes("deepak")) {
      return {
        redirectTo: "/education-coaching/deepak-yadav-in-pandeypur-varanasi",
      };
    }

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
          s.id,
          s.title AS name,
          s.slug,
          COALESCE(s.pricing_model, 'fixed_price') AS pricing_model,
          s.price AS regular_price,
          s.sale_price AS discounted_price,
          COALESCE(s.sale_price, s.price, 0) AS price,
          'INR' AS currency,
          COALESCE(s.image_url, ms.default_image_url) AS default_image_url,
          ms.images,
          s.description,
          COALESCE(s.duration_minutes || ' mins', ms.estimated_duration, '30 mins') AS estimated_duration,
          COALESCE(s.service_location, ms.service_location, 'At Center') AS service_location,
          COALESCE(sc.name, s.category, c.name, 'General') AS category_name,
          ssc.name AS subcategory_name
        FROM services s
        LEFT JOIN service_categories sc ON sc.id = s.category_id
        LEFT JOIN master_services ms ON ms.id = s.master_service_id
        LEFT JOIN categories c ON c.id = ms.category_id
        LEFT JOIN categories ssc ON ssc.id = ms.subcategory_id
        WHERE (s.professional_profile_id = $1 OR ($2::int IS NOT NULL AND s.business_profile_id = $2))
          AND COALESCE(s.status, 'active') = 'active'
        ORDER BY s.id DESC`,
        [profId, bizId]
      ),

      // Products (if any)
      db.query(
        `SELECT
          p.id,
          p.title AS name,
          p.slug,
          COALESCE(mp.brand, 'Generic') AS brand,
          b.name AS brand_name,
          p.price AS regular_price,
          p.sale_price AS discounted_price,
          COALESCE(p.sale_price, p.price, 0) AS price,
          'INR' AS currency,
          COALESCE(p.image_url, mp.default_image_url) AS default_image_url,
          mp.images,
          p.description,
          COALESCE(p.unit, 'piece') AS unit_of_measurement,
          COALESCE(p.unit, 'piece') AS unit,
          COALESCE(p.unit_quantity, 1) AS unit_quantity,
          COALESCE(pc.name, p.category, c.name, 'General') AS category_name,
          sc.name AS subcategory_name,
          p.stock_quantity
        FROM products p
        LEFT JOIN product_categories pc ON pc.id = p.category_id
        LEFT JOIN master_products mp ON mp.id = p.master_product_id
        LEFT JOIN brands b ON b.id = mp.brand_id
        LEFT JOIN categories c ON c.id = mp.category_id
        LEFT JOIN categories sc ON sc.id = mp.subcategory_id
        WHERE (p.professional_profile_id = $1 OR ($2::int IS NOT NULL AND p.business_profile_id = $2))
          AND COALESCE(p.status, 'active') = 'active'
        ORDER BY p.id DESC`,
        [profId, bizId]
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

  // Canonical SEO redirect to category + listing name + location URL
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

