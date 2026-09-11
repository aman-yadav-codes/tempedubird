import { NextResponse } from "next/server";

import { parseNoteQuestionsPayload } from "@/lib/notes/note-template-payload";
import { requireAdmin } from "@/lib/auth/auth";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  ensureNotesSchema,
  replaceNoteQuestions,
} from "@/lib/queries/notes";

type Context = { params: Promise<{ id: string }> };

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid note id");
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
    await ensureNotesSchema();
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const { id: value } = await context.params;
    const id = parseId(value);

    const result = await db.query<{
      institution_id: number;
      blocked_by_platform: boolean;
    }>(
      `
        SELECT institution_id, blocked_by_platform
        FROM study_notes
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );
    const note = result.rows[0];
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    if (note.blocked_by_platform && !isPlatformAdmin) {
      return NextResponse.json(
        { error: "This note is blocked by Platform Admin" },
        { status: 423 }
      );
    }
    if (
      !isPlatformAdmin &&
      !hasPermission(currentUser, "content.notes.edit", {
        institutionId: note.institution_id,
      })
    ) {
      return NextResponse.json(
        { error: "You don't have permission to manage these notes" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const questions = parseNoteQuestionsPayload(body.questions);

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await replaceNoteQuestions(client, id, questions);
      await client.query("COMMIT");
      return NextResponse.json({ success: true });
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
