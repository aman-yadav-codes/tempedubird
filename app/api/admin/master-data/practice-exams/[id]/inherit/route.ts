import { NextResponse } from "next/server";
import type { PoolClient } from "pg";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { resolveInstitutionDefaultAcademicYearId } from "@/lib/queries/academic-sessions";
import {
  ensurePracticeExamSchema,
  replacePracticeExamQuestionsFromTemplate,
} from "@/lib/queries/practice-exams";

type Context = { params: Promise<{ id: string }> };

function parseId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${label} is required`);
  return id;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    400;
  return NextResponse.json({ error: message }, { status });
}

async function resolveCopiedTarget(
  client: PoolClient,
  sourcePracticeExamId: number,
  targetInstitutionId: number
) {
  const result = await client.query<{
    target_type: string;
    target_id: number;
    program_id: number | null;
    program_title: string | null;
    section_name: string | null;
  }>(
    `
      SELECT
        target.target_type,
        target.target_id,
        target.program_id,
        source_program.title AS program_title,
        source_section.name AS section_name
      FROM practice_exam_targets target
      LEFT JOIN institution_programs source_program
        ON source_program.id = COALESCE(target.program_id, target.target_id)
       AND target.target_type IN ('PROGRAM', 'SECTION', 'STUDENT')
      LEFT JOIN sections source_section
        ON source_section.id = target.target_id
       AND target.target_type = 'SECTION'
      WHERE target.practice_exam_id = $1
      LIMIT 1
    `,
    [sourcePracticeExamId]
  );
  const source = result.rows[0];
  if (!source || source.target_type === "INSTITUTION") {
    return {
      targetType: "INSTITUTION",
      targetId: targetInstitutionId,
      targetProgramId: null as number | null,
    };
  }

  if (source.target_type === "PROGRAM" && source.program_title) {
    const program = await client.query<{ id: number }>(
      `
        SELECT id
        FROM institution_programs
        WHERE institution_id = $1
          AND LOWER(title) = LOWER($2)
          AND COALESCE(is_deleted, FALSE) = FALSE
          AND is_active = TRUE
        ORDER BY id
        LIMIT 1
      `,
      [targetInstitutionId, source.program_title]
    );
    if (program.rows[0]) {
      return {
        targetType: "PROGRAM",
        targetId: program.rows[0].id,
        targetProgramId: null as number | null,
      };
    }
  }

  if (source.target_type === "SECTION" && source.program_title && source.section_name) {
    const section = await client.query<{ program_id: number; section_id: number }>(
      `
        SELECT ip.id AS program_id, ps.section_id
        FROM institution_programs ip
        INNER JOIN program_sections ps ON ps.program_id = ip.id
        INNER JOIN sections section ON section.id = ps.section_id
        WHERE ip.institution_id = $1
          AND LOWER(ip.title) = LOWER($2)
          AND LOWER(section.name) = LOWER($3)
          AND COALESCE(ip.is_deleted, FALSE) = FALSE
          AND ip.is_active = TRUE
        ORDER BY ip.id, ps.section_id
        LIMIT 1
      `,
      [targetInstitutionId, source.program_title, source.section_name]
    );
    if (section.rows[0]) {
      return {
        targetType: "SECTION",
        targetId: section.rows[0].section_id,
        targetProgramId: section.rows[0].program_id,
      };
    }
  }

  return {
    targetType: "INSTITUTION",
    targetId: targetInstitutionId,
    targetProgramId: null as number | null,
  };
}

async function copyTemplateQuestions(
  client: PoolClient,
  sourceTemplateId: number,
  targetTemplateId: number
) {
  const questions = await client.query<{
    id: number;
    question_text: string;
    question_type: string;
    marks: string;
    explanation: string | null;
    display_order: number;
  }>(
    `
      SELECT id, question_text, question_type, marks, explanation, display_order
      FROM practice_exam_template_questions
      WHERE template_id = $1
      ORDER BY display_order, id
    `,
    [sourceTemplateId]
  );

  for (const question of questions.rows) {
    const inserted = await client.query<{ id: number }>(
      `
        INSERT INTO practice_exam_template_questions
          (template_id, question_text, question_type, marks, explanation, display_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        targetTemplateId,
        question.question_text,
        question.question_type,
        question.marks,
        question.explanation,
        question.display_order,
      ]
    );
    const targetQuestionId = inserted.rows[0].id;
    await client.query(
      `
        INSERT INTO practice_exam_template_question_options
          (question_id, option_text, is_correct, display_order)
        SELECT $2, option_text, is_correct, display_order
        FROM practice_exam_template_question_options
        WHERE question_id = $1
        ORDER BY display_order, id
      `,
      [question.id, targetQuestionId]
    );
    await client.query(
      `
        INSERT INTO practice_exam_template_question_files
          (question_id, file_url, sort_order)
        SELECT $2, file_url, sort_order
        FROM practice_exam_template_question_files
        WHERE question_id = $1
        ORDER BY sort_order, id
      `,
      [question.id, targetQuestionId]
    );
  }
}

export async function POST(req: Request, context: Context) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    await ensurePracticeExamSchema();
    if (isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Platform Admin cannot inherit practice exams" },
        { status: 403 }
      );
    }

    const { id: value } = await context.params;
    const sourceTemplateId = parseId(value, "Practice Exam");
    const body = await req.json().catch(() => ({}));
    const targetInstitutionId = parseId(body.institution_id, "Institution");

    const userRole = (currentUser as any)?.role || (currentUser as any)?.role_code || "";
    const userInstId = (currentUser as any)?.institution_id || currentUser?.memberships?.[0]?.institution_id || null;
    const isInstitutionAdmin = Boolean(
      userRole === "institution_admin" ||
      currentUser.role_codes?.includes("institution_admin") ||
      currentUser.roles?.includes("Institution Admin") ||
      (userInstId && Number(userInstId) === targetInstitutionId)
    );

    if (
      !isInstitutionAdmin &&
      !hasPermission(currentUser, "content.practice_exams.create", {
        institutionId: targetInstitutionId,
      })
    ) {
      return NextResponse.json(
        { error: "You don't have permission to inherit practice exams here" },
        { status: 403 }
      );
    }
    const targetAcademicYearId = await resolveInstitutionDefaultAcademicYearId(db, targetInstitutionId);

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<{ id: number; practice_exam_id: number }>(
        `
          SELECT practice_exam_templates.id, exam.id AS practice_exam_id
          FROM practice_exam_templates
          INNER JOIN practice_exams exam
            ON exam.template_id = practice_exam_templates.id
           AND exam.academic_year_id = $3
           AND COALESCE(exam.exam_kind, 'practice') = 'practice'
           AND COALESCE(exam.is_deleted, FALSE) = FALSE
          WHERE parent_template_id = $1
            AND source_institution_id = $2
            AND COALESCE(practice_exam_templates.is_deleted, FALSE) = FALSE
          LIMIT 1
        `,
        [sourceTemplateId, targetInstitutionId, targetAcademicYearId]
      );

      const source = await client.query<{
        id: number;
        title: string;
        description: string | null;
        total_marks: string;
        ai_question_format: unknown;
        duration_minutes: number;
        is_active: boolean;
        version: number;
        assigned_practice_exam_id: number | null;
      }>(
        `
          SELECT
            template.id,
            template.title,
            template.description,
            template.total_marks,
            template.ai_question_format,
            template.duration_minutes,
            template.is_active,
            template.version,
            exam.id AS assigned_practice_exam_id
          FROM practice_exam_templates template
          LEFT JOIN practice_exams exam
            ON exam.template_id = template.id
           AND COALESCE(exam.is_deleted, FALSE) = FALSE
          WHERE template.id = $1
            AND template.is_public = TRUE
            AND template.is_active = TRUE
            AND template.blocked_by_platform = FALSE
            AND COALESCE(template.is_deleted, FALSE) = FALSE
          LIMIT 1
        `,
        [sourceTemplateId]
      );
      const sourceRow = source.rows[0];
      if (!sourceRow) throw new Error("This practice exam is not available in marketplace");
      const existingRow = existing.rows[0];

      if (existingRow) {
        const targetTemplateId = existingRow.id;
        const targetPracticeExamId = existingRow.practice_exam_id;
        await client.query(
          `
            UPDATE practice_exam_templates
            SET title = $2,
                description = $3,
                total_marks = $4,
                ai_question_format = $5::jsonb,
                duration_minutes = $6,
                is_active = FALSE,
                version = $7,
                updated_by = $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [
            targetTemplateId,
            sourceRow.title,
            sourceRow.description,
            sourceRow.total_marks,
            JSON.stringify(sourceRow.ai_question_format ?? {
              enabled: false,
              true_false: 0,
              objective: 0,
            }),
            sourceRow.duration_minutes,
            sourceRow.version,
            currentUser.id,
          ]
        );
        await client.query(
          `
            UPDATE practice_exams
            SET academic_year_id = $2,
                title = $3,
                description = $4,
                duration_minutes = $5,
                total_marks = $6,
                status = 'draft',
                version = $7,
                updated_by = $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [
            targetPracticeExamId,
            targetAcademicYearId,
            sourceRow.title,
            sourceRow.description,
            sourceRow.duration_minutes,
            sourceRow.total_marks,
            sourceRow.version,
            currentUser.id,
          ]
        );
        await client.query(`DELETE FROM practice_exam_targets WHERE practice_exam_id = $1`, [targetPracticeExamId]);
        await client.query(`DELETE FROM practice_exam_syllabus_nodes WHERE practice_exam_id = $1`, [targetPracticeExamId]);
        await client.query(
          `
            DELETE FROM practice_exam_template_question_options
            WHERE question_id IN (SELECT id FROM practice_exam_template_questions WHERE template_id = $1)
          `,
          [targetTemplateId]
        );
        await client.query(
          `
            DELETE FROM practice_exam_template_question_files
            WHERE question_id IN (SELECT id FROM practice_exam_template_questions WHERE template_id = $1)
          `,
          [targetTemplateId]
        );
        await client.query(`DELETE FROM practice_exam_template_questions WHERE template_id = $1`, [targetTemplateId]);
        const target = sourceRow.assigned_practice_exam_id
          ? await resolveCopiedTarget(client, sourceRow.assigned_practice_exam_id, targetInstitutionId)
          : {
              targetType: "INSTITUTION",
              targetId: targetInstitutionId,
              targetProgramId: null as number | null,
            };
        await client.query(
          `
            INSERT INTO practice_exam_targets (practice_exam_id, target_type, target_id, program_id)
            VALUES ($1, $2, $3, $4)
          `,
          [targetPracticeExamId, target.targetType, target.targetId, target.targetProgramId]
        );
        if (sourceRow.assigned_practice_exam_id) {
          await client.query(
            `
              INSERT INTO practice_exam_syllabus_nodes (practice_exam_id, syllabus_node_id)
              SELECT $2, syllabus_node_id
              FROM practice_exam_syllabus_nodes
              WHERE practice_exam_id = $1
              ON CONFLICT DO NOTHING
            `,
            [sourceRow.assigned_practice_exam_id, targetPracticeExamId]
          );
        }
        await copyTemplateQuestions(client, sourceTemplateId, targetTemplateId);
        await replacePracticeExamQuestionsFromTemplate(client, targetPracticeExamId, targetTemplateId);

        await client.query("COMMIT");
        return NextResponse.json({ data: { id: targetTemplateId, practice_exam_id: targetPracticeExamId, existing: true } });
      }

      const template = await client.query<{ id: number }>(
        `
          INSERT INTO practice_exam_templates
            (title, description, total_marks, ai_question_format, duration_minutes, is_public,
             marketplace_requested, marketplace_approved, is_active, version,
             source_institution_id, parent_template_id, created_by, updated_by)
          VALUES ($1, $2, $3, $4::jsonb, $5, FALSE, FALSE, FALSE, $6, $7, $8, $9, $10, $10)
          RETURNING id
        `,
        [
          sourceRow.title,
          sourceRow.description,
          sourceRow.total_marks,
          JSON.stringify(sourceRow.ai_question_format ?? {
            enabled: false,
            true_false: 0,
            objective: 0,
          }),
          sourceRow.duration_minutes,
          false,
          sourceRow.version,
          targetInstitutionId,
          sourceTemplateId,
          currentUser.id,
        ]
      );
      const targetTemplateId = template.rows[0].id;
      const practiceExam = await client.query<{ id: number }>(
        `
          INSERT INTO practice_exams
            (institution_id, academic_year_id, template_id, title, description, duration_minutes,
             total_marks, status, version, created_by, updated_by)
          VALUES ($1, $10, $2, $3, $4, $5, $6, $7, $8, $9, $9)
          RETURNING id
        `,
        [
          targetInstitutionId,
          targetTemplateId,
          sourceRow.title,
          sourceRow.description,
          sourceRow.duration_minutes,
          sourceRow.total_marks,
          "draft",
          sourceRow.version,
          currentUser.id,
          targetAcademicYearId,
        ]
      );
      const targetPracticeExamId = practiceExam.rows[0].id;
      const target = sourceRow.assigned_practice_exam_id
        ? await resolveCopiedTarget(
            client,
            sourceRow.assigned_practice_exam_id,
            targetInstitutionId
          )
        : {
            targetType: "INSTITUTION",
            targetId: targetInstitutionId,
            targetProgramId: null as number | null,
          };

      await client.query(
        `
          INSERT INTO practice_exam_targets (practice_exam_id, target_type, target_id, program_id)
          VALUES ($1, $2, $3, $4)
        `,
        [
          targetPracticeExamId,
          target.targetType,
          target.targetId,
          target.targetProgramId,
        ]
      );

      if (sourceRow.assigned_practice_exam_id) {
        await client.query(
          `
            INSERT INTO practice_exam_syllabus_nodes (practice_exam_id, syllabus_node_id)
            SELECT $2, syllabus_node_id
            FROM practice_exam_syllabus_nodes
            WHERE practice_exam_id = $1
            ON CONFLICT DO NOTHING
          `,
          [sourceRow.assigned_practice_exam_id, targetPracticeExamId]
        );
      }

      await copyTemplateQuestions(client, sourceTemplateId, targetTemplateId);
      await replacePracticeExamQuestionsFromTemplate(
        client,
        targetPracticeExamId,
        targetTemplateId
      );

      await client.query("COMMIT");
      return NextResponse.json(
        { data: { id: targetTemplateId, practice_exam_id: targetPracticeExamId } },
        { status: 201 }
      );
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
