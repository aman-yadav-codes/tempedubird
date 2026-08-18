// app/api/admin/categories/route.ts

import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

import {
  insertCategory,
  listCategories,
} from "@/lib/queries/category";

// ─────────────────────────────────────────────────────────────
// GET /api/admin/categories
// ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);

    const page = Math.max(
      1,
      Number(url.searchParams.get("page")) || 1
    );

    const limit = Math.max(
      1,
      Number(url.searchParams.get("limit")) || 10
    );

    const offset = (page - 1) * limit;

    const search =
      url.searchParams.get("search")?.trim() || "";

    const onlyRoot =
      url.searchParams.get("onlyRoot") === "true";

    const showRootsFirst =
      url.searchParams.get("showRootsFirst") === "true";

    const onlyClass =
      url.searchParams.get("onlyClass") === "true";

    const onlyLeaf =
      url.searchParams.get("onlyLeaf") === "true";

    const { data, total } = await listCategories(db, {
      search,
      onlyRoot,
      showRootsFirst,
      onlyClass,
      onlyLeaf,
      limit,
      offset,
    });

    return NextResponse.json({
      data,
      total,
      pageCount: Math.ceil(total / limit),
    });
  } catch (err: any) {
    const status =
      err.message === "Forbidden: Admin access required"
        ? 403
        : 401;

    return NextResponse.json(
      { error: err.message },
      { status }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/admin/categories
// ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    await requireAdmin(req);

    const body = await req.json();

    const {
      name,
      slug,
      parentId = null,
    } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "name and slug are required" },
        { status: 400 }
      );
    }

    const category = await insertCategory(db, {
      name,
      slug,
      parentId,
    });

    return NextResponse.json(
      { data: category },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json(
        { error: "A category with this slug already exists under the selected parent" },
        { status: 409 }
      );
    }

    const status =
      err.message === "Forbidden: Admin access required"
        ? 403
        : 400;

    return NextResponse.json(
      { error: err.message },
      { status }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/categories (Bulk Update Status / Bulk Delete)
// ─────────────────────────────────────────────────────────────
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
        `UPDATE categories SET is_active = $1, updated_at = NOW() WHERE id = ANY($2::int[])`,
        [isActive, numericIds]
      );
    }
    if (softDelete === true) {
      await db.query(
        `UPDATE categories SET is_deleted = TRUE, updated_at = NOW() WHERE id = ANY($1::int[])`,
        [numericIds]
      );
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}