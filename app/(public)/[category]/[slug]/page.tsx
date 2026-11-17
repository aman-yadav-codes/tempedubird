import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/db";
import { extractIdFromSlug } from "@/lib/utils/seo-slug";
import { PublicBusinessProfileClient } from "@/components/profile/public-business-profile-client";
import { PublicProfessionalProfileClient } from "@/components/profile/public-professional-profile-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ category: string; slug: string }> | { category: string; slug: string };
}

const fetchProfileFromCategoryAndSlug = cache(async (category: string, slug: string) => {
  try {
    const { id: numId } = extractIdFromSlug(slug);

    // 1. Try to find matching Business Profile
    // Match exact slug, ID, or check if the URL slug contains the business slug
    const bizRes = await db.query(
      `SELECT
        bp.*,
        c.name AS category_name,
        sc.name AS subcategory_name,
        COALESCE(ip.founder_name, u.full_name) AS owner_name,
        COALESCE(ip.founder_title, 'Founder & Managing Director') AS owner_designation,
        COALESCE(ip.founder_image_url, u.avatar_url) AS owner_image_url,
        COALESCE(ip.phone, bp.phone, u.phone) AS owner_phone,
        COALESCE(bp.whatsapp, ip.phone, bp.phone, u.phone) AS owner_whatsapp,
        COALESCE(ip.email, bp.email, u.email) AS owner_email,
        ip.founder_about AS owner_about
      FROM business_profiles bp
      LEFT JOIN categories c ON c.id = bp.category_id
      LEFT JOIN categories sc ON sc.id = bp.subcategory_id
      LEFT JOIN institution_profiles ip ON ip.id = bp.institution_profile_id
      LEFT JOIN users u ON u.id = bp.user_id
      WHERE (
        bp.slug = $1 
        OR bp.id = $2 
        OR $1 ILIKE '%' || bp.slug || '%'
        OR bp.slug ILIKE '%' || $1 || '%'
      )
      AND COALESCE(bp.is_active, TRUE) = TRUE
      ORDER BY 
        CASE WHEN bp.slug = $1 THEN 1 
             WHEN $1 ILIKE '%' || bp.slug || '%' THEN 2 
             ELSE 3 END
      LIMIT 1`,
      [slug, numId || -1]
    );

    if (bizRes.rows.length > 0) {
      const business = bizRes.rows[0];
      const bizId = business.id;
      const instId = business.institution_profile_id || -1;
      const userId = business.user_id || -1;

      // Concurrently fetch products, services, professionals, reviews, courses, jobs
      const [productsSettled, servicesSettled, professionalsSettled, reviewsSettled, coursesSettled, jobsSettled] = await Promise.allSettled([
        // Products
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
          WHERE (
            p.business_profile_id = $1 
            OR (p.institution_id IS NOT NULL AND p.institution_id = $2)
            OR (p.created_by IS NOT NULL AND p.created_by = $3)
          )
            AND COALESCE(p.status, 'active') = 'active'
          ORDER BY p.id DESC`,
          [bizId, instId, userId]
        ),

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
          WHERE (
            s.business_profile_id = $1 
            OR (s.institution_id IS NOT NULL AND s.institution_id = $2)
            OR (s.created_by IS NOT NULL AND s.created_by = $3)
          )
            AND COALESCE(s.status, 'active') = 'active'
          ORDER BY s.id DESC`,
          [bizId, instId, userId]
        ),

        // Team: Associated Professionals & Institution Staff Members
        db.query(
          `SELECT * FROM (
            -- 1. Registered Professional Profiles
            SELECT
              pp.id::text AS id,
              pp.name,
              COALESCE(pp.slug, 'prof-' || pp.id) AS slug,
              COALESCE(pp.designation, pp.profession_type, 'Professional Specialist') AS designation,
              COALESCE(pp.profession_type, 'Professional') AS profession_type,
              pp.avatar_url,
              COALESCE(pp.experience_years::text, '') AS experience_years,
              COALESCE(pp.city, '') AS city,
              COALESCE(pp.state, '') AS state,
              'professional' AS member_type,
              1 AS sort_order
            FROM professional_profiles pp
            WHERE (pp.business_profile_id = $1 OR (pp.institution_profile_id IS NOT NULL AND pp.institution_profile_id = $2))
              AND COALESCE(pp.is_active, TRUE) = TRUE

            UNION ALL

            -- 2. Staff Members & Faculty from Institution / Business
            SELECT DISTINCT ON (u.id)
              ('staff-' || u.id) AS id,
              COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS name,
              COALESCE(u.id::text, '') AS slug,
              COALESCE(d.name, up.designation, r.name, up.department, 'Staff Member') AS designation,
              COALESCE(r.name, up.department, 'Team Member') AS profession_type,
              COALESCE(up.avatar_url, u.avatar_url) AS avatar_url,
              COALESCE(up.experience_years::text, '') AS experience_years,
              '' AS city,
              '' AS state,
              'staff' AS member_type,
              2 AS sort_order
            FROM users u
            JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
            JOIN roles r ON r.id = im.role_id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            LEFT JOIN designations d ON d.id = up.designation_id
            WHERE (im.institution_id = $2 OR ($2::int = -1 AND u.id = $3))
              AND COALESCE(u.is_deleted, FALSE) = FALSE
              AND r.code NOT IN ('student', 'guardian', 'parent')
          ) team
          ORDER BY sort_order ASC, name ASC`,
          [bizId, instId, userId]
        ),

        // Reviews
        db.query(
          `SELECT
            er.id,
            er.rating,
            COALESCE(er.title, 'Verified Review') AS title,
            COALESCE(er.comment, er.title, 'Great experience and high quality service.') AS review,
            COALESCE(er.comment, er.title, 'Great experience and high quality service.') AS comment,
            COALESCE(er.reviewer_name, 'Customer') AS user_name,
            er.reviewer_role,
            er.is_verified_user,
            er.created_at
          FROM entity_reviews er
          WHERE (er.entity_type = 'business' AND er.entity_id = $1)
             OR (er.entity_type = 'institution' AND er.entity_id = $2)
          ORDER BY er.created_at DESC LIMIT 50`,
          [bizId, instId]
        ),

        // Courses: Inherited / Created Institution & Business Courses
        db.query(
          `SELECT
            ic.id,
            COALESCE(ic.course_name, mc.name) AS name,
            COALESCE(ic.slug, mc.slug, 'course-' || ic.id) AS slug,
            COALESCE(ic.code, mc.code) AS code,
            COALESCE(ic.description, mc.description) AS description,
            COALESCE(mc.duration_value, 1) AS duration_value,
            COALESCE(mc.duration_unit, 'Year') AS duration_unit,
            COALESCE(ic.thumbnail_url, mc.thumbnail_url) AS thumbnail_url,
            COALESCE(ic.icon_url, mc.icon_url) AS icon_url,
            COALESCE(ic.board_or_university, mc.university_name) AS university_name,
            COALESCE(mc.authority_type, 'Accredited Program') AS authority_type,
            COALESCE(c.name, mc_cat.name, 'Academic & Certification') AS category_name,
            COALESCE(ic.seats_available, mc.seats_available, 60) AS seats_available,
            COALESCE(ic.fee_amount, 0) AS fee_amount,
            ic.price AS price_text
          FROM institution_courses ic
          LEFT JOIN master_courses mc ON mc.id = ic.master_course_id
          LEFT JOIN categories c ON c.id = ic.category_id
          LEFT JOIN categories mc_cat ON mc_cat.id = mc.category_id
          WHERE (
            ic.business_profile_id = $1
            OR (ic.institution_id IS NOT NULL AND ic.institution_id = $2)
          )
            AND COALESCE(ic.is_active, TRUE) = TRUE
          ORDER BY ic.id DESC
          LIMIT 100`,
          [bizId, instId]
        ),

        // Jobs: Store & Staff Job Postings
        db.query(
          `SELECT
            sjp.id,
            sjp.title,
            COALESCE(sjp.slug, 'job-' || sjp.id) AS slug,
            sjp.department,
            sjp.employment_type,
            sjp.experience_level,
            sjp.work_mode,
            sjp.location,
            sjp.salary_range,
            sjp.openings_count,
            sjp.description,
            sjp.requirements,
            sjp.benefits,
            sjp.status,
            sjp.created_at,
            COALESCE(sjp.department, 'Store Operations') AS category_name
          FROM staff_job_postings sjp
          WHERE (
            (sjp.institution_id IS NOT NULL AND sjp.institution_id = $1)
            OR (sjp.created_by IS NOT NULL AND sjp.created_by = $2)
            OR sjp.institution_id IS NULL
          )
            AND LOWER(COALESCE(sjp.status, 'active')) = 'active'
          ORDER BY sjp.id DESC
          LIMIT 50`,
          [instId, userId]
        ),
      ]);

      return {
        type: "business" as const,
        business,
        products: productsSettled.status === "fulfilled" ? productsSettled.value.rows : [],
        services: servicesSettled.status === "fulfilled" ? servicesSettled.value.rows : [],
        professionals: professionalsSettled.status === "fulfilled" ? professionalsSettled.value.rows : [],
        reviews: reviewsSettled.status === "fulfilled" ? reviewsSettled.value.rows : [],
        courses: coursesSettled.status === "fulfilled" ? coursesSettled.value.rows : [],
        jobs: jobsSettled.status === "fulfilled" ? jobsSettled.value.rows : [],
      };
    }

    // 2. Check if matching Professional Profile
    const profRes = await db.query(
      `SELECT
        pp.*,
        c.name AS category_name,
        sc.name AS subcategory_name
      FROM professional_profiles pp
      LEFT JOIN categories c ON c.id = pp.category_id
      LEFT JOIN categories sc ON sc.id = pp.subcategory_id
      WHERE (pp.slug = $1 OR pp.id = $2 OR $1 ILIKE '%' || pp.slug || '%')
        AND COALESCE(pp.is_active, TRUE) = TRUE 
      ORDER BY 
        CASE WHEN pp.slug = $1 THEN 1 
             WHEN $1 ILIKE '%' || pp.slug || '%' THEN 2 
             ELSE 3 END
      LIMIT 1`,
      [slug, numId || -1]
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
          LEFT JOIN master_products mp ON mp.id = p.master_product_id
          LEFT JOIN product_categories pc ON pc.id = p.category_id
          LEFT JOIN categories c ON c.id = mp.category_id
          LEFT JOIN categories sc ON sc.id = mp.subcategory_id
          LEFT JOIN brands b ON b.id = mp.brand_id
          WHERE (p.professional_profile_id = $1 OR ($2::int IS NOT NULL AND p.business_profile_id = $2))
            AND COALESCE(p.status, 'active') = 'active'
          ORDER BY p.id DESC`,
          [profId, bizId]
        ),

        db.query(
          `SELECT
            r.id,
            r.rating,
            COALESCE(r.comment, r.review) AS comment,
            COALESCE(r.comment, r.review) AS review,
            r.author_name,
            r.user_name,
            r.created_at
          FROM reviews r
          WHERE r.professional_profile_id = $1
            AND COALESCE(r.status, 'approved') = 'approved'
          ORDER BY r.created_at DESC`,
          [profId]
        ),
      ]);

      return {
        type: "professional" as const,
        professional,
        associatedBusiness: bizSettled.status === "fulfilled" && bizSettled.value.rows.length > 0 ? bizSettled.value.rows[0] : null,
        services: servicesSettled.status === "fulfilled" ? servicesSettled.value.rows : [],
        products: productsSettled.status === "fulfilled" ? productsSettled.value.rows : [],
        reviews: reviewsSettled.status === "fulfilled" ? reviewsSettled.value.rows : [],
      };
    }

    return null;
  } catch (err) {
    console.error("Error in fetchProfileFromCategoryAndSlug:", err);
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const data = await fetchProfileFromCategoryAndSlug(resolved.category, resolved.slug);

  if (!data) {
    return { title: "Profile Not Found" };
  }

  if (data.type === "professional") {
    const p = data.professional;
    const location = [p.locality, p.city, p.state].filter(Boolean).join(", ");
    const title = `${p.name}${p.designation ? ` - ${p.designation}` : ""}${location ? ` in ${location}` : ""} | 143Panda`;
    const description = p.about || `Consult with ${p.name}, verified professional expert in ${location || "your area"}.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: p.avatar_url ? [{ url: p.avatar_url }] : [],
      },
    };
  }

  if (!data.business) {
    return { title: "Profile Not Found" };
  }

  const b = data.business;
  const location = [b.locality, b.city, b.state].filter(Boolean).join(", ");
  const title = `${b.name}${location ? ` - ${location}` : ""} | 143Panda`;
  const description = b.about || `Explore products and services offered by ${b.name} in ${location}.`;

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

export default async function CategorySlugListingPage({ params }: Props) {
  const resolved = await params;
  const data = await fetchProfileFromCategoryAndSlug(resolved.category, resolved.slug);

  if (!data) {
    notFound();
  }

  if (data.type === "professional") {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background animate-pulse" />}>
        <PublicProfessionalProfileClient
          professional={data.professional}
          services={data.services}
          products={data.products}
          associatedBusiness={data.associatedBusiness}
          reviews={data.reviews}
        />
      </Suspense>
    );
  }

  if (!data.business) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background animate-pulse" />}>
      <PublicBusinessProfileClient
        business={data.business}
        products={data.products}
        services={data.services}
        professionals={data.professionals}
        reviews={data.reviews}
        courses={data.courses}
        jobs={data.jobs}
      />
    </Suspense>
  );
}
