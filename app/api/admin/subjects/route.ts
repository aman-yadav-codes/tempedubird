import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { createSubject, listSubjects } from "@/lib/queries/subjects";
import { getPagination, getPageCount } from "@/lib/queries/pagination";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);
    const categoryId = Number(url.searchParams.get("categoryId"));
    const boardId = Number(url.searchParams.get("boardId"));

    if (!categoryId || !boardId) {
      return NextResponse.json(
        { error: "categoryId and boardId query params are required" },
        { status: 400 }
      );
    }

    const { page, limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() || "";

    const { data, total } = await listSubjects(db, {
      categoryId,
      boardId,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      data,
      pageCount: getPageCount(total, limit),
      total,
    });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const { categoryId, boardId, name, slug } = await req.json();

    if (!categoryId || !boardId || !name || !slug) {
      return NextResponse.json(
        { error: "categoryId, boardId, name, and slug are required" },
        { status: 400 }
      );
    }

    const subject = await createSubject(db, {
      categoryId: Number(categoryId),
      boardId: Number(boardId),
      name,
      slug,
    });

    return NextResponse.json({ data: subject }, { status: 201 });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json(
        { error: "A subject with this name already exists for the selected category and board" },
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
    const numericIds = ids.map(Number);

    if (typeof isActive === "boolean") {
      await db.query(
        `UPDATE subjects SET is_active = $1, updated_at = NOW() WHERE id = ANY($2::int[])`,
        [isActive, numericIds]
      );
    }
    if (softDelete === true) {
      await db.query(
        `UPDATE subjects SET is_deleted = TRUE, updated_at = NOW() WHERE id = ANY($1::int[])`,
        [numericIds]
      );
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}