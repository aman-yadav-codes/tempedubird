import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import { listSyllabusSubjects } from "@/lib/queries/syllabi";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const { data, total } = await listSyllabusSubjects(
      db,
      url.searchParams.get("search") ?? "",
      limit,
      offset
    );

    return NextResponse.json({ data, total, pageCount: getPageCount(total, limit) });
  } catch (err) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
