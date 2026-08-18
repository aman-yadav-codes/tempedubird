import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
    deleteInstitutionPlacement,
    getInstitutionPlacementById,
    updateInstitutionPlacement,
} from "@/lib/queries/institutions";
import { assertCanAccessInstitution, assertRowsWithinInstitutionScope } from "@/lib/auth/institution-scope";
import { notifyInstitutionModuleUpdated } from "@/lib/notifications/admin-events";

async function assertPlacementProgramBelongsToInstitution(programId: number | null | undefined, institutionId: number) {
    if (!programId) return;

    const result = await db.query<{ id: number }>(
        `SELECT id
           FROM institution_programs
          WHERE id = $1
            AND institution_id = $2
            AND COALESCE(is_deleted, FALSE) = FALSE
          LIMIT 1`,
        [programId, institutionId]
    );

    if (!result.rows.length) {
        throw new Error("Selected program does not belong to this institution");
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await requireAdmin(req);
        const { id } = await params;
        const pid = Number(id);
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_placements", [pid]);
        const item = await getInstitutionPlacementById(db, pid);
        if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ data: item });
    } catch (err: any) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await requireAdmin(req);
        const { id } = await params;
        const body = await req.json();
        const pid = Number(id);
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_placements", [pid]);
        const current = await getInstitutionPlacementById(db, pid);
        if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (body.institutionId !== undefined || body.institution_id !== undefined) {
            assertCanAccessInstitution(currentUser, Number(body.institutionId ?? body.institution_id));
        }
        const nextInstitutionId = Number(body.institutionId ?? body.institution_id ?? current.institution_id);
        const nextProgramId = body.programId !== undefined
            ? (body.programId == null ? null : Number(body.programId))
            : body.program_id !== undefined
                ? (body.program_id == null ? null : Number(body.program_id))
                : current.program_id ?? null;
        await assertPlacementProgramBelongsToInstitution(nextProgramId, nextInstitutionId);
        const updated = await updateInstitutionPlacement(db, { id: pid, ...body });
        if (updated) {
            await notifyInstitutionModuleUpdated(db, {
                actor: currentUser,
                institutionId: Number((updated as any).institution_id ?? (updated as any).institutionId),
                moduleName: "Placements",
                entityType: "placement",
                entityId: pid,
            });
        }
        return NextResponse.json({ data: updated });
    } catch (err: any) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await requireAdmin(req);
        const { id } = await params;
        const pid = Number(id);
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_placements", [pid]);
        const item = await getInstitutionPlacementById(db, pid);
        await deleteInstitutionPlacement(db, pid);
        if (item) {
            await notifyInstitutionModuleUpdated(db, {
                actor: currentUser,
                institutionId: Number((item as any).institution_id ?? (item as any).institutionId),
                moduleName: "Placements",
                entityType: "placement",
                entityId: pid,
            });
        }
        return NextResponse.json({ success: true });
    } catch (err: any) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
