import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { createSubject, listSubjects } from "@/lib/queries/subjects";
import { getPagination, getPageCount } from "@/lib/queries/pagination";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);
    const categoryIdParam = url.searchParams.get("categoryId");
    const boardIdParam = url.searchParams.get("boardId");
    const courseIdParam = url.searchParams.get("courseId");
    const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined;
    const boardId = boardIdParam ? Number(boardIdParam) : undefined;
    const courseId = courseIdParam ? Number(courseIdParam) : undefined;

    const { page, limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() || "";

    const { data, total } = await listSubjects(db, {
      categoryId,
      boardId,
      courseId,
      search,
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

    // Check if multiple subjects payload is provided
    if (Array.isArray(body.subjects) && body.subjects.length > 0) {
      const commonCourseId = body.courseId || body.course_id ? Number(body.courseId || body.course_id) : null;
      const commonCategoryId = body.categoryId ? Number(body.categoryId) : null;
      const commonBoardId = body.boardId ? Number(body.boardId) : null;
      const commonIcon = body.icon_url || body.icon || null;
      const commonTermType = body.termType || body.term_type || "full_course";
      const commonTermNumber = body.termNumber || body.term_number || 1;
      const commonTermName = body.termName || body.term_name || null;

      const createdSubjects = [];
      const errors = [];

      for (const item of body.subjects) {
        if (!item || !item.name || !item.name.trim()) continue;
        try {
          const effectiveSlug = (item.slug || item.name)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");

          const subject = await createSubject(db, {
            name: item.name.trim(),
            slug: effectiveSlug,
            code: item.code?.trim() || null,
            icon_url: item.icon_url || item.icon || commonIcon || "/icons/default-subject.svg",
            categoryId: item.categoryId ? Number(item.categoryId) : commonCategoryId,
            boardId: item.boardId ? Number(item.boardId) : commonBoardId,
            courseId: item.courseId ? Number(item.courseId) : commonCourseId,
            termType: item.termType || item.term_type || commonTermType,
            termNumber: item.termNumber || item.term_number || commonTermNumber,
            termName: item.termName || item.term_name || commonTermName,
            is_active: item.is_active !== undefined ? Boolean(item.is_active) : true,
          });
          createdSubjects.push(subject);
        } catch (err: any) {
          errors.push({ name: item.name, error: err.message });
        }
      }

      return NextResponse.json({
        data: createdSubjects,
        count: createdSubjects.length,
        errors: errors.length > 0 ? errors : undefined,
      }, { status: 201 });
    }

    // Single subject payload
    const { name, slug, code, icon_url, icon, categoryId, boardId, courseId, course_id, termType, term_type, termNumber, term_number, termName, term_name, is_active } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Subject name is required" },
        { status: 400 }
      );
    }

    const effectiveSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    const effectiveCourseId = courseId || course_id ? Number(courseId || course_id) : null;

    const subject = await createSubject(db, {
      name: name.trim(),
      slug: effectiveSlug,
      code: code || null,
      icon_url: icon_url || icon || "/icons/default-subject.svg",
      categoryId: categoryId ? Number(categoryId) : null,
      boardId: boardId ? Number(boardId) : null,
      courseId: effectiveCourseId,
      termType: termType || term_type || "full_course",
      termNumber: termNumber || term_number || 1,
      termName: termName || term_name || null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    });

    return NextResponse.json({ data: subject }, { status: 201 });
  } catch (err: any) {
    if (err.code === "23505" || err.message?.includes("already exists")) {
      return NextResponse.json(
        { error: err.message || "A subject with this name already exists in the catalog" },
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
        `UPDATE subjects SET is_active = $1, updated_at = NOW() WHERE id = ANY($2::int[])`,
        [isActive, numericIds]
      );
    }
    if (softDelete === true) {
      await db.query(
        `UPDATE subjects SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW() WHERE id = ANY($1::int[])`,
        [numericIds]
      );
    }
    return NextResponse.json({ success: true, count: numericIds.length });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}