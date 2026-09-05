import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

export type ApprovalItemType = "assignment" | "note" | "practice_exam" | "exam" | "teacher";
export type ApprovalStatus = "pending" | "approved" | "declined";

export async function ensureApprovalColumns() {
  await db.query(`
    -- Ensure columns exist in assignment_templates
    ALTER TABLE assignment_templates ADD COLUMN IF NOT EXISTS marketplace_requested BOOLEAN DEFAULT FALSE;
    ALTER TABLE assignment_templates ADD COLUMN IF NOT EXISTS marketplace_requested_at TIMESTAMPTZ;
    ALTER TABLE assignment_templates ADD COLUMN IF NOT EXISTS marketplace_requested_by INTEGER;
    ALTER TABLE assignment_templates ADD COLUMN IF NOT EXISTS marketplace_approved BOOLEAN DEFAULT FALSE;
    ALTER TABLE assignment_templates ADD COLUMN IF NOT EXISTS marketplace_approved_at TIMESTAMPTZ;
    ALTER TABLE assignment_templates ADD COLUMN IF NOT EXISTS marketplace_approved_by INTEGER;
    ALTER TABLE assignment_templates ADD COLUMN IF NOT EXISTS marketplace_rejection_reason TEXT;
    ALTER TABLE assignment_templates ADD COLUMN IF NOT EXISTS marketplace_rejected_at TIMESTAMPTZ;

    -- Ensure columns exist in practice_exam_templates
    ALTER TABLE practice_exam_templates ADD COLUMN IF NOT EXISTS marketplace_requested BOOLEAN DEFAULT FALSE;
    ALTER TABLE practice_exam_templates ADD COLUMN IF NOT EXISTS marketplace_requested_at TIMESTAMPTZ;
    ALTER TABLE practice_exam_templates ADD COLUMN IF NOT EXISTS marketplace_requested_by INTEGER;
    ALTER TABLE practice_exam_templates ADD COLUMN IF NOT EXISTS marketplace_approved BOOLEAN DEFAULT FALSE;
    ALTER TABLE practice_exam_templates ADD COLUMN IF NOT EXISTS marketplace_approved_at TIMESTAMPTZ;
    ALTER TABLE practice_exam_templates ADD COLUMN IF NOT EXISTS marketplace_approved_by INTEGER;
    ALTER TABLE practice_exam_templates ADD COLUMN IF NOT EXISTS marketplace_rejection_reason TEXT;
    ALTER TABLE practice_exam_templates ADD COLUMN IF NOT EXISTS marketplace_rejected_at TIMESTAMPTZ;

    -- Ensure columns exist in exam_templates
    ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS marketplace_requested BOOLEAN DEFAULT FALSE;
    ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS marketplace_requested_at TIMESTAMPTZ;
    ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS marketplace_requested_by INTEGER;
    ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS marketplace_approved BOOLEAN DEFAULT FALSE;
    ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS marketplace_approved_at TIMESTAMPTZ;
    ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS marketplace_approved_by INTEGER;
    ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS marketplace_rejection_reason TEXT;
    ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS marketplace_rejected_at TIMESTAMPTZ;

    -- Ensure columns exist in notes
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS marketplace_requested BOOLEAN DEFAULT FALSE;
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS marketplace_requested_at TIMESTAMPTZ;
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS marketplace_requested_by INTEGER;
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS marketplace_approved BOOLEAN DEFAULT FALSE;
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS marketplace_approved_at TIMESTAMPTZ;
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS marketplace_approved_by INTEGER;
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS marketplace_rejection_reason TEXT;
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS marketplace_rejected_at TIMESTAMPTZ;

    -- Ensure columns exist in user_profiles & users
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS marketplace_requested BOOLEAN DEFAULT FALSE;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS marketplace_requested_at TIMESTAMPTZ;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS marketplace_approved BOOLEAN DEFAULT FALSE;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS marketplace_approved_at TIMESTAMPTZ;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS marketplace_approved_by INTEGER;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS marketplace_rejection_reason TEXT;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS marketplace_rejected_at TIMESTAMPTZ;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
  `);
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    if (!isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Forbidden: Platform Admin access required" },
        { status: 403 }
      );
    }

    await ensureApprovalColumns();

    const url = new URL(req.url);
    const typeFilter = url.searchParams.get("type")?.trim() || "all";
    const statusFilter = url.searchParams.get("status")?.trim() || "pending";
    const search = url.searchParams.get("search")?.trim().toLowerCase() || "";
    const { limit, offset, page } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit") || "15");

    // Fetch live summary counts
    const [
      assignmentsCountRes,
      notesCountRes,
      practiceExamsCountRes,
      examsCountRes,
      teachersCountRes,
    ] = await Promise.all([
      db.query<{ pending: string; approved: string; declined: string }>(`
        SELECT
          COUNT(*) FILTER (WHERE marketplace_requested = TRUE AND COALESCE(marketplace_approved, FALSE) = FALSE AND marketplace_rejected_at IS NULL AND COALESCE(blocked_by_platform, FALSE) = FALSE) AS pending,
          COUNT(*) FILTER (WHERE marketplace_approved = TRUE) AS approved,
          COUNT(*) FILTER (WHERE marketplace_rejected_at IS NOT NULL AND COALESCE(marketplace_approved, FALSE) = FALSE) AS declined
        FROM assignment_templates
        WHERE COALESCE(is_deleted, FALSE) = FALSE
      `),
      db.query<{ pending: string; approved: string; declined: string }>(`
        SELECT
          COUNT(*) FILTER (WHERE marketplace_requested = TRUE AND COALESCE(marketplace_approved, FALSE) = FALSE AND marketplace_rejected_at IS NULL) AS pending,
          COUNT(*) FILTER (WHERE marketplace_approved = TRUE) AS approved,
          COUNT(*) FILTER (WHERE marketplace_rejected_at IS NOT NULL AND COALESCE(marketplace_approved, FALSE) = FALSE) AS declined
        FROM notes
        WHERE COALESCE(is_deleted, FALSE) = FALSE
      `),
      db.query<{ pending: string; approved: string; declined: string }>(`
        SELECT
          COUNT(*) FILTER (WHERE marketplace_requested = TRUE AND COALESCE(marketplace_approved, FALSE) = FALSE AND marketplace_rejected_at IS NULL AND COALESCE(blocked_by_platform, FALSE) = FALSE) AS pending,
          COUNT(*) FILTER (WHERE marketplace_approved = TRUE) AS approved,
          COUNT(*) FILTER (WHERE marketplace_rejected_at IS NOT NULL AND COALESCE(marketplace_approved, FALSE) = FALSE) AS declined
        FROM practice_exam_templates
        WHERE COALESCE(is_deleted, FALSE) = FALSE
      `),
      db.query<{ pending: string; approved: string; declined: string }>(`
        SELECT
          COUNT(*) FILTER (WHERE marketplace_requested = TRUE AND COALESCE(marketplace_approved, FALSE) = FALSE AND marketplace_rejected_at IS NULL AND COALESCE(blocked_by_platform, FALSE) = FALSE) AS pending,
          COUNT(*) FILTER (WHERE marketplace_approved = TRUE) AS approved,
          COUNT(*) FILTER (WHERE marketplace_rejected_at IS NOT NULL AND COALESCE(marketplace_approved, FALSE) = FALSE) AS declined
        FROM exam_templates
        WHERE COALESCE(is_deleted, FALSE) = FALSE
      `),
      db.query<{ pending: string; approved: string; declined: string }>(`
        SELECT
          COUNT(*) FILTER (WHERE (up.marketplace_requested = TRUE OR (COALESCE(up.is_teacher, FALSE) = TRUE AND COALESCE(u.is_verified, FALSE) = FALSE)) AND COALESCE(up.marketplace_approved, FALSE) = FALSE AND up.marketplace_rejected_at IS NULL) AS pending,
          COUNT(*) FILTER (WHERE COALESCE(up.marketplace_approved, FALSE) = TRUE OR COALESCE(u.is_verified, FALSE) = TRUE) AS approved,
          COUNT(*) FILTER (WHERE up.marketplace_rejected_at IS NOT NULL AND COALESCE(up.marketplace_approved, FALSE) = FALSE) AS declined
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        WHERE u.is_active = TRUE AND COALESCE(u.is_deleted, FALSE) = FALSE
          AND (COALESCE(up.is_teacher, FALSE) = TRUE OR up.marketplace_requested = TRUE)
      `),
    ]);

    const counts = {
      assignments: {
        pending: Number(assignmentsCountRes.rows[0]?.pending || 0),
        approved: Number(assignmentsCountRes.rows[0]?.approved || 0),
        declined: Number(assignmentsCountRes.rows[0]?.declined || 0),
      },
      notes: {
        pending: Number(notesCountRes.rows[0]?.pending || 0),
        approved: Number(notesCountRes.rows[0]?.approved || 0),
        declined: Number(notesCountRes.rows[0]?.declined || 0),
      },
      practice_exams: {
        pending: Number(practiceExamsCountRes.rows[0]?.pending || 0),
        approved: Number(practiceExamsCountRes.rows[0]?.approved || 0),
        declined: Number(practiceExamsCountRes.rows[0]?.declined || 0),
      },
      exams: {
        pending: Number(examsCountRes.rows[0]?.pending || 0),
        approved: Number(examsCountRes.rows[0]?.approved || 0),
        declined: Number(examsCountRes.rows[0]?.declined || 0),
      },
      teachers: {
        pending: Number(teachersCountRes.rows[0]?.pending || 0),
        approved: Number(teachersCountRes.rows[0]?.approved || 0),
        declined: Number(teachersCountRes.rows[0]?.declined || 0),
      },
      total_pending:
        Number(assignmentsCountRes.rows[0]?.pending || 0) +
        Number(notesCountRes.rows[0]?.pending || 0) +
        Number(practiceExamsCountRes.rows[0]?.pending || 0) +
        Number(examsCountRes.rows[0]?.pending || 0) +
        Number(teachersCountRes.rows[0]?.pending || 0),
    };

    // Query across unified view
    const unionQueries: string[] = [];

    // 1. Assignments
    if (typeFilter === "all" || typeFilter === "assignment" || typeFilter === "assignments") {
      unionQueries.push(`
        SELECT
          'assignment' AS item_type,
          at.id,
          at.title,
          COALESCE(at.description, '') AS description,
          at.is_public,
          at.marketplace_requested,
          at.marketplace_requested_at,
          at.marketplace_requested_by,
          req.full_name AS requester_name,
          req.email AS requester_email,
          at.marketplace_approved,
          at.marketplace_approved_at,
          appr.full_name AS approver_name,
          at.marketplace_rejection_reason,
          at.marketplace_rejected_at,
          at.is_paid,
          at.price::float8 AS price,
          at.total_marks::float8 AS total_marks,
          (SELECT COUNT(*) FROM assignment_template_questions atq WHERE atq.template_id = at.id)::int AS items_count,
          COALESCE(ip.name, 'Educational Institution') AS institution_name,
          ip.id AS institution_id,
          creator.full_name AS author_name,
          creator.email AS author_email,
          creator.id AS author_id,
          at.created_at,
          at.updated_at
        FROM assignment_templates at
        LEFT JOIN institution_profiles ip ON ip.id = at.source_institution_id
        LEFT JOIN users creator ON creator.id = at.created_by
        LEFT JOIN users req ON req.id = at.marketplace_requested_by
        LEFT JOIN users appr ON appr.id = at.marketplace_approved_by
        WHERE COALESCE(at.is_deleted, FALSE) = FALSE
          AND (
            at.marketplace_requested = TRUE
            OR at.marketplace_approved = TRUE
            OR at.marketplace_rejected_at IS NOT NULL
          )
      `);
    }

    // 2. Notes
    if (typeFilter === "all" || typeFilter === "note" || typeFilter === "notes") {
      unionQueries.push(`
        SELECT
          'note' AS item_type,
          n.id,
          n.title,
          COALESCE(n.description, '') AS description,
          n.is_public,
          n.marketplace_requested,
          n.marketplace_requested_at,
          n.marketplace_requested_by,
          req.full_name AS requester_name,
          req.email AS requester_email,
          n.marketplace_approved,
          n.marketplace_approved_at,
          appr.full_name AS approver_name,
          n.marketplace_rejection_reason,
          n.marketplace_rejected_at,
          n.is_paid,
          n.price::float8 AS price,
          0::float8 AS total_marks,
          (SELECT COUNT(*) FROM note_items ni WHERE ni.note_id = n.id AND COALESCE(ni.is_deleted, FALSE) = FALSE)::int AS items_count,
          COALESCE(ip.name, 'Educational Institution') AS institution_name,
          ip.id AS institution_id,
          creator.full_name AS author_name,
          creator.email AS author_email,
          creator.id AS author_id,
          n.created_at,
          n.updated_at
        FROM notes n
        LEFT JOIN institution_profiles ip ON ip.id = n.institution_id
        LEFT JOIN users creator ON creator.id = n.created_by
        LEFT JOIN users req ON req.id = n.marketplace_requested_by
        LEFT JOIN users appr ON appr.id = n.marketplace_approved_by
        WHERE COALESCE(n.is_deleted, FALSE) = FALSE
          AND (
            n.marketplace_requested = TRUE
            OR n.marketplace_approved = TRUE
            OR n.marketplace_rejected_at IS NOT NULL
          )
      `);
    }

    // 3. Practice Exams
    if (typeFilter === "all" || typeFilter === "practice_exam" || typeFilter === "practice-exam" || typeFilter === "practice-exams" || typeFilter === "practice_exams") {
      unionQueries.push(`
        SELECT
          'practice_exam' AS item_type,
          pet.id,
          pet.title,
          COALESCE(pet.description, '') AS description,
          pet.is_public,
          pet.marketplace_requested,
          pet.marketplace_requested_at,
          pet.marketplace_requested_by,
          req.full_name AS requester_name,
          req.email AS requester_email,
          pet.marketplace_approved,
          pet.marketplace_approved_at,
          appr.full_name AS approver_name,
          pet.marketplace_rejection_reason,
          pet.marketplace_rejected_at,
          pet.is_paid,
          pet.price::float8 AS price,
          pet.total_marks::float8 AS total_marks,
          (SELECT COUNT(*) FROM practice_exam_template_questions petq WHERE petq.template_id = pet.id)::int AS items_count,
          COALESCE(ip.name, 'Educational Institution') AS institution_name,
          ip.id AS institution_id,
          creator.full_name AS author_name,
          creator.email AS author_email,
          creator.id AS author_id,
          pet.created_at,
          pet.updated_at
        FROM practice_exam_templates pet
        LEFT JOIN institution_profiles ip ON ip.id = pet.source_institution_id
        LEFT JOIN users creator ON creator.id = pet.created_by
        LEFT JOIN users req ON req.id = pet.marketplace_requested_by
        LEFT JOIN users appr ON appr.id = pet.marketplace_approved_by
        WHERE COALESCE(pet.is_deleted, FALSE) = FALSE
          AND (
            pet.marketplace_requested = TRUE
            OR pet.marketplace_approved = TRUE
            OR pet.marketplace_rejected_at IS NOT NULL
          )
      `);
    }

    // 4. Exams
    if (typeFilter === "all" || typeFilter === "exam" || typeFilter === "exams") {
      unionQueries.push(`
        SELECT
          'exam' AS item_type,
          et.id,
          et.title,
          COALESCE(et.description, '') AS description,
          et.is_public,
          et.marketplace_requested,
          et.marketplace_requested_at,
          et.marketplace_requested_by,
          req.full_name AS requester_name,
          req.email AS requester_email,
          et.marketplace_approved,
          et.marketplace_approved_at,
          appr.full_name AS approver_name,
          et.marketplace_rejection_reason,
          et.marketplace_rejected_at,
          et.is_paid,
          et.price::float8 AS price,
          et.total_marks::float8 AS total_marks,
          (SELECT COUNT(*) FROM exam_template_questions etq WHERE etq.template_id = et.id)::int AS items_count,
          COALESCE(ip.name, 'Educational Institution') AS institution_name,
          ip.id AS institution_id,
          creator.full_name AS author_name,
          creator.email AS author_email,
          creator.id AS author_id,
          et.created_at,
          et.updated_at
        FROM exam_templates et
        LEFT JOIN institution_profiles ip ON ip.id = et.source_institution_id
        LEFT JOIN users creator ON creator.id = et.created_by
        LEFT JOIN users req ON req.id = et.marketplace_requested_by
        LEFT JOIN users appr ON appr.id = et.marketplace_approved_by
        WHERE COALESCE(et.is_deleted, FALSE) = FALSE
          AND (
            et.marketplace_requested = TRUE
            OR et.marketplace_approved = TRUE
            OR et.marketplace_rejected_at IS NOT NULL
          )
      `);
    }

    // 5. Teachers
    if (typeFilter === "all" || typeFilter === "teacher" || typeFilter === "teachers") {
      unionQueries.push(`
        SELECT
          'teacher' AS item_type,
          u.id,
          u.full_name AS title,
          COALESCE(up.bio, COALESCE(up.qualification, 'Faculty Specialist')) AS description,
          COALESCE(u.is_verified, FALSE) AS is_public,
          COALESCE(up.marketplace_requested, TRUE) AS marketplace_requested,
          COALESCE(up.marketplace_requested_at, u.created_at) AS marketplace_requested_at,
          u.id AS marketplace_requested_by,
          u.full_name AS requester_name,
          u.email AS requester_email,
          COALESCE(up.marketplace_approved, u.is_verified, FALSE) AS marketplace_approved,
          up.marketplace_approved_at,
          appr.full_name AS approver_name,
          up.marketplace_rejection_reason,
          up.marketplace_rejected_at,
          FALSE AS is_paid,
          0::float8 AS price,
          COALESCE(up.experience_years, 0)::float8 AS total_marks,
          (SELECT COUNT(*) FROM user_teaching_subjects uts WHERE uts.user_id = u.id)::int AS items_count,
          COALESCE(ip.name, 'Educational Institution') AS institution_name,
          ip.id AS institution_id,
          u.full_name AS author_name,
          u.email AS author_email,
          u.id AS author_id,
          u.created_at,
          COALESCE(up.updated_at, u.created_at) AS updated_at
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN institution_profiles ip ON ip.id = up.under_institution_id
        LEFT JOIN users appr ON appr.id = up.marketplace_approved_by
        WHERE u.is_active = TRUE
          AND COALESCE(u.is_deleted, FALSE) = FALSE
          AND (
            COALESCE(up.is_teacher, FALSE) = TRUE
            OR up.marketplace_requested = TRUE
            OR up.marketplace_approved = TRUE
            OR up.marketplace_rejected_at IS NOT NULL
          )
      `);
    }

    const unifiedSql = unionQueries.join("\nUNION ALL\n");

    // Dynamic filters
    const whereConditions: string[] = [];
    const params: unknown[] = [];

    if (statusFilter === "pending") {
      whereConditions.push(`(t.marketplace_approved = FALSE AND t.marketplace_rejected_at IS NULL)`);
    } else if (statusFilter === "approved") {
      whereConditions.push(`(t.marketplace_approved = TRUE)`);
    } else if (statusFilter === "declined") {
      whereConditions.push(`(t.marketplace_rejected_at IS NOT NULL AND t.marketplace_approved = FALSE)`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(
        LOWER(t.title) LIKE $${params.length}
        OR LOWER(t.description) LIKE $${params.length}
        OR LOWER(t.institution_name) LIKE $${params.length}
        OR LOWER(t.author_name) LIKE $${params.length}
        OR LOWER(t.author_email) LIKE $${params.length}
      )`);
    }

    const filterClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM (${unifiedSql}) t
      ${filterClause}
    `;

    const dataQuery = `
      SELECT *
      FROM (${unifiedSql}) t
      ${filterClause}
      ORDER BY
        (t.marketplace_approved = FALSE AND t.marketplace_rejected_at IS NULL) DESC,
        COALESCE(t.marketplace_requested_at, t.created_at) DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const [totalRes, dataRes] = await Promise.all([
      db.query<{ total: string }>(countQuery, params),
      db.query(dataQuery, [...params, limit, offset]),
    ]);

    const total = Number(totalRes.rows[0]?.total || 0);

    return NextResponse.json({
      data: dataRes.rows,
      counts,
      total,
      page,
      pageCount: getPageCount(total, limit),
    });
  } catch (error) {
    console.error("[approvals.get.error]", error);
    const message = error instanceof Error ? error.message : "Failed to load approvals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
