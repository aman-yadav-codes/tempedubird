import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { deleteInstitutionMedia } from "@/lib/queries/institutions";
import { assertRowsWithinInstitutionScope } from "@/lib/auth/institution-scope";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await requireAdmin(req);
        const { id } = await params;
        const mediaId = Number(id);
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_media", [mediaId]);
        await deleteInstitutionMedia(db, mediaId);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
