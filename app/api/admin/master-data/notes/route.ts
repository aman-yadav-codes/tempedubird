import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import {
  approveNoteMarketplace,
  createNote,
  createNoteItem,
  deleteNotes,
  deleteNoteItems,
  inheritMarketplaceNote,
  listNoteInstitutions,
  listNoteItems,
  listNotePrograms,
  listNotes,
  listNoteSections,
  listNoteSyllabi,
  listNoteSyllabusNodes,
  removeNoteFromMarketplace,
  updateNote,
  updateNoteItem,
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

function parseNoteBody(body: Record<string, unknown>) {
  const institutionId = asPositiveInteger(body.institution_id);
  if (!institutionId) throw new Error("Institution is required");
  if (!asPositiveInteger(body.program_id)) throw new Error("Class / Program is required");
  return {
    institution_id: institutionId,
    subject_id: asPositiveInteger(body.subject_id),
    syllabus_id: asPositiveInteger(body.syllabus_id),
    program_id: asPositiveInteger(body.program_id),
    section_id: asPositiveInteger(body.section_id),
    is_active: typeof body.is_active === "boolean" ? body.is_active : false,
    marketplace_requested: typeof body.marketplace_requested === "boolean" ? body.marketplace_requested : false,
  };
}

function parseNoteItemBody(body: Record<string, unknown>) {
  const noteId = asPositiveInteger(body.note_id);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const noteBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!noteId) throw new Error("Note is required");
  if (!title) throw new Error("Title is required");
  if (!noteBody) throw new Error("Notes content is required");
  return {
    note_id: noteId,
    syllabus_node_id: asPositiveInteger(body.syllabus_node_id),
    title,
    body: noteBody,
    is_active: typeof body.is_active === "boolean" ? body.is_active : true,
  };
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
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search") ?? "";

    if (action === "institutions") {
      const result = await listNoteInstitutions(db, user, search, limit, offset);
      return NextResponse.json({ ...result, pageCount: getPageCount(result.total, limit) });
    }

    if (action === "programs") {
      const institutionId = asPositiveInteger(url.searchParams.get("institutionId"));
      if (!institutionId) return NextResponse.json({ error: "Institution is required" }, { status: 422 });
      const result = await listNotePrograms(db, user, institutionId, search, limit, offset);
      return NextResponse.json({ ...result, pageCount: getPageCount(result.total, limit) });
    }

    if (action === "sections") {
      const programId = asPositiveInteger(url.searchParams.get("programId"));
      if (!programId) return NextResponse.json({ error: "Class / Program is required" }, { status: 422 });
      const result = await listNoteSections(db, user, programId, search, limit, offset);
      return NextResponse.json({ ...result, pageCount: getPageCount(result.total, limit) });
    }

    if (action === "syllabi") {
      const institutionId = asPositiveInteger(url.searchParams.get("institutionId"));
      if (!institutionId) return NextResponse.json({ error: "Institution is required" }, { status: 422 });
      const result = await listNoteSyllabi(db, user, institutionId, search, limit, offset);
      return NextResponse.json({ ...result, pageCount: getPageCount(result.total, limit) });
    }

    if (action === "nodes") {
      const syllabusId = asPositiveInteger(url.searchParams.get("syllabusId"));
      if (!syllabusId) return NextResponse.json({ error: "Syllabus is required" }, { status: 422 });
      const result = await listNoteSyllabusNodes(db, user, syllabusId, search, limit, offset);
      return NextResponse.json({ ...result, pageCount: getPageCount(result.total, limit) });
    }

    if (action === "items") {
      const noteId = asPositiveInteger(url.searchParams.get("noteId"));
      if (!noteId) return NextResponse.json({ error: "Note is required" }, { status: 422 });
      const data = await listNoteItems(db, user, noteId);
      return NextResponse.json({ data, total: data.length, pageCount: 1 });
    }

    const result = await listNotes(db, user, {
      search,
      limit,
      offset,
      institutionId: asPositiveInteger(url.searchParams.get("institutionId")),
      subjectId: asPositiveInteger(url.searchParams.get("subjectId")),
      syllabusId: asPositiveInteger(url.searchParams.get("syllabusId")),
      academicYearId: asPositiveInteger(url.searchParams.get("academicYearId")),
      view: parseNotesView(url.searchParams.get("view")),
    });

    return NextResponse.json({ ...result, pageCount: getPageCount(result.total, limit) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();
    if (body.action === "createItem") {
      const id = await createNoteItem(db, user, parseNoteItemBody(body));
      return NextResponse.json({ data: { id } }, { status: 201 });
    }
    if (body.action === "inheritMarketplace") {
      const sourceId = asPositiveInteger(body.id);
      const institutionId = asPositiveInteger(body.institution_id);
      if (!sourceId) return NextResponse.json({ error: "Note is required" }, { status: 422 });
      if (!institutionId) return NextResponse.json({ error: "Institution is required" }, { status: 422 });
      const id = await inheritMarketplaceNote(db, user, sourceId, institutionId);
      return NextResponse.json({ data: { id } }, { status: 201 });
    }
    const id = await createNote(db, user, parseNoteBody(body));
    return NextResponse.json({ data: { id } }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAdmin(req);
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
    if (body.action === "updateItem") {
      const id = asPositiveInteger(body.id);
      if (!id) return NextResponse.json({ error: "Note item is required" }, { status: 422 });
      await updateNoteItem(db, user, id, parseNoteItemBody(body));
      return NextResponse.json({ success: true });
    }
    const id = asPositiveInteger(body.id);
    if (!id) return NextResponse.json({ error: "Note is required" }, { status: 422 });
    await updateNote(db, user, id, parseNoteBody(body));
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();
    if (body.action === "deleteItems") {
      const noteId = asPositiveInteger(body.note_id);
      if (!noteId) return NextResponse.json({ error: "Note is required" }, { status: 422 });
      const ids = Array.isArray(body.ids)
        ? body.ids.map(Number).filter((id) => Number.isInteger(id) && id > 0)
        : [];
      await deleteNoteItems(db, user, noteId, ids);
      return NextResponse.json({ success: true });
    }
    const ids = Array.isArray(body.ids)
      ? body.ids.map(Number).filter((id) => Number.isInteger(id) && id > 0)
      : [];
    await deleteNotes(db, user, ids);
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
