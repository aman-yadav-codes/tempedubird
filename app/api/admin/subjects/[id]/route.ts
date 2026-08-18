import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  softDeleteSubject,
  toggleSubjectActive,
} from "@/lib/queries/subjects";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);

    const { id } = await params;
    const body = await req.json();

    if (typeof body.isActive === "boolean") {
      await toggleSubjectActive(db, Number(id), body.isActive);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    const status =
      message === "Forbidden: Admin access required" ? 403 : 400;

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

    await softDeleteSubject(db, Number(id), currentUser.id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    const status =
      message === "Forbidden: Admin access required" ? 403 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
