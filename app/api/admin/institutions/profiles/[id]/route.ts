import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
    getInstitutionProfileById,
    updateInstitutionProfile,
    softDeleteInstitutionProfile,
    toggleInstitutionProfileActive,
} from "@/lib/queries/institutions";
import { institutionProfileUpdateSchema } from "@/lib/validations/institution-profile.schema";
import { assertRowsWithinInstitutionScope } from "@/lib/auth/institution-scope";
import {
    notifyInstitutionProfileUpdated,
    notifyInstitutionStatusChanged,
} from "@/lib/notifications/admin-events";
import {
    archiveInstitutionLifecycle,
    restoreInstitutionLifecycle,
    softDeleteInstitutionLifecycle,
    suspendInstitutionLifecycle,
} from "@/lib/queries/institution-lifecycle";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await requireAdmin(req);
        const { id } = await params;
        const body = await req.json();
        const pid = Number(id);
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_profiles", [pid], "id");
        const before = await getInstitutionProfileById(db, pid);

        if (body.restore === true || body.status === "active") {
            await restoreInstitutionLifecycle(db, [pid]);
        } else if (body.archive === true || body.status === "archived") {
            await archiveInstitutionLifecycle(db, [pid]);
        } else if (body.softDelete === true || body.status === "deleted") {
            await softDeleteInstitutionLifecycle(db, [pid]);
        } else if (typeof body.isActive === "boolean") {
            if (body.isActive) {
                await restoreInstitutionLifecycle(db, [pid]);
            } else {
                await suspendInstitutionLifecycle(db, [pid]);
            }
        }

        const lifecycleKeys = new Set(["isActive", "restore", "archive", "softDelete", "status"]);
        const profileUpdateBody = Object.fromEntries(
            Object.entries(body ?? {}).filter(([key]) => !lifecycleKeys.has(key))
        );
        if (Object.keys(profileUpdateBody).length) {
            const parsed = institutionProfileUpdateSchema.parse({ id: pid, ...profileUpdateBody });
            await updateInstitutionProfile(db, {
                ...parsed,
                updatedBy: currentUser.id,
            } as any);
        }

        const updated = await getInstitutionProfileById(db, pid);
        if (updated && typeof body.isActive === "boolean" && before?.is_active !== updated.is_active) {
            await notifyInstitutionStatusChanged(db, {
                actor: currentUser,
                institutionId: pid,
                isActive: updated.is_active,
            });
        }
        if (updated && Object.keys(profileUpdateBody).length) {
            await notifyInstitutionProfileUpdated(db, {
                actor: currentUser,
                institutionId: pid,
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
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_profiles", [pid], "id");
        await softDeleteInstitutionLifecycle(db, [pid]);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
