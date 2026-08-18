import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import { createSyllabus, listSyllabi } from "@/lib/queries/syllabi";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function asPositiveInteger(value: string | null) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export async function GET(req: Request) {
  try {
    const user = await requireAdmin(req);
    const url = new URL(req.url);
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );

    const { data, total } = await listSyllabi(db, user, {
      search: url.searchParams.get("search") ?? "",
      limit,
      offset,
      subjectId: asPositiveInteger(url.searchParams.get("subjectId")),
      institutionId: asPositiveInteger(url.searchParams.get("institutionId")),
      activeInstitutionId: asPositiveInteger(url.searchParams.get("activeInstitutionId")),
      templatesOnly: url.searchParams.get("templatesOnly") === "true",
      view: url.searchParams.get("view") === "my" ? "my" : "marketplace",
    });

    return NextResponse.json({ data, total, pageCount: getPageCount(total, limit) });
  } catch (err) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();
    const subjectId = Number(body.subject_id);

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      return NextResponse.json({ error: "Subject is required" }, { status: 422 });
    }
    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 422 });
    }

    const syllabus = await createSyllabus(db, user, {
      subject_id: subjectId,
      institution_id: body.institution_id ? Number(body.institution_id) : null,
      title: body.title.trim(),
      description: typeof body.description === "string" ? body.description.trim() : null,
      version: body.version ? Number(body.version) : 1,
      is_template: Boolean(body.is_template),
      is_active: typeof body.is_active === "boolean" ? body.is_active : true,
    });

    return NextResponse.json({ data: syllabus }, { status: 201 });
  } catch (err) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
