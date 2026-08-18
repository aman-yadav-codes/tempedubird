import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { inheritSyllabusTemplate } from "@/lib/queries/syllabi";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function POST(req: Request, ctx: RouteContext) {
  try {
    const user = await requireAdmin(req);
    const { id } = await ctx.params;
    const templateSyllabusId = Number(id);
    if (!Number.isInteger(templateSyllabusId) || templateSyllabusId <= 0) {
      return NextResponse.json({ error: "Invalid template syllabus id" }, { status: 400 });
    }

    const body = await req.json();
    const institutionId = Number(body.institution_id);
    if (!Number.isInteger(institutionId) || institutionId <= 0) {
      return NextResponse.json({ error: "Institution is required" }, { status: 422 });
    }

    const syllabusId = await inheritSyllabusTemplate(
      db,
      user,
      templateSyllabusId,
      institutionId,
      typeof body.title === "string" ? body.title : null
    );

    return NextResponse.json({ data: { id: syllabusId } }, { status: 201 });
  } catch (err) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
