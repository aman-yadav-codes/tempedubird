import { NextResponse } from "next/server";

import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import { parseNoteMetadataPayload } from "@/lib/notes/note-template-payload";
import {
  approveNoteMarketplace,
  createNote,
  deleteNotes,
  ensureNotesSchema,
  inheritMarketplaceNote,
  listNotes,
  removeNoteFromMarketplace,
} from "@/lib/queries/notes";

type NotesView = "my" | "requests" | "marketplace";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function asPositiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function parseNotesView(value: string | null): NotesView {
  if (value === "requests" || value === "marketplace") return value;
  return "my";
}

function errorResponse(err: unknown) {
  const message = getErrorMessage(err);
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const user = await requireAdmin(req);
    await ensureNotesSchema();
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search") ?? "";

    if (action === "sections") {
      const programId = asPositiveInteger(url.searchParams.get("programId"));
      if (!programId) return NextResponse.json({ data: [] });
      const result = await db.query<{ id: number; name: string }>(
        `
          SELECT s.id, s.name
          FROM program_sections ps
          INNER JOIN sections s ON s.id = ps.section_id
          WHERE ps.program_id = $1
            AND s.is_active = TRUE
            AND COALESCE(s.is_deleted, FALSE) = FALSE
          ORDER BY s.name ASC
        `,
        [programId]
      );
      return NextResponse.json({ data: result.rows });
    }

    const result = await listNotes(db, user, {
      search,
      limit,
      offset,
      institutionId: asPositiveInteger(url.searchParams.get("institutionId")),
      view: parseNotesView(url.searchParams.get("view")),
    });

    return NextResponse.json({
      ...result,
      pageCount: getPageCount(result.total, limit),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin(req);
    await ensureNotesSchema();
    const body = await req.json();

    if (body.action === "inheritMarketplace") {
      const sourceId = asPositiveInteger(body.id);
      const institutionId = asPositiveInteger(body.institution_id);
      if (!sourceId) return NextResponse.json({ error: "Note is required" }, { status: 422 });
      if (!institutionId) return NextResponse.json({ error: "Institution is required" }, { status: 422 });
      const id = await inheritMarketplaceNote(db, user, sourceId, institutionId);
      return NextResponse.json({ data: { id } }, { status: 201 });
    }

    const payload = parseNoteMetadataPayload(body);
    const id = await createNote(db, user, payload);
    return NextResponse.json({ data: { id } }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAdmin(req);
    await ensureNotesSchema();
    const body = await req.json();

    if (body.action === "approveMarketplace") {
      const id = asPositiveInteger(body.id);
      if (!id) return NextResponse.json({ error: "Note is required" }, { status: 422 });
      await approveNoteMarketplace(db, user, id);
      return NextResponse.json({ success: true });
    }

    if (body.action === "removeFromMarketplace") {
      const id = asPositiveInteger(body.id);
      if (!id) return NextResponse.json({ error: "Note is required" }, { status: 422 });
      await removeNoteFromMarketplace(db, user, id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAdmin(req);
    await ensureNotesSchema();
    const body = await req.json();
    const ids = Array.isArray(body.ids)
      ? body.ids.map(Number).filter((id: number) => Number.isInteger(id) && id > 0)
      : [];
    if (!ids.length) return NextResponse.json({ error: "Select notes to delete" }, { status: 422 });
    await deleteNotes(db, user, ids);
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
