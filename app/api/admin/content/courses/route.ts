import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  createMasterCourse,
  listMasterCourses,
} from "@/lib/queries/content-courses";
import { getPagination, getPageCount } from "@/lib/queries/pagination";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);
    const { page, limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() || "";
    const categoryIdParam = url.searchParams.get("categoryId");
    const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined;
    const authorityType = url.searchParams.get("authorityType")?.trim() || "";

    const { data, total } = await listMasterCourses(db, {
      search,
      categoryId,
      authorityType,
      limit,
      offset,
    });

    return NextResponse.json({
      data,
      pageCount: getPageCount(total, limit),
      total,
      page,
      limit,
    });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const {
      name,
      slug,
      code,
      categoryId,
      authorityType,
      boardId,
      universityId,
      universityName,
      certificationProviderId,
      durationValue,
      durationUnit,
      seatsAvailable,
      description,
      thumbnailUrl,
      thumbnail_url,
      iconUrl,
      icon_url,
      subjectIds,
      isActive,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Course name is required" }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    const created = await createMasterCourse(db, {
      name: name.trim(),
      slug: slug?.trim(),
      code: code?.trim() || null,
      categoryId: Number(categoryId),
      authorityType: authorityType || "board",
      boardId: boardId ? Number(boardId) : null,
      universityId: universityId ? Number(universityId) : null,
      universityName: universityName?.trim() || null,
      certificationProviderId: certificationProviderId ? Number(certificationProviderId) : null,
      durationValue: durationValue ? Number(durationValue) : null,
      durationUnit: durationUnit || "months",
      seatsAvailable: seatsAvailable ? Number(seatsAvailable) : null,
      description: description?.trim() || null,
      thumbnail_url: (thumbnailUrl || thumbnail_url)?.trim() || null,
      icon_url: (iconUrl || icon_url)?.trim() || null,
      subjectIds: Array.isArray(subjectIds) ? subjectIds.map(Number) : [],
      customSubjects: Array.isArray(body.customSubjects)
        ? body.customSubjects
        : Array.isArray(body.subjects)
        ? body.subjects
        : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    return NextResponse.json({ data: created }, { status: 201 });
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

export async function PATCH(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { ids, isActive, softDelete } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
    }
    const numericIds = ids.map(Number).filter((id) => !isNaN(id));

    if (typeof isActive === "boolean") {
      await db.query(
        `UPDATE master_courses SET is_active = $1, updated_at = NOW() WHERE id = ANY($2::int[])`,
        [isActive, numericIds]
      );
    }

    if (softDelete === true) {
      await db.query(
        `UPDATE master_courses SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW() WHERE id = ANY($1::int[])`,
        [numericIds]
      );
    }

    return NextResponse.json({ success: true, count: numericIds.length });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
