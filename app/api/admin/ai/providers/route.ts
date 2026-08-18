import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { aiProviderUpsertSchema } from "@/lib/validations/ai.schema";
import { createAiProvider, listAiProviders, listInstitutionAiProviders } from "@/lib/queries/ai";
import { hasPermission, isPlatformAdminUser, type PermissionUser } from "@/lib/auth/permissions";

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Something went wrong";
}

function getPermittedInstitutionIds(user: PermissionUser, permission: string) {
    return (user.memberships ?? [])
        .filter((item) =>
            hasPermission(user, permission, { institutionId: item.institution_id })
        )
        .map((item) => item.institution_id);
}

function parseInstitutionId(value: unknown) {
    const institutionId = Number(value);
    return Number.isInteger(institutionId) && institutionId > 0 ? institutionId : null;
}

function getRequestedInstitutionId(req: Request) {
    return parseInstitutionId(new URL(req.url).searchParams.get("institutionId"));
}

function getManageableInstitutionId(user: PermissionUser, permission: string, requestedInstitutionId?: number | null) {
    const permittedInstitutionIds = getPermittedInstitutionIds(user, permission);
    if (requestedInstitutionId) {
        return permittedInstitutionIds.includes(requestedInstitutionId) ? requestedInstitutionId : null;
    }

    return permittedInstitutionIds[0] ?? null;
}

function getProviderAccess(user: PermissionUser, method: "GET" | "POST", requestedInstitutionId?: number | null) {
    const hasPlatformAccess =
        isPlatformAdminUser(user) ||
        hasPermission(user, method === "GET" ? "settings.ai.view" : "settings.ai.create");

    if (hasPlatformAccess) {
        return requestedInstitutionId
            ? { scope: "institution" as const, institutionId: requestedInstitutionId }
            : { scope: "platform" as const, institutionId: null };
    }

    const permission = method === "GET" ? "institution.ai_settings.view" : "institution.ai_settings.manage";
    const institutionId = getManageableInstitutionId(user, permission, requestedInstitutionId);
    if (institutionId) return { scope: "institution" as const, institutionId };

    throw new Error("Forbidden: Admin access required");
}

function getBodyInstitutionId(body: unknown) {
    return body && typeof body === "object" && "institutionId" in body
        ? parseInstitutionId((body as { institutionId?: unknown }).institutionId)
        : null;
}

export async function GET(req: Request) {
    try {
        const user = await getAuthenticatedUser(req);
        const access = getProviderAccess(user, "GET", getRequestedInstitutionId(req));
        const data = access.scope === "platform"
            ? await listAiProviders(db)
            : await listInstitutionAiProviders(db, access.institutionId);
        return NextResponse.json({ data });
    } catch (err: unknown) {
        const message = getErrorMessage(err);
        const status = message === "Forbidden: Admin access required" ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function POST(req: Request) {
    try {
        const admin = await getAuthenticatedUser(req);
        const body = await req.json();
        const access = getProviderAccess(admin, "POST", getBodyInstitutionId(body));
        const parsed = aiProviderUpsertSchema.parse(body);
        const created = await createAiProvider(db, {
            ...parsed,
            institution_id: access.institutionId,
            provider_scope: access.scope,
            createdBy: admin.id,
        });
        return NextResponse.json({ data: created }, { status: 201 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid input";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
