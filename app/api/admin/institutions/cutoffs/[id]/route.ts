import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { deleteInstitutionCutoff, getInstitutionCutoffById, updateInstitutionCutoff } from "@/lib/queries/institutions";
import { institutionCutoffUpdateSchema } from "@/lib/validations";
import { assertCanAccessInstitution, assertRowsWithinInstitutionScope } from "@/lib/auth/institution-scope";
import { notifyInstitutionModuleUpdated } from "@/lib/notifications/admin-events";

async function assertCutoffRelationsBelongToInstitution(input: {
    institutionId: number;
    programId?: number | null;
    academicYearId?: number | null;
}) {
    if (input.programId) {
        const program = await db.query<{ id: number }>(
            `SELECT id
               FROM institution_programs
              WHERE id = $1
                AND institution_id = $2
                AND COALESCE(is_deleted, FALSE) = FALSE
              LIMIT 1`,
            [input.programId, input.institutionId]
        );
        if (!program.rows.length) throw new Error("Selected program does not belong to this institution");
    }

    if (input.academicYearId) {
        const session = await db.query<{ id: number }>(
            `SELECT id
               FROM academic_years
              WHERE id = $1
                AND institution_id = $2
                AND COALESCE(is_deleted, FALSE) = FALSE
              LIMIT 1`,
            [input.academicYearId, input.institutionId]
        );
        if (!session.rows.length) throw new Error("Selected session does not belong to this institution");
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await requireAdmin(req);
        const { id } = await params;
        const pid = Number(id);
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_cutoffs", [pid]);
        const item = await getInstitutionCutoffById(db, pid);
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
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_cutoffs", [pid]);
        const current = await getInstitutionCutoffById(db, pid);
        if (!current) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        if (body.institutionId !== undefined || body.institution_id !== undefined) {
            assertCanAccessInstitution(currentUser, Number(body.institutionId ?? body.institution_id));
        }

        const parsed = institutionCutoffUpdateSchema.parse({
            id: pid,
            ...body,
        });
        await assertCutoffRelationsBelongToInstitution({
            institutionId: parsed.institutionId ?? current.institution_id,
            programId: parsed.programId !== undefined ? parsed.programId : current.program_id ?? null,
            academicYearId: parsed.academicYearId !== undefined ? parsed.academicYearId : current.academic_year_id ?? null,
        });

        await updateInstitutionCutoff(db, parsed as any);
        const updated = await getInstitutionCutoffById(db, pid);
        if (updated) {
            await notifyInstitutionModuleUpdated(db, {
                actor: currentUser,
                institutionId: Number((updated as any).institution_id ?? (updated as any).institutionId),
                moduleName: "Institution Cutoffs",
                entityType: "cutoff",
                entityId: pid,
            });
        }

        return NextResponse.json({
            success: true,
        });
    } catch (err: any) {
        const message =
            err instanceof Error ? err.message : "Internal server error";

        const status =
            message === "Forbidden: Admin access required" ? 403 : 400;

        return NextResponse.json({
            success: false,
            error: message,
        }, { status });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await requireAdmin(req);
        const { id } = await params;
        const pid = Number(id);
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_cutoffs", [pid]);
        const item = await getInstitutionCutoffById(db, pid);
        await deleteInstitutionCutoff(db, pid);
        if (item) {
            await notifyInstitutionModuleUpdated(db, {
                actor: currentUser,
                institutionId: Number((item as any).institution_id ?? (item as any).institutionId),
                moduleName: "Institution Cutoffs",
                entityType: "cutoff",
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
