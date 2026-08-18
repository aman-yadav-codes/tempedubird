import { NextResponse } from "next/server";

import { parseExamQuestionsPayload } from "@/lib/exams/exam-payload";
import { requireAdmin } from "@/lib/auth/auth";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  ensureExamSchema,
  replaceExamQuestionsFromTemplate,
  replaceExamQuestions,
} from "@/lib/queries/exams";

type Context = { params: Promise<{ id: string }> };

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid exam id");
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

export async function PUT(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureExamSchema();
    if (isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Platform Admin cannot manage exam questions" },
        { status: 403 }
      );
    }
    const { id: value } = await context.params;
    const id = parseId(value);
    const result = await db.query<{
      source_institution_id: number;
      total_marks: string;
      instant_result: boolean;
      blocked_by_platform: boolean;
      created_by: number;
      exam_date: string;
      exam_time: string;
    }>(
      `
        SELECT
          template.source_institution_id,
          template.total_marks,
          COALESCE(series.instant_result, template.instant_result) AS instant_result,
          template.blocked_by_platform,
          template.created_by,
          template.exam_date,
          template.exam_time
        FROM practice_exam_templates template
        LEFT JOIN exam_series series ON series.id = template.exam_series_id
        WHERE template.id = $1
          AND COALESCE(template.exam_kind, 'practice') = 'exam'
        LIMIT 1
      `,
      [id]
    );
    const exam = result.rows[0];
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }
    const releaseAt = new Date(`${String(exam.exam_date).slice(0, 10)}T${String(exam.exam_time).slice(0, 8)}+05:30`).getTime();
    if (
      !isInstitutionAdminUser(currentUser) &&
      exam.created_by !== currentUser.id &&
      releaseAt > Date.now()
    ) {
      return NextResponse.json({ error: "Only the exam creator or an administrator can manage questions before release" }, { status: 403 });
    }
    if (exam.blocked_by_platform) {
      return NextResponse.json(
        { error: "This exam is blocked by Platform Admin" },
        { status: 423 }
      );
    }
    if (
      !hasPermission(currentUser, "content.exams.edit", {
        institutionId: exam.source_institution_id,
      })
    ) {
      return NextResponse.json(
        { error: "You don't have permission to manage these questions" },
        { status: 403 }
      );
    }
    const body = await req.json();
    const questions = parseExamQuestionsPayload(
      body.questions,
      Number(exam.total_marks),
      exam.instant_result
    );
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await replaceExamQuestions(client, id, questions);
      const versionResult = await client.query<{ version: number }>(
        `
          UPDATE practice_exam_templates
          SET version = version + 1,
              updated_by = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING version
        `,
        [id, currentUser.id]
      );
      const nextVersion = Number(versionResult.rows[0]?.version ?? 1);
      const exams = await client.query<{ id: number }>(
        `SELECT id FROM practice_exams WHERE template_id = $1`,
        [id]
      );
      for (const exam of exams.rows) {
        await client.query(
          `
            UPDATE practice_exams
            SET version = $2,
                updated_by = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [exam.id, nextVersion, currentUser.id]
        );
        await replaceExamQuestionsFromTemplate(client, exam.id, id);
      }
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



