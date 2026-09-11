import { NextResponse } from "next/server";

import { parseAssignmentMetadataPayload } from "@/lib/assignments/assignment-template-payload";
import { requireAdmin } from "@/lib/auth/auth";
import {
  getRequestedInstitutionId,
  getScopedInstitutionIds,
} from "@/lib/auth/institution-scope";
import { hasPermission, isPlatformAdminUser, isInstitutionAdminUser, isTeacherUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  ensureAssignmentTemplateSchema,
  replaceAssignmentSyllabusNodes,
} from "@/lib/queries/assignment-templates";
import { notifyStudentsForContentTarget } from "@/lib/notifications/student-content-events";
import { ensureSystemNotificationTemplates } from "@/lib/queries/notifications";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import { NotificationService } from "@/services/notificationService";

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
    new Set([
      ...(user.memberships ?? [])
        .filter(
          (membership) =>
            isInstitutionAdminUser(user) ||
            isTeacherUser(user) ||
            membership.permissions.includes("*") ||
            membership.permissions.includes(permission) ||
            hasPermission(user, permission, { institutionId: membership.institution_id })
        )
        .map((membership) => membership.institution_id),
      ...((user as any).under_institution_id ? [(user as any).under_institution_id as number] : []),
    ])
  );
}

async function validateAssignmentTarget(
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
        UNION ALL
        SELECT 1
        FROM master_courses mc
        WHERE mc.id = $1
          AND COALESCE(mc.is_deleted, FALSE) = FALSE
          AND mc.is_active = TRUE
        LIMIT 1
      `,
      [targetId, institutionId]
    );
    if (!result.rows[0]) throw new Error("Selected class or course is not available");
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

async function getValidSyllabusNodeIds(institutionId: number, nodeIds: number[]) {
  if (nodeIds.length === 0) return [];
  const result = await db.query<{ id: number }>(
    `
      SELECT DISTINCT sn.id
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
  const validIds = new Set(result.rows.map((row) => Number(row.id)));
  return nodeIds.filter((nodeId) => validIds.has(nodeId));
}

async function notifyInstitutionAdminsAssignmentBlocked(
  actor: Awaited<ReturnType<typeof requireAdmin>>,
  assignments: Array<{
    id: number;
    title: string;
    source_institution_id: number;
  }>,
  reason: string
) {
  if (!assignments.length) return;
  const institutionIds = Array.from(
    new Set(assignments.map((assignment) => assignment.source_institution_id))
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
    assignments.map((assignment) =>
      notificationService.create({
        type: "content.assignments.blocked",
        recipients:
          recipientsByInstitution.get(assignment.source_institution_id) ?? [],
        institutionId: assignment.source_institution_id,
        entityType: "assignment_template",
        entityId: assignment.id,
        createdBy: actor.id,
        priority: "high",
        payload: {
          actor_name: actor.full_name,
          assignment_name: assignment.title,
          block_reason: reason,
          url: "/admin/master-data/assignments",
        },
      })
    )
  );
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureAssignmentTemplateSchema();
    const url = new URL(req.url);
    const isPlatformAdmin = isPlatformAdminUser(currentUser);

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
              membership.permissions.includes("content.assignments.create") ||
              membership.permissions.includes("content.assignments.edit")
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
        !hasPermission(currentUser, "content.assignments.create", {
          institutionId,
        }) &&
        !hasPermission(currentUser, "content.assignments.edit", {
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

    const { page, limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() ?? "";
    const view = url.searchParams.get("view") === "marketplace" ? "marketplace" : "my";
    const academicYearId = Number(url.searchParams.get("academicYearId"));
    const scopedAcademicYearId = Number.isInteger(academicYearId) && academicYearId > 0 ? academicYearId : null;
    const programId = Number(url.searchParams.get("programId"));
    const scopedProgramId = Number.isInteger(programId) && programId > 0 ? programId : null;
    const subjectFilter = url.searchParams.get("subject")?.trim() || null;
    const syllabusFilter = url.searchParams.get("syllabus")?.trim() || null;

    const requestedInstitutionId = getRequestedInstitutionId(url.searchParams);
    const institutionIds = requestedInstitutionId
      ? getScopedInstitutionIds(currentUser, requestedInstitutionId) ?? []
      : isPlatformAdmin
        ? []
        : permissionInstitutionIds(currentUser, "content.assignments.view");
    const scopeAllInstitutions = isPlatformAdmin && !requestedInstitutionId;
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
          FROM assignment_templates at
          INNER JOIN institution_profiles ip ON ip.id = at.source_institution_id
          WHERE ($3 = '' OR at.title ILIKE $4 OR COALESCE(at.description, '') ILIKE $4
            OR COALESCE(at.subject_name, '') ILIKE $4
            OR COALESCE(at.syllabus_data::text, '') ILIKE $4
            OR COALESCE(ip.name, ip.slug, '') ILIKE $4)
            AND (
              (
                $7::text = 'marketplace'
                AND (
                  at.is_public = TRUE
                  OR at.marketplace_approved = TRUE
                  OR EXISTS (
                    SELECT 1 FROM users u
                    LEFT JOIN user_roles ur ON ur.user_id = u.id
                    LEFT JOIN roles r ON r.id = ur.role_id
                    WHERE u.id = at.created_by AND (r.code = 'platform_admin' OR r.code = 'platform_superadmin')
                  )
                )
                AND at.is_active = TRUE
                AND at.blocked_by_platform = FALSE
              )
              OR (
                $7::text <> 'marketplace'
                AND ($5::boolean OR at.source_institution_id = ANY($6::int[]))
              )
            )
            AND (
              $7::text = 'marketplace'
              OR $8::int IS NULL
              OR EXISTS (
                SELECT 1
                FROM assignments scoped_assignment
                WHERE scoped_assignment.template_id = at.id
                  AND scoped_assignment.academic_year_id = $8
                  AND COALESCE(scoped_assignment.is_deleted, FALSE) = FALSE
              )
            )
            AND (
              $9::int IS NULL
              OR EXISTS (
                SELECT 1
                FROM assignments scoped_assn
                JOIN assignment_targets scoped_target ON scoped_target.assignment_id = scoped_assn.id
                WHERE scoped_assn.template_id = at.id
                  AND (scoped_target.program_id = $9 OR (scoped_target.target_type = 'PROGRAM' AND scoped_target.target_id = $9))
                  AND COALESCE(scoped_assn.is_deleted, FALSE) = FALSE
              )
            )
            AND (
              $10::text IS NULL
              OR at.subject_id = $10
              OR at.subject_name ILIKE $10
            )
            AND (
              $11::text IS NULL
              OR at.syllabus_data::text ILIKE ('%' || $11 || '%')
            )
            AND COALESCE(at.is_deleted, FALSE) = FALSE
            AND COALESCE(ip.is_deleted, FALSE) = FALSE
            AND ip.is_active = TRUE
        ),
        page_rows AS (
          SELECT
            at.id,
            at.title,
            at.description,
            at.total_marks::float8 AS total_marks,
            at.ai_question_format,
            at.is_public,
            at.marketplace_requested,
            at.marketplace_requested_at,
            at.marketplace_requested_by,
            requester.full_name AS marketplace_requested_by_name,
            at.marketplace_approved,
            at.marketplace_approved_at,
            at.marketplace_approved_by,
            approver.full_name AS marketplace_approved_by_name,
            at.parent_template_id,
            COALESCE(parent_ip.name, parent_ip.slug, 'Institution ' || parent_ip.id::text) AS parent_institution_name,
            parent_at.is_public AS parent_is_public,
            (
              SELECT COALESCE(child_ip.name, child_ip.slug, 'Institution ' || child_ip.id::text)
              FROM assignment_templates child
              INNER JOIN assignments child_assignment
                ON child_assignment.template_id = child.id
               AND ($8::int IS NULL OR child_assignment.academic_year_id = $8)
               AND COALESCE(child_assignment.is_deleted, FALSE) = FALSE
              INNER JOIN institution_profiles child_ip ON child_ip.id = child.source_institution_id
              WHERE child.parent_template_id = at.id
                AND child.source_institution_id = ANY($6::int[])
                AND COALESCE(child.is_deleted, FALSE) = FALSE
                AND COALESCE(child_ip.is_deleted, FALSE) = FALSE
                AND child_ip.is_active = TRUE
              ORDER BY child.updated_at DESC, child.id DESC
              LIMIT 1
            ) AS inherited_by_institution_name,
            at.is_active,
            COALESCE(at.is_paid, FALSE) AS is_paid,
            COALESCE(at.price, 0)::float8 AS price,
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
            assn.id AS assigned_assignment_id,
            assn.issue_date,
            assn.submission_date,
            assn.target_type,
            assn.target_id,
            assn.target_program_id,
            COALESCE(
              (
                SELECT COUNT(DISTINCT sa.student_id)::int
                FROM assignments a_sub
                INNER JOIN student_assignments sa ON sa.assignment_id = a_sub.id
                WHERE a_sub.template_id = at.id
                  AND COALESCE(a_sub.is_deleted, FALSE) = FALSE
                  AND ($8::int IS NULL OR a_sub.academic_year_id = $8)
              ), 0
            ) AS assigned_student_count,
            COALESCE(
              (
                SELECT COUNT(DISTINCT a_sub.id)::int
                FROM assignments a_sub
                WHERE a_sub.template_id = at.id
                  AND COALESCE(a_sub.is_deleted, FALSE) = FALSE
                  AND ($8::int IS NULL OR a_sub.academic_year_id = $8)
              ), 0
            ) AS assigned_count,
            COALESCE(target_scope_program.title, target_scope_master_course.name, target_program.title, target_master_course.name) AS target_program_label,
            CASE
              WHEN assn.target_type = 'INSTITUTION' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > Whole institution'
              WHEN assn.target_type = 'PROGRAM' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > ' || COALESCE(target_program.title, target_master_course.name, 'Course')
              WHEN assn.target_type = 'SECTION' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || ' > ' || COALESCE(target_scope_program.title, target_scope_master_course.name, 'Class') || ' > ' || target_section.name
              WHEN assn.target_type = 'STUDENT' THEN COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) || COALESCE(' > ' || COALESCE(target_scope_program.title, target_scope_master_course.name), '') || ' > ' || target_user.full_name
              ELSE NULL
            END AS target_label,
            at.subject_id,
            at.subject_name,
            COALESCE(at.syllabus_data, '[]'::jsonb) AS syllabus_data,
            '[]'::json AS syllabus_node_ids,
            COALESCE(at.syllabus_data, '[]'::jsonb) AS syllabus_nodes,
            COUNT(DISTINCT q.id)::int AS question_count,
            COUNT(DISTINCT qf.id)::int AS attachment_count
          FROM filtered f
          INNER JOIN assignment_templates at ON at.id = f.id
          INNER JOIN institution_profiles ip
            ON ip.id = at.source_institution_id
           AND COALESCE(ip.is_deleted, FALSE) = FALSE
           AND ip.is_active = TRUE
          LEFT JOIN users creator ON creator.id = at.created_by
          LEFT JOIN users updater ON updater.id = at.updated_by
          LEFT JOIN users blocker ON blocker.id = at.blocked_by
          LEFT JOIN users requester ON requester.id = at.marketplace_requested_by
          LEFT JOIN users approver ON approver.id = at.marketplace_approved_by
          LEFT JOIN assignment_templates parent_at ON parent_at.id = at.parent_template_id
          LEFT JOIN institution_profiles parent_ip ON parent_ip.id = parent_at.source_institution_id
          LEFT JOIN LATERAL (
            SELECT
              a.id,
              a.issue_date,
              a.submission_date,
              t.target_type,
              t.target_id,
              t.program_id AS target_program_id
            FROM assignments a
            LEFT JOIN LATERAL (
              SELECT target_type, target_id, program_id
              FROM assignment_targets
              WHERE assignment_id = a.id
              ORDER BY id ASC
              LIMIT 1
            ) t ON TRUE
            WHERE a.template_id = at.id
              AND COALESCE(a.is_deleted, FALSE) = FALSE
              AND ($8::int IS NULL OR a.academic_year_id = $8)
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT 1
          ) assn ON TRUE
          LEFT JOIN institution_programs target_program
            ON target_program.id = assn.target_id
           AND target_program.institution_id = at.source_institution_id
           AND assn.target_type = 'PROGRAM'
          LEFT JOIN master_courses target_master_course
            ON target_master_course.id = assn.target_id AND assn.target_type = 'PROGRAM'
          LEFT JOIN institution_programs target_scope_program
            ON target_scope_program.id = assn.target_program_id
           AND target_scope_program.institution_id = at.source_institution_id
          LEFT JOIN master_courses target_scope_master_course
            ON target_scope_master_course.id = assn.target_program_id
          LEFT JOIN sections target_section
            ON target_section.id = assn.target_id AND assn.target_type = 'SECTION'
          LEFT JOIN student_profiles target_student
            ON target_student.id = assn.target_id AND assn.target_type = 'STUDENT'
          LEFT JOIN users target_user ON target_user.id = target_student.user_id
          LEFT JOIN assignment_template_questions q ON q.template_id = at.id
          LEFT JOIN assignment_template_question_files qf ON qf.question_id = q.id
          GROUP BY at.id, ip.id, parent_at.id, parent_ip.id, creator.id, updater.id, blocker.id,
                   requester.id, approver.id, assn.id, assn.issue_date, assn.submission_date,
                   assn.target_type, assn.target_id, assn.target_program_id,
                   target_scope_program.title, target_scope_master_course.name,
                   target_program.title, target_master_course.name,
                   target_section.name, target_user.full_name
          ORDER BY
            (at.marketplace_requested = TRUE AND at.is_public = FALSE AND at.blocked_by_platform = FALSE) DESC,
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
            FROM assignment_templates at
            INNER JOIN filtered f ON f.id = at.id
            WHERE at.is_active = TRUE AND at.blocked_by_platform = FALSE
          ) AS stats_active,
          (
            SELECT COUNT(*)::int
            FROM assignment_templates at
            INNER JOIN filtered f ON f.id = at.id
            WHERE at.blocked_by_platform = TRUE
          ) AS stats_blocked,
          (
            SELECT COUNT(*)::int
            FROM assignment_template_questions q
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
        scopedAcademicYearId,
        scopedProgramId,
        subjectFilter,
        syllabusFilter,
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
          isPlatformAdmin ||
          hasPermission(currentUser, "content.assignments.create"),
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
    await ensureAssignmentTemplateSchema();
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const payload = parseAssignmentMetadataPayload(await req.json());
    if (
      !isPlatformAdmin &&
      !hasPermission(currentUser, "content.assignments.create", {
        institutionId: payload.institutionId,
      })
    ) {
      return NextResponse.json(
        { error: "You don't have permission to create assignments for this institution" },
        { status: 403 }
      );
    }

    await validateAssignmentTarget(
      payload.institutionId,
      payload.targetType,
      payload.targetId,
      payload.targetProgramId
    );
    payload.syllabusNodeIds = await getValidSyllabusNodeIds(
      payload.institutionId,
      payload.syllabusNodeIds
    );
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const isPublic = isPlatformAdmin ? (payload.isPublic !== false) : false;
      const marketplaceApproved = isPlatformAdmin;
      const result = await client.query<{ id: number }>(
        `
          INSERT INTO assignment_templates
            (title, description, total_marks, ai_question_format, is_public,
             marketplace_requested, marketplace_requested_at, marketplace_requested_by,
             marketplace_approved, marketplace_approved_at, marketplace_approved_by,
             is_active, is_paid, price, version, source_institution_id,
             subject_id, subject_name, syllabus_data,
             created_by, updated_by)
          VALUES (
            $1, $2, $3, $4::jsonb, $5,
            $6, CASE WHEN $6 THEN CURRENT_TIMESTAMP ELSE NULL END,
            CASE WHEN $6 THEN $8::integer ELSE NULL::integer END,
            $9, CASE WHEN $9 THEN CURRENT_TIMESTAMP ELSE NULL END,
            CASE WHEN $9 THEN $8::integer ELSE NULL::integer END,
            $7, $11, $12, 1, $10,
            $13, $14, $15::jsonb,
            $8, $8
          )
          RETURNING id
        `,
        [
          payload.title,
          payload.description,
          payload.totalMarks,
          JSON.stringify(payload.aiQuestionFormat),
          isPublic,
          payload.isPublic,
          payload.isActive,
          currentUser.id,
          marketplaceApproved,
          payload.institutionId,
          payload.isPaid,
          payload.price,
          payload.subjectId,
          payload.subjectName,
          JSON.stringify(payload.syllabusData ?? []),
        ]
      );
      const templateId = result.rows[0].id;
      const issueDate = payload.issueDate ?? new Date().toISOString().slice(0, 10);
      const submissionDate =
        payload.submissionDate ??
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const assignment = await client.query<{ id: number }>(
        `
          INSERT INTO assignments
            (institution_id, academic_year_id, template_id, title, description, issue_date,
             submission_date, total_marks, status, created_by, updated_by)
          VALUES ($1, (SELECT default_academic_year_id FROM institution_profiles WHERE id = $1), $2, $3, $4, $5, $6, $7, $8, $9, $9)
          RETURNING id
        `,
        [
          payload.institutionId,
          templateId,
          payload.title,
          payload.description,
          issueDate,
          submissionDate,
          payload.totalMarks,
          payload.isActive ? "active" : "draft",
          currentUser.id,
        ]
      );
      await client.query(
        `
          INSERT INTO assignment_targets (assignment_id, target_type, target_id, program_id)
          VALUES ($1, $2, $3, $4)
        `,
        [
          assignment.rows[0].id,
          payload.targetType,
          payload.targetId,
          payload.targetProgramId,
        ]
      );
      await replaceAssignmentSyllabusNodes(
        client,
        assignment.rows[0].id,
        payload.syllabusNodeIds
      );
      await client.query("COMMIT");
      if (payload.isActive) {
        try {
          await notifyStudentsForContentTarget(db, {
            type: "content.assignments.created",
            institutionId: payload.institutionId,
            targetType: payload.targetType,
            targetId: payload.targetId,
            targetProgramId: payload.targetProgramId,
            entityType: "assignment",
            entityId: assignment.rows[0].id,
            createdBy: currentUser.id,
            payload: {
              actor_name: currentUser.full_name,
              assignment_name: payload.title,
              due_date: payload.submissionDate,
              url: "/admin/classroom/assignments",
            },
          });
        } catch (notificationError) {
          console.error("[assignment.created.notification]", notificationError);
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
    await ensureAssignmentTemplateSchema();
    if (!isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Only Platform Admin can block assignments" },
        { status: 403 }
      );
    }
    const body = await req.json();
    const ids = parseIds(body.ids);
    if (ids.length === 0) throw new Error("Select at least one assignment");

    if (body.action === "approveMarketplace") {
      const result = await db.query<{
        id: number;
        title: string;
        created_by: number;
        marketplace_requested_by: number;
        source_institution_id: number;
      }>(
        `
          UPDATE assignment_templates
          SET is_public = TRUE,
              marketplace_approved = TRUE,
              marketplace_approved_at = CURRENT_TIMESTAMP,
              marketplace_approved_by = $2,
              marketplace_rejected_at = NULL,
              marketplace_rejection_reason = NULL,
              updated_by = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[])
            AND marketplace_requested = TRUE
            AND blocked_by_platform = FALSE
            AND COALESCE(is_deleted, FALSE) = FALSE
          RETURNING id, title, created_by, marketplace_requested_by, source_institution_id
        `,
        [ids, currentUser.id]
      );

      // Notify authors
      try {
        const notifService = new NotificationService(db);
        await Promise.all(
          result.rows.map((row) => {
            const authorId = row.marketplace_requested_by || row.created_by;
            if (!authorId) return Promise.resolve();
            return notifService.create({
              type: "content.marketplace.approved",
              recipients: [authorId],
              institutionId: row.source_institution_id,
              entityType: "assignment",
              entityId: row.id,
              createdBy: currentUser.id,
              priority: "high",
              payload: {
                actor_name: currentUser.full_name || "Platform Admin",
                title: "Assignment Approved for Marketplace",
                item_title: row.title,
                item_type: "assignment",
                status: "allowed",
                message: `Great news! Your assignment "${row.title}" has been approved by Platform Admin and is now live on the marketplace.`,
                url: "/admin/classroom/assignments",
              },
            });
          })
        );
      } catch (err) {
        console.error("[assignments.approveMarketplace.notif]", err);
      }

      return NextResponse.json({ updated: result.rowCount ?? 0 });
    }

    if (body.action === "declineMarketplace") {
      const declineReason = String(body.reason || "Declined by platform admin").trim();
      const result = await db.query<{
        id: number;
        title: string;
        created_by: number;
        marketplace_requested_by: number;
        source_institution_id: number;
      }>(
        `
          UPDATE assignment_templates
          SET is_public = FALSE,
              marketplace_approved = FALSE,
              marketplace_approved_at = NULL,
              marketplace_approved_by = NULL,
              marketplace_requested = FALSE,
              marketplace_rejected_at = CURRENT_TIMESTAMP,
              marketplace_rejection_reason = $3,
              updated_by = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[])
            AND COALESCE(is_deleted, FALSE) = FALSE
          RETURNING id, title, created_by, marketplace_requested_by, source_institution_id
        `,
        [ids, currentUser.id, declineReason]
      );

      // Notify authors
      try {
        const notifService = new NotificationService(db);
        await Promise.all(
          result.rows.map((row) => {
            const authorId = row.marketplace_requested_by || row.created_by;
            if (!authorId) return Promise.resolve();
            return notifService.create({
              type: "content.marketplace.declined",
              recipients: [authorId],
              institutionId: row.source_institution_id,
              entityType: "assignment",
              entityId: row.id,
              createdBy: currentUser.id,
              priority: "high",
              payload: {
                actor_name: currentUser.full_name || "Platform Admin",
                title: "Assignment Marketplace Request Declined",
                item_title: row.title,
                item_type: "assignment",
                status: "declined",
                reason: declineReason,
                message: `Your request to publish assignment "${row.title}" to the marketplace was declined.${declineReason ? ` Reason: ${declineReason}` : ""}`,
                url: "/admin/classroom/assignments",
              },
            });
          })
        );
      } catch (err) {
        console.error("[assignments.declineMarketplace.notif]", err);
      }

      return NextResponse.json({ updated: result.rowCount ?? 0 });
    }

    if (body.action === "removeFromMarketplace") {
      const result = await db.query(
        `
          UPDATE assignment_templates
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
        UPDATE assignment_templates
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
      await notifyInstitutionAdminsAssignmentBlocked(
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
