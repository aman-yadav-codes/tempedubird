import { NextResponse } from "next/server";

import { parseNoteMetadataPayload } from "@/lib/notes/note-template-payload";
import { requireAdmin } from "@/lib/auth/auth";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  ensureNotesSchema,
  getNoteById,
  updateNote,
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
    message === "Note not found" ? 404 :
    400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureNotesSchema();
    const { id: value } = await context.params;
    const id = parseId(value);

    const note = await getNoteById(db, id);
    if (!note) throw new Error("Note not found");

    if (
      !isPlatformAdminUser(currentUser) &&
      !hasPermission(currentUser, "content.notes.view", {
        institutionId: note.institution_id,
      })
    ) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: note });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureNotesSchema();
    const { id: value } = await context.params;
    const id = parseId(value);

    const existing = await getNoteById(db, id);
    if (!existing) throw new Error("Note not found");

    if (
      !isPlatformAdminUser(currentUser) &&
      !hasPermission(currentUser, "content.notes.edit", {
        institutionId: existing.institution_id,
      })
    ) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const payload = parseNoteMetadataPayload(body);
    await updateNote(db, currentUser, id, payload);

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return errorResponse(error);
  }
}
