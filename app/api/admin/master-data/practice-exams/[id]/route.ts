import { NextResponse } from "next/server";

import {
  parsePracticeExamMetadataPayload,
  serializePracticeExamQuestions,
} from "@/lib/practice-exams/practice-exam-payload";
import { requireAdmin } from "@/lib/auth/auth";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  ensurePracticeExamSchema,
  replacePracticeExamSyllabusNodes,
} from "@/lib/queries/practice-exams";
import { notifyStudentsForContentTarget } from "@/lib/notifications/student-content-events";

type Context = { params: Promise<{ id: string }> };

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid practice exam id");
  return id;
}

function parseOptionalId(value: string | null) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    400;
  return NextResponse.json({ error: message }, { status });
}

async function getTemplate(id: number, academicYearId: number | null = null) {
  const result = await db.query(
    `
      SELECT
        at.*,
        at.total_marks::float8 AS total_marks,
        at.duration_minutes,
        COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) AS institution_name,
        creator.full_name AS created_by_name,
        updater.full_name AS updated_by_name,
        blocker.full_name AS blocked_by_name,
        requester.full_name AS marketplace_requested_by_name,
        approver.full_name AS marketplace_approved_by_name,
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
        ) AS syllabus_nodes
      FROM practice_exam_templates at
      INNER JOIN institution_profiles ip
        ON ip.id = at.source_institution_id
       AND ip.is_active = TRUE
       AND COALESCE(ip.is_deleted, FALSE) = FALSE
      LEFT JOIN users creator ON creator.id = at.created_by
      LEFT JOIN users updater ON updater.id = at.updated_by
      LEFT JOIN users blocker ON blocker.id = at.blocked_by
      LEFT JOIN users requester ON requester.id = at.marketplace_requested_by
      LEFT JOIN users approver ON approver.id = at.marketplace_approved_by
      LEFT JOIN practice_exams assn
        ON assn.template_id = at.id
       AND COALESCE(assn.is_deleted, FALSE) = FALSE
       AND ($2::int IS NULL OR assn.academic_year_id = $2)
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
      WHERE at.id = $1
        AND COALESCE(at.exam_kind, 'practice') = 'practice'
        AND COALESCE(at.is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [id, academicYearId]
  );
  return result.rows[0] ?? null;
}

async function validatePracticeExamTarget(
  institutionId: number,
  targetType: string,
  targetId: number,
  targetProgramId: number | null
) {
  if (targetType === "INSTITUTION") return;
  if (targetType === "PROGRAM") {
    const result = await db.query(
      `SELECT 1 FROM institution_programs WHERE id = $1 AND institution_id = $2 LIMIT 1`,
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
        WHERE ps.program_id = $1
          AND ps.section_id = $2
          AND ip.institution_id = $3
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
        WHERE sp.id = $1
          AND se.institution_id = $2
          AND se.program_id = $3
          AND se.status = 'active'
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

async function getQuestions(id: number) {
  const result = await db.query(
    `
      SELECT
        q.id,
        q.question_text,
        q.question_type,
        q.marks,
        q.explanation,
        q.display_order,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', qo.id,
                'text', qo.option_text,
                'is_correct', qo.is_correct
              )
              ORDER BY qo.display_order, qo.id
            )
            FROM practice_exam_template_question_options qo
            WHERE qo.question_id = q.id
          ),
          '[]'::json
        ) AS options,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', qf.id,
                'url', qf.file_url
              )
              ORDER BY qf.sort_order, qf.id
            )
            FROM practice_exam_template_question_files qf
            WHERE qf.question_id = q.id
          ),
          '[]'::json
        ) AS files
      FROM practice_exam_template_questions q
      WHERE q.template_id = $1
      ORDER BY q.display_order, q.id
    `,
    [id]
  );
  return serializePracticeExamQuestions(result.rows as never);
}

export async function GET(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    await ensurePracticeExamSchema();
    const { id: value } = await context.params;
    const id = parseId(value);
    const academicYearId = parseOptionalId(new URL(req.url).searchParams.get("academicYearId"));
    const template = await getTemplate(id, academicYearId);
    if (!template) {
      return NextResponse.json({ error: "Practice Exam not found" }, { status: 404 });
    }
    if (
      isPlatformAdminUser(currentUser) &&
      !hasPermission(currentUser, "content.practice_exam_reviews.view")
    ) {
      return NextResponse.json(
        { error: "You don't have permission to review this practice exam" },
        { status: 403 }
      );
    }
    if (
      !isPlatformAdminUser(currentUser) &&
      !template.is_public &&
      !hasPermission(currentUser, "content.practice_exams.view", {
        institutionId: Number(template.source_institution_id),
      })
    ) {
      return NextResponse.json(
        { error: "You don't have permission to view this practice exam" },
        { status: 403 }
      );
    }
    return NextResponse.json({
      data: { ...template, questions: await getQuestions(id) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    await ensurePracticeExamSchema();
    if (isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Platform Admin can block practice exams but cannot edit their content" },
        { status: 403 }
      );
    }
    const { id: value } = await context.params;
    const id = parseId(value);
    const existing = await getTemplate(id);
    if (!existing) {
      return NextResponse.json({ error: "Practice Exam not found" }, { status: 404 });
    }
    if (existing.blocked_by_platform) {
      return NextResponse.json(
        { error: "This practice exam is blocked by Platform Admin and cannot be edited" },
        { status: 423 }
      );
    }
    const institutionId = Number(existing.source_institution_id);
    if (
      !hasPermission(currentUser, "content.practice_exams.edit", { institutionId })
    ) {
      return NextResponse.json(
        { error: "You don't have permission to edit this practice exam" },
        { status: 403 }
      );
    }
    const payload = parsePracticeExamMetadataPayload(await req.json());
    if (payload.institutionId !== institutionId) {
      throw new Error("Practice Exam institution cannot be changed");
    }
    await validatePracticeExamTarget(
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
      const versionResult = await client.query<{ version: number }>(
        `
          UPDATE practice_exam_templates
          SET title = $2,
              description = $3,
              total_marks = $4,
              ai_question_format = $5::jsonb,
              duration_minutes = $6,
              is_public = FALSE,
              marketplace_requested = $7,
              marketplace_requested_at = CASE WHEN $7 THEN COALESCE(marketplace_requested_at, CURRENT_TIMESTAMP) ELSE NULL END,
              marketplace_requested_by = CASE WHEN $7 THEN COALESCE(marketplace_requested_by, $9::integer) ELSE NULL::integer END,
              marketplace_approved = FALSE,
              marketplace_approved_at = NULL,
              marketplace_approved_by = NULL,
              is_active = $8,
              version = version + 1,
              updated_by = $9,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING version
        `,
        [
          id,
          payload.title,
          payload.description,
          payload.totalMarks,
          JSON.stringify(payload.aiQuestionFormat),
          payload.durationMinutes,
          payload.isPublic,
          payload.isActive,
          currentUser.id,
        ]
      );
      const nextVersion = Number(versionResult.rows[0]?.version ?? 1);
      let practiceExamId = Number(existing.assigned_practice_exam_id);
      if (Number.isInteger(practiceExamId) && practiceExamId > 0) {
        await client.query(
          `
            UPDATE practice_exams
            SET title = $2,
                description = $3,
                duration_minutes = $4,
                total_marks = $5,
                status = $6,
                version = $7,
                updated_by = $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [
            practiceExamId,
            payload.title,
            payload.description,
            payload.durationMinutes,
            payload.totalMarks,
            payload.isActive ? "active" : "draft",
            nextVersion,
            currentUser.id,
          ]
        );
      } else {
        const practiceExam = await client.query<{ id: number }>(
          `
            INSERT INTO practice_exams
              (institution_id, academic_year_id, template_id, title, description, duration_minutes,
               total_marks, status, version, created_by, updated_by)
            VALUES ($1, (SELECT default_academic_year_id FROM institution_profiles WHERE id = $1), $2, $3, $4, $5, $6, $7, $8, $9, $9)
            RETURNING id
          `,
          [
            payload.institutionId,
            id,
            payload.title,
            payload.description,
            payload.durationMinutes,
            payload.totalMarks,
            payload.isActive ? "active" : "draft",
            nextVersion,
            currentUser.id,
          ]
        );
        practiceExamId = practiceExam.rows[0].id;
      }
      await client.query(`DELETE FROM practice_exam_targets WHERE practice_exam_id = $1`, [
        practiceExamId,
      ]);
      await client.query(
        `
          INSERT INTO practice_exam_targets (practice_exam_id, target_type, target_id, program_id)
          VALUES ($1, $2, $3, $4)
        `,
        [practiceExamId, payload.targetType, payload.targetId, payload.targetProgramId]
      );
      await replacePracticeExamSyllabusNodes(
        client,
        practiceExamId,
        payload.syllabusNodeIds
      );
      await client.query("COMMIT");
      if (payload.isActive && !existing.is_active) {
        try {
          await notifyStudentsForContentTarget(db, {
            type: "content.practice_exams.created",
            institutionId: payload.institutionId,
            targetType: payload.targetType,
            targetId: payload.targetId,
            targetProgramId: payload.targetProgramId,
            entityType: "practice_exam",
            entityId: practiceExamId,
            createdBy: currentUser.id,
            payload: {
              actor_name: currentUser.full_name,
              practice_exam_name: payload.title,
              url: "/admin/classroom/practice-exams",
            },
          });
        } catch (notificationError) {
          console.error("[practice-exam.activated.notification]", notificationError);
        }
      }
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

export async function DELETE(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    await ensurePracticeExamSchema();
    if (isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Platform Admin cannot delete institution practice exams" },
        { status: 403 }
      );
    }
    const { id: value } = await context.params;
    const id = parseId(value);
    const existing = await getTemplate(id);
    if (!existing) {
      return NextResponse.json({ error: "Practice Exam not found" }, { status: 404 });
    }
    if (existing.blocked_by_platform) {
      return NextResponse.json(
        { error: "Blocked practice exams cannot be deleted" },
        { status: 423 }
      );
    }
    const institutionId = Number(existing.source_institution_id);
    if (
      !hasPermission(currentUser, "content.practice_exams.delete", { institutionId })
    ) {
      return NextResponse.json(
        { error: "You don't have permission to delete this practice exam" },
        { status: 403 }
      );
    }
    await db.query(
      `
        UPDATE practice_exams
        SET is_deleted = TRUE,
            deleted_at = NOW(),
            status = 'deleted',
            updated_by = $2,
            updated_at = NOW()
        WHERE template_id = $1
          AND COALESCE(is_deleted, FALSE) = FALSE
      `,
      [id, currentUser.id]
    );
    await db.query(
      `
        UPDATE practice_exam_templates
        SET is_deleted = TRUE,
            deleted_at = NOW(),
            is_active = FALSE,
            updated_by = $2,
            updated_at = NOW()
        WHERE id = $1
          AND COALESCE(is_deleted, FALSE) = FALSE
      `,
      [id, currentUser.id]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}



