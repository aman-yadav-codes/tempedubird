import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { createSyllabusNode } from "@/lib/queries/syllabi";

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

    const body = await req.json();
    if (!body.title || !body.node_type) {
      return NextResponse.json({ error: "Title and node type are required" }, { status: 422 });
    }

    const nodeId = await createSyllabusNode(db, user, syllabusId, {
      parent_id: body.parent_id ? Number(body.parent_id) : null,
      title: String(body.title).trim(),
      description: typeof body.description === "string" ? body.description.trim() : null,
      node_type: String(body.node_type).trim(),
      sort_order: body.sort_order ? Number(body.sort_order) : 0,
      estimated_hours: body.estimated_hours ? Number(body.estimated_hours) : null,
      learning_outcomes: typeof body.learning_outcomes === "string" ? body.learning_outcomes.trim() : null,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
      is_active: typeof body.is_active === "boolean" ? body.is_active : true,
    });

    return NextResponse.json({ data: { id: nodeId } }, { status: 201 });
  } catch (err) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
