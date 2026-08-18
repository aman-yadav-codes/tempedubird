import { Pool } from "pg";
import { AiProvider } from "@/lib/types/ai";
import { getBuiltInAiGenerationConfig } from "@/lib/ai/content-config";

let aiProviderScopeSchemaReady: Promise<void> | null = null;

async function ensureAiProviderScopeSchema(db: Pool) {
    if (!aiProviderScopeSchemaReady) {
        aiProviderScopeSchemaReady = db.query(`
            ALTER TABLE ai_providers
            ADD COLUMN IF NOT EXISTS institution_id INTEGER NULL;

            ALTER TABLE ai_providers
            ADD COLUMN IF NOT EXISTS provider_scope VARCHAR(20) NOT NULL DEFAULT 'platform';

            ALTER TABLE ai_providers
            DROP CONSTRAINT IF EXISTS ai_providers_slug_key;

            UPDATE ai_providers
            SET provider_scope = 'institution'
            WHERE institution_id IS NOT NULL
              AND provider_scope <> 'institution';

            UPDATE ai_providers
            SET provider_scope = 'platform'
            WHERE institution_id IS NULL
              AND provider_scope <> 'platform';

            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_ai_provider_institution'
              ) THEN
                ALTER TABLE ai_providers
                ADD CONSTRAINT fk_ai_provider_institution
                FOREIGN KEY (institution_id)
                REFERENCES institution_profiles(id)
                ON DELETE CASCADE;
              END IF;

              IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'chk_ai_provider_scope'
              ) THEN
                ALTER TABLE ai_providers
                ADD CONSTRAINT chk_ai_provider_scope
                CHECK (provider_scope IN ('platform','institution'));
              END IF;
            END $$;

            CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_providers_platform_slug
            ON ai_providers (slug)
            WHERE provider_scope = 'platform' AND institution_id IS NULL;

            CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_providers_institution_slug
            ON ai_providers (institution_id, slug)
            WHERE provider_scope = 'institution' AND institution_id IS NOT NULL;
        `).then(() => undefined).catch((error) => {
            aiProviderScopeSchemaReady = null;
            throw error;
        });
    }

    return aiProviderScopeSchemaReady;
}

const AI_PROVIDER_COLUMNS =
    "id, name, slug, base_url, institution_id, provider_scope, model_name, chat_id, last_response_id, token, token_expires_at, is_active, created_by, updated_by, created_at, updated_at";

type AiProviderScope = "platform" | "institution";

type AiProviderInput = {
    id?: number;
    name?: string;
    slug?: string;
    base_url?: string;
    institution_id?: number | null;
    provider_scope?: AiProviderScope;
    model_name?: string | null;
    chat_id?: string | null;
    last_response_id?: string | null;
    token?: string | null;
    token_expires_at?: string | null;
    is_active?: boolean;
    createdBy?: number | null;
    updated_by?: number | null;
    updatedBy?: number | null;
};

export async function listAiProviders(db: Pool) {
    await ensureAiProviderScopeSchema(db);
    const res = await db.query(
        `SELECT ${AI_PROVIDER_COLUMNS}
         FROM ai_providers
         WHERE TRUE
         ORDER BY provider_scope ASC, institution_id ASC NULLS FIRST, created_at DESC`
    );
    return res.rows as AiProvider[];
}

export async function listPlatformAiProviders(db: Pool) {
    await ensureAiProviderScopeSchema(db);
    const res = await db.query(
        `SELECT ${AI_PROVIDER_COLUMNS}
         FROM ai_providers
         WHERE provider_scope = 'platform'
           AND institution_id IS NULL
         ORDER BY created_at DESC`
    );
    return res.rows as AiProvider[];
}

export async function listInstitutionAiProviders(db: Pool, institutionId: number) {
    await ensureAiProviderScopeSchema(db);
    const res = await db.query(
        `SELECT ${AI_PROVIDER_COLUMNS}
         FROM ai_providers
         WHERE provider_scope = 'institution'
           AND institution_id = $1
         ORDER BY created_at DESC`,
        [institutionId]
    );
    return res.rows as AiProvider[];
}

export async function getAiProviderById(db: Pool, id: number) {
    await ensureAiProviderScopeSchema(db);
    const res = await db.query(
        `SELECT ${AI_PROVIDER_COLUMNS}
         FROM ai_providers
         WHERE id = $1`,
        [id]
    );
    return res.rows[0] || null;
}

export async function getActiveAiProvider(db: Pool) {
    await ensureAiProviderScopeSchema(db);
    const res = await db.query(
        `SELECT ${AI_PROVIDER_COLUMNS}
         FROM ai_providers
         WHERE is_active = TRUE
           AND provider_scope = 'platform'
           AND institution_id IS NULL
         ORDER BY updated_at DESC NULLS LAST, created_at DESC
         LIMIT 1`
    );
    return (res.rows[0] || null) as AiProvider | null;
}

export async function getActiveAiProviderForInstitution(db: Pool, institutionId?: number | null, allowPlatformFallback = true) {
    await ensureAiProviderScopeSchema(db);

    if (institutionId) {
        const institutionRes = await db.query(
            `SELECT ${AI_PROVIDER_COLUMNS}
             FROM ai_providers
             WHERE institution_id = $1
               AND provider_scope = 'institution'
               AND is_active = TRUE
             ORDER BY updated_at DESC NULLS LAST, created_at DESC
             LIMIT 1`,
            [institutionId]
        );
        if (institutionRes.rows[0]) return institutionRes.rows[0] as AiProvider;
    }

    if (!allowPlatformFallback) return null;

    return getActiveAiProvider(db);
}

export async function createAiProvider(db: Pool, input: Required<Pick<AiProviderInput, "name" | "slug" | "base_url">> & AiProviderInput) {
    await ensureAiProviderScopeSchema(db);
    const providerScope = input.provider_scope ?? (input.institution_id ? "institution" : "platform");
    const institutionId = input.institution_id ?? null;
    const existing = await db.query<{ id: number }>(
        `SELECT id
         FROM ai_providers
         WHERE slug = $1
           AND provider_scope = $2
           AND (
             ($2 = 'platform' AND institution_id IS NULL)
             OR ($2 = 'institution' AND institution_id = $3)
           )
         ORDER BY updated_at DESC NULLS LAST, created_at DESC
         LIMIT 1`,
        [input.slug, providerScope, institutionId]
    );
    if (existing.rows[0]) {
        return updateAiProvider(db, {
            id: existing.rows[0].id,
            name: input.name,
            slug: input.slug,
            base_url: input.base_url,
            institution_id: institutionId,
            provider_scope: providerScope,
            model_name: input.model_name ?? null,
            chat_id: input.chat_id ?? null,
            last_response_id: input.last_response_id ?? null,
            token: input.token ?? null,
            token_expires_at: input.token_expires_at ?? null,
            is_active: input.is_active ?? true,
            updatedBy: input.updatedBy ?? input.createdBy ?? null,
        });
    }
    const res = await db.query(
        `INSERT INTO ai_providers (name, slug, base_url, institution_id, provider_scope, model_name, chat_id, last_response_id, token, token_expires_at, is_active, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
         RETURNING ${AI_PROVIDER_COLUMNS}`,
        [
            input.name,
            input.slug,
            input.base_url,
            institutionId,
            providerScope,
            input.model_name ?? null,
            input.chat_id ?? null,
            input.last_response_id ?? null,
            input.token ?? null,
            input.token_expires_at ?? null,
            input.is_active ?? true,
            input.createdBy ?? null,
        ]
    );
    return res.rows[0] as AiProvider;
}

export async function updateAiProvider(db: Pool, input: Required<Pick<AiProviderInput, "id">> & AiProviderInput) {
    await ensureAiProviderScopeSchema(db);
    const fields: string[] = [];
    const params: unknown[] = [];

    if (input.name !== undefined) { params.push(input.name); fields.push(`name = $${params.length}`); }
    if (input.slug !== undefined) { params.push(input.slug); fields.push(`slug = $${params.length}`); }
    if (input.base_url !== undefined) { params.push(input.base_url); fields.push(`base_url = $${params.length}`); }
    if (input.institution_id !== undefined) { params.push(input.institution_id); fields.push(`institution_id = $${params.length}`); }
    if (input.provider_scope !== undefined) { params.push(input.provider_scope); fields.push(`provider_scope = $${params.length}`); }
    if (input.model_name !== undefined) { params.push(input.model_name); fields.push(`model_name = $${params.length}`); }
    if (input.chat_id !== undefined) { params.push(input.chat_id); fields.push(`chat_id = $${params.length}`); }
    if (input.last_response_id !== undefined) { params.push(input.last_response_id); fields.push(`last_response_id = $${params.length}`); }
    if (input.token !== undefined) { params.push(input.token); fields.push(`token = $${params.length}`); }
    if (input.token_expires_at !== undefined) { params.push(input.token_expires_at); fields.push(`token_expires_at = $${params.length}`); }
    if (input.is_active !== undefined) { params.push(input.is_active); fields.push(`is_active = $${params.length}`); }
    if (input.updated_by !== undefined) { params.push(input.updated_by); fields.push(`updated_by = $${params.length}`); }
    if (input.updatedBy !== undefined) { params.push(input.updatedBy); fields.push(`updated_by = $${params.length}`); }

    if (!fields.length) return getAiProviderById(db, input.id);

    params.push(input.id);
    const res = await db.query(
        `UPDATE ai_providers SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${params.length} RETURNING ${AI_PROVIDER_COLUMNS}`,
        params
    );
    return res.rows[0] as AiProvider;
}

export async function deleteAiProvider(db: Pool, id: number) {
    await ensureAiProviderScopeSchema(db);
    await db.query(`DELETE FROM ai_providers WHERE id = $1`, [id]);
}

export async function getAiGenerationConfig(db: Pool, contentTypeSlug: string, institutionId?: number | null, allowPlatformFallback = true) {
    const provider = await getActiveAiProviderForInstitution(db, institutionId, allowPlatformFallback);
    if (!provider) return null;

    const config = getBuiltInAiGenerationConfig(contentTypeSlug, provider.id);
    if (!config) return null;

    return { provider, contentType: config.contentType, fields: config.fields };
}
