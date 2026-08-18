import { NextResponse } from "next/server";

import { parsePracticeExamQuestionsPayload } from "@/lib/practice-exams/practice-exam-payload";
import { requireAdmin } from "@/lib/auth/auth";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  ensurePracticeExamSchema,
  replacePracticeExamQuestionsFromTemplate,
  replacePracticeExamQuestions,
} from "@/lib/queries/practice-exams";

type Context = { params: Promise<{ id: string }> };

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid practice exam id");
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
    await ensurePracticeExamSchema();
    if (isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Platform Admin cannot manage practice exam questions" },
        { status: 403 }
      );
    }
    const { id: value } = await context.params;
    const id = parseId(value);
    const result = await db.query<{
      source_institution_id: number;
      total_marks: string;
      blocked_by_platform: boolean;
    }>(
      `
        SELECT source_institution_id, total_marks, blocked_by_platform
        FROM practice_exam_templates
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );
    const practiceExam = result.rows[0];
    if (!practiceExam) {
      return NextResponse.json({ error: "Practice Exam not found" }, { status: 404 });
    }
    if (practiceExam.blocked_by_platform) {
      return NextResponse.json(
        { error: "This practice exam is blocked by Platform Admin" },
        { status: 423 }
      );
    }
    if (
      !hasPermission(currentUser, "content.practice_exams.edit", {
        institutionId: practiceExam.source_institution_id,
      })
    ) {
      return NextResponse.json(
        { error: "You don't have permission to manage these questions" },
        { status: 403 }
      );
    }
    const body = await req.json();
    const questions = parsePracticeExamQuestionsPayload(
      body.questions,
      Number(practiceExam.total_marks)
    );
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await replacePracticeExamQuestions(client, id, questions);
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
      const practice_exams = await client.query<{ id: number }>(
        `SELECT id FROM practice_exams WHERE template_id = $1`,
        [id]
      );
      for (const practiceExam of practice_exams.rows) {
        await client.query(
          `
            UPDATE practice_exams
            SET version = $2,
                updated_by = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [practiceExam.id, nextVersion, currentUser.id]
        );
        await replacePracticeExamQuestionsFromTemplate(client, practiceExam.id, id);
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



