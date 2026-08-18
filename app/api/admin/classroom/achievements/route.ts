import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to load achievements";
  const status =
    message === "Unauthorized" || message === "User not found" ? 401 :
      message === "Forbidden: Admin access required" ||
      message === "Forbidden: Invalid child context" ? 403 :
        400;
  return NextResponse.json({ error: message }, { status });
}

async function ensureStudentAchievementColumns() {
  await db.query(`
    ALTER TABLE student_achievements
      ADD COLUMN IF NOT EXISTS template_id INTEGER,
      ADD COLUMN IF NOT EXISTS institution_id INTEGER,
      ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
  `);
  await db.query(`
    UPDATE student_achievements achievement
    SET academic_year_id = enrollment.academic_year_id
    FROM student_profiles profile
    INNER JOIN student_enrollments enrollment
      ON enrollment.student_id = profile.id
     AND enrollment.status = 'active'
     AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
    INNER JOIN academic_years academic_year
      ON academic_year.id = enrollment.academic_year_id
     AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
    WHERE achievement.student_id = profile.user_id
      AND achievement.institution_id = enrollment.institution_id
      AND achievement.academic_year_id IS NULL
      AND COALESCE(achievement.is_deleted, FALSE) = FALSE
      AND COALESCE(achievement.achievement_date, achievement.created_at::date)
        BETWEEN academic_year.start_date AND academic_year.end_date
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_student_achievements_session
    ON student_achievements(institution_id, academic_year_id, is_deleted, achievement_date DESC)
  `);
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const canView = hasPermission(currentUser, "student.myclassroom.achievements.view");
    if (!canView) throw new Error("Forbidden: Admin access required");

    await ensureStudentAchievementColumns();
    const enrollment = await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes);
    if (!enrollment) {
      return NextResponse.json({ data: [], pageCount: 0, total: 0, stats: { total: 0, certificates: 0 } });
    }

    const url = new URL(req.url);
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() ?? "";
    const params: unknown[] = [
      currentUser.id,
      enrollment.student_id,
      enrollment.institution_id,
      enrollment.id,
      limit,
      offset,
      search,
      `%${search}%`,
    ];

    const [achievementsResult, countResult, statsResult] = await Promise.all([
      db.query(
        `
          SELECT
            achievement.id,
            achievement.student_id,
            achievement.card_category_id,
            category.name AS category,
            achievement.template_id,
            achievement.institution_id,
            achievement.academic_year_id,
            template.name AS template_name,
            template.thumbnail_url AS template_thumbnail_url,
            COALESCE(NULLIF(achievement.certificate_url, ''), template.thumbnail_url) AS download_url,
            achievement.title,
            achievement.achievement_date,
            achievement.certificate_url,
            achievement.remarks,
            achievement.created_at,
            achievement.updated_at,
            institution.name AS institution_name,
            student_user.full_name AS student_name,
            enrollment.roll_number,
            COALESCE(program.title, class_category.name) AS program_name,
            section.name AS section_name,
            academic_year.name AS academic_year_name
          FROM student_achievements achievement
          INNER JOIN users student_user
             ON student_user.id = achievement.student_id
            AND student_user.id = $1
            AND COALESCE(student_user.is_deleted, FALSE) = FALSE
          INNER JOIN student_profiles student_profile
             ON student_profile.user_id = student_user.id
            AND student_profile.id = $2
          INNER JOIN institution_profiles institution
             ON institution.id = achievement.institution_id
            AND institution.id = $3
            AND institution.is_active = TRUE
            AND COALESCE(institution.is_deleted, FALSE) = FALSE
          INNER JOIN student_enrollments enrollment
             ON enrollment.id = $4
            AND enrollment.institution_id = institution.id
            AND enrollment.student_id = student_profile.id
            AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
          INNER JOIN card_categories category ON category.id = achievement.card_category_id
          LEFT JOIN document_templates template ON template.id = achievement.template_id
          LEFT JOIN institution_programs program
             ON program.id = enrollment.program_id
            AND COALESCE(program.is_deleted, FALSE) = FALSE
          LEFT JOIN categories class_category ON class_category.id = enrollment.class_category_id
          LEFT JOIN sections section ON section.id = enrollment.section_id
          LEFT JOIN academic_years academic_year ON academic_year.id = enrollment.academic_year_id
          WHERE COALESCE(achievement.is_deleted, FALSE) = FALSE
            AND achievement.academic_year_id = enrollment.academic_year_id
            AND (
              $7 = ''
              OR achievement.title ILIKE $8
              OR category.name ILIKE $8
              OR COALESCE(template.name, '') ILIKE $8
              OR COALESCE(achievement.remarks, '') ILIKE $8
            )
          ORDER BY COALESCE(achievement.achievement_date, achievement.created_at::date) DESC, achievement.id DESC
          LIMIT $5 OFFSET $6
        `,
        params
      ),
      db.query<{ count: string }>(
        `
          SELECT COUNT(*)
          FROM student_achievements achievement
          INNER JOIN users student_user
             ON student_user.id = achievement.student_id
            AND student_user.id = $1
            AND COALESCE(student_user.is_deleted, FALSE) = FALSE
          INNER JOIN student_profiles student_profile
             ON student_profile.user_id = student_user.id
            AND student_profile.id = $2
          INNER JOIN institution_profiles institution
             ON institution.id = achievement.institution_id
            AND institution.id = $3
            AND institution.is_active = TRUE
            AND COALESCE(institution.is_deleted, FALSE) = FALSE
          INNER JOIN card_categories category ON category.id = achievement.card_category_id
          LEFT JOIN document_templates template ON template.id = achievement.template_id
          WHERE COALESCE(achievement.is_deleted, FALSE) = FALSE
            AND achievement.academic_year_id = $6
            AND (
              $4 = ''
              OR achievement.title ILIKE $5
              OR category.name ILIKE $5
              OR COALESCE(template.name, '') ILIKE $5
              OR COALESCE(achievement.remarks, '') ILIKE $5
            )
        `,
        [currentUser.id, enrollment.student_id, enrollment.institution_id, search, `%${search}%`, enrollment.academic_year_id]
      ),
      db.query<{ total: string; certificates: string }>(
        `
          SELECT
            COUNT(*)::text AS total,
            COUNT(*) FILTER (WHERE COALESCE(achievement.certificate_url, '') <> '')::text AS certificates
          FROM student_achievements achievement
          INNER JOIN users student_user
             ON student_user.id = achievement.student_id
            AND student_user.id = $1
            AND COALESCE(student_user.is_deleted, FALSE) = FALSE
          INNER JOIN student_profiles student_profile
             ON student_profile.user_id = student_user.id
            AND student_profile.id = $2
          WHERE achievement.institution_id = $3
            AND achievement.academic_year_id = $4
            AND COALESCE(achievement.is_deleted, FALSE) = FALSE
        `,
        [currentUser.id, enrollment.student_id, enrollment.institution_id, enrollment.academic_year_id]
      ),
    ]);

    const total = Number(countResult.rows[0]?.count ?? 0);
    return NextResponse.json({
      data: achievementsResult.rows,
      pageCount: getPageCount(total, limit),
      total,
      stats: {
        total: Number(statsResult.rows[0]?.total ?? 0),
        certificates: Number(statsResult.rows[0]?.certificates ?? 0),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
