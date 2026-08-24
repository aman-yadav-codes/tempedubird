import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  getMasterCourseById,
  updateMasterCourse,
  softDeleteMasterCourse,
  toggleMasterCourseActive,
} from "@/lib/queries/content-courses";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const courseId = Number(id);

    const course = await getMasterCourseById(db, courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({ data: course });
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
    const courseId = Number(id);
    const body = await req.json();

    if (typeof body.isActive === "boolean") {
      await toggleMasterCourseActive(db, courseId, body.isActive);
    }

    const updated = await updateMasterCourse(db, courseId, {
      name: body.name,
      slug: body.slug,
      code: body.code,
      categoryId: body.categoryId ? Number(body.categoryId) : undefined,
      authorityType: body.authorityType,
      boardId: body.boardId !== undefined ? (body.boardId ? Number(body.boardId) : null) : undefined,
      universityId: body.universityId !== undefined ? (body.universityId ? Number(body.universityId) : null) : undefined,
      universityName: body.universityName,
      certificationProviderId: body.certificationProviderId !== undefined ? (body.certificationProviderId ? Number(body.certificationProviderId) : null) : undefined,
      durationValue: body.durationValue !== undefined ? (body.durationValue ? Number(body.durationValue) : null) : undefined,
      durationUnit: body.durationUnit,
      seatsAvailable: body.seatsAvailable !== undefined ? (body.seatsAvailable ? Number(body.seatsAvailable) : null) : undefined,
      description: body.description,
      thumbnail_url: body.thumbnailUrl !== undefined ? body.thumbnailUrl : body.thumbnail_url,
      icon_url: body.iconUrl !== undefined ? body.iconUrl : body.icon_url,
      subjectIds: Array.isArray(body.subjectIds) ? body.subjectIds.map(Number) : undefined,
      customSubjects: Array.isArray(body.customSubjects)
        ? body.customSubjects
        : Array.isArray(body.subjects)
        ? body.subjects
        : undefined,
      isActive: body.isActive ?? body.is_active,
    });

    if (!updated) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json(
        { error: "A course with that slug or name already exists" },
        { status: 409 }
      );
    }
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin(req);
    const { id } = await params;
    const courseId = Number(id);

    await softDeleteMasterCourse(db, courseId, currentUser.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
