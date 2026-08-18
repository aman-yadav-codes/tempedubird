import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { aiGenerateRequestSchema, aiScholarshipResponseSchema } from "@/lib/validations/ai.schema";
import { getAiGenerationConfig, updateAiProvider } from "@/lib/queries/ai";
import { generateContentWithProvider } from "@/lib/ai/qwen";
import { hasPermission, isPlatformFullAccess } from "@/lib/auth/permissions";

function getGenerationPermission(contentTypeSlug: string) {
    if (contentTypeSlug === "scholarship") return "institution.scholarships.create";
    if (contentTypeSlug === "institution-cutoffs" || contentTypeSlug === "institute-cutoffs") return "institution.cutoffs.create";
    if (contentTypeSlug === "institution-facilities") return "institution.facilities.create";
    if (contentTypeSlug === "institution-details") return "institution.institutions.edit";
    return "institution.ai_settings.view";
}

export async function POST(req: Request) {
    try {
        const user = await getAuthenticatedUser(req);
        const body = await req.json();
        const parsed = aiGenerateRequestSchema.parse(body);
        let resolvedSlug = parsed.contentTypeSlug;
        const isPlatformUser = isPlatformFullAccess(user);
        const requestedInstitutionId = parsed.institutionId ??
            (user.memberships?.length === 1 ? user.memberships[0]?.institution_id : null);
        const generationInstitutionId = isPlatformUser ? null : requestedInstitutionId;
        if (parsed.institutionId) {
            const permission = getGenerationPermission(resolvedSlug);
            if (!hasPermission(user, permission, { institutionId: parsed.institutionId })) {
                return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
            }
        }

        let config = await getAiGenerationConfig(db, resolvedSlug, generationInstitutionId, isPlatformUser);

        // Backward-compatible alias for institution cutoff content type naming.
        if (!config && resolvedSlug === "institution-cutoffs") {
            resolvedSlug = "institute-cutoffs";
            config = await getAiGenerationConfig(db, resolvedSlug, generationInstitutionId, isPlatformUser);
        } else if (!config && resolvedSlug === "institute-cutoffs") {
            resolvedSlug = "institution-cutoffs";
            config = await getAiGenerationConfig(db, resolvedSlug, generationInstitutionId, isPlatformUser);
        }

        if (!config) {
            return NextResponse.json(
                {
                    error: "Add API key first",
                    code: "AI_PROVIDER_NOT_CONFIGURED",
                    redirectTo: "/admin/ai-settings",
                },
                { status: 428 }
            );
        }

        let institutionName = parsed.institutionName?.trim() || "";
        if (parsed.institutionId) {
            const institutionRes = await db.query(`SELECT id, name, slug FROM institution_profiles WHERE id = $1 LIMIT 1`, [parsed.institutionId]);
            const institution = institutionRes.rows[0];
            if (!institution) {
                return NextResponse.json({ error: "Institution not found" }, { status: 404 });
            }
            institutionName = institution.name || institution.slug;
        }

        if (!institutionName) {
            return NextResponse.json({ error: "Institution name is required" }, { status: 400 });
        }

        const result = await generateContentWithProvider({
            provider: config.provider,
            contentType: config.contentType,
            fields: config.fields,
            institutionName,
            context: parsed.inputContext,
            tweakMessage: parsed.tweakMessage,
        });

        const data = resolvedSlug === "scholarship"
            ? aiScholarshipResponseSchema.parse(result.data)
            : result.data;

        if (
            result.session?.chat_id !== config.provider.chat_id ||
            result.session?.last_response_id !== config.provider.last_response_id
        ) {
            await updateAiProvider(db, {
                id: config.provider.id,
                chat_id: result.session?.chat_id ?? null,
                last_response_id: result.session?.last_response_id ?? null,
            });
        }

        return NextResponse.json({
            data,
            content_type: resolvedSlug,
            provider: config.provider.slug,
            elapsed_ms: result.elapsed_ms,
            chat_id: result.session?.chat_id ?? null,
            last_response_id: result.session?.last_response_id ?? null,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid input";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
