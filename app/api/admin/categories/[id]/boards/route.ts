// app/api/admin/categories/[id]/boards/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  getBoardsForCategory,
  mapBoardToCategory,
  unmapBoardFromCategory,
} from "@/lib/queries/boards";

// GET /api/admin/categories/[id]/boards — boards mapped to this category
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const boards = await getBoardsForCategory(db, Number(id));
    return NextResponse.json({ data: boards });
  } catch (err: any) {
    const status =
      err.message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: err.message }, { status });
  }
}

// POST /api/admin/categories/[id]/boards — map a board to this category
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);

    const { id } = await params;
    const categoryId = Number(id);

    const { boardIds } = await req.json();

    if (!Array.isArray(boardIds)) {
      return NextResponse.json(
        { error: "boardIds is required" },
        { status: 400 }
      );
    }

    const selectedBoardIds = [
      ...new Set(
        boardIds
          .map((v: any) => Number(v))
          .filter((v: number) => Number.isInteger(v))
      ),
    ];

    // current mapped boards
    const currentBoards = await getBoardsForCategory(
      db,
      categoryId
    );

    const currentBoardIds = currentBoards.map(
      (b: any) => Number(b.id)
    );

    // boards to add
    const toAdd = selectedBoardIds.filter(
      (id: number) => !currentBoardIds.includes(id)
    );

    // boards to remove
    const toRemove = currentBoardIds.filter(
      (id: number) => !selectedBoardIds.includes(id)
    );

    // add new mappings
    for (const boardId of toAdd) {
      await mapBoardToCategory(
        db,
        categoryId,
        boardId
      );
    }

    // remove unchecked mappings
    for (const boardId of toRemove) {
      await unmapBoardFromCategory(
        db,
        categoryId,
        boardId
      );
    }

    return NextResponse.json({
      success: true,
      category_id: categoryId,
      board_ids: selectedBoardIds,
    });
  } catch (err: any) {
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

// DELETE /api/admin/categories/[id]/boards — unmap a board from this category
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const { boardIds } = await req.json();

    if (!boardIds) {
      return NextResponse.json({ error: "boardId is required" }, { status: 400 });
    }

    for (const boardId of boardIds) {
      await unmapBoardFromCategory(
        db,
        Number(id),
        Number(boardId)
      );
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status =
      err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
