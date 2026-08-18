import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import { listNoteItems, listNotes } from "@/lib/queries/notes";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const user = await requireAdmin(req);
    const url = new URL(req.url);
    const enrollment = user.role_codes.includes("student")
      ? await resolveStudentEnrollmentContext(db, req, user.id, user.role_codes)
      : null;
    if (url.searchParams.get("action") === "items") {
      const noteId = Number(url.searchParams.get("noteId"));
      if (!Number.isInteger(noteId) || noteId <= 0) {
        return NextResponse.json({ error: "Note is required" }, { status: 422 });
      }
      const data = await listNoteItems(db, user, noteId, enrollment);
      return NextResponse.json({ data, total: data.length, pageCount: 1 });
    }
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const result = await listNotes(db, user, {
      search: url.searchParams.get("search") ?? "",
      limit,
      offset,
      view: "classroom",
      studentEnrollmentScope: enrollment,
    });
    return NextResponse.json({ ...result, pageCount: getPageCount(result.total, limit) });
  } catch (err) {
    const message = getErrorMessage(err);
    const status =
      message === "Forbidden: Admin access required" ? 403 :
      message === "Unauthorized" || message === "User not found" ? 401 :
      400;
    return NextResponse.json({ error: message }, { status });
  }
}
