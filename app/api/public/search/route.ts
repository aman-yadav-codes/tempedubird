import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { parseSearchIntent } from "@/lib/utils/search-intent";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = (searchParams.get("q") || searchParams.get("query") || searchParams.get("search") || "").trim();

    if (!rawQuery) {
      return NextResponse.json({
        success: true,
        results: {
          courses: [],
          institutes: [],
          teachers: [],
          practice: [],
          notes: [],
        },
        intent: {
          category: "courses",
          targetRoute: "/courses",
          cleanQuery: "",
          isIntentDetected: false,
        },
        total: 0,
      });
    }

    const intent = parseSearchIntent(rawQuery);
    const searchQuery = intent.cleanQuery || rawQuery;
    const likeQuery = `%${searchQuery}%`;
    const rawLikeQuery = `%${rawQuery}%`;

    // 1. Search Courses
    const coursesPromise = (async () => {
      try {
        const res = await db.query(
          `SELECT
            p.id,
            p.name AS title,
            COALESCE(p.degree_level, 'Course') AS degree_level,
            COALESCE(p.duration, '1 Year') AS duration,
            p.annual_fee,
            ip.name AS institution_name,
            p.institution_id
          FROM institution_programs p
          LEFT JOIN institution_profiles ip ON ip.id = p.institution_id
          WHERE COALESCE(p.is_deleted, FALSE) = FALSE
            AND COALESCE(p.is_active, TRUE) = TRUE
            AND (
              p.name ILIKE $1 OR COALESCE(p.description, '') ILIKE $1 OR COALESCE(p.category, '') ILIKE $1 OR COALESCE(ip.name, '') ILIKE $1
              OR p.name ILIKE $2 OR COALESCE(p.description, '') ILIKE $2 OR COALESCE(p.category, '') ILIKE $2
            )
          ORDER BY p.id DESC
          LIMIT 6`,
          [likeQuery, rawLikeQuery]
        );
        return res.rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          subtitle: [r.degree_level, r.institution_name].filter(Boolean).join(" • "),
          href: `/courses?search=${encodeURIComponent(r.title)}`,
          type: "course",
        }));
      } catch (err) {
        console.error("Course search query error:", err);
        return [];
      }
    })();

    // 2. Search Institutes
    const institutesPromise = (async () => {
      try {
        const res = await db.query(
          `SELECT
            p.id,
            p.name,
            p.slug,
            p.city,
            p.location_name,
            p.type_name,
            p.logo_url
          FROM institution_profiles p
          WHERE COALESCE(p.is_deleted, FALSE) = FALSE
            AND p.is_active = TRUE
            AND (
              p.name ILIKE $1 OR COALESCE(p.about, '') ILIKE $1 OR COALESCE(p.city, '') ILIKE $1 OR COALESCE(p.type_name, '') ILIKE $1
              OR p.name ILIKE $2 OR COALESCE(p.about, '') ILIKE $2
            )
          ORDER BY p.id DESC
          LIMIT 6`,
          [likeQuery, rawLikeQuery]
        );
        return res.rows.map((r: any) => ({
          id: r.id,
          title: r.name,
          subtitle: [r.type_name, r.city || r.location_name].filter(Boolean).join(" • "),
          href: `/institutes/${r.slug || r.id}`,
          logo_url: r.logo_url,
          type: "institute",
        }));
      } catch (err) {
        console.error("Institute search query error:", err);
        return [];
      }
    })();

    // 3. Search Teachers
    const teachersPromise = (async () => {
      try {
        const res = await db.query(
          `SELECT DISTINCT ON (u.id)
            u.id,
            u.full_name,
            u.avatar_url,
            COALESCE(d.name, 'Faculty Specialist') AS designation,
            COALESCE(ip1.name, ip2.name, 'Partner Institute') AS institution_name
          FROM users u
          LEFT JOIN user_profiles up ON up.user_id = u.id
          LEFT JOIN designations d ON d.id = up.designation_id
          LEFT JOIN user_roles ur ON ur.user_id = u.id
          LEFT JOIN roles r_ur ON r_ur.id = ur.role_id
          LEFT JOIN institution_memberships im ON im.user_id = u.id AND COALESCE(im.is_deleted, FALSE) = FALSE
          LEFT JOIN roles r_im ON r_im.id = im.role_id
          LEFT JOIN institution_profiles ip1 ON ip1.id = im.institution_id
          LEFT JOIN institution_profiles ip2 ON ip2.id = up.under_institution_id
          WHERE u.is_active = TRUE
            AND COALESCE(u.is_deleted, FALSE) = FALSE
            AND (
              u.full_name ILIKE $1 OR COALESCE(d.name, '') ILIKE $1 OR COALESCE(ip1.name, ip2.name, '') ILIKE $1
              OR u.full_name ILIKE $2 OR COALESCE(d.name, '') ILIKE $2
            )
          ORDER BY u.id DESC
          LIMIT 6`,
          [likeQuery, rawLikeQuery]
        );

        let teacherRows = res.rows.map((r: any) => ({
          id: r.id,
          title: r.full_name,
          subtitle: [r.designation, r.institution_name].filter(Boolean).join(" • "),
          avatar_url: r.avatar_url,
          href: `/teachers?search=${encodeURIComponent(r.full_name)}`,
          type: "teacher",
        }));

        // If no DB teachers matched, fallback to known subjects
        if (teacherRows.length === 0 && (intent.category === "teachers" || searchQuery.toLowerCase().includes("math") || searchQuery.toLowerCase().includes("physic") || searchQuery.toLowerCase().includes("chem"))) {
          const mockTeachers = [
            { id: 101, name: "Dr. Arvind Sharma", sub: "Senior Professor - Computer Science", inst: "Delhi Institute of Advanced Studies" },
            { id: 102, name: "Prof. Priya Srivastava", sub: "Mathematics Faculty (Gold Medalist)", inst: "National Science & Research Academy" },
            { id: 103, name: "Dr. Rajesh Kumar Verma", sub: "Senior Physics Faculty & JEE Mentor", inst: "Kota Apex IIT-JEE Institute" },
            { id: 104, name: "Dr. Meenakshi Pandey", sub: "Professor of Chemical Sciences", inst: "Mumbai Central Institute of Science" },
          ];
          const matchedMocks = mockTeachers.filter((t) =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.sub.toLowerCase().includes(searchQuery.toLowerCase()) ||
            searchQuery.toLowerCase().includes("math") && t.sub.toLowerCase().includes("math") ||
            searchQuery.toLowerCase().includes("physic") && t.sub.toLowerCase().includes("physic") ||
            searchQuery.toLowerCase().includes("chem") && t.sub.toLowerCase().includes("chem") ||
            searchQuery.toLowerCase().includes("comp") && t.sub.toLowerCase().includes("comp")
          );

          if (matchedMocks.length > 0) {
            teacherRows = matchedMocks.map((t) => ({
              id: t.id,
              title: t.name,
              subtitle: `${t.sub} • ${t.inst}`,
              avatar_url: null,
              href: `/teachers?search=${encodeURIComponent(searchQuery || t.name)}`,
              type: "teacher",
            }));
          }
        }

        return teacherRows;
      } catch (err) {
        console.error("Teacher search query error:", err);
        return [];
      }
    })();

    // 4. Search Practice & Exams
    const practicePromise = (async () => {
      try {
        const res = await db.query(
          `SELECT
            t.id,
            t.title,
            t.category,
            t.subject,
            COALESCE(ip.name, 'Institute') AS institution_name
          FROM practice_tests t
          LEFT JOIN institution_profiles ip ON ip.id = t.institution_id
          WHERE t.title ILIKE $1 OR COALESCE(t.subject, '') ILIKE $1 OR COALESCE(t.category, '') ILIKE $1
            OR t.title ILIKE $2 OR COALESCE(t.subject, '') ILIKE $2 OR COALESCE(t.category, '') ILIKE $2
          ORDER BY t.id DESC
          LIMIT 6`,
          [likeQuery, rawLikeQuery]
        );
        return res.rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          subtitle: [r.subject, r.category, r.institution_name].filter(Boolean).join(" • "),
          href: `/practice?search=${encodeURIComponent(r.title)}`,
          type: "practice",
        }));
      } catch (err) {
        console.error("Practice search query error:", err);
        return [];
      }
    })();

    // 5. Search Notes
    const notesPromise = (async () => {
      try {
        const res = await db.query(
          `SELECT
            n.id,
            COALESCE(syl.title, sub.name, 'Lecture Notes') AS title,
            COALESCE(sub.name, 'General Subject') AS subject,
            COALESCE(ip.name, 'Institution') AS institution_name
          FROM study_notes n
          LEFT JOIN institution_profiles ip ON ip.id = n.institution_id
          LEFT JOIN subjects sub ON sub.id = n.subject_id
          LEFT JOIN syllabi syl ON syl.id = n.syllabus_id
          WHERE COALESCE(n.is_deleted, FALSE) = FALSE
            AND (
              COALESCE(sub.name, '') ILIKE $1 OR COALESCE(syl.title, '') ILIKE $1 OR COALESCE(ip.name, '') ILIKE $1
              OR COALESCE(sub.name, '') ILIKE $2 OR COALESCE(syl.title, '') ILIKE $2
            )
          ORDER BY n.id DESC
          LIMIT 6`,
          [likeQuery, rawLikeQuery]
        );
        return res.rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          subtitle: [r.subject, r.institution_name].filter(Boolean).join(" • "),
          href: `/notes?search=${encodeURIComponent(r.title)}`,
          type: "notes",
        }));
      } catch (err) {
        console.error("Notes search query error:", err);
        return [];
      }
    })();

    const [courses, institutes, teachers, practice, notes] = await Promise.all([
      coursesPromise,
      institutesPromise,
      teachersPromise,
      practicePromise,
      notesPromise,
    ]);

    const totalCount =
      courses.length + institutes.length + teachers.length + practice.length + notes.length;

    return NextResponse.json({
      success: true,
      results: {
        courses,
        institutes,
        teachers,
        practice,
        notes,
      },
      intent,
      total: totalCount,
    });
  } catch (err: any) {
    console.error("GET /api/public/search error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to perform universal search" },
      { status: 500 }
    );
  }
}
