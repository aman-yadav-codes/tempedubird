import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  getUniversityById,
  updateUniversity,
  softDeleteUniversity,
  toggleUniversityActive,
} from "@/lib/queries/universities";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    await requireAdmin(_req);
    const { id } = await params;
    const numId = Number(id);

    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid university ID" }, { status: 400 });
    }

    const university = await getUniversityById(db, numId);
    if (!university) {
      return NextResponse.json({ error: "University not found" }, { status: 404 });
    }

    return NextResponse.json({ data: university });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const numId = Number(id);

    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid university ID" }, { status: 400 });
    }

    const body = await req.json();

    if (typeof body.isActive === "boolean") {
      const toggled = await toggleUniversityActive(db, numId, body.isActive);
      if (!toggled) {
        return NextResponse.json({ error: "University not found" }, { status: 404 });
      }
      return NextResponse.json({ data: toggled });
    }

    const updated = await updateUniversity(db, numId, body);
    if (!updated) {
      return NextResponse.json({ error: "University not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err.code === "23505" || err.message?.includes("already exists")) {
      return NextResponse.json(
        { error: err.message || "A university with this name already exists" },
        { status: 409 }
      );
    }
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const currentUser = await requireAdmin(req);
    const { id } = await params;
    const numId = Number(id);

    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid university ID" }, { status: 400 });
    }

    const deleted = await softDeleteUniversity(db, numId, currentUser.id);
    if (!deleted) {
      return NextResponse.json({ error: "University not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "University deleted successfully",
    });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
