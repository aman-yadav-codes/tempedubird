import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureNotesSchema, inheritMarketplaceNote } from "@/lib/queries/notes";

type Context = { params: Promise<{ id: string }> };

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid note id");
  return id;
}

export async function POST(req: Request, context: Context) {
  try {
    const user = await requireAdmin(req);
    await ensureNotesSchema();
    const { id: rawId } = await context.params;
    const sourceNoteId = parseId(rawId);
    const body = await req.json().catch(() => ({}));
    const targetInstitutionId = Number(body.institution_id);

    if (!Number.isInteger(targetInstitutionId) || targetInstitutionId <= 0) {
      return NextResponse.json({ error: "Institution is required" }, { status: 422 });
    }

    const newNoteId = await inheritMarketplaceNote(db, user, sourceNoteId, targetInstitutionId);
    return NextResponse.json({ data: { id: newNoteId } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to inherit note";
    const status =
      message === "Forbidden: Admin access required" ? 403 :
      message === "Unauthorized" || message === "User not found" ? 401 :
      400;
    return NextResponse.json({ error: message }, { status });
  }
}
