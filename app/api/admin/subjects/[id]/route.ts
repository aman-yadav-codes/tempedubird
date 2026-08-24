import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  getSubjectById,
  updateSubject,
  softDeleteSubject,
  toggleSubjectActive,
} from "@/lib/queries/subjects";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const subjectId = Number(id);

    const subject = await getSubjectById(db, subjectId);
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    return NextResponse.json({ data: subject });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const subjectId = Number(id);
    const body = await req.json();

    if (typeof body.isActive === "boolean") {
      await toggleSubjectActive(db, subjectId, body.isActive);
    }

    const updated = await updateSubject(db, subjectId, {
      name: body.name,
      slug: body.slug,
      code: body.code,
      icon_url: body.icon_url !== undefined ? body.icon_url : body.icon,
      categoryId: body.categoryId,
      boardId: body.boardId,
      courseId: body.courseId !== undefined ? (body.courseId ? Number(body.courseId) : null) : (body.course_id !== undefined ? (body.course_id ? Number(body.course_id) : null) : undefined),
      is_active: body.is_active ?? body.isActive,
    });

    if (!updated) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err.code === "23505" || err.message?.includes("already exists")) {
      return NextResponse.json(
        { error: err.message || "A subject with this name already exists" },
        { status: 409 }
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin(req);
    const { id } = await params;
    const subjectId = Number(id);

    await softDeleteSubject(db, subjectId, currentUser.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
