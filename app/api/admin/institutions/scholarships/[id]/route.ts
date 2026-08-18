import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { aiScholarshipResponseSchema } from "@/lib/validations/ai.schema";
import {
    deleteInstitutionScholarship,
    getInstitutionScholarshipById,
    updateInstitutionScholarship,
} from "@/lib/queries/institutions";
import { assertCanAccessInstitution, assertRowsWithinInstitutionScope } from "@/lib/auth/institution-scope";
import { notifyInstitutionModuleUpdated } from "@/lib/notifications/admin-events";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await requireAdmin(req);
        const { id } = await params;
        const pid = Number(id);
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_scholarships", [pid]);
        const item = await getInstitutionScholarshipById(db, pid);
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
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_scholarships", [pid]);
        if (body.institutionId !== undefined || body.institution_id !== undefined) {
            assertCanAccessInstitution(currentUser, Number(body.institutionId ?? body.institution_id));
        }
        const updatePayload: any = { id: pid };

        if (body.aiResponse ?? body.ai_response) {
            updatePayload.aiResponse = aiScholarshipResponseSchema.parse(body.aiResponse ?? body.ai_response);
        }
        if (body.institutionId !== undefined) updatePayload.institutionId = Number(body.institutionId);
        if (typeof body.isAiGenerated === "boolean") updatePayload.isAiGenerated = body.isAiGenerated;
        if (typeof body.isActive === "boolean") updatePayload.isActive = body.isActive;
        if (typeof body.isDeleted === "boolean") updatePayload.isDeleted = body.isDeleted;

        const updated = await updateInstitutionScholarship(db, updatePayload);
        if (updated) {
            await notifyInstitutionModuleUpdated(db, {
                actor: currentUser,
                institutionId: Number((updated as any).institution_id ?? (updated as any).institutionId),
                moduleName: "Scholarships",
                entityType: "scholarship",
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
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_scholarships", [pid]);
        const item = await getInstitutionScholarshipById(db, pid);
        await deleteInstitutionScholarship(db, pid);
        if (item) {
            await notifyInstitutionModuleUpdated(db, {
                actor: currentUser,
                institutionId: Number((item as any).institution_id ?? (item as any).institutionId),
                moduleName: "Scholarships",
                entityType: "scholarship",
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
