import { NextResponse } from "next/server";

import { parseExamMetadataPayload } from "@/lib/exams/exam-payload";
import { requireAdmin } from "@/lib/auth/auth";
import {
  getRequestedInstitutionId,
  getScopedInstitutionIds,
} from "@/lib/auth/institution-scope";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  ensureExamSchema,
  replaceExamSyllabusNodes,
} from "@/lib/queries/exams";
import { notifyStudentsForContentTarget } from "@/lib/notifications/student-content-events";
import { ensureSystemNotificationTemplates } from "@/lib/queries/notifications";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import { NotificationService } from "@/services/notificationService";
import { slugify } from "@/lib/utils/slug";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    400;
  return NextResponse.json({ error: message }, { status });
}

function parseIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0))
  );
}

function permissionInstitutionIds(
  user: Awaited<ReturnType<typeof requireAdmin>>,
  permission: string
) {
  return Array.from(
    new Set(
      (user.memberships ?? [])
        .filter(
          (membership) =>
            membership.permissions.includes("*") ||
            membership.permissions.includes(permission)
        )
        .map((membership) => membership.institution_id)
    )
  );
}

function parseSeriesPayload(body: Record<string, unknown>) {
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const fromDate = String(body.from_date ?? "").trim();
  const toDate = String(body.to_date ?? "").trim();
  const institutionId = Number(body.source_institution_id);
  const targetType = String(body.target_type ?? "INSTITUTION").toUpperCase();
  const allowedTargetTypes = new Set(["INSTITUTION", "PROGRAM", "SECTION", "STUDENT"]);
  const instantResult = body.instant_result === true;
  const resultDate = String(body.result_date ?? "").trim();
  if (!title) throw new Error("Exam name is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) throw new Error("From date is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(toDate)) throw new Error("To date is required");
  if (toDate < fromDate) throw new Error("To date cannot be before from date");
  if (!Number.isInteger(institutionId) || institutionId <= 0) {
    throw new Error("Institution is required");
  }
  if (!allowedTargetTypes.has(targetType)) throw new Error("Exam target is required");
  if (!instantResult && !/^\d{4}-\d{2}-\d{2}$/.test(resultDate)) {
    throw new Error("Result date is required");
  }
  if (!instantResult && resultDate < toDate) {
    throw new Error("Result date cannot be before exam end date");
  }
  const targetId =
    targetType === "INSTITUTION"
      ? institutionId
      : Number(body.target_id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    throw new Error("Exam target is required");
  }
  const targetProgramId =
    targetType === "PROGRAM"
      ? targetId
      : targetType === "SECTION" || targetType === "STUDENT"
        ? Number(body.target_program_id ?? body.program_id)
        : null;
  if (
    (targetType === "SECTION" || targetType === "STUDENT") &&
    (!Number.isInteger(targetProgramId) || Number(targetProgramId) <= 0)
  ) {
    throw new Error("Class / Program is required");
  }
  return {
    title,
    description,
    fromDate,
    toDate,
    institutionId,
    targetType,
    targetId,
    targetProgramId: targetProgramId && Number.isInteger(targetProgramId) ? targetProgramId : null,
    instantResult,
    resultDate: instantResult ? null : resultDate,
    isPublic: body.is_public === true,
    isActive: body.is_active === true,
  };
}

async function buildSeriesSlug(institutionId: number, title: string, excludeId?: number) {
  const baseSlug = slugify(title) || `exam-${Date.now()}`;
  let slug = baseSlug;
  let index = 1;
  while (true) {
    const params: unknown[] = [institutionId, slug];
    let exclude = "";
    if (excludeId) {
      params.push(excludeId);
      exclude = `AND id <> $${params.length}`;
    }
    const result = await db.query(
      `
        SELECT 1
        FROM exam_series
        WHERE source_institution_id = $1
          AND slug = $2
          AND COALESCE(is_deleted, FALSE) = FALSE
          ${exclude}
        LIMIT 1
      `,
      params
    );
    if (!result.rows[0]) return slug;
    slug = `${baseSlug}-${index++}`;
  }
}

async function getSeriesSubjectTitle(seriesId: number, syllabusNodeIds: number[], targetProgramId: number | null, targetType: string, targetId: number) {
  const seriesResult = await db.query<{ title: string }>(
    `SELECT title FROM exam_series WHERE id = $1 AND COALESCE(is_deleted, FALSE) = FALSE`,
    [seriesId]
  );
  const seriesTitle = seriesResult.rows[0]?.title;
  if (!seriesTitle) throw new Error("Exam structure not found");

  const subjectResult = await db.query<{ name: string }>(
    `
      SELECT sub.name
      FROM syllabus_nodes sn
      INNER JOIN syllabi sy ON sy.id = sn.syllabus_id
      INNER JOIN subjects sub ON sub.id = sy.subject_id
      WHERE sn.id = ANY($1::int[])
      ORDER BY sub.name
      LIMIT 1
    `,
    [syllabusNodeIds]
  );
  const subjectName = subjectResult.rows[0]?.name ?? "Subject";
  const programId = targetProgramId ?? (targetType === "PROGRAM" ? targetId : null);
  let className = "";
  if (programId) {
    const programResult = await db.query<{ title: string }>(
      `SELECT title FROM institution_programs WHERE id = $1 LIMIT 1`,
      [programId]
    );
    className = programResult.rows[0]?.title ?? "";
  }
  return className
    ? `${seriesTitle}-${subjectName} (${className})`
    : `${seriesTitle}-${subjectName}`;
}

function toDateOnly(value: string | Date | null | undefined) {
  if (!value) return "";
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const text = String(value).trim();
  const isoDate = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];
  const parsed = new Date(text);
  if (!Number.isFinite(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function applySeriesResultControls(
  payload: ReturnType<typeof parseExamMetadataPayload>
) {
  if (!payload.examSeriesId) return;
  const result = await db.query<{
    source_institution_id: number;
    instant_result: boolean;
    result_date: string | null;
  }>(
    `
      SELECT source_institution_id, instant_result, result_date
      FROM exam_series
      WHERE id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [payload.examSeriesId]
  );
  const series = result.rows[0];
  if (!series) throw new Error("Exam structure not found");
  if (Number(series.source_institution_id) !== payload.institutionId) {
    throw new Error("Subject paper institution must match the exam");
  }
  payload.instantResult = Boolean(series.instant_result);
  payload.resultDate = series.instant_result
    ? null
    : toDateOnly(series.result_date);
}

async function validateExamTarget(
  institutionId: number,
  targetType: string,
  targetId: number,
  targetProgramId: number | null
) {
  if (targetType === "INSTITUTION") return;
  if (targetType === "PROGRAM") {
    const result = await db.query(
      `
        SELECT 1
        FROM institution_programs program
        INNER JOIN institution_profiles institution
          ON institution.id = program.institution_id
        WHERE program.id = $1
          AND program.institution_id = $2
          AND COALESCE(program.is_deleted, FALSE) = FALSE
          AND program.is_active = TRUE
          AND COALESCE(institution.is_deleted, FALSE) = FALSE
          AND institution.is_active = TRUE
        LIMIT 1
      `,
      [targetId, institutionId]
    );
    if (!result.rows[0]) throw new Error("Selected class is not in this institution");
    return;
  }
  if (targetType === "SECTION") {
    if (!targetProgramId) throw new Error("Class / Program is required");
    const result = await db.query(
      `
        SELECT 1
        FROM program_sections ps
        INNER JOIN institution_programs ip ON ip.id = ps.program_id
        INNER JOIN institution_profiles institution ON institution.id = ip.institution_id
        WHERE ps.program_id = $1
          AND ps.section_id = $2
          AND ip.institution_id = $3
          AND COALESCE(ip.is_deleted, FALSE) = FALSE
          AND ip.is_active = TRUE
          AND COALESCE(institution.is_deleted, FALSE) = FALSE
          AND institution.is_active = TRUE
        LIMIT 1
      `,
      [targetProgramId, targetId, institutionId]
    );
    if (!result.rows[0]) throw new Error("Selected section is not in this class");
    return;
  }
  if (targetType === "STUDENT") {
    if (!targetProgramId) throw new Error("Class / Program is required");
    const result = await db.query(
      `
        SELECT 1
        FROM student_profiles sp
        INNER JOIN student_enrollments se ON se.student_id = sp.id
        INNER JOIN institution_profiles institution ON institution.id = se.institution_id
        WHERE sp.id = $1
          AND se.institution_id = $2
          AND se.program_id = $3
          AND se.status = 'active'
          AND COALESCE(se.is_deleted, FALSE) = FALSE
          AND COALESCE(institution.is_deleted, FALSE) = FALSE
          AND institution.is_active = TRUE
        LIMIT 1
      `,
      [targetId, institutionId, targetProgramId]
    );
    if (!result.rows[0]) throw new Error("Selected student is not in this class");
  }
}

async function validateSyllabusNodes(institutionId: number, nodeIds: number[]) {
  if (nodeIds.length === 0) return;
  const result = await db.query<{ count: string }>(
    `
      SELECT COUNT(DISTINCT sn.id)::text AS count
      FROM syllabus_nodes sn
      INNER JOIN syllabi s ON s.id = sn.syllabus_id
      WHERE sn.id = ANY($1::int[])
        AND COALESCE(sn.is_active, TRUE) = TRUE
        AND COALESCE(s.is_active, TRUE) = TRUE
        AND (
          s.is_template = TRUE
          OR s.institution_id = $2
        )
    `,
    [nodeIds, institutionId]
  );
  if (Number(result.rows[0]?.count ?? 0) !== nodeIds.length) {
    throw new Error("One or more selected syllabus nodes are invalid");
  }
}

async function notifyInstitutionAdminsExamBlocked(
  actor: Awaited<ReturnType<typeof requireAdmin>>,
  exams: Array<{
    id: number;
    title: string;
    source_institution_id: number;
  }>,
  reason: string
) {
  if (!exams.length) return;
  const institutionIds = Array.from(
    new Set(exams.map((exam) => exam.source_institution_id))
  );
  const recipientsResult = await db.query<{
    institution_id: number;
    user_id: number;
  }>(
    `
      SELECT DISTINCT im.institution_id, im.user_id
      FROM institution_memberships im
      INNER JOIN roles r ON r.id = im.role_id
      INNER JOIN users u ON u.id = im.user_id
      WHERE im.institution_id = ANY($1::int[])
        AND im.is_active = TRUE
        AND r.code = 'institution_admin'
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
    `,
    [institutionIds]
  );
  const recipientsByInstitution = new Map<number, number[]>();
  for (const row of recipientsResult.rows) {
    const recipients = recipientsByInstitution.get(row.institution_id) ?? [];
    recipients.push(row.user_id);
    recipientsByInstitution.set(row.institution_id, recipients);
  }

  await ensureSystemNotificationTemplates(db);
  const notificationService = new NotificationService(db);
  await Promise.all(
    exams.map((exam) =>
      notificationService.create({
        type: "content.exams.blocked",
        recipients:
          recipientsByInstitution.get(exam.source_institution_id) ?? [],
        institutionId: exam.source_institution_id,
        entityType: "practice_exam_template",
        entityId: exam.id,
        createdBy: actor.id,
        priority: "high",
        payload: {
          actor_name: actor.full_name,
          practice_exam_name: exam.title,
          block_reason: reason,
          url: "/admin/master-data/exams",
        },
      })
    )
  );
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureExamSchema();
    const url = new URL(req.url);
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    if (isPlatformAdmin) {
      if (!hasPermission(currentUser, "content.exam_reviews.view")) {
        return NextResponse.json(
          { error: "You don't have permission to review exams" },
          { status: 403 }
        );
      }
    } else if (!hasPermission(currentUser, "content.exams.view")) {
      return NextResponse.json(
        { error: "You don't have permission to view exams" },
        { status: 403 }
      );
    }

    if (url.searchParams.get("action") === "institutions") {
      if (isPlatformAdmin) return NextResponse.json({ data: [] });
      const { page, limit, offset } = getPagination(
        url.searchParams.get("page"),
        url.searchParams.get("limit")
      );
      const search = url.searchParams.get("search")?.trim() ?? "";
      const institutionIds = Array.from(
        new Set(
          (currentUser.memberships ?? [])
            .filter((membership) =>
              membership.permissions.includes("*") ||
              membership.permissions.includes("content.exams.create") ||
              membership.permissions.includes("content.exams.edit")
            )
            .map((membership) => membership.institution_id)
        )
      );
      const [result, countResult] = await Promise.all([
        db.query(
        `
          SELECT id, COALESCE(name, slug, 'Institution ' || id::text) AS name
          FROM institution_profiles
          WHERE id = ANY($1::int[])
            AND is_active = TRUE
            AND COALESCE(is_deleted, FALSE) = FALSE
            AND ($2 = '' OR COALESCE(name, slug, '') ILIKE $3)
          ORDER BY COALESCE(name, slug), id
          LIMIT $4 OFFSET $5
        `,
        [institutionIds, search, `%${search}%`, limit, offset]
        ),
        db.query<{ count: string }>(
          `
            SELECT COUNT(*)
            FROM institution_profiles
            WHERE id = ANY($1::int[])
              AND is_active = TRUE
              AND COALESCE(is_deleted, FALSE) = FALSE
              AND ($2 = '' OR COALESCE(name, slug, '') ILIKE $3)
          `,
          [institutionIds, search, `%${search}%`]
        ),
      ]);
      const total = Number(countResult.rows[0]?.count ?? 0);
      return NextResponse.json({
        data: result.rows,
        page,
        pageCount: getPageCount(total, limit),
      });
    }

    if (url.searchParams.get("action") === "students") {
      if (isPlatformAdmin) return NextResponse.json({ data: [], pageCount: 0 });
      const institutionId = Number(url.searchParams.get("institutionId"));
      const programId = Number(url.searchParams.get("programId"));
      const sectionId = Number(url.searchParams.get("sectionId"));
      if (!Number.isInteger(institutionId) || institutionId <= 0) {
        throw new Error("Institution is required");
      }
      if (
        !hasPermission(currentUser, "content.exams.create", {
          institutionId,
        }) &&
        !hasPermission(currentUser, "content.exams.edit", {
          institutionId,
        })
      ) {
        return NextResponse.json(
          { error: "You don't have permission to assign students here" },
          { status: 403 }
        );
      }
      const { page, limit, offset } = getPagination(
        url.searchParams.get("page"),
        url.searchParams.get("limit")
      );
      const search = url.searchParams.get("search")?.trim() ?? "";
      const params: unknown[] = [institutionId, search, `%${search}%`];
      const filters = [
        "se.institution_id = $1",
        "se.status = 'active'",
        "COALESCE(se.is_deleted, FALSE) = FALSE",
        "institution.is_active = TRUE",
        "COALESCE(institution.is_deleted, FALSE) = FALSE",
        "($2 = '' OR u.full_name ILIKE $3 OR COALESCE(sp.admission_number, '') ILIKE $3 OR COALESCE(u.email, '') ILIKE $3)",
      ];
      if (Number.isInteger(programId) && programId > 0) {
        params.push(programId);
        filters.push(`se.program_id = $${params.length}`);
      }
      if (Number.isInteger(sectionId) && sectionId > 0) {
        params.push(sectionId);
        filters.push(`se.section_id = $${params.length}`);
      }
      const pagedParams = [...params, limit, offset];
      const limitIndex = pagedParams.length - 1;
      const offsetIndex = pagedParams.length;
      const [students, count] = await Promise.all([
        db.query(
          `
            SELECT DISTINCT
              sp.id,
              u.full_name AS name,
              u.email,
              sp.admission_number
            FROM student_enrollments se
            INNER JOIN institution_profiles institution ON institution.id = se.institution_id
            INNER JOIN student_profiles sp ON sp.id = se.student_id
            INNER JOIN users u ON u.id = sp.user_id
            WHERE ${filters.join(" AND ")}
              AND u.is_active = TRUE
              AND COALESCE(u.is_deleted, FALSE) = FALSE
            ORDER BY u.full_name, sp.id
            LIMIT $${limitIndex} OFFSET $${offsetIndex}
          `,
          pagedParams
        ),
        db.query<{ count: string }>(
          `
            SELECT COUNT(DISTINCT sp.id) AS count
            FROM student_enrollments se
            INNER JOIN institution_profiles institution ON institution.id = se.institution_id
            INNER JOIN student_profiles sp ON sp.id = se.student_id
            INNER JOIN users u ON u.id = sp.user_id
            WHERE ${filters.join(" AND ")}
              AND u.is_active = TRUE
              AND COALESCE(u.is_deleted, FALSE) = FALSE
          `,
          params
        ),
      ]);
      const total = Number(count.rows[0]?.count ?? 0);
      return NextResponse.json({
        data: students.rows,
        page,
        pageCount: getPageCount(total, limit),
      });
    }

    if (url.searchParams.get("action") === "series-subjects") {
      const seriesId = Number(url.searchParams.get("seriesId"));
      if (!Number.isInteger(seriesId) || seriesId <= 0) throw new Error("Exam structure is required");
      const series = await db.query<{ source_institution_id: number }>(
        `
          SELECT source_institution_id
          FROM exam_series
          WHERE id = $1
            AND COALESCE(is_deleted, FALSE) = FALSE
          LIMIT 1
        `,
        [seriesId]
      );
      const institutionId = Number(series.rows[0]?.source_institution_id);
      if (!institutionId) throw new Error("Exam structure not found");
      const canViewOwnSeries = isPlatformAdmin || hasPermission(currentUser, "content.exams.view", { institutionId });
      const externalMarketplaceView = !canViewOwnSeries;
      if (externalMarketplaceView && !hasPermission(currentUser, "content.exams.create")) {
        return NextResponse.json({ error: "You don't have permission to view this exam" }, { status: 403 });
      }
      const subjects = await db.query(
        `
          SELECT
            at.id,
            at.exam_series_id,
            CASE
              WHEN es.id IS NOT NULL THEN
                es.title || '-' || COALESCE(
                  (
                    SELECT sub.name
                    FROM practice_exam_syllabus_nodes asn
                    INNER JOIN syllabus_nodes sn ON sn.id = asn.syllabus_node_id
                    INNER JOIN syllabi sy ON sy.id = sn.syllabus_id
                    INNER JOIN subjects sub ON sub.id = sy.subject_id
                    WHERE asn.practice_exam_id = assn.id
                    ORDER BY sub.name
                    LIMIT 1
                  ),
                  'Subject'
                ) || COALESCE(' (' || COALESCE(target_scope_program.title, target_program.title) || ')', '')
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
            COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) AS institution_name,
            at.created_by,
            creator.full_name AS created_by_name,
            updater.full_name AS updated_by_name,
            at.created_at,
            at.updated_at,
            at.blocked_by_platform,
            blocker.full_name AS blocked_by_name,
            at.blocked_at,
            at.block_reason,
            assn.id AS assigned_practice_exam_id,
            target.target_type,
            target.target_id,
            target.program_id AS target_program_id,
            target_scope_program.title AS target_program_label,
            CASE
              WHEN target.target_type = 'INSTITUTION' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > Whole institution'
              WHEN target.target_type = 'PROGRAM' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > ' || target_program.title
              WHEN target.target_type = 'SECTION' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > ' || COALESCE(target_scope_program.title, 'Class') || ' > ' || target_section.name
              WHEN target.target_type = 'STUDENT' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || COALESCE(' > ' || target_scope_program.title, '') || ' > ' || target_user.full_name
              ELSE NULL
            END AS target_label,
            COALESCE(
              (
                SELECT json_agg(asn.syllabus_node_id ORDER BY asn.id)
                FROM practice_exam_syllabus_nodes asn
                WHERE asn.practice_exam_id = assn.id
              ),
              '[]'::json
            ) AS syllabus_node_ids,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', sn.id,
                    'title', sn.title,
                    'node_type', sn.node_type,
                    'subject_id', sub.id,
                    'subject_name', sub.name,
                    'syllabus_id', s.id,
                    'syllabus_title', s.title
                  )
                  ORDER BY sub.name, s.title, sn.sort_order, sn.id
                )
                FROM practice_exam_syllabus_nodes asn
                INNER JOIN syllabus_nodes sn ON sn.id = asn.syllabus_node_id
                INNER JOIN syllabi s ON s.id = sn.syllabus_id
                INNER JOIN subjects sub ON sub.id = s.subject_id
                WHERE asn.practice_exam_id = assn.id
              ),
              '[]'::json
            ) AS syllabus_nodes,
            COUNT(DISTINCT q.id)::int AS question_count,
            COUNT(DISTINCT qf.id)::int AS attachment_count
          FROM practice_exam_templates at
          LEFT JOIN exam_series es
            ON es.id = at.exam_series_id
           AND COALESCE(es.is_deleted, FALSE) = FALSE
          INNER JOIN institution_profiles ip ON ip.id = at.source_institution_id
          LEFT JOIN users creator ON creator.id = at.created_by
          LEFT JOIN users updater ON updater.id = at.updated_by
          LEFT JOIN users blocker ON blocker.id = at.blocked_by
          LEFT JOIN users requester ON requester.id = COALESCE(at.marketplace_requested_by, es.marketplace_requested_by)
          LEFT JOIN users approver ON approver.id = at.marketplace_approved_by
          LEFT JOIN practice_exams assn
            ON assn.template_id = at.id
           AND COALESCE(assn.exam_kind, 'practice') = 'exam'
           AND COALESCE(assn.is_deleted, FALSE) = FALSE
          LEFT JOIN practice_exam_targets target ON target.practice_exam_id = assn.id
          LEFT JOIN institution_programs target_program
            ON target_program.id = target.target_id AND target.target_type = 'PROGRAM'
          LEFT JOIN institution_programs target_scope_program
            ON target_scope_program.id = target.program_id
          LEFT JOIN sections target_section
            ON target_section.id = target.target_id AND target.target_type = 'SECTION'
          LEFT JOIN student_profiles target_student
            ON target_student.id = target.target_id AND target.target_type = 'STUDENT'
          LEFT JOIN users target_user ON target_user.id = target_student.user_id
          LEFT JOIN practice_exam_template_questions q ON q.template_id = at.id
          LEFT JOIN practice_exam_template_question_files qf ON qf.question_id = q.id
          WHERE at.exam_series_id = $1
            AND COALESCE(at.exam_kind, 'practice') = 'exam'
            AND COALESCE(at.is_deleted, FALSE) = FALSE
            AND (
              $2::boolean = FALSE
              OR (
                at.is_public = TRUE
                AND at.is_active = TRUE
                AND at.blocked_by_platform = FALSE
                AND (at.exam_date + at.exam_time) <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
              )
            )
          GROUP BY at.id, es.id, ip.id, creator.id, updater.id, blocker.id,
                   requester.id, approver.id, assn.id, target.id, target_program.id,
                   target_section.id, target_user.id, target_scope_program.id
          ORDER BY target_scope_program.title, at.exam_date, at.exam_time, at.title
        `,
        [seriesId, externalMarketplaceView]
      );
      return NextResponse.json({ data: subjects.rows });
    }

    const { page, limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() ?? "";
    const view = url.searchParams.get("view") === "marketplace" ? "marketplace" : "my";
    const academicYearId = Number(url.searchParams.get("academicYearId"));
    const scopedAcademicYearId = Number.isInteger(academicYearId) && academicYearId > 0 ? academicYearId : null;
    const requestedInstitutionId = getRequestedInstitutionId(url.searchParams);
    const institutionIds = requestedInstitutionId
      ? getScopedInstitutionIds(currentUser, requestedInstitutionId) ?? []
      : isPlatformAdmin
        ? []
        : permissionInstitutionIds(currentUser, "content.exams.view");
    const scopeAllInstitutions = isPlatformAdmin && !requestedInstitutionId;
    {
      const params: unknown[] = [limit, offset, search, `%${search}%`, institutionIds, view, isPlatformAdmin, scopedAcademicYearId];
      const seriesResult = await db.query<{
        data: unknown[];
        total: number;
        stats_total: number;
        stats_active: number;
        stats_blocked: number;
        stats_questions: number;
      }>(
        `
          WITH filtered AS MATERIALIZED (
            SELECT es.id
            FROM exam_series es
            INNER JOIN institution_profiles ip ON ip.id = es.source_institution_id
            WHERE ($3 = '' OR es.title ILIKE $4 OR COALESCE(es.description, '') ILIKE $4 OR es.slug ILIKE $4
              OR COALESCE(ip.name, ip.slug, '') ILIKE $4)
              AND COALESCE(es.is_deleted, FALSE) = FALSE
              AND COALESCE(ip.is_deleted, FALSE) = FALSE
              AND ip.is_active = TRUE
              AND (
                (
                  $6::text = 'marketplace'
                  AND EXISTS (
                    SELECT 1
                    FROM practice_exam_templates child
                    WHERE child.exam_series_id = es.id
                      AND COALESCE(child.exam_kind, 'practice') = 'exam'
                      AND child.is_public = TRUE
                      AND child.is_active = TRUE
                      AND child.blocked_by_platform = FALSE
                      AND COALESCE(child.is_deleted, FALSE) = FALSE
                      AND (child.exam_date + child.exam_time) <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
                  )
                  AND NOT (es.source_institution_id = ANY($5::int[]))
                )
              OR (
                $6::text <> 'marketplace'
                AND ($7::boolean OR es.source_institution_id = ANY($5::int[]))
              )
            )
            AND (
              $6::text = 'marketplace'
              OR $8::int IS NULL
              OR EXISTS (
                SELECT 1
                FROM academic_years academic_year
                WHERE academic_year.id = $8
                  AND academic_year.institution_id = es.source_institution_id
                  AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
                  AND es.from_date <= academic_year.end_date
                  AND es.to_date >= academic_year.start_date
              )
              OR EXISTS (
                SELECT 1
                FROM practice_exam_templates scoped_child
                INNER JOIN practice_exams scoped_exam
                  ON scoped_exam.template_id = scoped_child.id
                 AND scoped_exam.academic_year_id = $8
                 AND COALESCE(scoped_exam.exam_kind, 'practice') = 'exam'
                 AND COALESCE(scoped_exam.is_deleted, FALSE) = FALSE
                WHERE scoped_child.exam_series_id = es.id
                  AND COALESCE(scoped_child.exam_kind, 'practice') = 'exam'
                  AND COALESCE(scoped_child.is_deleted, FALSE) = FALSE
              )
            )
          ),
          page_rows AS (
            SELECT
              es.id,
              es.title,
              es.slug,
              es.description,
              es.from_date,
              es.to_date,
              es.target_type,
              es.target_id,
              es.target_program_id,
              target_scope_program.title AS target_program_label,
              CASE
                WHEN es.target_type = 'INSTITUTION' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > Whole institution'
                WHEN es.target_type = 'PROGRAM' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > ' || target_program.title
                WHEN es.target_type = 'SECTION' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > ' || COALESCE(target_scope_program.title, 'Class') || ' > ' || target_section.name
                WHEN es.target_type = 'STUDENT' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || COALESCE(' > ' || target_scope_program.title, '') || ' > ' || target_user.full_name
                ELSE NULL
              END AS target_label,
              es.result_date,
              es.instant_result,
              (
                es.marketplace_requested = TRUE
                AND EXISTS (
                  SELECT 1
                  FROM practice_exam_templates pending_child
                  WHERE pending_child.exam_series_id = es.id
                    AND COALESCE(pending_child.exam_kind, 'practice') = 'exam'
                    AND pending_child.is_public = FALSE
                    AND pending_child.blocked_by_platform = FALSE
                  AND COALESCE(pending_child.is_deleted, FALSE) = FALSE
                )
              ) AS marketplace_requested,
              EXISTS (
                SELECT 1
                FROM practice_exam_templates approved_child
                WHERE approved_child.exam_series_id = es.id
                  AND COALESCE(approved_child.exam_kind, 'practice') = 'exam'
                  AND approved_child.marketplace_approved = TRUE
                  AND approved_child.is_public = TRUE
                  AND approved_child.blocked_by_platform = FALSE
                  AND COALESCE(approved_child.is_deleted, FALSE) = FALSE
              ) AS marketplace_approved,
              es.is_active,
              es.source_institution_id,
              COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) AS institution_name,
              (
                SELECT COALESCE(child_ip.name, child_ip.slug, 'Institution ' || child_ip.id::text)
                FROM practice_exam_templates source_child
                INNER JOIN practice_exam_templates inherited_child
                  ON inherited_child.parent_template_id = source_child.id
                 AND inherited_child.source_institution_id = ANY($5::int[])
                 AND COALESCE(inherited_child.exam_kind, 'practice') = 'exam'
                 AND COALESCE(inherited_child.is_deleted, FALSE) = FALSE
                INNER JOIN practice_exams inherited_exam
                  ON inherited_exam.template_id = inherited_child.id
                 AND ($8::int IS NULL OR inherited_exam.academic_year_id = $8)
                 AND COALESCE(inherited_exam.exam_kind, 'practice') = 'exam'
                 AND COALESCE(inherited_exam.is_deleted, FALSE) = FALSE
                INNER JOIN institution_profiles child_ip
                  ON child_ip.id = inherited_child.source_institution_id
                 AND child_ip.is_active = TRUE
                 AND COALESCE(child_ip.is_deleted, FALSE) = FALSE
                WHERE source_child.exam_series_id = es.id
                  AND COALESCE(source_child.exam_kind, 'practice') = 'exam'
                  AND source_child.is_public = TRUE
                  AND source_child.is_active = TRUE
                  AND source_child.blocked_by_platform = FALSE
                  AND COALESCE(source_child.is_deleted, FALSE) = FALSE
                ORDER BY inherited_child.updated_at DESC, inherited_child.id DESC
                LIMIT 1
              ) AS inherited_by_institution_name,
              EXISTS (
                SELECT 1
                FROM practice_exam_templates inherited_subject
                WHERE inherited_subject.exam_series_id = es.id
                  AND COALESCE(inherited_subject.exam_kind, 'practice') = 'exam'
                  AND inherited_subject.parent_template_id IS NOT NULL
                  AND COALESCE(inherited_subject.is_deleted, FALSE) = FALSE
              ) AS has_inherited_subjects,
              es.created_by,
              creator.full_name AS created_by_name,
              updater.full_name AS updated_by_name,
              es.created_at,
              es.updated_at,
              COUNT(DISTINCT child.id)::int AS subject_count,
              COUNT(DISTINCT question.id)::int AS question_count,
              COUNT(DISTINCT child.id) FILTER (WHERE child.is_active = TRUE AND child.blocked_by_platform = FALSE)::int AS active_count,
              COUNT(DISTINCT child.id) FILTER (WHERE child.blocked_by_platform = TRUE)::int AS blocked_count
            FROM filtered f
            INNER JOIN exam_series es ON es.id = f.id
            INNER JOIN institution_profiles ip ON ip.id = es.source_institution_id
            LEFT JOIN users creator ON creator.id = es.created_by
            LEFT JOIN users updater ON updater.id = es.updated_by
            LEFT JOIN institution_programs target_program
              ON target_program.id = es.target_id AND es.target_type = 'PROGRAM'
            LEFT JOIN institution_programs target_scope_program
              ON target_scope_program.id = es.target_program_id
              OR (es.target_type = 'PROGRAM' AND target_scope_program.id = es.target_id)
            LEFT JOIN sections target_section
              ON target_section.id = es.target_id AND es.target_type = 'SECTION'
            LEFT JOIN student_profiles target_student
              ON target_student.id = es.target_id AND es.target_type = 'STUDENT'
            LEFT JOIN users target_user ON target_user.id = target_student.user_id
            LEFT JOIN practice_exam_templates child
              ON child.exam_series_id = es.id
             AND COALESCE(child.exam_kind, 'practice') = 'exam'
             AND COALESCE(child.is_deleted, FALSE) = FALSE
             AND (
               $6::text <> 'marketplace'
               OR (
                 child.is_public = TRUE
                 AND child.is_active = TRUE
                 AND child.blocked_by_platform = FALSE
                 AND (child.exam_date + child.exam_time) <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
               )
             )
            LEFT JOIN practice_exam_template_questions question ON question.template_id = child.id
            GROUP BY es.id, ip.id, creator.id, updater.id, target_program.id,
                     target_scope_program.id, target_section.id, target_user.id
            ORDER BY es.updated_at DESC, es.id DESC
            LIMIT $1 OFFSET $2
          )
          SELECT
            COALESCE((SELECT json_agg(page_rows) FROM page_rows), '[]'::json) AS data,
            (SELECT COUNT(*)::int FROM filtered) AS total,
            (SELECT COUNT(*)::int FROM filtered) AS stats_total,
            (SELECT COALESCE(SUM(active_count), 0)::int FROM page_rows) AS stats_active,
            (SELECT COALESCE(SUM(blocked_count), 0)::int FROM page_rows) AS stats_blocked,
            (SELECT COALESCE(SUM(question_count), 0)::int FROM page_rows) AS stats_questions
        `,
        params
      );
      const summary = seriesResult.rows[0];
      const total = Number(summary?.total ?? 0);
      return NextResponse.json({
        data: summary?.data ?? [],
        total,
        page,
        pageCount: getPageCount(total, limit),
        stats: {
          total: Number(summary?.stats_total ?? 0),
          active: Number(summary?.stats_active ?? 0),
          blocked: Number(summary?.stats_blocked ?? 0),
          questions: Number(summary?.stats_questions ?? 0),
        },
        capabilities: {
          canCreate: !isPlatformAdmin && hasPermission(currentUser, "content.exams.create"),
          canBlock: isPlatformAdmin,
          canInherit: !isPlatformAdmin && view === "marketplace",
        },
      });
    }
    const result = await db.query<{
      data: unknown[];
      total: number;
      stats_total: number;
      stats_active: number;
      stats_blocked: number;
      stats_questions: number;
    }>(
      `
        WITH filtered AS MATERIALIZED (
          SELECT at.id
          FROM practice_exam_templates at
          INNER JOIN institution_profiles ip ON ip.id = at.source_institution_id
          WHERE ($3 = '' OR at.title ILIKE $4 OR COALESCE(at.description, '') ILIKE $4
            OR COALESCE(ip.name, ip.slug, '') ILIKE $4)
            AND COALESCE(at.exam_kind, 'practice') = 'exam'
            AND (
              (at.exam_date + at.exam_time) <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
              OR at.created_by = $8
              OR $9::boolean
              OR ($10::boolean AND at.source_institution_id = ANY($6::int[]))
            )
            AND (
              (
                $7::text = 'marketplace'
                AND at.is_public = TRUE
                AND at.is_active = TRUE
                AND at.blocked_by_platform = FALSE
                AND NOT (at.source_institution_id = ANY($6::int[]))
              )
              OR (
                $7::text <> 'marketplace'
                AND ($5::boolean OR at.source_institution_id = ANY($6::int[]))
              )
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
            AND COALESCE(ip.is_deleted, FALSE) = FALSE
            AND ip.is_active = TRUE
        ),
        page_rows AS (
          SELECT
            at.id,
            CASE
              WHEN es.id IS NOT NULL THEN
                es.title || '-' || COALESCE(
                  (
                    SELECT sub.name
                    FROM practice_exam_syllabus_nodes asn
                    INNER JOIN syllabus_nodes sn ON sn.id = asn.syllabus_node_id
                    INNER JOIN syllabi sy ON sy.id = sn.syllabus_id
                    INNER JOIN subjects sub ON sub.id = sy.subject_id
                    WHERE asn.practice_exam_id = assn.id
                    ORDER BY sub.name
                    LIMIT 1
                  ),
                  'Subject'
                ) || COALESCE(' (' || COALESCE(target_scope_program.title, target_program.title) || ')', '')
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
            COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) AS institution_name,
            at.created_by,
            creator.full_name AS created_by_name,
            updater.full_name AS updated_by_name,
            at.created_at,
            at.updated_at,
            at.blocked_by_platform,
            blocker.full_name AS blocked_by_name,
            at.blocked_at,
            at.block_reason,
            assn.id AS assigned_practice_exam_id,
            target.target_type,
            target.target_id,
            target.program_id AS target_program_id,
            target_scope_program.title AS target_program_label,
            CASE
              WHEN target.target_type = 'INSTITUTION' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > Whole institution'
              WHEN target.target_type = 'PROGRAM' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > ' || target_program.title
              WHEN target.target_type = 'SECTION' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > ' || COALESCE(target_scope_program.title, 'Class') || ' > ' || target_section.name
              WHEN target.target_type = 'STUDENT' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || COALESCE(' > ' || target_scope_program.title, '') || ' > ' || target_user.full_name
              ELSE NULL
            END AS target_label,
            COALESCE(
              (
                SELECT json_agg(asn.syllabus_node_id ORDER BY asn.id)
                FROM practice_exam_syllabus_nodes asn
                WHERE asn.practice_exam_id = assn.id
              ),
              '[]'::json
            ) AS syllabus_node_ids,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', sn.id,
                    'title', sn.title,
                    'node_type', sn.node_type,
                    'subject_id', sub.id,
                    'subject_name', sub.name,
                    'syllabus_id', s.id,
                    'syllabus_title', s.title
                  )
                  ORDER BY sub.name, s.title, sn.sort_order, sn.id
                )
                FROM practice_exam_syllabus_nodes asn
                INNER JOIN syllabus_nodes sn ON sn.id = asn.syllabus_node_id
                INNER JOIN syllabi s ON s.id = sn.syllabus_id
                INNER JOIN subjects sub ON sub.id = s.subject_id
                WHERE asn.practice_exam_id = assn.id
              ),
              '[]'::json
            ) AS syllabus_nodes,
            COUNT(DISTINCT q.id)::int AS question_count,
            COUNT(DISTINCT qf.id)::int AS attachment_count
          FROM filtered f
          INNER JOIN practice_exam_templates at ON at.id = f.id
          LEFT JOIN exam_series es
            ON es.id = at.exam_series_id
           AND COALESCE(es.is_deleted, FALSE) = FALSE
          INNER JOIN institution_profiles ip
            ON ip.id = at.source_institution_id
           AND COALESCE(ip.is_deleted, FALSE) = FALSE
           AND ip.is_active = TRUE
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
          LEFT JOIN institution_programs target_scope_program
            ON target_scope_program.id = target.program_id
          LEFT JOIN sections target_section
            ON target_section.id = target.target_id AND target.target_type = 'SECTION'
          LEFT JOIN student_profiles target_student
            ON target_student.id = target.target_id AND target.target_type = 'STUDENT'
          LEFT JOIN users target_user ON target_user.id = target_student.user_id
          LEFT JOIN practice_exam_template_questions q ON q.template_id = at.id
          LEFT JOIN practice_exam_template_question_files qf ON qf.question_id = q.id
          GROUP BY at.id, es.id, ip.id, creator.id, updater.id, blocker.id,
                   requester.id, approver.id, assn.id, target.id, target_program.id, target_section.id,
                   target_user.id, target_scope_program.id
          ORDER BY
            ((COALESCE(at.marketplace_requested, FALSE) OR COALESCE(es.marketplace_requested, FALSE)) AND at.is_public = FALSE AND at.blocked_by_platform = FALSE) DESC,
            at.updated_at DESC,
            at.id DESC
          LIMIT $1 OFFSET $2
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
      `,
      [
        limit,
        offset,
        search,
        `%${search}%`,
        scopeAllInstitutions,
        institutionIds,
        view,
        currentUser.id,
        isPlatformAdmin,
        isInstitutionAdminUser(currentUser),
        scopedAcademicYearId,
      ]
    );
    const summary = result.rows[0];
    const total = Number(summary?.total ?? 0);
    return NextResponse.json({
      data: summary?.data ?? [],
      total,
      page,
      pageCount: getPageCount(total, limit),
      stats: {
        total: Number(summary?.stats_total ?? 0),
        active: Number(summary?.stats_active ?? 0),
        blocked: Number(summary?.stats_blocked ?? 0),
        questions: Number(summary?.stats_questions ?? 0),
      },
      capabilities: {
        canCreate:
          !isPlatformAdmin &&
          hasPermission(currentUser, "content.exams.create"),
        canBlock: isPlatformAdmin,
        canInherit: !isPlatformAdmin && view === "marketplace",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureExamSchema();
    if (isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Platform Admin can review exams but cannot create them" },
        { status: 403 }
      );
    }
    const body = await req.json();
    if (body?.record_type === "series") {
      const payload = parseSeriesPayload(body);
      if (
        !hasPermission(currentUser, "content.exams.create", {
          institutionId: payload.institutionId,
        })
      ) {
        return NextResponse.json(
          { error: "You don't have permission to create exams for this institution" },
          { status: 403 }
        );
      }
      await validateExamTarget(
        payload.institutionId,
        payload.targetType,
        payload.targetId,
        payload.targetProgramId
      );
      const slug = await buildSeriesSlug(payload.institutionId, payload.title);
      const result = await db.query<{ id: number }>(
        `
          INSERT INTO exam_series
            (source_institution_id, title, slug, description, from_date, to_date,
             target_type, target_id, target_program_id, result_date, instant_result,
             marketplace_requested, marketplace_requested_at, marketplace_requested_by,
             is_active, created_by, updated_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                  $12, CASE WHEN $12 THEN CURRENT_TIMESTAMP ELSE NULL END,
                  CASE WHEN $12 THEN $14::integer ELSE NULL::integer END,
                  $13, $14, $14)
          RETURNING id
        `,
        [
          payload.institutionId,
          payload.title,
          slug,
          payload.description,
          payload.fromDate,
          payload.toDate,
          payload.targetType,
          payload.targetId,
          payload.targetProgramId,
          payload.resultDate,
          payload.instantResult,
          payload.isPublic,
          payload.isActive,
          currentUser.id,
        ]
      );
      if (payload.isActive) {
        try {
          await notifyStudentsForContentTarget(db, {
            type: "content.exams.created",
            institutionId: payload.institutionId,
            targetType: payload.targetType,
            targetId: payload.targetId,
            targetProgramId: payload.targetProgramId,
            entityType: "exam_series",
            entityId: result.rows[0].id,
            createdBy: currentUser.id,
            priority: "high",
            payload: {
              actor_name: currentUser.full_name,
              exam_name: payload.title,
              from_date: payload.fromDate,
              to_date: payload.toDate,
              url: "/admin/classroom/exams",
            },
          });
        } catch (notificationError) {
          console.error("[exam-series.created.notification]", notificationError);
        }
      }
      return NextResponse.json({ data: { id: result.rows[0].id } }, { status: 201 });
    }
    const payload = parseExamMetadataPayload(body);
    if (
      !hasPermission(currentUser, "content.exams.create", {
        institutionId: payload.institutionId,
      })
    ) {
      return NextResponse.json(
        { error: "You don't have permission to create exams for this institution" },
        { status: 403 }
      );
    }

    await validateExamTarget(
      payload.institutionId,
      payload.targetType,
      payload.targetId,
      payload.targetProgramId
    );
    if (payload.examSeriesId && payload.syllabusNodeIds.length === 0) {
      throw new Error("Select syllabus mapping for this subject");
    }
    await applySeriesResultControls(payload);
    await validateSyllabusNodes(payload.institutionId, payload.syllabusNodeIds);
    const resolvedTitle = payload.examSeriesId
      ? await getSeriesSubjectTitle(
          payload.examSeriesId,
          payload.syllabusNodeIds,
          payload.targetProgramId,
          payload.targetType,
          payload.targetId
        )
      : payload.title;
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ id: number }>(
        `
          INSERT INTO practice_exam_templates
            (title, description, total_marks, ai_question_format, duration_minutes, exam_kind, exam_series_id,
             exam_date, exam_time, exam_place, exam_mode, result_date, instant_result, is_public,
             marketplace_requested, marketplace_requested_at, marketplace_requested_by,
             marketplace_approved, is_active, version, source_institution_id,
             created_by, updated_by)
          VALUES (
            $1, $2, $3, $4::jsonb, $5, 'exam', $16,
            $6, $7, $8, $9, $10, $11, FALSE,
            $12, CASE WHEN $12 THEN CURRENT_TIMESTAMP ELSE NULL END,
            CASE WHEN $12 THEN $15::integer ELSE NULL::integer END,
            FALSE, $13, 1, $14, $15, $15
          )
          RETURNING id
        `,
        [
          resolvedTitle,
          payload.description,
          payload.totalMarks,
          JSON.stringify(payload.aiQuestionFormat),
          payload.durationMinutes,
          payload.examDate,
          payload.examTime,
          payload.examPlace,
          payload.examMode,
          payload.resultDate,
          payload.instantResult,
          payload.isPublic,
          payload.isActive,
          payload.institutionId,
          currentUser.id,
          payload.examSeriesId,
        ]
      );
      const templateId = result.rows[0].id;
      const exam = await client.query<{ id: number }>(
        `
          INSERT INTO practice_exams
            (institution_id, academic_year_id, template_id, title, description, duration_minutes, exam_kind,
             exam_date, exam_time, exam_place, exam_mode, result_date, instant_result,
             total_marks, status, version, created_by, updated_by)
          VALUES ($1, (SELECT default_academic_year_id FROM institution_profiles WHERE id = $1), $2, $3, $4, $5, 'exam', $6, $7, $8, $9, $10, $11, $12, $13, 1, $14, $14)
          RETURNING id
        `,
        [
          payload.institutionId,
          templateId,
          resolvedTitle,
          payload.description,
          payload.durationMinutes,
          payload.examDate,
          payload.examTime,
          payload.examPlace,
          payload.examMode,
          payload.resultDate,
          payload.instantResult,
          payload.totalMarks,
          payload.isActive ? "active" : "draft",
          currentUser.id,
        ]
      );
      await client.query(
        `
          INSERT INTO practice_exam_targets (practice_exam_id, target_type, target_id, program_id)
          VALUES ($1, $2, $3, $4)
        `,
        [
          exam.rows[0].id,
          payload.targetType,
          payload.targetId,
          payload.targetProgramId,
        ]
      );
      await replaceExamSyllabusNodes(
        client,
        exam.rows[0].id,
        payload.syllabusNodeIds
      );
      await client.query("COMMIT");
      if (payload.isActive && !payload.examSeriesId) {
        try {
          await notifyStudentsForContentTarget(db, {
            type: "content.exams.created",
            institutionId: payload.institutionId,
            targetType: payload.targetType,
            targetId: payload.targetId,
            targetProgramId: payload.targetProgramId,
            entityType: "exam",
            entityId: exam.rows[0].id,
            createdBy: currentUser.id,
            priority: "high",
            payload: {
              actor_name: currentUser.full_name,
              exam_name: resolvedTitle,
              from_date: payload.examDate,
              to_date: payload.examDate,
              url: "/admin/classroom/exams",
            },
          });
        } catch (notificationError) {
          console.error("[exam.created.notification]", notificationError);
        }
      }
      return NextResponse.json({ data: { id: templateId } }, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureExamSchema();
    const body = await req.json();
    if (!isPlatformAdminUser(currentUser) && body?.record_type === "series") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) throw new Error("Exam is required");
      const existing = await db.query<{ source_institution_id: number }>(
        `
          SELECT source_institution_id
          FROM exam_series
          WHERE id = $1
            AND COALESCE(is_deleted, FALSE) = FALSE
          LIMIT 1
        `,
        [id]
      );
      const existingInstitutionId = Number(existing.rows[0]?.source_institution_id);
      if (!existingInstitutionId) throw new Error("Exam not found");
      if (!hasPermission(currentUser, "content.exams.edit", { institutionId: existingInstitutionId })) {
        return NextResponse.json(
          { error: "You don't have permission to edit this exam" },
          { status: 403 }
        );
      }
      const payload = parseSeriesPayload(body);
      if (payload.institutionId !== existingInstitutionId) {
        throw new Error("Exam institution cannot be changed");
      }
      await validateExamTarget(
        payload.institutionId,
        payload.targetType,
        payload.targetId,
        payload.targetProgramId
      );
      const slug = await buildSeriesSlug(payload.institutionId, payload.title, id);
      await db.query(
        `
          UPDATE exam_series
          SET title = $2,
              slug = $3,
              description = $4,
              from_date = $5,
              to_date = $6,
              target_type = $7,
              target_id = $8,
              target_program_id = $9,
              result_date = $10,
              instant_result = $11,
              marketplace_requested = $12,
              marketplace_requested_at = CASE WHEN $12 THEN COALESCE(marketplace_requested_at, CURRENT_TIMESTAMP) ELSE NULL END,
              marketplace_requested_by = CASE WHEN $12 THEN COALESCE(marketplace_requested_by, $14::integer) ELSE NULL::integer END,
              is_active = $13,
              updated_by = $14,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          id,
          payload.title,
          slug,
          payload.description,
          payload.fromDate,
          payload.toDate,
          payload.targetType,
          payload.targetId,
          payload.targetProgramId,
          payload.resultDate,
          payload.instantResult,
          payload.isPublic,
          payload.isActive,
          currentUser.id,
        ]
      );
      await db.query(
        `
          UPDATE practice_exam_templates
          SET result_date = $2,
              instant_result = $3,
              updated_by = $4,
              updated_at = CURRENT_TIMESTAMP
          WHERE exam_series_id = $1
            AND COALESCE(exam_kind, 'practice') = 'exam'
            AND COALESCE(is_deleted, FALSE) = FALSE
        `,
        [id, payload.resultDate, payload.instantResult, currentUser.id]
      );
      await db.query(
        `
          UPDATE practice_exams pe
          SET result_date = $2,
              instant_result = $3,
              updated_by = $4,
              updated_at = CURRENT_TIMESTAMP
          FROM practice_exam_templates template
          WHERE pe.template_id = template.id
            AND template.exam_series_id = $1
            AND COALESCE(pe.exam_kind, 'practice') = 'exam'
            AND COALESCE(pe.is_deleted, FALSE) = FALSE
            AND COALESCE(template.is_deleted, FALSE) = FALSE
        `,
        [id, payload.resultDate, payload.instantResult, currentUser.id]
      );
      return NextResponse.json({ success: true });
    }
    if (!isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Only Platform Admin can block exams" },
        { status: 403 }
      );
    }
    if (!hasPermission(currentUser, "content.exam_reviews.edit")) {
      return NextResponse.json(
        { error: "You don't have permission to review exams" },
        { status: 403 }
      );
    }
    const ids = parseIds(body.ids);
    if (ids.length === 0) throw new Error("Select at least one exam");

    if (body.record_type === "series" && body.action === "approveMarketplace") {
      const result = await db.query(
        `
          UPDATE practice_exam_templates template
          SET is_public = TRUE,
              marketplace_requested = TRUE,
              marketplace_requested_at = COALESCE(template.marketplace_requested_at, series.marketplace_requested_at, CURRENT_TIMESTAMP),
              marketplace_requested_by = COALESCE(template.marketplace_requested_by, series.marketplace_requested_by),
              marketplace_approved = TRUE,
              marketplace_approved_at = CURRENT_TIMESTAMP,
              marketplace_approved_by = $2,
              updated_by = $2,
              updated_at = CURRENT_TIMESTAMP
          FROM exam_series series
          WHERE template.exam_series_id = series.id
            AND series.id = ANY($1::int[])
            AND COALESCE(template.exam_kind, 'practice') = 'exam'
            AND (template.marketplace_requested = TRUE OR series.marketplace_requested = TRUE)
            AND template.blocked_by_platform = FALSE
            AND COALESCE(template.is_deleted, FALSE) = FALSE
            AND COALESCE(series.is_deleted, FALSE) = FALSE
        `,
        [ids, currentUser.id]
      );
      return NextResponse.json({ updated: result.rowCount ?? 0 });
    }

    if (body.action === "approveMarketplace") {
      const result = await db.query(
        `
          UPDATE practice_exam_templates
          SET is_public = TRUE,
              marketplace_approved = TRUE,
              marketplace_approved_at = CURRENT_TIMESTAMP,
              marketplace_approved_by = $2,
              updated_by = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[])
            AND (
              marketplace_requested = TRUE
              OR EXISTS (
                SELECT 1
                FROM exam_series es
                WHERE es.id = practice_exam_templates.exam_series_id
                  AND es.marketplace_requested = TRUE
                  AND COALESCE(es.is_deleted, FALSE) = FALSE
              )
            )
            AND blocked_by_platform = FALSE
            AND COALESCE(is_deleted, FALSE) = FALSE
        `,
        [ids, currentUser.id]
      );
      return NextResponse.json({ updated: result.rowCount ?? 0 });
    }

    if (body.action === "removeFromMarketplace") {
      const result = await db.query(
        `
          UPDATE practice_exam_templates
          SET is_public = FALSE,
              marketplace_approved = FALSE,
              marketplace_approved_at = NULL,
              marketplace_approved_by = NULL,
              updated_by = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[])
            AND is_public = TRUE
            AND COALESCE(is_deleted, FALSE) = FALSE
        `,
        [ids, currentUser.id]
      );
      return NextResponse.json({ updated: result.rowCount ?? 0 });
    }

    if (typeof body.blocked !== "boolean") throw new Error("Blocked state is required");

    const reason = String(body.reason ?? "").trim();
    const result = await db.query<{
      id: number;
      title: string;
      source_institution_id: number;
    }>(
      `
        UPDATE practice_exam_templates
        SET blocked_by_platform = $2,
            blocked_by = CASE WHEN $2 THEN $3::integer ELSE NULL::integer END,
            blocked_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END,
            block_reason = CASE WHEN $2 THEN NULLIF($4, '') ELSE NULL END,
            updated_by = $3::integer,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1::int[])
          AND COALESCE(is_deleted, FALSE) = FALSE
        RETURNING id, title, source_institution_id
      `,
      [ids, body.blocked, currentUser.id, reason]
    );
    if (body.blocked) {
      await notifyInstitutionAdminsExamBlocked(
        currentUser,
        result.rows,
        reason
      );
    }
    return NextResponse.json({ updated: result.rowCount ?? 0 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureExamSchema();
    if (isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Platform Admin cannot delete institution exams" },
        { status: 403 }
      );
    }
    const body = await req.json();
    const ids = parseIds(body.ids);
    if (ids.length === 0) throw new Error("Select at least one exam");

    const existing = await db.query<{
      id: number;
      source_institution_id: number;
      blocked_count: number;
    }>(
      `
        SELECT
          es.id,
          es.source_institution_id,
          COUNT(template.id) FILTER (WHERE template.blocked_by_platform = TRUE)::int AS blocked_count
        FROM exam_series es
        LEFT JOIN practice_exam_templates template
          ON template.exam_series_id = es.id
         AND COALESCE(template.exam_kind, 'practice') = 'exam'
         AND COALESCE(template.is_deleted, FALSE) = FALSE
        WHERE es.id = ANY($1::int[])
          AND COALESCE(es.is_deleted, FALSE) = FALSE
        GROUP BY es.id
      `,
      [ids]
    );

    if (existing.rows.length !== ids.length) throw new Error("Some selected exams were not found");
    const blocked = existing.rows.find((row) => Number(row.blocked_count) > 0);
    if (blocked) {
      return NextResponse.json(
        { error: "Blocked exams cannot be deleted" },
        { status: 423 }
      );
    }
    for (const row of existing.rows) {
      if (!hasPermission(currentUser, "content.exams.delete", {
        institutionId: Number(row.source_institution_id),
      })) {
        return NextResponse.json(
          { error: "You don't have permission to delete these exams" },
          { status: 403 }
        );
      }
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `
          UPDATE practice_exams pe
          SET is_deleted = TRUE,
              deleted_at = NOW(),
              status = 'deleted',
              updated_by = $2,
              updated_at = NOW()
          FROM practice_exam_templates template
          WHERE pe.template_id = template.id
            AND template.exam_series_id = ANY($1::int[])
            AND COALESCE(pe.exam_kind, 'practice') = 'exam'
            AND COALESCE(pe.is_deleted, FALSE) = FALSE
        `,
        [ids, currentUser.id]
      );
      await client.query(
        `
          UPDATE practice_exam_templates
          SET is_deleted = TRUE,
              deleted_at = NOW(),
              is_active = FALSE,
              updated_by = $2,
              updated_at = NOW()
          WHERE exam_series_id = ANY($1::int[])
            AND COALESCE(exam_kind, 'practice') = 'exam'
            AND COALESCE(is_deleted, FALSE) = FALSE
        `,
        [ids, currentUser.id]
      );
      await client.query(
        `
          UPDATE exam_series
          SET is_deleted = TRUE,
              is_active = FALSE,
              updated_by = $2,
              updated_at = NOW()
          WHERE id = ANY($1::int[])
            AND COALESCE(is_deleted, FALSE) = FALSE
        `,
        [ids, currentUser.id]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}



