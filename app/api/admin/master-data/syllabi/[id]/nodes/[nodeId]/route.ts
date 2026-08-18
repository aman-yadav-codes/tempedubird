import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { deleteSyllabusNode, updateSyllabusNode } from "@/lib/queries/syllabi";

type RouteContext = {
  params: Promise<{ id: string; nodeId: string }>;
};

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function parseOptionalNumber(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

async function getIds(ctx: RouteContext) {
  const { id, nodeId } = await ctx.params;
  const syllabusId = Number(id);
  const syllabusNodeId = Number(nodeId);
  if (!Number.isInteger(syllabusId) || syllabusId <= 0 || !Number.isInteger(syllabusNodeId) || syllabusNodeId <= 0) {
    throw new Error("Invalid syllabus node id");
  }
  return { syllabusId, syllabusNodeId };
}

export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const user = await requireAdmin(req);
    const { syllabusId, syllabusNodeId } = await getIds(ctx);
    const body = await req.json();

    await updateSyllabusNode(db, user, syllabusId, syllabusNodeId, {
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      description: typeof body.description === "string" ? body.description.trim() : undefined,
      node_type: typeof body.node_type === "string" ? body.node_type.trim() : undefined,
      sort_order: parseOptionalNumber(body.sort_order) ?? undefined,
      estimated_hours: parseOptionalNumber(body.estimated_hours),
      learning_outcomes: typeof body.learning_outcomes === "string" ? body.learning_outcomes.trim() : undefined,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
      is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  try {
    const user = await requireAdmin(req);
    const { syllabusId, syllabusNodeId } = await getIds(ctx);
    await deleteSyllabusNode(db, user, syllabusId, syllabusNodeId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
