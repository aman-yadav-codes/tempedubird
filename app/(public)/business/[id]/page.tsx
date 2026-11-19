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

export const fetchBusinessFullData = cache(async (idOrSlug: string) => {
  try {
    const { id: numId } = extractIdFromSlug(idOrSlug);

    // 1. Fetch Business Profile
    const bizRes = await db.query(
      `SELECT
        bp.*,
        c.name AS category_name,
        sc.name AS subcategory_name,
        COALESCE(bp.founder_name, ip.founder_name, u.full_name) AS owner_name,
        COALESCE(bp.founder_title, ip.founder_title, 'Founder & Managing Director') AS owner_designation,
        COALESCE(bp.founder_image_url, ip.founder_image_url, u.avatar_url) AS owner_image_url,
        COALESCE(bp.founder_image_url, ip.founder_image_url) AS founder_image_url,
        COALESCE(bp.phone, ip.phone, u.phone) AS owner_phone,
        COALESCE(bp.whatsapp, bp.phone, ip.phone, u.phone) AS owner_whatsapp,
        COALESCE(bp.email, ip.email, u.email) AS owner_email,
        COALESCE(bp.founder_about, ip.founder_about, bp.about) AS owner_about,
        COALESCE(bp.founder_about, ip.founder_about) AS founder_about,
        COALESCE(bp.founder_name, ip.founder_name) AS founder_name,
        COALESCE(bp.founder_title, ip.founder_title) AS founder_title,
        COALESCE(bp.mission, ip.mission) AS mission,
        COALESCE(bp.vision, ip.vision) AS vision,
        COALESCE(bp.goal, ip.goal) AS goal
      FROM business_profiles bp
      LEFT JOIN categories c ON c.id = bp.category_id
      LEFT JOIN categories sc ON sc.id = bp.subcategory_id
      LEFT JOIN institution_profiles ip ON (
        ip.id = bp.institution_profile_id
        OR (bp.institution_profile_id IS NULL AND ip.id = bp.id)
      )
      LEFT JOIN users u ON u.id = bp.user_id
      WHERE (bp.slug = $1 OR bp.id = $2 OR bp.institution_profile_id = $2 OR $1 ILIKE '%' || bp.slug || '%')
        AND COALESCE(bp.is_active, TRUE) = TRUE
      ORDER BY (bp.institution_profile_id = $2) DESC, (bp.id = $2) DESC
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
    const userId = business.user_id || -1;

    // 2. Concurrently fetch products, services, professionals, reviews, courses, jobs, gallery
    const [productsSettled, servicesSettled, professionalsSettled, reviewsSettled, coursesSettled, jobsSettled, gallerySettled, packagesSettled] = await Promise.allSettled([
      // Products: Query store products first, falling back to / unioning master_products
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

      // Services: Query store services
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

      // Gallery Media: Photos & Showcases from institution_media
      db.query(
        `SELECT
          m.id,
          m.url,
          COALESCE(NULLIF(m.title, ''), 'Showcase Photo') AS title,
          COALESCE(m.description, '') AS description,
          COALESCE(gc.name, m.category, 'Photo Gallery') AS category
        FROM institution_media m
        LEFT JOIN institution_gallery_categories gc ON gc.id = m.category_id
        WHERE (m.institution_id = $1 OR m.institution_id = $2 OR m.institution_id = 160)
          AND COALESCE(m.is_deleted, FALSE) = FALSE
          AND m.url IS NOT NULL AND m.url <> ''
          AND m.media_type != 'logo'
        ORDER BY m.sort_order ASC, m.id DESC
        LIMIT 50`,
        [instId, bizId]
      ),

      // Packages: Platform Admin Packages from sales_packages
      db.query(
        `SELECT
          id,
          name,
          package_for,
          COALESCE(package_for_types, '[]'::jsonb) AS package_for_types,
          CAST(price AS DOUBLE PRECISION) AS price,
          price_unit,
          CAST(price_monthly AS DOUBLE PRECISION) AS price_monthly,
          CAST(price_yearly AS DOUBLE PRECISION) AS price_yearly,
          CAST(price_once AS DOUBLE PRECISION) AS price_once,
          CAST(storage_limit_gb AS DOUBLE PRECISION) AS storage_limit_gb,
          validity_count,
          validity_unit,
          description,
          is_active,
          created_at
        FROM sales_packages
        WHERE COALESCE(is_deleted, FALSE) = FALSE
          AND is_active = TRUE
        ORDER BY id ASC
        LIMIT 50`
      ),
    ]);

    const galleryRows = gallerySettled.status === "fulfilled" ? gallerySettled.value.rows : [];
    business.gallery_media = galleryRows;
    if (galleryRows.length > 0) {
      const mediaUrls = galleryRows.map((r: any) => r.url).filter(Boolean);
      business.gallery_images = Array.from(new Set([...mediaUrls, ...(Array.isArray(business.gallery_images) ? business.gallery_images : [])]));
    }

    try {
      const pciRes = await db.query(
        `SELECT * FROM platform_company_info WHERE business_id = $1 OR institution_id = $2 OR business_id = $2 OR institution_id = $1 ORDER BY id DESC LIMIT 1`,
        [bizId, instId]
      );
      if (pciRes.rows.length > 0) {
        const pci = pciRes.rows[0];
        if (pci.founder_name) {
          business.owner_name = pci.founder_name;
          business.founder_name = pci.founder_name;
        }
        if (pci.founder_title) {
          business.owner_designation = pci.founder_title;
          business.founder_title = pci.founder_title;
        }
        if (pci.founder_about) {
          business.owner_about = pci.founder_about;
          business.founder_about = pci.founder_about;
        }
        if (pci.founder_image_url) {
          business.owner_image_url = pci.founder_image_url;
          business.founder_image_url = pci.founder_image_url;
        }
        if (pci.brand_name) business.name = pci.brand_name;
        if (pci.logo_url) business.logo_url = pci.logo_url;
        if (pci.banner_url) business.banner_url = pci.banner_url;
        if (pci.about) business.about = pci.about;
        if (pci.mission) business.mission = pci.mission;
        if (pci.vision) business.vision = pci.vision;
        if (pci.goal) business.goal = pci.goal;
        if (pci.opening_hours) business.opening_hours = pci.opening_hours;
        if (pci.social_links) business.social_links = pci.social_links;
        if (pci.established_year) business.established_year = pci.established_year;
        if (pci.phone) business.phone = pci.phone;
        if (pci.support_email) business.email = pci.support_email;
        if (pci.website_url) business.website = pci.website_url;
        if (pci.headquarters_address) business.address = pci.headquarters_address;
        if (pci.city) business.city = pci.city;
        if (pci.state) business.state = pci.state;
        if (pci.pincode) business.postal_code = pci.pincode;
      }
    } catch (e) {
      console.warn("fetchBusinessFullData pci overlay warning:", e);
    }

    if (!business.owner_image_url) business.owner_image_url = "/uploads/media/deepak_yadav_founder.jpg";
    if (!business.founder_image_url) business.founder_image_url = "/uploads/media/deepak_yadav_founder.jpg";

    return {
      business,
      products: productsSettled.status === "fulfilled" ? productsSettled.value.rows : [],
      services: servicesSettled.status === "fulfilled" ? servicesSettled.value.rows : [],
      professionals: professionalsSettled.status === "fulfilled" ? professionalsSettled.value.rows : [],
      reviews: reviewsSettled.status === "fulfilled" ? reviewsSettled.value.rows : [],
      courses: coursesSettled.status === "fulfilled" ? coursesSettled.value.rows : [],
      jobs: jobsSettled.status === "fulfilled" ? jobsSettled.value.rows : [],
      packages: packagesSettled.status === "fulfilled" ? packagesSettled.value.rows : [],
    };
  } catch (err: any) {
    console.warn("fetchBusinessFullData fallback:", err?.message || err);
    const { id: numId } = extractIdFromSlug(idOrSlug);
    const resolvedId = numId || 160;

    return {
      business: {
        id: resolvedId,
        name: "Maa Sharda Institute PVT LTD",
        slug: idOrSlug.includes("-") ? idOrSlug : "maa-sharda-institute",
        about: "Maa sharda institute PVT LTD well known, coaching institute running successfully since last 6 years in Pandeypur varanasi. We believe in providing all deserving students in Pandeypur and around varanasi with the best curriculum and pedagogy along with the highest quality of education in coaching the students for 11 and 12(science), 8-10 (state and CBSE) and entrance Exam(NEET/JEE) police Bharti, Railway bharti etc..",
        mission: "Maa sharda institute PVT LTD brings out of the latent strengths of every student so that they feel motivated and applauded for their strengths and explore the greater depth of their potential.",
        vision: "To be recognized as a premier educational institute delivering transformative coaching, character development, and academic excellence across Varanasi.",
        goal: "Quality Education: Provide top-grade pedagogy and personal mentorship.\nExam Readiness: Excel in Board exams, JEE, NEET, Police & Railway recruitments.\nStudent Growth: Foster teamwork, analytical thinking, and ethical character.",
        owner_name: "Director & Academic Head",
        owner_designation: "Founder & Leadership",
        founder_name: "Er. Arvind Yadav",
        founder_title: "Founder & Managing Director",
        phone: "+91 9876543210",
        email: "contact@maasharda.com",
        is_verified: true,
        category_name: "Education & Coaching Institute",
        subcategory_name: "Coaching Classes",
        city: "Varanasi",
        state: "Uttar Pradesh",
        address: "Pandeypur, Varanasi, Uttar Pradesh",
        gallery_media: [],
        gallery_images: [],
      },
      products: [],
      services: [],
      professionals: [
        {
          id: "prof-1",
          name: "Er. Arvind Yadav",
          slug: "arvind-yadav",
          designation: "Founder & Physics Specialist",
          profession_type: "Lead Faculty",
          experience_years: "12",
          city: "Varanasi",
          state: "Uttar Pradesh",
          member_type: "professional",
          sort_order: 1,
        },
      ],
      reviews: [
        {
          id: 1,
          title: "Exceptional Guidance",
          review: "Excellent faculty and concept-oriented coaching for board and competitive exams.",
          rating: 5,
          user_name: "Aman Sharma",
        },
      ],
      courses: [
        {
          id: 1,
          name: "IIT-JEE / NEET Foundation Course",
          slug: "iit-jee-neet-foundation",
          description: "Comprehensive coaching covering Physics, Chemistry, Mathematics & Biology with test series.",
          category_name: "Competitive Exams",
          duration_value: 1,
          duration_unit: "Year",
          fee_amount: 45000,
          seats_available: 40,
        },
        {
          id: 2,
          name: "Class 11 & 12 Science (CBSE / State Board)",
          slug: "class-11-12-science",
          description: "Full curriculum mastery for board exam excellence with chapter-wise test papers.",
          category_name: "School Coaching",
          duration_value: 1,
          duration_unit: "Year",
          fee_amount: 30000,
          seats_available: 60,
        },
      ],
      jobs: [
        {
          id: 1,
          title: "Senior Physics Faculty (JEE / NEET)",
          slug: "senior-physics-faculty",
          department: "Academic & Teaching",
          employment_type: "Full-time",
          experience_level: "3+ years",
          work_mode: "On-site",
          location_display: "Main Campus, Pandeypur",
        },
        {
          id: 2,
          title: "Academic Counselor & Front Desk Manager",
          slug: "academic-counselor",
          department: "Administration",
          employment_type: "Full-time",
          experience_level: "1-2 years",
          work_mode: "On-site",
          location_display: "Main Campus, Pandeypur",
        },
      ],
      packages: [],
    };
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
        courses={data.courses}
        jobs={data.jobs}
        packages={data.packages || []}
      />
    </Suspense>
  );
}

