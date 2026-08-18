import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { deleteSyllabus, getSyllabusById, updateSyllabus } from "@/lib/queries/syllabi";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

async function getId(ctx: RouteContext) {
  const { id } = await ctx.params;
  const syllabusId = Number(id);
  if (!Number.isInteger(syllabusId) || syllabusId <= 0) {
    throw new Error("Invalid syllabus id");
  }
  return syllabusId;
}

export async function GET(req: Request, ctx: RouteContext) {
  try {
    const user = await requireAdmin(req);
    const syllabus = await getSyllabusById(db, user, await getId(ctx));
    if (!syllabus) return NextResponse.json({ error: "Syllabus not found" }, { status: 404 });
    return NextResponse.json({ data: syllabus });
  } catch (err) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();
    const syllabus = await updateSyllabus(db, user, await getId(ctx), {
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      description: typeof body.description === "string" ? body.description.trim() : undefined,
      version: body.version ? Number(body.version) : undefined,
      is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
    });

    return NextResponse.json({ data: syllabus });
  } catch (err) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  try {
    const user = await requireAdmin(req);
    await deleteSyllabus(db, user, await getId(ctx));
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
