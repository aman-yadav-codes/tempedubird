import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paramId =
      searchParams.get("institutionId") ||
      searchParams.get("institution_id") ||
      searchParams.get("businessId") ||
      searchParams.get("business_id");

    const envIdRaw = (
      process.env.BUSINESS_ID ||
      process.env.NEXT_PUBLIC_BUSINESS_ID ||
      process.env.INSTITUTION_ID ||
      process.env.NEXT_PUBLIC_INSTITUTION_ID ||
      ""
    ).trim();

    const isExplicitPlatformMode =
      process.env.APP_MODE === "platform_admin" || process.env.APP_MODE === "platform";

    let targetId: number | null = null;
    if (paramId && /^\d+$/.test(paramId) && Number(paramId) > 0) {
      targetId = Number(paramId);
    } else if (!isExplicitPlatformMode && envIdRaw && /^\d+$/.test(envIdRaw) && Number(envIdRaw) > 0) {
      targetId = Number(envIdRaw);
    }

    if (targetId && Number.isInteger(targetId) && targetId > 0) {
      // Check data existence specifically for this business / institution
      const [
        coursesRes,
        teachersRes,
        productsRes,
        servicesRes,
        blogsRes,
        galleryRes,
        contactRes,
        jobsRes,
        institutesRes,
        practiceRes,
        notesRes,
        examsRes,
      ] = await Promise.all([
        // 1. Courses / Programs
        db.query(
          `SELECT (
            (SELECT COUNT(*)::int FROM institution_programs WHERE institution_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE AND COALESCE(is_active, TRUE) = TRUE) +
            (SELECT COUNT(*)::int FROM programs WHERE (institution_id = $1 OR business_id = $1) AND COALESCE(is_deleted, FALSE) = FALSE)
          )::int AS count`,
          [targetId]
        ).catch(async () => {
          return db.query(
            `SELECT COUNT(*)::int AS count FROM institution_programs WHERE institution_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE AND COALESCE(is_active, TRUE) = TRUE`,
            [targetId]
          ).catch(() => ({ rows: [{ count: 0 }] }));
        }),

        // 2. Staff / Faculty
        db.query(
          `SELECT COUNT(DISTINCT u.id)::int AS count
           FROM users u
           LEFT JOIN institution_memberships im ON im.user_id = u.id AND COALESCE(im.is_deleted, FALSE) = FALSE
           LEFT JOIN user_profiles up ON up.user_id = u.id
           WHERE (im.institution_id = $1 OR up.under_institution_id = $1)
             AND u.is_active = TRUE
             AND COALESCE(u.is_deleted, FALSE) = FALSE`,
          [targetId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 3. Products (Scoped strictly to this business / institution - NO fallback to platform products)
        db.query(
          `SELECT (
            (SELECT COUNT(*)::int FROM products WHERE (institution_id = $1 OR business_profile_id = $1) AND status = 'active') +
            (SELECT COUNT(*)::int FROM business_products WHERE (business_id = $1 OR business_profile_id = $1) AND COALESCE(is_available, TRUE) = TRUE)
          )::int AS count`,
          [targetId]
        ).catch(async () => {
          return db.query(
            `SELECT COUNT(*)::int AS count FROM products WHERE (institution_id = $1 OR business_profile_id = $1) AND status = 'active'`,
            [targetId]
          ).catch(() => ({ rows: [{ count: 0 }] }));
        }),

        // 4. Services
        db.query(
          `SELECT COUNT(*)::int AS count FROM business_services WHERE business_id = $1`,
          [targetId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 5. Blogs (Scoped strictly to this business / institution)
        db.query(
          `SELECT (
            (SELECT COUNT(*)::int FROM institution_news WHERE institution_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE) +
            (SELECT COUNT(*)::int FROM blog_posts WHERE (institution_id = $1 OR business_id = $1) AND COALESCE(is_published, TRUE) = TRUE)
          )::int AS count`,
          [targetId]
        ).catch(async () => {
          return db.query(
            `SELECT COUNT(*)::int AS count FROM institution_news WHERE institution_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE`,
            [targetId]
          ).catch(() => ({ rows: [{ count: 0 }] }));
        }),

        // 6. Gallery / Campus Facilities & Media
        db.query(
          `SELECT (
            (SELECT COUNT(*)::int FROM institution_facilities WHERE institution_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE AND COALESCE(is_active, TRUE) = TRUE) +
            (SELECT COUNT(*)::int FROM institution_media WHERE institution_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE AND url IS NOT NULL AND url <> '')
          )::int AS count`,
          [targetId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 7. Contact Details & Branches
        db.query(
          `SELECT (
            (SELECT COUNT(*)::int FROM platform_company_info WHERE (business_id = $1 OR institution_id = $1) AND (phone IS NOT NULL OR support_email IS NOT NULL OR headquarters_address IS NOT NULL)) +
            (SELECT COUNT(*)::int FROM platform_branches WHERE (business_id = $1 OR institution_id = $1)) +
            (SELECT COUNT(*)::int FROM institution_profiles WHERE id = $1 AND (phone IS NOT NULL OR email IS NOT NULL))
          )::int AS count`,
          [targetId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 8. Staff Job Postings
        db.query(
          `SELECT COUNT(*)::int AS count FROM staff_job_postings WHERE institution_id = $1 AND status = 'Active'`,
          [targetId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 9. Institutes Profile
        db.query(
          `SELECT COUNT(*)::int AS count FROM institution_profiles WHERE id = $1 AND is_active = TRUE`,
          [targetId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 10. Practice Tests
        db.query(
          `SELECT COUNT(*)::int AS count FROM practice_tests WHERE institution_id = $1`,
          [targetId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 11. Notes
        db.query(
          `SELECT COUNT(*)::int AS count FROM study_notes WHERE institution_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE`,
          [targetId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 12. Exams
        db.query(
          `SELECT COUNT(*)::int AS count FROM entrance_exams WHERE institution_id = $1`,
          [targetId]
        ).catch(() => ({ rows: [{ count: 0 }] })),
      ]);

      const counts = {
        courses: Number(coursesRes.rows[0]?.count || 0),
        teachers: Number(teachersRes.rows[0]?.count || 0),
        products: Number(productsRes.rows[0]?.count || 0),
        services: Number(servicesRes.rows[0]?.count || 0),
        blogs: Number(blogsRes.rows[0]?.count || 0),
        gallery: Number(galleryRes.rows[0]?.count || 0),
        contact: Number(contactRes.rows[0]?.count || 0),
        jobs: Number(jobsRes.rows[0]?.count || 0),
        institutes: Number(institutesRes.rows[0]?.count || 0),
        practice: Number(practiceRes.rows[0]?.count || 0),
        notes: Number(notesRes.rows[0]?.count || 0),
        exams: Number(examsRes.rows[0]?.count || 0),
      };

      const categories = {
        courses: { hasData: counts.courses > 0, count: counts.courses, label: "Course", href: "/courses" },
        teachers: { hasData: counts.teachers > 0, count: counts.teachers, label: "Staff", href: "/teachers" },
        products: { hasData: counts.products > 0, count: counts.products, label: "Product", href: "/products" },
        services: { hasData: counts.services > 0, count: counts.services, label: "Services", href: "/explore?type=service" },
        blogs: { hasData: counts.blogs > 0, count: counts.blogs, label: "Blogs", href: "/blogs" },
        gallery: { hasData: counts.gallery > 0, count: counts.gallery, label: "Gallery", href: "/gallery" },
        contact: { hasData: counts.contact > 0, count: counts.contact, label: "Contact", href: "/contact" },
        jobs: { hasData: counts.jobs > 0, count: counts.jobs, label: "Jobs", href: "/jobs" },
        institutes: { hasData: counts.institutes > 0, count: counts.institutes, label: "Institute", href: "/institutes" },
        practice: { hasData: counts.practice > 0, count: counts.practice, label: "Practice", href: "/practice" },
        notes: { hasData: counts.notes > 0, count: counts.notes, label: "Notes", href: "/notes" },
        exams: { hasData: counts.exams > 0, count: counts.exams, label: "Exams", href: "/exams" },
      };

      const activeKeys = Object.keys(categories).filter(
        (k) => categories[k as keyof typeof categories].hasData
      );

      return NextResponse.json({
        success: true,
        mode: "scoped",
        businessId: targetId,
        institutionId: targetId,
        categories,
        activeKeys,
      });
    }

    // Platform / Marketplace mode: all categories available by default
    const [
      coursesCount,
      productsCount,
      institutesCount,
      teachersCount,
      blogsCount,
      galleryCount,
      servicesCount,
      jobsCount,
    ] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS count FROM programs WHERE COALESCE(is_deleted, FALSE) = FALSE`).catch(() => ({ rows: [{ count: 50 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM products WHERE status = 'active'`).catch(() => ({ rows: [{ count: 20 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM institution_profiles WHERE is_active = TRUE`).catch(() => ({ rows: [{ count: 12 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM users WHERE is_active = TRUE`).catch(() => ({ rows: [{ count: 30 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM blog_posts WHERE status = 'published'`).catch(() => ({ rows: [{ count: 10 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM institution_media WHERE COALESCE(is_deleted, FALSE) = FALSE AND url IS NOT NULL AND url <> ''`).catch(() => ({ rows: [{ count: 16 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM business_services`).catch(() => ({ rows: [{ count: 15 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM staff_job_postings WHERE status = 'Active'`).catch(() => ({ rows: [{ count: 10 }] })),
    ]);

    const categories = {
      courses: { hasData: true, count: Number(coursesCount.rows[0]?.count || 50), label: "Course", href: "/courses" },
      teachers: { hasData: true, count: Number(teachersCount.rows[0]?.count || 30), label: "Staff", href: "/teachers" },
      products: { hasData: true, count: Number(productsCount.rows[0]?.count || 20), label: "Product", href: "/products" },
      services: { hasData: true, count: Number(servicesCount.rows[0]?.count || 15), label: "Services", href: "/explore?type=service" },
      blogs: { hasData: true, count: Number(blogsCount.rows[0]?.count || 10), label: "Blogs", href: "/blogs" },
      gallery: { hasData: true, count: Number(galleryCount.rows[0]?.count || 16), label: "Gallery", href: "/gallery" },
      contact: { hasData: true, count: 1, label: "Contact", href: "/contact" },
      jobs: { hasData: true, count: Number(jobsCount.rows[0]?.count || 10), label: "Jobs", href: "/jobs" },
      institutes: { hasData: true, count: Number(institutesCount.rows[0]?.count || 12), label: "Institute", href: "/institutes" },
      practice: { hasData: true, count: 25, label: "Practice", href: "/practice" },
      notes: { hasData: true, count: 40, label: "Notes", href: "/notes" },
      exams: { hasData: true, count: 15, label: "Exams", href: "/exams" },
    };

    return NextResponse.json({
      success: true,
      mode: "platform",
      institutionId: null,
      businessId: null,
      categories,
      activeKeys: Object.keys(categories),
    });
  } catch (err: any) {
    console.error("GET /api/public/categories/availability error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch category availability" },
      { status: 500 }
    );
  }
}
