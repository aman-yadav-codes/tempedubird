import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { deleteDesignation, toggleDesignationStatus, updateDesignation } from "@/lib/queries/designations";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid designation ID" }, { status: 400 });
    }

    await deleteDesignation(db, id);
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
      return NextResponse.json({ error: "Invalid designation ID" }, { status: 400 });
    }

    const body = await req.json();

    // Toggle status
    if (body.is_active !== undefined) {
      const designation = await toggleDesignationStatus(db, id, body.is_active);
      return NextResponse.json({ data: designation });
    }

    // Update name/slug
    if (body.name || body.slug) {
      const designation = await updateDesignation(db, id, { name: body.name, slug: body.slug });
      return NextResponse.json({ data: designation });
    }

    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json({ error: "A designation with that slug already exists" }, { status: 409 });
    }
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
