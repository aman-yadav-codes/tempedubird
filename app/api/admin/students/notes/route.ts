import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import { listNotes } from "@/lib/queries/notes";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const user = await requireAdmin(req);
    const url = new URL(req.url);
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const result = await listNotes(db, user, {
      search: url.searchParams.get("search") ?? "",
      limit,
      offset,
      view: "my",
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
