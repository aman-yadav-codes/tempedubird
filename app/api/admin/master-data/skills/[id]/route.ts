import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { deleteSkill, toggleSkillStatus, updateSkill } from "@/lib/queries/skills";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid skill ID" }, { status: 400 });
    }

    await deleteSkill(db, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid skill ID" }, { status: 400 });
    }

    const body = await req.json();

    // Toggle status
    if (body.is_active !== undefined) {
      const skill = await toggleSkillStatus(db, id, body.is_active);
      return NextResponse.json({ data: skill });
    }

    // Update name/slug
    if (body.name || body.slug) {
      const skill = await updateSkill(db, id, { name: body.name, slug: body.slug });
      return NextResponse.json({ data: skill });
    }

    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json({ error: "A skill with that slug already exists" }, { status: 409 });
    }
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
