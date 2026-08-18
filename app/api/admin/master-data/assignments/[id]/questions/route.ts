import { NextResponse } from "next/server";

import { parseAssignmentQuestionsPayload } from "@/lib/assignments/assignment-template-payload";
import { requireAdmin } from "@/lib/auth/auth";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  ensureAssignmentTemplateSchema,
  replaceAssignmentQuestionsFromTemplate,
  replaceAssignmentTemplateQuestions,
} from "@/lib/queries/assignment-templates";

type Context = { params: Promise<{ id: string }> };

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid assignment id");
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
    await ensureAssignmentTemplateSchema();
    if (isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Platform Admin cannot manage assignment questions" },
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
        FROM assignment_templates
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );
    const assignment = result.rows[0];
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    if (assignment.blocked_by_platform) {
      return NextResponse.json(
        { error: "This assignment is blocked by Platform Admin" },
        { status: 423 }
      );
    }
    if (
      !hasPermission(currentUser, "content.assignments.edit", {
        institutionId: assignment.source_institution_id,
      })
    ) {
      return NextResponse.json(
        { error: "You don't have permission to manage these questions" },
        { status: 403 }
      );
    }
    const body = await req.json();
    const questions = parseAssignmentQuestionsPayload(
      body.questions,
      Number(assignment.total_marks)
    );
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await replaceAssignmentTemplateQuestions(client, id, questions);
      const assignments = await client.query<{ id: number }>(
        `SELECT id FROM assignments WHERE template_id = $1`,
        [id]
      );
      for (const assignment of assignments.rows) {
        await replaceAssignmentQuestionsFromTemplate(client, assignment.id, id);
      }
      await client.query(
        `
          UPDATE assignment_templates
          SET version = version + 1,
              updated_by = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [id, currentUser.id]
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
