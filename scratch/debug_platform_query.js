require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function test() {
  const limit = 10;
  const offset = 0;
  const search = "";
  const scopeAllInstitutions = true;
  const institutionIds = [];
  const view = "my";
  const currentUserId = 5307;
  const isPlatformAdmin = true;
  const isInstitutionAdmin = false;
  const scopedAcademicYearId = null;

  const query = `
    WITH filtered AS MATERIALIZED (
      SELECT at.id
      FROM practice_exam_templates at
      LEFT JOIN institution_profiles ip ON ip.id = at.source_institution_id
      WHERE ($3 = '' OR at.title ILIKE $4 OR COALESCE(at.description, '') ILIKE $4
        OR COALESCE(at.conducting_body, '') ILIKE $4 OR COALESCE(at.exam_category, '') ILIKE $4
        OR COALESCE(ip.name, ip.slug, '') ILIKE $4)
        AND COALESCE(at.exam_kind, 'practice') = 'exam'
        AND (
          (at.exam_date + at.exam_time) <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
          OR at.created_by = $8
          OR $9::boolean
          OR ($10::boolean AND at.source_institution_id = ANY($6::int[]))
        )
        AND (
          CASE
            WHEN $9::boolean THEN at.is_government_exam = TRUE
            WHEN $7::text = 'marketplace' THEN (
              at.is_public = TRUE
              AND at.is_active = TRUE
              AND at.blocked_by_platform = FALSE
              AND NOT (at.source_institution_id = ANY($6::int[]))
            )
            ELSE (
              $5::boolean
              OR at.source_institution_id = ANY($6::int[])
              OR at.is_government_exam = TRUE
              OR at.is_public = TRUE
            )
          END
        )
        AND (
          $7::text = 'marketplace'
          OR $11::int IS NULL
          OR EXISTS (
            SELECT 1
            FROM practice_exams scoped_exam
            WHERE scoped_exam.template_id = at.id
              AND scoped_exam.academic_year_id = $11
              AND COALESCE(scoped_exam.exam_kind, 'practice') = 'exam'
              AND COALESCE(scoped_exam.is_deleted, FALSE) = FALSE
          )
        )
        AND COALESCE(at.is_deleted, FALSE) = FALSE
        AND (at.is_government_exam = TRUE OR ip.id IS NULL OR (COALESCE(ip.is_deleted, FALSE) = FALSE AND ip.is_active = TRUE))
    ),
    page_ids AS (
      SELECT f.id
      FROM filtered f
      INNER JOIN practice_exam_templates at ON at.id = f.id
      LEFT JOIN exam_series es
        ON es.id = at.exam_series_id
       AND COALESCE(es.is_deleted, FALSE) = FALSE
      ORDER BY
        ((COALESCE(at.marketplace_requested, FALSE) OR COALESCE(es.marketplace_requested, FALSE)) AND at.is_public = FALSE AND at.blocked_by_platform = FALSE) DESC,
        at.updated_at DESC,
        at.id DESC
      LIMIT $1::int OFFSET $2::int
    ),
    page_rows AS (
      SELECT
        at.id,
        CASE
          WHEN es.id IS NOT NULL THEN
            es.title || COALESCE(' (' || COALESCE(target_scope_program.title, target_program.title) || ')', '')
          ELSE at.title
        END AS title,
        at.description,
        at.total_marks::float8 AS total_marks,
        at.duration_minutes,
        at.ai_question_format,
        at.exam_date,
        at.exam_time,
        at.exam_place,
        at.exam_mode,
        COALESCE(es.result_date, at.result_date) AS result_date,
        COALESCE(es.instant_result, at.instant_result) AS instant_result,
        at.is_public,
        (COALESCE(at.marketplace_requested, FALSE) OR COALESCE(es.marketplace_requested, FALSE)) AS marketplace_requested,
        COALESCE(at.marketplace_requested_at, es.marketplace_requested_at) AS marketplace_requested_at,
        COALESCE(at.marketplace_requested_by, es.marketplace_requested_by) AS marketplace_requested_by,
        requester.full_name AS marketplace_requested_by_name,
        at.marketplace_approved,
        at.marketplace_approved_at,
        at.marketplace_approved_by,
        approver.full_name AS marketplace_approved_by_name,
        at.parent_template_id,
        at.is_active,
        at.version,
        at.source_institution_id,
        COALESCE(ip.name, ip.slug, 'Platform Examination Authority') AS institution_name,
        at.created_by,
        creator.full_name AS created_by_name,
        updater.full_name AS updated_by_name,
        at.created_at,
        at.updated_at,
        at.blocked_by_platform,
        blocker.full_name AS blocked_by_name,
        at.blocked_at,
        at.block_reason,
        at.conducting_body,
        at.exam_category,
        at.official_website_url,
        at.apply_url,
        at.notification_pdf_url,
        at.application_start_date,
        at.application_end_date,
        at.admit_card_date,
        at.eligibility_criteria,
        at.application_fee,
        COALESCE(at.is_government_exam, FALSE) AS is_government_exam,
        assn.id AS assigned_practice_exam_id,
        target.target_type,
        target.target_id,
        target.program_id AS target_program_id,
        COALESCE(target_scope_program.title, target_scope_master_course.name) AS target_program_label,
        CASE
          WHEN target.target_type = 'INSTITUTION' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > Whole institution'
          WHEN target.target_type = 'PROGRAM' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > ' || COALESCE(target_program.title, target_master_course.name, 'Course')
          WHEN target.target_type = 'SECTION' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > ' || COALESCE(target_scope_program.title, target_scope_master_course.name, 'Class') || ' > ' || target_section.name
          WHEN target.target_type = 'STUDENT' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || COALESCE(' > ' || COALESCE(target_scope_program.title, target_scope_master_course.name), '') || ' > ' || target_user.full_name
          ELSE NULL
        END AS target_label,
        '[]'::json AS syllabus_node_ids,
        '[]'::json AS syllabus_nodes,
        COUNT(DISTINCT q.id)::int AS question_count,
        COUNT(DISTINCT qf.id)::int AS attachment_count
      FROM page_ids p
      INNER JOIN practice_exam_templates at ON at.id = p.id
      LEFT JOIN exam_series es
        ON es.id = at.exam_series_id
       AND COALESCE(es.is_deleted, FALSE) = FALSE
      LEFT JOIN institution_profiles ip
        ON ip.id = at.source_institution_id
       AND COALESCE(ip.is_deleted, FALSE) = FALSE
      LEFT JOIN users creator ON creator.id = at.created_by
      LEFT JOIN users updater ON updater.id = at.updated_by
      LEFT JOIN users blocker ON blocker.id = at.blocked_by
      LEFT JOIN users requester ON requester.id = COALESCE(at.marketplace_requested_by, es.marketplace_requested_by)
      LEFT JOIN users approver ON approver.id = at.marketplace_approved_by
      LEFT JOIN practice_exams assn
        ON assn.template_id = at.id
       AND COALESCE(assn.exam_kind, 'practice') = 'exam'
       AND COALESCE(assn.is_deleted, FALSE) = FALSE
       AND ($11::int IS NULL OR assn.academic_year_id = $11)
      LEFT JOIN practice_exam_targets target ON target.practice_exam_id = assn.id
      LEFT JOIN institution_programs target_program
        ON target_program.id = target.target_id AND target.target_type = 'PROGRAM'
      LEFT JOIN master_courses target_master_course
        ON target_master_course.id = target.target_id AND target.target_type = 'PROGRAM'
      LEFT JOIN institution_programs target_scope_program
        ON target_scope_program.id = target.program_id
      LEFT JOIN master_courses target_scope_master_course
        ON target_scope_master_course.id = target.program_id
      LEFT JOIN sections target_section
        ON target_section.id = target.target_id AND target.target_type = 'SECTION'
      LEFT JOIN student_profiles target_student
        ON target_student.id = target.target_id AND target.target_type = 'STUDENT'
      LEFT JOIN users target_user ON target_user.id = target_student.user_id
      LEFT JOIN practice_exam_template_questions q ON q.template_id = at.id
      LEFT JOIN practice_exam_template_question_files qf ON qf.question_id = q.id
      GROUP BY at.id, es.id, ip.id, creator.id, updater.id, blocker.id,
               requester.id, approver.id, assn.id, target.id, target_program.id, target_master_course.id,
               target_section.id, target_user.id, target_scope_program.id, target_scope_master_course.id
      ORDER BY
        ((COALESCE(at.marketplace_requested, FALSE) OR COALESCE(es.marketplace_requested, FALSE)) AND at.is_public = FALSE AND at.blocked_by_platform = FALSE) DESC,
        at.updated_at DESC,
        at.id DESC
    )
    SELECT
      COALESCE((SELECT json_agg(page_rows) FROM page_rows), '[]'::json) AS data,
      (SELECT COUNT(*)::int FROM filtered) AS total,
      (SELECT COUNT(*)::int FROM filtered) AS stats_total,
      (
        SELECT COUNT(*)::int
        FROM practice_exam_templates at
        INNER JOIN filtered f ON f.id = at.id
        WHERE at.is_active = TRUE AND at.blocked_by_platform = FALSE
      ) AS stats_active,
      (
        SELECT COUNT(*)::int
        FROM practice_exam_templates at
        INNER JOIN filtered f ON f.id = at.id
        WHERE at.blocked_by_platform = TRUE
      ) AS stats_blocked,
      (
        SELECT COUNT(*)::int
        FROM practice_exam_template_questions q
        WHERE q.template_id IN (SELECT id FROM filtered)
      ) AS stats_questions
  `;

  const params = [
    limit,
    offset,
    search,
    `%${search}%`,
    scopeAllInstitutions,
    institutionIds,
    view,
    currentUserId,
    isPlatformAdmin,
    isInstitutionAdmin,
    scopedAcademicYearId,
  ];

  const res = await pool.query(query, params);
  console.log('RESULT:', JSON.stringify(res.rows[0], null, 2));
  await pool.end();
}

test();
