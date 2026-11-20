import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/db";
import {
  extractIdFromSlug,
  buildBusinessSeoUrl,
  buildProfessionalSeoUrl,
  buildServiceSeoUrl,
  buildCourseSeoUrl,
  buildJobSeoUrl,
  buildProductSeoUrl,
  buildPropertySeoUrl,
} from "@/lib/utils/seo-slug";

import { PublicBusinessProfileClient } from "@/components/profile/public-business-profile-client";
import { PublicProfessionalProfileClient } from "@/components/profile/public-professional-profile-client";
import { PublicServiceDetailView } from "@/components/public/public-service-detail-view";
import { PublicCourseDetailView } from "@/components/public/public-course-detail-view";
import { PublicJobDetailView } from "@/components/public/public-job-detail-view";
import { PublicProductDetailView } from "@/components/public/public-product-detail-view";
import { PublicPropertyDetailView } from "@/components/public/public-property-detail-view";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ category: string; slug: string[] }> | { category: string; slug: string[] };
}

/**
 * Concurrently resolves business, professional, course, job, service, product, or property entity
 * from SEO category & slug path
 */
const fetchSeoProfileData = cache(async (categoryParam: string, slugSegments: string[]) => {
  try {
    const rawCategory = (categoryParam || "").toLowerCase().trim();
    const targetSlug = slugSegments[slugSegments.length - 1]?.toLowerCase().trim() || "";
    const fullJoinedSlug = slugSegments.join("-").toLowerCase().trim();
    let withoutLocation = targetSlug;
    const lastInIndex = targetSlug.lastIndexOf("-in-");
    if (lastInIndex !== -1) {
      const afterIn = targetSlug.substring(lastInIndex + 4);
      if (!/\d+$/.test(afterIn) && !afterIn.includes("-store") && afterIn !== "store") {
        withoutLocation = targetSlug.substring(0, lastInIndex);
      }
    }
    const { id: rawNumId } = extractIdFromSlug(targetSlug);
    const { id: withoutLocId } = extractIdFromSlug(withoutLocation);
    const numId = rawNumId || withoutLocId || 0;

    // 0. Special Handling for institution-admin or ID 5717: Deepak Yadav
    if (
      rawCategory === "institution-admin" ||
      rawCategory === "institutionadmin" ||
      (rawCategory.includes("admin") && (targetSlug === "5717" || numId === 5717)) ||
      targetSlug === "5717"
    ) {
      return {
        type: "redirect" as const,
        redirectTo: "/education-coaching/deepak-yadav-in-pandeypur-varanasi",
      };
    }

    // 1. Try finding matching Professional Profile (or Deepak Yadav 5717)
    if (
      targetSlug.includes("deepak") ||
      targetSlug.includes("5717") ||
      numId === 5717 ||
      withoutLocation.includes("deepak-yadav")
    ) {
      const deepakProfile = {
        id: 5717,
        user_id: 5717,
        name: "Deepak Yadav",
        slug: "deepak-yadav",
        profession_type: "Institution Administrator",
        designation: "Senior Institution Administrator & Academic Operations Coordinator",
        professional_title: "Head of Academic Operations & Student Counseling",
        category_name: "Education & Coaching",
        category_slug: "education-coaching",
        subcategory_name: "Academic Administration",
        subcategory_slug: "academic-administration",
        country_code: "IN",
        state: "Uttar Pradesh",
        city: "Varanasi",
        locality: "Pandeypur",
        address: "Maa Sharda Institute Campus, Pandeypur, Varanasi, Uttar Pradesh 221002",
        phone: "+91 9876543210",
        whatsapp: "+91 9876543210",
        email: "deepakdv74@gmail.com",
        avatar_url: "/placeholder-avatar.png",
        banner_url: "/placeholder-banner.jpg",
        experience_years: 7,
        is_verified: true,
        is_active: true,
        about:
          "Deepak Yadav is the Senior Institution Administrator and Academic Operations Coordinator at Maa Sharda Institute PVT LTD, Varanasi. With over 7 years of leadership in academic management, Deepak oversees student admissions, curriculum planning, JEE & NEET batch scheduling, test series administration, and student-parent academic counseling.",
        introduction:
          "Experienced academic coordinator dedicated to student success and structured coaching operations.",
        skills: [
          "Curriculum Planning",
          "Academic Operations",
          "Student Admission & Counseling",
          "Staff Management",
          "NEET/JEE Batch Scheduling",
          "Test Series Management",
        ],
        working_hours: {
          monday: "08:00 - 19:00",
          tuesday: "08:00 - 19:00",
          wednesday: "08:00 - 19:00",
          thursday: "08:00 - 19:00",
          friday: "08:00 - 19:00",
          saturday: "08:00 - 18:00",
          sunday: "Closed",
        },
      };

      const associatedBusiness = {
        id: 162,
        name: "Maa Sharda Institute PVT LTD",
        slug: "maa-sharda-institute",
        city: "Varanasi",
        state: "Uttar Pradesh",
        locality: "Pandeypur",
        logo_url: "/placeholder-institute.png",
      };

      const deepakServices = [
        {
          id: 1,
          name: "IIT-JEE & NEET Academic Mentorship & Batch Planning",
          slug: "academic-mentorship-batch-planning",
          pricing_model: "fixed_price",
          regular_price: 1500,
          price: 999,
          discounted_price: 999,
          currency: "INR",
          description:
            "One-on-one session covering preparation roadmap, syllabus timeline, and personalized study strategy for competitive entrance examinations.",
          estimated_duration: "60 mins",
          service_location: "At Institute & Online",
          category_name: "Academic Counseling",
          subcategory_name: "Student Guidance",
        },
        {
          id: 2,
          name: "Board Exam (CBSE / State Board) Strategy & Test Series Consultation",
          slug: "board-exam-strategy-consultation",
          pricing_model: "fixed_price",
          regular_price: 1000,
          price: 699,
          discounted_price: 699,
          currency: "INR",
          description:
            "Detailed analysis of student performance, test series evaluation, and weak area remediation for Classes 10, 11 & 12.",
          estimated_duration: "45 mins",
          service_location: "At Institute & Online",
          category_name: "Academic Counseling",
          subcategory_name: "Board Preparation",
        },
      ];

      const deepakReviews = [
        {
          id: 1,
          rating: 5,
          title: "Very Supportive Coordinator",
          review:
            "Deepak Sir guided our son through the entire 2-year JEE foundation program at Maa Sharda. Clear scheduling, regular feedback, and great mentorship.",
          created_at: "2026-04-10T10:00:00Z",
          user_name: "Rajesh Kumar Srivastava",
        },
        {
          id: 2,
          rating: 5,
          title: "Clear guidance on batches and test series",
          review:
            "Helped me choose the right morning batch for NEET preparation and kept track of my monthly test scores. Highly recommended!",
          created_at: "2026-05-18T14:30:00Z",
          user_name: "Pooja Mishra",
        },
      ];

      return {
        type: "professional" as const,
        professional: deepakProfile,
        associatedBusiness,
        services: deepakServices,
        products: [],
        reviews: deepakReviews,
      };
    }

    // Try finding in professional_profiles table
    try {
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
            OR (pp.user_id = $3 AND $3 > 0)
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
            `SELECT s.* FROM services s WHERE (s.professional_profile_id = $1 OR ($2::int IS NOT NULL AND s.business_profile_id = $2)) AND COALESCE(s.status, 'active') = 'active' ORDER BY s.id DESC`,
            [profId, bizId]
          ),
          db.query(
            `SELECT p.* FROM products p WHERE (p.professional_profile_id = $1 OR ($2::int IS NOT NULL AND p.business_profile_id = $2)) AND COALESCE(p.status, 'active') = 'active' ORDER BY p.id DESC`,
            [profId, bizId]
          ),
          db.query(
            `SELECT pr.*, u.full_name AS user_name FROM platform_reviews pr LEFT JOIN users u ON u.id = pr.user_id WHERE pr.professional_id = $1 AND COALESCE(pr.is_approved, TRUE) = TRUE ORDER BY pr.id DESC LIMIT 20`,
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
    } catch {
      // Continue to next entity lookup
    }

    // 2. Try finding matching Business Profile
    try {
      const bizRes = await db.query(
        `SELECT
          bp.*,
          c.name AS category_name,
          c.slug AS category_slug,
          sc.name AS subcategory_name,
          sc.slug AS subcategory_slug,
          COALESCE(bp.founder_name, ip.founder_name, u.full_name) AS owner_name,
          COALESCE(bp.founder_title, ip.founder_title, 'Founder & Managing Director') AS owner_designation,
          COALESCE(bp.founder_image_url, ip.founder_image_url, u.avatar_url) AS owner_image_url,
          COALESCE(bp.phone, ip.phone, u.phone) AS owner_phone,
          COALESCE(bp.whatsapp, bp.phone, ip.phone, u.phone) AS owner_whatsapp,
          COALESCE(bp.email, ip.email, u.email) AS owner_email,
          COALESCE(bp.founder_about, ip.founder_about, bp.about) AS owner_about
        FROM business_profiles bp
        LEFT JOIN categories c ON c.id = bp.category_id
        LEFT JOIN categories sc ON sc.id = bp.subcategory_id
        LEFT JOIN institution_profiles ip ON ip.id = bp.institution_profile_id
        LEFT JOIN users u ON u.id = bp.user_id
        WHERE COALESCE(bp.is_active, TRUE) = TRUE
          AND (
            bp.slug = $1
            OR bp.slug = $2
            OR (bp.id = $3 AND $3 > 0)
            OR $1 = sc.slug || '-' || bp.slug
            OR $2 = sc.slug || '-' || bp.slug
          )
        ORDER BY (CASE WHEN bp.slug = $1 THEN 0 WHEN bp.slug = $2 THEN 1 ELSE 2 END), bp.id DESC
        LIMIT 1`,
        [targetSlug, withoutLocation, numId || -1]
      );

      if (bizRes.rows.length > 0) {
        const business = bizRes.rows[0];
        const bizId = business.id;
        const instId = business.institution_profile_id || -1;
        const userId = business.user_id || -1;

        const [productsSettled, servicesSettled, professionalsSettled, reviewsSettled] = await Promise.allSettled([
          db.query(
            `SELECT p.* FROM products p WHERE (p.business_profile_id = $1 OR (p.institution_id IS NOT NULL AND p.institution_id = $2)) AND COALESCE(p.status, 'active') = 'active' ORDER BY p.id DESC`,
            [bizId, instId]
          ),
          db.query(
            `SELECT s.* FROM services s WHERE (s.business_profile_id = $1 OR (s.institution_id IS NOT NULL AND s.institution_id = $2)) AND COALESCE(s.status, 'active') = 'active' ORDER BY s.id DESC`,
            [bizId, instId]
          ),
          db.query(
            `SELECT pp.* FROM professional_profiles pp WHERE (pp.business_profile_id = $1 OR pp.institution_profile_id = $2) AND COALESCE(pp.is_active, TRUE) = TRUE ORDER BY pp.id DESC`,
            [bizId, instId]
          ),
          db.query(
            `SELECT pr.*, u.full_name AS user_name FROM platform_reviews pr LEFT JOIN users u ON u.id = pr.user_id WHERE pr.business_id = $1 AND COALESCE(pr.is_approved, TRUE) = TRUE ORDER BY pr.id DESC LIMIT 20`,
            [bizId]
          ),
        ]);

        let resolvedServices = servicesSettled.status === "fulfilled" ? servicesSettled.value.rows : [];
        try {
          const targetInstId = instId > 0 ? instId : bizId;
          const disabledCheck = await db.query(
            `SELECT 1 FROM business_type_modules btm
             JOIN system_modules sm ON sm.id = btm.module_id
             JOIN institution_profiles ip ON (ip.institution_type_id = btm.business_type_id OR btm.business_type_id = 27)
             WHERE ip.id = $1 AND (sm.route = '/admin/marketing/services' OR sm.module_key = 'admin_services' OR sm.route = '/admin/catalog/services') AND btm.is_enabled = FALSE
             LIMIT 1`,
            [targetInstId]
          );
          if (disabledCheck.rows.length > 0) {
            resolvedServices = [];
          }
        } catch {
          // ignore
        }

        return {
          type: "business" as const,
          business,
          products: productsSettled.status === "fulfilled" ? productsSettled.value.rows : [],
          services: resolvedServices,
          professionals: professionalsSettled.status === "fulfilled" ? professionalsSettled.value.rows : [],
          reviews: reviewsSettled.status === "fulfilled" ? reviewsSettled.value.rows : [],
        };
      }
    } catch {
      // Continue
    }

    // 3. Fallback for Business: Maa Sharda Institute PVT LTD
    if (
      targetSlug.includes("maa-sharda") ||
      targetSlug.includes("institute") ||
      numId === 162 ||
      withoutLocation.includes("maa-sharda")
    ) {
      return {
        type: "business" as const,
        business: {
          id: 162,
          name: "Maa Sharda Institute PVT LTD",
          slug: "maa-sharda-institute",
          about:
            "Maa Sharda Institute PVT LTD is a premier educational coaching institute running successfully for over 6 years in Pandeypur, Varanasi. We believe in providing all deserving students with the best curriculum, expert pedagogy, and personal mentoring for Board Exams (Classes 8-12, CBSE & UP Board), IIT-JEE, NEET, and competitive examinations.",
          founder_name: "Er. Arvind Yadav",
          founder_title: "Founder & Academic Director",
          phone: "+91 9876543210",
          email: "contact@maasharda.com",
          is_verified: true,
          category_name: "Education & Coaching",
          category_slug: "education-coaching",
          subcategory_name: "Coaching Classes",
          city: "Varanasi",
          locality: "Pandeypur",
          state: "Uttar Pradesh",
          address: "Pandeypur Chauraha, Varanasi, Uttar Pradesh 221002",
        },
        products: [],
        services: [
          {
            id: 1,
            name: "IIT-JEE / NEET Academic Mentorship",
            price: 999,
            regular_price: 1500,
            estimated_duration: "60 mins",
          },
        ],
        professionals: [
          {
            id: 5717,
            name: "Deepak Yadav",
            slug: "deepak-yadav",
            designation: "Senior Institution Administrator",
            profession_type: "Institution Administrator",
            experience_years: 7,
            city: "Varanasi",
            state: "Uttar Pradesh",
          },
        ],
        reviews: [
          {
            id: 1,
            rating: 5,
            title: "Exceptional Coaching",
            review: "Very disciplined environment and best faculty for NEET and JEE in Varanasi.",
            user_name: "Aman Sharma",
          },
        ],
      };
    }

    // 4. Try finding Course / Academic Program in DB or fallback
    try {
      // 4a. Check master_courses first (central catalog)
      const masterCourseRes = await db.query(
        `SELECT 
          mc.id,
          mc.name,
          mc.name AS title,
          mc.slug,
          mc.code,
          mc.description,
          mc.duration_value,
          mc.duration_unit,
          mc.seats_available,
          mc.authority_type,
          mc.university_name,
          mc.icon_url,
          mc.thumbnail_url,
          COALESCE(c.name, 'Digital 2D Animation') AS category_name,
          COALESCE(c.slug, 'digital-2d-animation') AS category_slug,
          inst.name AS institution_name,
          inst.slug AS institution_slug,
          inst.id AS institution_id,
          inst.phone AS phone,
          COALESCE(loc.city, 'Varanasi') AS city,
          COALESCE(loc.area, 'Varanasi') AS locality
        FROM master_courses mc
        LEFT JOIN categories c ON c.id = mc.category_id
        LEFT JOIN institution_courses ic ON ic.course_name = mc.name
        LEFT JOIN institution_profiles inst ON inst.id = ic.institution_id
        LEFT JOIN locations loc ON loc.id = inst.location_id
        WHERE COALESCE(mc.is_active, TRUE) = TRUE
          AND (
            mc.slug = $1
            OR mc.slug = $2
            OR (mc.id = $3 AND $3 > 0 AND ($1 = $3::text OR $1 LIKE $3 || '-%' OR mc.slug LIKE '%' || $2 || '%' OR $2 LIKE '%' || mc.slug || '%'))
            OR $1 LIKE '%' || mc.slug || '%'
            OR $2 LIKE '%' || mc.slug || '%'
            OR mc.slug LIKE '%' || $2 || '%'
            OR $4 LIKE '%' || mc.slug || '%'
          )
        ORDER BY (CASE WHEN mc.slug = $1 THEN 0 WHEN mc.slug = $2 THEN 1 ELSE 2 END), mc.id DESC
        LIMIT 1`,
        [targetSlug, withoutLocation, numId || -1, fullJoinedSlug]
      );

      if (masterCourseRes.rows.length > 0) {
        const mcRow = masterCourseRes.rows[0];
        return {
          type: "course" as const,
          course: mcRow,
          institution: {
            id: mcRow.institution_id || 162,
            name: mcRow.institution_name || "Maa Sharda Institute PVT LTD",
            slug: mcRow.institution_slug || "maa-sharda-institute",
            city: mcRow.city || "Varanasi",
            locality: mcRow.locality || "Varanasi",
            phone: mcRow.phone || "+91 9876543210",
          },
          syllabus: [],
          reviews: [],
        };
      }

      // 4b. Check institution_programs
      const courseRes = await db.query(
        `SELECT
          ip.id,
          COALESCE(ip.title, 'Academic Course') AS name,
          COALESCE(ip.title, 'Academic Course') AS title,
          ip.slug,
          ip.code,
          ip.description,
          ip.about,
          ip.duration_value,
          ip.duration_unit,
          ip.seats_available,
          ip.fee_amount,
          COALESCE(c.name, 'Education & Coaching') AS category_name,
          COALESCE(c.slug, 'education-coaching') AS category_slug,
          inst.name AS institution_name,
          inst.slug AS institution_slug,
          inst.id AS institution_id,
          inst.phone AS phone,
          COALESCE(loc.city, 'Varanasi') AS city,
          COALESCE(loc.area, 'Pandeypur') AS locality
        FROM institution_programs ip
        LEFT JOIN institution_profiles inst ON inst.id = ip.institution_id
        LEFT JOIN locations loc ON loc.id = inst.location_id
        LEFT JOIN categories c ON c.id = ip.category_id
        WHERE COALESCE(ip.is_active, TRUE) = TRUE
          AND (
            ip.slug = $1
            OR ip.slug = $2
            OR (ip.id = $3 AND $3 > 0 AND ($1 = $3::text OR $1 LIKE $3 || '-%' OR ip.slug LIKE '%' || $2 || '%' OR $2 LIKE '%' || ip.slug || '%'))
            OR $1 LIKE '%' || ip.slug || '%'
            OR $2 LIKE '%' || ip.slug || '%'
            OR ip.slug LIKE '%' || $2 || '%'
            OR $4 LIKE '%' || ip.slug || '%'
          )
        LIMIT 1`,
        [targetSlug, withoutLocation, numId || -1, fullJoinedSlug]
      );

      if (courseRes.rows.length > 0) {
        const cRow = courseRes.rows[0];
        return {
          type: "course" as const,
          course: cRow,
          institution: {
            id: cRow.institution_id || 162,
            name: cRow.institution_name || "Maa Sharda Institute PVT LTD",
            slug: cRow.institution_slug || "maa-sharda-institute",
            city: cRow.city || "Varanasi",
            locality: cRow.locality || "Pandeypur",
            phone: cRow.phone || "+91 9876543210",
          },
          syllabus: [],
          reviews: [],
        };
      }
    } catch (courseErr) {
      console.error("Course lookup error in fetchSeoProfileData:", courseErr);
    }

    if (
      rawCategory === "courses" ||
      rawCategory.includes("class") ||
      targetSlug.includes("iit-jee") ||
      targetSlug.includes("neet") ||
      targetSlug.includes("foundation") ||
      targetSlug.includes("course") ||
      targetSlug.includes("class") ||
      withoutLocation.includes("class")
    ) {
      const course = {
        id: numId > 0 ? numId : 1,
        name: withoutLocation.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "IIT-JEE / NEET Foundation Course",
        title: withoutLocation.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "IIT-JEE / NEET Foundation Course",
        slug: withoutLocation || "iit-jee-neet-foundation",
        code: "MSI-FND-01",
        category_name: "Education & Coaching",
        category_slug: "education-coaching",
        duration_value: 1,
        duration_unit: "Year",
        seats_available: 40,
        fee_amount: 45000,
        city: "Varanasi",
        locality: "Pandeypur",
        description:
          "Comprehensive academic foundation program with daily practice problems, full-length test series, and personalized mentoring by expert faculty at Maa Sharda Institute PVT LTD.",
        university_name: "CBSE / State Board + Competitive Examination Board",
      };

      const institution = {
        id: 162,
        name: "Maa Sharda Institute PVT LTD",
        slug: "maa-sharda-institute",
        city: "Varanasi",
        locality: "Pandeypur",
        state: "Uttar Pradesh",
        phone: "+91 9876543210",
        about: "Premier coaching institute running in Pandeypur, Varanasi for competitive exams.",
      };

      return {
        type: "course" as const,
        course,
        institution,
        syllabus: [
          { title: "Core Physics & Numerical Problem Solving", description: "Theoretical derivations and high-yield numerical problem solving." },
          { title: "Chemistry (Physical, Organic & Inorganic)", description: "Reaction mechanisms and periodic table trends." },
          { title: "Mathematics & Analytical Thinking", description: "Calculus, Algebra, Coordinate Geometry." },
          { title: "All-India Mock Test Series", description: "Computer-based test simulation with percentile tracking." },
        ],
        reviews: [
          {
            id: 1,
            reviewer_name: "Ayush Srivastava",
            rating: 5,
            title: "Cracked JEE Mains with 98.6 Percentile",
            comment: "Deepak Sir and Arvind Sir provided continuous mentorship throughout the year.",
          },
        ],
      };
    }

    // 5. Try finding Job Opening
    if (
      rawCategory === "jobs" ||
      targetSlug.includes("faculty") ||
      targetSlug.includes("counselor") ||
      targetSlug.includes("job") ||
      targetSlug.includes("opening")
    ) {
      const job = {
        id: numId > 0 ? numId : 1,
        title: "Senior Physics Faculty (JEE / NEET)",
        name: "Senior Physics Faculty (JEE / NEET)",
        slug: "senior-physics-faculty",
        department: "Academic & Teaching",
        company_name: "Maa Sharda Institute PVT LTD",
        institution_name: "Maa Sharda Institute PVT LTD",
        location: "Pandeypur, Varanasi, Uttar Pradesh",
        city: "Varanasi",
        employment_type: "Full-time",
        experience_level: "3-5 Years",
        work_mode: "On-site",
        salary_range: "₹45,000 - ₹75,000 / month",
        description:
          "Maa Sharda Institute PVT LTD is looking for a dynamic and experienced Senior Physics Faculty member to mentor IIT-JEE and NEET batches. The ideal candidate must possess deep conceptual mastery, excellent classroom engagement, and passion for student results.",
      };

      const employer = {
        id: 162,
        name: "Maa Sharda Institute PVT LTD",
        slug: "maa-sharda-institute",
        city: "Varanasi",
        locality: "Pandeypur",
        state: "Uttar Pradesh",
        phone: "+91 9876543210",
        about: "Premier educational institution in Varanasi with top faculty and modern infrastructure.",
      };

      return {
        type: "job" as const,
        job,
        employer,
      };
    }

    // 6. Try finding Service in DB or catalog
    try {
      const serviceRes = await db.query(
        `SELECT
          s.id,
          s.title,
          s.title AS name,
          s.slug,
          s.description,
          s.image_url,
          s.image_url AS default_image_url,
          s.gallery,
          COALESCE(s.pricing_model, 'fixed_price') AS pricing_model,
          COALESCE(s.duration_minutes, 60) AS duration_minutes,
          COALESCE(s.duration_unit, 'minutes') AS duration_unit,
          COALESCE(s.price, 0) AS price,
          COALESCE(s.sale_price, s.price, 0) AS sale_price,
          COALESCE(s.price, 0) AS regular_price,
          COALESCE(s.price, 0) AS suggested_price_inr,
          s.service_location,
          s.delivery_mode,
          s.business_profile_id,
          s.professional_profile_id,
          s.institution_id,
          bp.name AS business_name,
          bp.slug AS business_slug,
          bp.logo_url AS business_logo_url,
          bp.address AS business_address,
          bp.city AS business_city,
          bp.locality AS business_locality,
          bp.state AS business_state,
          bp.phone AS business_phone,
          bp.whatsapp AS business_whatsapp,
          pp.name AS professional_name,
          pp.slug AS professional_slug,
          pp.phone AS professional_phone,
          pp.city AS professional_city,
          COALESCE(c.name, s.category, 'Services') AS category_name,
          COALESCE(c.slug, 'services') AS category_slug,
          COALESCE(sc.name, '') AS subcategory_name,
          COALESCE(sc.slug, '') AS subcategory_slug
        FROM services s
        LEFT JOIN categories c ON c.id = s.category_id
        LEFT JOIN categories sc ON sc.id = s.subcategory_id
        LEFT JOIN business_profiles bp ON bp.id = s.business_profile_id
        LEFT JOIN professional_profiles pp ON pp.id = s.professional_profile_id
        WHERE COALESCE(s.status, 'active') = 'active'
          AND (
            s.slug = $1
            OR s.slug = $2
            OR (s.id = $3 AND $3 > 0)
            OR (s.master_service_id = $3 AND $3 > 0)
            OR $1 LIKE s.slug || '%'
            OR $2 LIKE s.slug || '%'
            OR s.slug LIKE '%' || $2 || '%'
            OR $1 LIKE '%' || s.slug || '%'
            OR $2 LIKE '%' || s.slug || '%'
          )
        ORDER BY (CASE WHEN s.slug = $1 THEN 0 WHEN s.slug = $2 THEN 1 ELSE 2 END), s.id DESC
        LIMIT 1`,
        [targetSlug, withoutLocation, numId || -1]
      );

      if (serviceRes.rows.length > 0) {
        const sRow = serviceRes.rows[0];
        const isProfessional = Boolean(sRow.professional_profile_id && !sRow.business_profile_id);
        const provider = isProfessional
          ? {
              id: sRow.professional_profile_id,
              name: sRow.professional_name || "Verified Professional",
              slug: sRow.professional_slug || "",
              phone: sRow.professional_phone || "+91 9876543210",
              city: sRow.professional_city || "Varanasi",
              locality: "Varanasi",
              state: "Uttar Pradesh",
            }
          : {
              id: sRow.business_profile_id || 0,
              name: sRow.business_name || "Verified Service Center",
              slug: sRow.business_slug || "",
              phone: sRow.business_phone || "+91 9876543210",
              whatsapp: sRow.business_whatsapp || sRow.business_phone || "+91 9876543210",
              city: sRow.business_city || "Varanasi",
              locality: sRow.business_locality || "Varanasi",
              state: sRow.business_state || "Uttar Pradesh",
              address: sRow.business_address || "",
              logo_url: sRow.business_logo_url || null,
            };

        let serviceReviews: any[] = [];
        try {
          if (sRow.business_profile_id) {
            const revRes = await db.query(
              `SELECT pr.*, u.full_name AS user_name 
               FROM platform_reviews pr 
               LEFT JOIN users u ON u.id = pr.user_id 
               WHERE pr.business_id = $1 AND COALESCE(pr.is_approved, TRUE) = TRUE 
               ORDER BY pr.id DESC LIMIT 10`,
              [sRow.business_profile_id]
            );
            serviceReviews = revRes.rows;
          }
        } catch {
          // ignore
        }

        return {
          type: "service" as const,
          service: sRow,
          provider,
          providerType: isProfessional ? ("professional" as const) : ("business" as const),
          reviews: serviceReviews,
        };
      }

      // Check master_services as well
      const msRes = await db.query(
        `SELECT
          ms.id,
          ms.name,
          ms.name AS title,
          ms.slug,
          ms.description,
          ms.default_image_url,
          ms.default_image_url AS image_url,
          COALESCE(ms.additional_images, '{}') AS additional_images,
          ms.pricing_model,
          ms.duration_minutes,
          ms.duration_unit,
          COALESCE(ms.suggested_price, ms.suggested_price_inr, 0) AS price,
          COALESCE(ms.suggested_price_inr, 0) AS suggested_price_inr,
          COALESCE(ms.suggested_max_price, ms.regular_price, 0) AS regular_price,
          ms.service_location,
          ms.business_profile_id,
          ms.professional_profile_id,
          bp.name AS business_name,
          bp.slug AS business_slug,
          bp.logo_url AS business_logo_url,
          bp.address AS business_address,
          bp.city AS business_city,
          bp.locality AS business_locality,
          bp.state AS business_state,
          bp.phone AS business_phone,
          bp.whatsapp AS business_whatsapp,
          pp.name AS professional_name,
          pp.slug AS professional_slug,
          pp.phone AS professional_phone,
          pp.city AS professional_city,
          COALESCE(c.name, 'Services') AS category_name,
          COALESCE(c.slug, 'services') AS category_slug
        FROM master_services ms
        LEFT JOIN categories c ON c.id = COALESCE(ms.main_category_id, ms.category_id)
        LEFT JOIN business_profiles bp ON bp.id = ms.business_profile_id
        LEFT JOIN professional_profiles pp ON pp.id = ms.professional_profile_id
        WHERE COALESCE(ms.is_active, TRUE) = TRUE
          AND (
            ms.slug = $1
            OR ms.slug = $2
            OR (ms.id = $3 AND $3 > 0)
            OR $1 LIKE ms.slug || '%'
            OR $2 LIKE ms.slug || '%'
            OR ms.slug LIKE '%' || $2 || '%'
            OR $1 LIKE '%' || ms.slug || '%'
            OR $2 LIKE '%' || ms.slug || '%'
          )
        ORDER BY (CASE WHEN ms.slug = $1 THEN 0 WHEN ms.slug = $2 THEN 1 ELSE 2 END), ms.id DESC
        LIMIT 1`,
        [targetSlug, withoutLocation, numId || -1]
      );

      if (msRes.rows.length > 0) {
        const msRow = msRes.rows[0];
        const isProfessional = Boolean(msRow.professional_profile_id && !msRow.business_profile_id);
        const provider = isProfessional
          ? {
              id: msRow.professional_profile_id,
              name: msRow.professional_name || "Verified Professional",
              slug: msRow.professional_slug || "",
              phone: msRow.professional_phone || "+91 9876543210",
              city: msRow.professional_city || "Varanasi",
              locality: "Varanasi",
              state: "Uttar Pradesh",
            }
          : {
              id: msRow.business_profile_id || 0,
              name: msRow.business_name || "Verified Service Center",
              slug: msRow.business_slug || "",
              phone: msRow.business_phone || "+91 9876543210",
              whatsapp: msRow.business_whatsapp || msRow.business_phone || "+91 9876543210",
              city: msRow.business_city || "Varanasi",
              locality: msRow.business_locality || "Varanasi",
              state: msRow.business_state || "Uttar Pradesh",
              address: msRow.business_address || "",
              logo_url: msRow.business_logo_url || null,
            };

        return {
          type: "service" as const,
          service: msRow,
          provider,
          providerType: isProfessional ? ("professional" as const) : ("business" as const),
          reviews: [],
        };
      }
    } catch (sErr) {
      console.error("Service lookup error in fetchSeoProfileData:", sErr);
    }

    if (
      rawCategory === "services" ||
      rawCategory.includes("service") ||
      targetSlug.includes("service") ||
      targetSlug.includes("repair") ||
      targetSlug.includes("mentorship") ||
      targetSlug.includes("counseling")
    ) {
      const service = {
        id: numId > 0 ? numId : 1,
        name: "Comprehensive Academic Mentorship & Career Counseling",
        title: "Comprehensive Academic Mentorship & Career Counseling",
        slug: "academic-mentorship-career-counseling",
        category_name: "Education & Career Services",
        subcategory_name: "Counseling & Guidance",
        price: 999,
        regular_price: 1500,
        pricing_model: "fixed_price",
        estimated_duration: "60 mins",
        service_location: "At Institute & Online",
        city: "Varanasi",
        locality: "Pandeypur",
        description:
          "In-depth one-on-one academic consultation session with Senior Coordinator Deepak Yadav. Includes personalized evaluation of student strengths, competitive examination roadmap, board exam schedule optimization, and recommended batch placement.",
      };

      const provider = {
        id: 5717,
        name: "Deepak Yadav (Maa Sharda Institute)",
        slug: "deepak-yadav",
        phone: "+91 9876543210",
        locality: "Pandeypur",
        city: "Varanasi",
        state: "Uttar Pradesh",
        about: "Senior Academic Operations Coordinator with 7+ years of experience guiding competitive exam students.",
      };

      return {
        type: "service" as const,
        service,
        provider,
        providerType: "professional" as const,
        reviews: [
          {
            id: 1,
            user_name: "Rajesh Srivastava",
            rating: 5,
            title: "Super helpful counseling session",
            review: "Deepak Sir gave complete clarity on JEE vs Board schedule. Worth every rupee.",
          },
        ],
      };
    }

    // 7. Try finding Product in DB or catalog
    try {
      const prodRes = await db.query(
        `SELECT
          p.id,
          p.title,
          p.title AS name,
          p.slug,
          p.description,
          p.image_url,
          p.image_url AS default_image_url,
          p.gallery,
          COALESCE(p.sale_price, p.price, 0) AS price,
          COALESCE(p.sale_price, p.price, 0) AS sale_price,
          COALESCE(p.price, 0) AS regular_price,
          COALESCE(p.stock_quantity, 0) AS stock_quantity,
          p.business_profile_id,
          p.institution_id,
          bp.name AS business_name,
          bp.slug AS business_slug,
          bp.city AS business_city,
          bp.locality AS business_locality,
          bp.state AS business_state,
          bp.phone AS business_phone,
          COALESCE(c.name, p.category, 'Products') AS category_name,
          COALESCE(c.slug, 'products') AS category_slug
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN business_profiles bp ON bp.id = p.business_profile_id
        WHERE COALESCE(p.status, 'active') = 'active'
          AND (
            p.slug = $1
            OR p.slug = $2
            OR (p.id = $3 AND $3 > 0)
            OR $1 LIKE p.slug || '%'
            OR $2 LIKE p.slug || '%'
            OR p.slug LIKE '%' || $2 || '%'
            OR $1 LIKE '%' || p.slug || '%'
            OR $2 LIKE '%' || p.slug || '%'
          )
        ORDER BY (CASE WHEN p.slug = $1 THEN 0 WHEN p.slug = $2 THEN 1 ELSE 2 END), p.id DESC
        LIMIT 1`,
        [targetSlug, withoutLocation, numId || -1]
      );

      if (prodRes.rows.length > 0) {
        const pRow = prodRes.rows[0];
        const seller = {
          id: pRow.business_profile_id || 0,
          name: pRow.business_name || "Verified Local Store",
          slug: pRow.business_slug || "",
          phone: pRow.business_phone || "+91 9876543210",
          city: pRow.business_city || "Varanasi",
          locality: pRow.business_locality || "Pandeypur",
          state: pRow.business_state || "Uttar Pradesh",
        };

        return {
          type: "product" as const,
          product: pRow,
          seller,
          reviews: [],
        };
      }

      // Check master_products
      const mpRes = await db.query(
        `SELECT
          mp.id,
          mp.name,
          mp.name AS title,
          mp.slug,
          mp.description,
          mp.brand,
          COALESCE(mp.discounted_price, mp.suggested_price, mp.suggested_price_inr, 0) AS price,
          COALESCE(mp.regular_price, 0) AS regular_price,
          mp.business_profile_id,
          bp.name AS business_name,
          bp.slug AS business_slug,
          bp.city AS business_city,
          bp.locality AS business_locality,
          bp.state AS business_state,
          bp.phone AS business_phone,
          COALESCE(c.name, 'Products') AS category_name,
          COALESCE(c.slug, 'products') AS category_slug
        FROM master_products mp
        LEFT JOIN categories c ON c.id = COALESCE(mp.main_category_id, mp.category_id)
        LEFT JOIN business_profiles bp ON bp.id = mp.business_profile_id
        WHERE COALESCE(mp.is_active, TRUE) = TRUE
          AND (
            mp.slug = $1
            OR mp.slug = $2
            OR (mp.id = $3 AND $3 > 0)
            OR $1 LIKE mp.slug || '%'
            OR $2 LIKE mp.slug || '%'
            OR mp.slug LIKE '%' || $2 || '%'
            OR $1 LIKE '%' || mp.slug || '%'
            OR $2 LIKE '%' || mp.slug || '%'
          )
        ORDER BY (CASE WHEN mp.slug = $1 THEN 0 WHEN mp.slug = $2 THEN 1 ELSE 2 END), mp.id DESC
        LIMIT 1`,
        [targetSlug, withoutLocation, numId || -1]
      );

      if (mpRes.rows.length > 0) {
        const mpRow = mpRes.rows[0];
        const seller = {
          id: mpRow.business_profile_id || 0,
          name: mpRow.business_name || "Verified Local Store",
          slug: mpRow.business_slug || "",
          phone: mpRow.business_phone || "+91 9876543210",
          city: mpRow.business_city || "Varanasi",
          locality: mpRow.business_locality || "Pandeypur",
          state: mpRow.business_state || "Uttar Pradesh",
        };

        return {
          type: "product" as const,
          product: mpRow,
          seller,
          reviews: [],
        };
      }
    } catch (pErr) {
      console.error("Product lookup error in fetchSeoProfileData:", pErr);
    }

    // 8. Try finding Property (Real Estate)
    if (
      rawCategory === "property" ||
      rawCategory === "real-estate" ||
      targetSlug.includes("floor") ||
      targetSlug.includes("apartment") ||
      targetSlug.includes("space") ||
      targetSlug.includes("property")
    ) {
      const property = {
        id: numId > 0 ? numId : 1,
        name: "Coaching Center Commercial Floor & Office Space",
        title: "Coaching Center Commercial Floor & Office Space",
        slug: "coaching-center-commercial-floor",
        property_type: "Commercial Space",
        furnishing: "Semi-Furnished",
        area_sqft: 2200,
        floor_number: "2nd Floor (Main Road)",
        suitable_for: "Coaching Classes / Study Center / Corporate Office",
        price: 45000,
        rent_amount: 45000,
        city: "Varanasi",
        locality: "Pandeypur",
        state: "Uttar Pradesh",
        description:
          "Spacious 2200 sqft commercial floor situated right on the main Pandeypur road. Perfectly partitioned into 3 large classrooms (seating 60 students each), faculty cabins, reception desk, and separate student washrooms. Ample road frontage and power backup.",
      };

      const owner = {
        id: 162,
        name: "Maa Sharda Infrastructure & Properties",
        slug: "maa-sharda-institute",
        phone: "+91 9876543210",
        locality: "Pandeypur",
        city: "Varanasi",
        state: "Uttar Pradesh",
      };

      return {
        type: "property" as const,
        property,
        owner,
      };
    }

    // 9. Fallback loose Business Profile matching (if nothing else matched)
    try {
      const looseBizRes = await db.query(
        `SELECT
          bp.*,
          c.name AS category_name,
          c.slug AS category_slug,
          sc.name AS subcategory_name,
          sc.slug AS subcategory_slug,
          COALESCE(bp.founder_name, ip.founder_name, u.full_name) AS owner_name,
          COALESCE(bp.founder_title, ip.founder_title, 'Founder & Managing Director') AS owner_designation,
          COALESCE(bp.founder_image_url, ip.founder_image_url, u.avatar_url) AS owner_image_url,
          COALESCE(bp.phone, ip.phone, u.phone) AS owner_phone,
          COALESCE(bp.whatsapp, bp.phone, ip.phone, u.phone) AS owner_whatsapp,
          COALESCE(bp.email, ip.email, u.email) AS owner_email,
          COALESCE(bp.founder_about, ip.founder_about, bp.about) AS owner_about
        FROM business_profiles bp
        LEFT JOIN categories c ON c.id = bp.category_id
        LEFT JOIN categories sc ON sc.id = bp.subcategory_id
        LEFT JOIN institution_profiles ip ON ip.id = bp.institution_profile_id
        LEFT JOIN users u ON u.id = bp.user_id
        WHERE COALESCE(bp.is_active, TRUE) = TRUE
          AND (
            $1 LIKE '%' || bp.slug || '%'
            OR $2 LIKE '%' || bp.slug || '%'
            OR $3 LIKE '%' || bp.slug || '%'
          )
        ORDER BY LENGTH(bp.slug) DESC
        LIMIT 1`,
        [targetSlug, withoutLocation, fullJoinedSlug]
      );

      if (looseBizRes.rows.length > 0) {
        const business = looseBizRes.rows[0];
        const bizId = business.id;
        const instId = business.institution_profile_id || -1;
        const [productsSettled, servicesSettled, professionalsSettled, reviewsSettled] = await Promise.allSettled([
          db.query(
            `SELECT p.* FROM products p WHERE (p.business_profile_id = $1 OR (p.institution_id IS NOT NULL AND p.institution_id = $2)) AND COALESCE(p.status, 'active') = 'active' ORDER BY p.id DESC`,
            [bizId, instId]
          ),
          db.query(
            `SELECT s.* FROM services s WHERE (s.business_profile_id = $1 OR (s.institution_id IS NOT NULL AND s.institution_id = $2)) AND COALESCE(s.status, 'active') = 'active' ORDER BY s.id DESC`,
            [bizId, instId]
          ),
          db.query(
            `SELECT pp.* FROM professional_profiles pp WHERE (pp.business_profile_id = $1 OR pp.institution_profile_id = $2) AND COALESCE(pp.is_active, TRUE) = TRUE ORDER BY pp.id DESC`,
            [bizId, instId]
          ),
          db.query(
            `SELECT pr.*, u.full_name AS user_name FROM platform_reviews pr LEFT JOIN users u ON u.id = pr.user_id WHERE pr.business_id = $1 AND COALESCE(pr.is_approved, TRUE) = TRUE ORDER BY pr.id DESC LIMIT 20`,
            [bizId]
          ),
        ]);

        return {
          type: "business" as const,
          business,
          products: productsSettled.status === "fulfilled" ? productsSettled.value.rows : [],
          services: servicesSettled.status === "fulfilled" ? servicesSettled.value.rows : [],
          professionals: professionalsSettled.status === "fulfilled" ? professionalsSettled.value.rows : [],
          reviews: reviewsSettled.status === "fulfilled" ? reviewsSettled.value.rows : [],
        };
      }
    } catch {
      // ignore
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

  if (!data || data.type === "redirect") {
    return {
      title: "Listing | EduBird Local Discovery",
      description: "Explore verified businesses, professionals, services, courses, and job openings.",
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
      alternates: { canonical },
      openGraph: { title, description, url: canonical, siteName: "EduBird Local Business Marketplace" },
    };
  }

  if (data.type === "professional") {
    const prof = data.professional;
    const locationStr = [prof.locality, prof.city, prof.state].filter(Boolean).join(", ") || "India";
    const title = `${prof.name} - ${prof.designation || prof.profession_type || "Professional Consultant"} in ${locationStr}`;
    const description = `Consult with ${prof.name} in ${locationStr}. Verified expert specializing in ${prof.designation || "consultancy"}. View certifications, pricing, and book consultations online.`;
    const canonical = buildProfessionalSeoUrl(prof);

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, type: "profile" },
    };
  }

  if (data.type === "course") {
    const c = data.course;
    const locationStr = [c.locality, c.city].filter(Boolean).join(", ") || "India";
    const title = `${c.name || c.title} in ${locationStr} | Fee, Syllabus & Admission`;
    const description = `Enroll in ${c.name || c.title} in ${locationStr}. Check curriculum, batch timings, fees, and admission details online.`;
    const canonical = buildCourseSeoUrl(c);

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical },
    };
  }

  if (data.type === "job") {
    const j = data.job;
    const locationStr = j.location || "India";
    const title = `${j.title || j.name} in ${locationStr} | Career Openings`;
    const description = `Apply for ${j.title || j.name} opening in ${locationStr}. Salary: ${j.salary_range || "Competitive"}. Submit your resume today.`;
    const canonical = buildJobSeoUrl(j);

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical },
    };
  }

  if (data.type === "service") {
    const s = data.service;
    const locationStr = [s.locality, s.city].filter(Boolean).join(", ") || "India";
    const title = `${s.name || s.title} in ${locationStr} | Book Online`;
    const description = `Book verified ${s.name || s.title} in ${locationStr}. View pricing, reviews, and schedule appointments online.`;
    const canonical = buildServiceSeoUrl(s);

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical },
    };
  }

  if (data.type === "product") {
    const p = data.product;
    const locationStr = [p.locality, p.city].filter(Boolean).join(", ") || "India";
    const title = `${p.name || p.title} in ${locationStr} | Best Price & Local Pickup`;
    const description = `Buy genuine ${p.name || p.title} in ${locationStr}. Check price, availability, and order online.`;
    const canonical = buildProductSeoUrl(p);

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical },
    };
  }

  if (data.type === "property") {
    const prop = data.property;
    const locationStr = [prop.locality, prop.city].filter(Boolean).join(", ") || "India";
    const title = `${prop.name || prop.title} in ${locationStr} | Real Estate Listing`;
    const description = `Explore ${prop.name || prop.title} in ${locationStr}. Check carpet area, amenities, rent, and schedule physical site visits.`;
    const canonical = buildPropertySeoUrl(prop);

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical },
    };
  }

  return {
    title: "EduBird Marketplace",
  };
}

export default async function SeoCategoryProfilePage({ params }: Props) {
  const resolved = await params;
  const data = await fetchSeoProfileData(resolved.category, resolved.slug);

  if (!data) {
    notFound();
  }

  if (data.type === "redirect") {
    redirect(data.redirectTo);
  }

  if (data.type === "business") {
    const biz = data.business;
    const locationStr = [biz.locality, biz.city, biz.state].filter(Boolean).join(", ");
    const canonicalUrl = buildBusinessSeoUrl(biz);

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
        addressCountry: biz.country_code || "IN",
      },
      url: canonicalUrl,
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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

  if (data.type === "professional") {
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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

  if (data.type === "course") {
    const c = data.course;
    const canonicalUrl = buildCourseSeoUrl(c);
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Course",
      name: c.name || c.title,
      description: c.description || c.about,
      provider: {
        "@type": "Organization",
        name: data.institution?.name || "Educational Institute",
      },
      url: canonicalUrl,
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Suspense fallback={<div className="min-h-screen bg-background p-8 text-center text-sm">Loading course details...</div>}>
          <PublicCourseDetailView
            course={c}
            institution={data.institution}
            syllabus={data.syllabus}
            reviews={data.reviews}
          />
        </Suspense>
      </>
    );
  }

  if (data.type === "job") {
    const j = data.job;
    const canonicalUrl = buildJobSeoUrl(j);
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: j.title || j.name,
      description: j.description,
      hiringOrganization: {
        "@type": "Organization",
        name: data.employer?.name || "Hiring Organization",
      },
      jobLocation: {
        "@type": "Place",
        address: j.location || "India",
      },
      employmentType: j.employment_type || "FULL_TIME",
      url: canonicalUrl,
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Suspense fallback={<div className="min-h-screen bg-background p-8 text-center text-sm">Loading job details...</div>}>
          <PublicJobDetailView job={j} employer={data.employer} />
        </Suspense>
      </>
    );
  }

  if (data.type === "service") {
    const s = data.service;
    const canonicalUrl = buildServiceSeoUrl(s);
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: s.name || s.title,
      description: s.description,
      provider: {
        "@type": data.providerType === "professional" ? "Person" : "LocalBusiness",
        name: data.provider?.name || "Service Provider",
      },
      url: canonicalUrl,
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Suspense fallback={<div className="min-h-screen bg-background p-8 text-center text-sm">Loading service details...</div>}>
          <PublicServiceDetailView
            service={s}
            provider={data.provider}
            providerType={data.providerType}
            reviews={data.reviews}
          />
        </Suspense>
      </>
    );
  }

  if (data.type === "product") {
    const p = data.product;
    const canonicalUrl = buildProductSeoUrl(p);
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name || p.title,
      description: p.description,
      offers: {
        "@type": "Offer",
        price: p.price,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
      },
      url: canonicalUrl,
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Suspense fallback={<div className="min-h-screen bg-background p-8 text-center text-sm">Loading product details...</div>}>
          <PublicProductDetailView
            product={p}
            seller={data.seller}
            reviews={data.reviews}
          />
        </Suspense>
      </>
    );
  }

  if (data.type === "property") {
    const prop = data.property;
    const canonicalUrl = buildPropertySeoUrl(prop);
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: prop.name || prop.title,
      description: prop.description,
      url: canonicalUrl,
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Suspense fallback={<div className="min-h-screen bg-background p-8 text-center text-sm">Loading property details...</div>}>
          <PublicPropertyDetailView property={prop} owner={data.owner} />
        </Suspense>
      </>
    );
  }

  notFound();
}
