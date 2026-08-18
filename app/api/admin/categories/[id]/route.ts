// app/api/admin/categories/[id]/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { updateCategory } from "@/lib/queries/category";
import {
  getCategoryById,
  softDeleteCategory,
  toggleCategoryActive,
} from "@/lib/queries/category";

// GET /api/admin/categories/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const category = await getCategoryById(db, Number(id));
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ data: category });
  } catch (err: any) {
    const status =
      err.message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: err.message }, { status });
  }
}

// PATCH /api/admin/categories/[id] — toggle active or soft delete
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const numId = Number(id);

    if (typeof body.isActive === "boolean") {
      await toggleCategoryActive(db, numId, body.isActive);
    }
    if (body.softDelete === true) {
      await softDeleteCategory(db, numId);
    }

    const updated = await getCategoryById(db, numId);
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    const status =
      err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

// PUT /api/admin/categories/[id] — edit category
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);

    const { id } = await params;

    const body = await req.json();

    const updated = await updateCategory(db, {
      id: Number(id),
      name: body.name,
      slug: body.slug,
      parentId: body.parentId,
    });

    return NextResponse.json({
      data: updated,
    });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json(
        {
          error:
            "A category with this slug already exists under the selected parent",
        },
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

// DELETE /api/admin/categories/[id] — soft delete
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin(req);
    const { id } = await params;
    await softDeleteCategory(db, Number(id), currentUser.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status =
      err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
