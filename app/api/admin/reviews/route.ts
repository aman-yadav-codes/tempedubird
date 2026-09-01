import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthUser } from "@/lib/auth/auth";

export async function ensureReviewsSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS entity_reviews (
      id SERIAL PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL DEFAULT 'institution',
      entity_id INTEGER NOT NULL DEFAULT 1,
      institution_id INTEGER,
      program_id INTEGER,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewer_name VARCHAR(255) NOT NULL,
      reviewer_role VARCHAR(100) DEFAULT 'Student',
      is_verified_user BOOLEAN DEFAULT TRUE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      academic_rating INTEGER CHECK (academic_rating >= 1 AND academic_rating <= 5),
      faculty_rating INTEGER CHECK (faculty_rating >= 1 AND faculty_rating <= 5),
      infrastructure_rating INTEGER CHECK (infrastructure_rating >= 1 AND infrastructure_rating <= 5),
      support_rating INTEGER CHECK (support_rating >= 1 AND support_rating <= 5),
      title VARCHAR(255),
      comment TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'published',
      institution_reply TEXT,
      institution_replied_at TIMESTAMP WITH TIME ZONE,
      institution_replied_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50) DEFAULT 'institution';
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS entity_id INTEGER DEFAULT 1;
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS institution_id INTEGER;
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS program_id INTEGER;
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS reviewer_name VARCHAR(255);
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS reviewer_role VARCHAR(100) DEFAULT 'Student';
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS is_verified_user BOOLEAN DEFAULT TRUE;
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS academic_rating INTEGER;
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS faculty_rating INTEGER;
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS infrastructure_rating INTEGER;
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS support_rating INTEGER;
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS institution_reply TEXT;
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS institution_replied_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE entity_reviews ADD COLUMN IF NOT EXISTS institution_replied_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_entity_reviews_inst ON entity_reviews(institution_id);
    CREATE INDEX IF NOT EXISTS idx_entity_reviews_user ON entity_reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_entity_reviews_status ON entity_reviews(status);
  `);

  const countCheck = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM entity_reviews`);
  if (Number(countCheck.rows[0]?.count || 0) === 0) {
    const sUser = await db.query<{ id: number }>(`SELECT id FROM users WHERE email = 'demo.student@edubird.com' LIMIT 1`);
    const pUser = await db.query<{ id: number }>(`SELECT id FROM users WHERE email = 'demo.guardian@edubird.com' LIMIT 1`);
    const aUser = await db.query<{ id: number }>(`SELECT id FROM users WHERE email = 'deepakdv74@gmail.com' LIMIT 1`);

    const sId = sUser.rows[0]?.id || null;
    const pId = pUser.rows[0]?.id || null;
    const adminId = aUser.rows[0]?.id || null;

    await db.query(`
      INSERT INTO entity_reviews (
        entity_type, entity_id, institution_id, program_id, user_id, reviewer_name, reviewer_role, is_verified_user,
        rating, academic_rating, faculty_rating, infrastructure_rating, support_rating, title, comment, status,
        institution_reply, institution_replied_at, institution_replied_by, created_at
      ) VALUES
      (
        'institution', 1, 1, 1, $1, 'Aarav Sharma', 'Verified Student', TRUE,
        5, 5, 5, 4, 5, 'Exceptional Coaching for NEET & Medical Prep',
        'The biology and physics faculty at Maa Sharda Institute are truly outstanding. The daily practice problems and weekly mock tests helped me improve my score drastically. Very supportive doubt clearing sessions!',
        'published',
        'Thank you Aarav! We are proud of your progress and consistency in mock tests. Keep up the great dedication!',
        NOW() - INTERVAL '2 days', $3, NOW() - INTERVAL '5 days'
      ),
      (
        'institution', 1, 1, 1, $2, 'Sunita Sharma (Guardian)', 'Verified Parent', TRUE,
        5, 5, 5, 5, 5, 'Highly disciplined and transparent institute',
        'We receive attendance SMS and monthly performance report cards without fail. The administration and teachers are very approachable and dedicated to every student.',
        'published',
        'Thank you Mrs. Sharma! We are dedicated to providing the best learning environment and transparent communication for our students and parents.',
        NOW() - INTERVAL '1 day', $3, NOW() - INTERVAL '3 days'
      ),
      (
        'institution', 1, 1, 1, $1, 'Rohan Mehta', 'Verified Student', TRUE,
        4, 5, 4, 4, 4, 'Great study material & competitive environment',
        'The comprehensive study modules and test series give real examination feel. Library is quiet and resourceful.',
        'published',
        'Thanks Rohan for your positive review! We will continue improving our facilities.',
        NOW() - INTERVAL '1 day', $3, NOW() - INTERVAL '1 day'
      )
    `, [sId, pId, adminId]);
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureReviewsSchema();
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope"); // 'mine' | 'institution' | 'all'
    const filterInstId = searchParams.get("institutionId") ? Number(searchParams.get("institutionId")) : null;
    const filterRating = searchParams.get("rating") ? Number(searchParams.get("rating")) : null;
    const filterRole = searchParams.get("role"); // 'student' | 'parent'
    const filterStatus = searchParams.get("status"); // 'published' | 'pending' | 'flagged' | 'hidden'
    const search = searchParams.get("search")?.trim().toLowerCase();

    const isPlatformAdmin = Boolean(
      user.role_codes?.includes("platform_admin") ||
      user.role_codes?.includes("super_admin") ||
      (user as any)?.is_super_admin
    );

    const isInstitutionAdmin = Boolean(
      user.role_codes?.includes("institution_admin") ||
      user.role_codes?.includes("school_owner") ||
      user.role_codes?.includes("college_owner") ||
      user.role_codes?.includes("university_owner")
    );

    const isStudentOrParent = Boolean(
      user.role_codes?.includes("student") ||
      user.role_codes?.includes("parent") ||
      user.role_codes?.includes("guardian")
    );

    // Determine querying scope
    let whereConditions: string[] = [];
    const params: any[] = [];

    if (scope === "mine" || (!scope && isStudentOrParent && !isInstitutionAdmin && !isPlatformAdmin)) {
      // Current user's reviews
      params.push(user.id);
      whereConditions.push(`(r.user_id = $${params.length} OR r.user_id IN (
        SELECT sp.user_id FROM student_guardians sg 
        JOIN student_profiles sp ON sp.id = sg.student_id 
        WHERE sg.guardian_user_id = $${params.length}
      ))`);
    } else if (scope === "institution" || (!scope && isInstitutionAdmin && !isPlatformAdmin)) {
      // Scoped to institution
      const instId = filterInstId || (user.memberships?.[0]?.institution_id ?? 1);
      params.push(instId);
      whereConditions.push(`COALESCE(r.institution_id, r.entity_id) = $${params.length}`);
    } else if (scope === "all" || isPlatformAdmin) {
      // Platform admin: can see all or filter by inst
      if (filterInstId) {
        params.push(filterInstId);
        whereConditions.push(`COALESCE(r.institution_id, r.entity_id) = $${params.length}`);
      }
    }

    if (filterRating) {
      params.push(filterRating);
      whereConditions.push(`r.rating = $${params.length}`);
    }

    if (filterRole) {
      params.push(`%${filterRole}%`);
      whereConditions.push(`r.reviewer_role ILIKE $${params.length}`);
    }

    if (filterStatus) {
      params.push(filterStatus);
      whereConditions.push(`r.status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(
        r.reviewer_name ILIKE $${params.length} OR
        r.comment ILIKE $${params.length} OR
        r.title ILIKE $${params.length} OR
        ip.name ILIKE $${params.length} OR
        prog.title ILIKE $${params.length}
      )`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const query = `
      SELECT
        r.id,
        r.entity_type,
        r.entity_id,
        COALESCE(r.institution_id, r.entity_id) AS institution_id,
        r.program_id,
        r.user_id,
        r.reviewer_name,
        r.reviewer_role,
        r.is_verified_user,
        r.rating,
        COALESCE(r.academic_rating, r.rating) AS academic_rating,
        COALESCE(r.faculty_rating, r.rating) AS faculty_rating,
        COALESCE(r.infrastructure_rating, r.rating) AS infrastructure_rating,
        COALESCE(r.support_rating, r.rating) AS support_rating,
        r.title,
        r.comment,
        r.status,
        r.institution_reply,
        r.institution_replied_at,
        r.created_at,
        r.updated_at,
        COALESCE(ip.name, 'Maa Sharda Institute PVT LTD') AS institution_name,
        ip.slug AS institution_slug,
        COALESCE(prog.title, 'NEET Intensive Classroom Program') AS program_title,
        u.avatar_url AS reviewer_avatar,
        reply_user.full_name AS replied_by_name
      FROM entity_reviews r
      LEFT JOIN institution_profiles ip ON ip.id = COALESCE(r.institution_id, r.entity_id)
      LEFT JOIN institution_programs prog ON prog.id = r.program_id
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN users reply_user ON reply_user.id = r.institution_replied_by
      ${whereClause}
      ORDER BY r.created_at DESC
    `;

    const result = await db.query(query, params);
    const reviews = result.rows;

    // Calculate aggregated statistics
    const totalCount = reviews.length;
    const avgRating =
      totalCount > 0
        ? Number((reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / totalCount).toFixed(1))
        : 5.0;

    const avgAcademic =
      totalCount > 0
        ? Number((reviews.reduce((acc, r) => acc + Number(r.academic_rating || r.rating || 0), 0) / totalCount).toFixed(1))
        : 5.0;

    const avgFaculty =
      totalCount > 0
        ? Number((reviews.reduce((acc, r) => acc + Number(r.faculty_rating || r.rating || 0), 0) / totalCount).toFixed(1))
        : 5.0;

    const avgInfrastructure =
      totalCount > 0
        ? Number((reviews.reduce((acc, r) => acc + Number(r.infrastructure_rating || r.rating || 0), 0) / totalCount).toFixed(1))
        : 5.0;

    const avgSupport =
      totalCount > 0
        ? Number((reviews.reduce((acc, r) => acc + Number(r.support_rating || r.rating || 0), 0) / totalCount).toFixed(1))
        : 5.0;

    const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let studentReviewsCount = 0;
    let parentReviewsCount = 0;
    let repliedReviewsCount = 0;

    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      starCounts[star] = (starCounts[star] || 0) + 1;
      if (r.reviewer_role?.toLowerCase().includes("parent") || r.reviewer_role?.toLowerCase().includes("guardian")) {
        parentReviewsCount++;
      } else {
        studentReviewsCount++;
      }
      if (r.institution_reply && r.institution_reply.trim()) {
        repliedReviewsCount++;
      }
    });

    const stats = {
      total_reviews: totalCount,
      avg_rating: avgRating,
      avg_academic: avgAcademic,
      avg_faculty: avgFaculty,
      avg_infrastructure: avgInfrastructure,
      avg_support: avgSupport,
      star_counts: starCounts,
      student_count: studentReviewsCount,
      parent_count: parentReviewsCount,
      replied_count: repliedReviewsCount,
      pending_reply_count: totalCount - repliedReviewsCount,
    };

    // Also get list of available institutions for filter
    const institutionsRes = await db.query<{ id: number; name: string }>(`
      SELECT id, name FROM institution_profiles WHERE is_deleted = FALSE ORDER BY name ASC LIMIT 50
    `);

    return NextResponse.json({
      success: true,
      reviews,
      stats,
      institutions: institutionsRes.rows,
      userRole: isPlatformAdmin ? "platform_admin" : isInstitutionAdmin ? "institution_admin" : "student_parent",
    });
  } catch (err: any) {
    console.error("GET /api/admin/reviews error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureReviewsSchema();
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to submit feedback." }, { status: 401 });
    }

    const body = await req.json();
    const {
      institution_id,
      program_id,
      rating,
      academic_rating,
      faculty_rating,
      infrastructure_rating,
      support_rating,
      title,
      comment,
      reviewer_role,
    } = body;

    const numRating = Math.min(5, Math.max(1, Number(rating || 5)));
    if (!comment || !comment.trim()) {
      return NextResponse.json({ error: "Feedback comment is required." }, { status: 400 });
    }

    const effectiveInstId = Number(institution_id) || 1;
    const effectiveRole =
      reviewer_role ||
      (user.role_codes?.includes("parent") || user.role_codes?.includes("guardian")
        ? "Verified Parent / Guardian"
        : "Verified Student");

    const result = await db.query(
      `
      INSERT INTO entity_reviews (
        entity_type,
        entity_id,
        institution_id,
        program_id,
        user_id,
        reviewer_name,
        reviewer_role,
        is_verified_user,
        rating,
        academic_rating,
        faculty_rating,
        infrastructure_rating,
        support_rating,
        title,
        comment,
        status
      )
      VALUES ('institution', $1, $1, $2, $3, $4, $5, TRUE, $6, $7, $8, $9, $10, $11, $12, 'published')
      RETURNING *
      `,
      [
        effectiveInstId,
        program_id ? Number(program_id) : null,
        user.id,
        user.full_name || user.email || "Verified Member",
        effectiveRole,
        numRating,
        academic_rating ? Math.min(5, Math.max(1, Number(academic_rating))) : numRating,
        faculty_rating ? Math.min(5, Math.max(1, Number(faculty_rating))) : numRating,
        infrastructure_rating ? Math.min(5, Math.max(1, Number(infrastructure_rating))) : numRating,
        support_rating ? Math.min(5, Math.max(1, Number(support_rating))) : numRating,
        title?.trim() || "Course & Institution Feedback",
        comment.trim(),
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Thank you! Your feedback and rating have been recorded successfully.",
      review: result.rows[0],
    });
  } catch (err: any) {
    console.error("POST /api/admin/reviews error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit review" }, { status: 500 });
  }
}
