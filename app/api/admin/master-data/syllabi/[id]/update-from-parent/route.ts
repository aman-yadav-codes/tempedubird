import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { updateInheritedSyllabusFromParent } from "@/lib/queries/syllabi";

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
    const syllabusId = Number(id);
    if (!Number.isInteger(syllabusId) || syllabusId <= 0) {
      return NextResponse.json({ error: "Invalid syllabus id" }, { status: 400 });
    }

    const updatedId = await updateInheritedSyllabusFromParent(db, user, syllabusId);
    return NextResponse.json({ data: { id: updatedId } });
  } catch (err) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
