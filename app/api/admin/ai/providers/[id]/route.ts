import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { aiProviderUpsertSchema } from "@/lib/validations/ai.schema";
import { deleteAiProvider, getAiProviderById, updateAiProvider } from "@/lib/queries/ai";
import { hasPermission, isPlatformAdminUser, type PermissionUser } from "@/lib/auth/permissions";

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Something went wrong";
}

function canReadProvider(user: PermissionUser, provider: Awaited<ReturnType<typeof getAiProviderById>>) {
    if (!provider) return false;
    if (isPlatformAdminUser(user) || hasPermission(user, "settings.ai.view")) return true;
    if (provider.provider_scope !== "institution" || !provider.institution_id) return false;
    return hasPermission(user, "institution.ai_settings.view", { institutionId: provider.institution_id });
}

function canManageProvider(user: PermissionUser, provider: Awaited<ReturnType<typeof getAiProviderById>>) {
    if (!provider) return false;
    if (isPlatformAdminUser(user) || hasPermission(user, "settings.ai.edit")) return true;
    if (provider.provider_scope !== "institution" || !provider.institution_id) return false;
    return hasPermission(user, "institution.ai_settings.manage", { institutionId: provider.institution_id });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthenticatedUser(req);
        const { id } = await params;
        const provider = await getAiProviderById(db, Number(id));
        if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canReadProvider(user, provider)) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }
        return NextResponse.json({ data: provider });
    } catch (err: unknown) {
        const message = getErrorMessage(err);
        const status = message === "Forbidden: Admin access required" ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const admin = await getAuthenticatedUser(req);
        const { id } = await params;
        const provider = await getAiProviderById(db, Number(id));
        if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canManageProvider(admin, provider)) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }
        const body = await req.json();
        const parsed = aiProviderUpsertSchema.partial().parse(body);
        const updated = await updateAiProvider(db, {
            id: Number(id),
            ...parsed,
            institution_id: provider.institution_id,
            provider_scope: provider.provider_scope,
            updatedBy: admin.id,
        });
        return NextResponse.json({ data: updated });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid input";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthenticatedUser(req);
        const { id } = await params;
        const provider = await getAiProviderById(db, Number(id));
        if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canManageProvider(user, provider)) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }
        await deleteAiProvider(db, Number(id));
        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const message = getErrorMessage(err);
        const status = message === "Forbidden: Admin access required" ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
