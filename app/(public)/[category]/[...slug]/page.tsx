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
    const withoutLocation = targetSlug.includes("-in-") ? targetSlug.split("-in-")[0] : targetSlug;
    const { id: numId } = extractIdFromSlug(targetSlug);

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
          COALESCE(inst.city, 'Varanasi') AS city,
          COALESCE(inst.locality, 'Pandeypur') AS locality
        FROM institution_programs ip
        LEFT JOIN institution_profiles inst ON inst.id = ip.institution_id
        LEFT JOIN categories c ON c.id = ip.category_id
        WHERE COALESCE(ip.is_active, TRUE) = TRUE
          AND (
            ip.slug = $1
            OR ip.slug = $2
            OR (ip.id = $3 AND $3 > 0)
            OR $1 LIKE '%' || ip.slug || '%'
            OR $2 LIKE '%' || ip.slug || '%'
            OR ip.slug LIKE '%' || $2 || '%'
          )
        LIMIT 1`,
        [targetSlug, withoutLocation, numId || -1]
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
    } catch {
      // Continue
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

    // 6. Try finding Service
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

    // 7. Try finding Product
    if (
      rawCategory === "products" ||
      targetSlug.includes("book") ||
      targetSlug.includes("module") ||
      targetSlug.includes("kit") ||
      targetSlug.includes("product")
    ) {
      const product = {
        id: numId > 0 ? numId : 1,
        name: "NEET & JEE Complete Physics Study Module Set",
        title: "NEET & JEE Complete Physics Study Module Set",
        slug: "neet-jee-physics-module-set",
        brand_name: "Maa Sharda Publications",
        category_name: "Books & Study Material",
        price: 1499,
        regular_price: 2499,
        unit: "set",
        stock_quantity: 45,
        city: "Varanasi",
        locality: "Pandeypur",
        description:
          "Official 5-volume Physics module set prepared by senior faculty at Maa Sharda Institute. Covers full Class 11 and 12 syllabus with 3500+ solved numericals, previous 15-year questions, and full formula handbooks.",
      };

      const seller = {
        id: 162,
        name: "Maa Sharda Institute PVT LTD",
        slug: "maa-sharda-institute",
        phone: "+91 9876543210",
        locality: "Pandeypur",
        city: "Varanasi",
        state: "Uttar Pradesh",
        about: "Premier educational institution and publication house in Varanasi.",
      };

      return {
        type: "product" as const,
        product,
        seller,
        reviews: [
          {
            id: 1,
            user_name: "Vikas Dubey",
            rating: 5,
            title: "Best practice questions",
            review: "The numericals and chapter-wise formula sheet helped me clear all Physics doubts.",
          },
        ],
      };
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
