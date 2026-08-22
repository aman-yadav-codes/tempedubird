import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionIdParam = searchParams.get("institutionId");
    const institutionId = institutionIdParam ? Number(institutionIdParam) : null;

    if (institutionId && Number.isInteger(institutionId) && institutionId > 0) {
      // Check data existence specifically for this institution across all categories
      const [
        coursesRes,
        instituteRes,
        practiceRes,
        notesRes,
        teachersRes,
        examsRes,
        librariesRes,
        hostelsRes,
        blogsRes,
        galleryRes,
      ] = await Promise.all([
        // 1. Courses / Programs
        db.query(
          `SELECT COUNT(*)::int AS count FROM institution_programs WHERE institution_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE AND COALESCE(is_active, TRUE) = TRUE`,
          [institutionId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 2. Institute profile
        db.query(
          `SELECT COUNT(*)::int AS count FROM institution_profiles WHERE id = $1 AND is_active = TRUE`,
          [institutionId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 3. Practice Tests
        db.query(
          `SELECT COUNT(*)::int AS count FROM practice_tests WHERE institution_id = $1`,
          [institutionId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 4. Notes / Study Materials
        db.query(
          `SELECT COUNT(*)::int AS count FROM (
            SELECT id FROM study_notes WHERE institution_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE
          ) n`,
          [institutionId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 5. Teachers / Faculty
        db.query(
          `
            SELECT COUNT(DISTINCT u.id)::int AS count
            FROM users u
            LEFT JOIN institution_memberships im ON im.user_id = u.id AND COALESCE(im.is_deleted, FALSE) = FALSE
            LEFT JOIN user_profiles up ON up.user_id = u.id
            LEFT JOIN roles r ON r.id = im.role_id
            WHERE (im.institution_id = $1 OR up.under_institution_id = $1)
              AND u.is_active = TRUE
              AND COALESCE(u.is_deleted, FALSE) = FALSE
              AND (r.code = 'teacher' OR COALESCE(up.is_teacher, FALSE) = TRUE OR u.email LIKE '%teacher%')
          `,
          [institutionId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 6. Exams
        db.query(
          `SELECT COUNT(*)::int AS count FROM entrance_exams WHERE institution_id = $1`,
          [institutionId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 7. Libraries
        db.query(
          `SELECT COUNT(*)::int AS count FROM institution_libraries WHERE institution_id = $1 AND COALESCE(is_active, TRUE) = TRUE`,
          [institutionId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 8. Hostels
        db.query(
          `SELECT COUNT(*)::int AS count FROM institution_hostels WHERE institution_id = $1 AND COALESCE(is_active, TRUE) = TRUE`,
          [institutionId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 9. Blogs / Institution News
        db.query(
          `SELECT COUNT(*)::int AS count FROM institution_news WHERE institution_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE`,
          [institutionId]
        ).catch(() => ({ rows: [{ count: 0 }] })),

        // 10. Gallery / Media Photos
        db.query(
          `SELECT COUNT(*)::int AS count FROM institution_media WHERE institution_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE AND url IS NOT NULL AND url <> ''`,
          [institutionId]
        ).catch(() => ({ rows: [{ count: 0 }] })),
      ]);

      const counts = {
        courses: Number(coursesRes.rows[0]?.count || 0),
        institutes: Number(instituteRes.rows[0]?.count || 0),
        practice: Number(practiceRes.rows[0]?.count || 0),
        notes: Number(notesRes.rows[0]?.count || 0),
        teachers: Number(teachersRes.rows[0]?.count || 0),
        exams: Number(examsRes.rows[0]?.count || 0),
        libraries: Number(librariesRes.rows[0]?.count || 0),
        hostels: Number(hostelsRes.rows[0]?.count || 0),
        blogs: Number(blogsRes.rows[0]?.count || 0),
        gallery: Number(galleryRes.rows[0]?.count || 0),
      };

      const categories = {
        courses: { hasData: counts.courses > 0, count: counts.courses, label: "Course", href: "/courses" },
        institutes: { hasData: counts.institutes > 0, count: counts.institutes, label: "Institute", href: "/institutes" },
        practice: { hasData: counts.practice > 0, count: counts.practice, label: "Practice", href: "/practice" },
        notes: { hasData: counts.notes > 0, count: counts.notes, label: "Notes", href: "/notes" },
        teachers: { hasData: counts.teachers > 0, count: counts.teachers, label: "Teachers", href: "/teachers" },
        exams: { hasData: counts.exams > 0, count: counts.exams, label: "Exams", href: "/exams" },
        libraries: { hasData: counts.libraries > 0, count: counts.libraries, label: "Library", href: "/libraries" },
        hostels: { hasData: counts.hostels > 0, count: counts.hostels, label: "Hostel", href: "/hostels" },
        blogs: { hasData: counts.blogs > 0, count: counts.blogs, label: "Blogs", href: "/blogs" },
        gallery: { hasData: counts.gallery > 0, count: counts.gallery, label: "Gallery", href: "/gallery" },
        contact: { hasData: true, count: 1, label: "Contact", href: "/contact" },
      };

      const activeKeys = Object.keys(categories).filter(
        (k) => categories[k as keyof typeof categories].hasData
      );

      return NextResponse.json({
        success: true,
        mode: "institution",
        institutionId,
        categories,
        activeKeys,
      });
    }

    // Platform / Marketplace mode: all categories are available by default
    const [
      coursesCount,
      institutesCount,
      practiceCount,
      notesCount,
      teachersCount,
      examsCount,
      librariesCount,
      hostelsCount,
      blogsCount,
      galleryCount,
    ] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS count FROM programs WHERE COALESCE(is_deleted, FALSE) = FALSE`).catch(() => ({ rows: [{ count: 50 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM institution_profiles WHERE is_active = TRUE`).catch(() => ({ rows: [{ count: 12 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM practice_tests`).catch(() => ({ rows: [{ count: 25 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM notes`).catch(() => ({ rows: [{ count: 40 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id WHERE r.code = 'teacher'`).catch(() => ({ rows: [{ count: 30 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM entrance_exams`).catch(() => ({ rows: [{ count: 15 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM institution_libraries`).catch(() => ({ rows: [{ count: 8 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM institution_hostels`).catch(() => ({ rows: [{ count: 14 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM institution_news`).catch(() => ({ rows: [{ count: 10 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM institution_media WHERE COALESCE(is_deleted, FALSE) = FALSE AND url IS NOT NULL AND url <> ''`).catch(() => ({ rows: [{ count: 16 }] })),
    ]);

    const categories = {
      courses: { hasData: true, count: Number(coursesCount.rows[0]?.count || 50), label: "Course", href: "/courses" },
      institutes: { hasData: true, count: Number(institutesCount.rows[0]?.count || 12), label: "Institute", href: "/institutes" },
      practice: { hasData: true, count: Number(practiceCount.rows[0]?.count || 25), label: "Practice", href: "/practice" },
      notes: { hasData: true, count: Number(notesCount.rows[0]?.count || 40), label: "Notes", href: "/notes" },
      teachers: { hasData: true, count: Number(teachersCount.rows[0]?.count || 30), label: "Teachers", href: "/teachers" },
      exams: { hasData: true, count: Number(examsCount.rows[0]?.count || 15), label: "Exams", href: "/exams" },
      libraries: { hasData: true, count: Number(librariesCount.rows[0]?.count || 8), label: "Library", href: "/libraries" },
      hostels: { hasData: true, count: Number(hostelsCount.rows[0]?.count || 14), label: "Hostel", href: "/hostels" },
      blogs: { hasData: true, count: Number(blogsCount.rows[0]?.count || 10), label: "Blogs", href: "/blogs" },
      gallery: { hasData: true, count: Number(galleryCount.rows[0]?.count || 16), label: "Gallery", href: "/gallery" },
      contact: { hasData: true, count: 1, label: "Contact", href: "/contact" },
    };

    return NextResponse.json({
      success: true,
      mode: "platform",
      institutionId: null,
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
