import type { Pool } from "pg";

export type InstitutionTenant = {
  institution_id: number;
  institution_name: string;
  institution_slug: string | null;
  domain: string | null;
  is_primary: boolean;
  config: Record<string, unknown>;
};

type Queryable = Pick<Pool, "query">;

let schemaReady: Promise<void> | null = null;

export async function ensureInstitutionDomainSchema(db: Queryable) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS institution_domains (
          id SERIAL PRIMARY KEY,
          institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
          domain VARCHAR(255) NOT NULL,
          is_primary BOOLEAN NOT NULL DEFAULT FALSE,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          config JSONB NOT NULL DEFAULT '{}'::jsonb,
          verified_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (domain)
        )
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_institution_domains_institution
        ON institution_domains (institution_id, is_active)
      `);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  await schemaReady;
}

export function normalizeTenantHost(host: string | null | undefined) {
  const rawHost = String(host ?? "").trim().toLowerCase();
  if (!rawHost) return "";
  const withoutProtocol = rawHost.replace(/^https?:\/\//, "");
  const hostname = withoutProtocol.split("/")[0]?.split(":")[0] ?? "";
  return hostname.replace(/^www\./, "");
}

function getConfiguredDomainSuffixes() {
  return String(
    process.env.INSTITUTION_DOMAIN_SUFFIXES ??
      process.env.NEXT_PUBLIC_INSTITUTION_DOMAIN_SUFFIXES ??
      "",
  )
    .split(",")
    .map(normalizeTenantHost)
    .filter(Boolean);
}

function getPlatformHosts() {
  return String(
    process.env.PLATFORM_HOSTS ??
      process.env.NEXT_PUBLIC_PLATFORM_HOSTS ??
      "",
  )
    .split(",")
    .map(normalizeTenantHost)
    .filter(Boolean);
}

export function getConfiguredInstitutionId() {
  const rawId = String(
    process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID ??
      process.env.DEFAULT_INSTITUTION_ID ??
      process.env.INSTITUTION_ID ??
      process.env.NEXT_PUBLIC_INSTITUTION_ID ??
      process.env.TENANT_INSTITUTION_ID ??
      process.env.NEXT_PUBLIC_TENANT_INSTITUTION_ID ??
      process.env.INSTITUTION_PROFILE_ID ??
      process.env.NEXT_PUBLIC_INSTITUTION_PROFILE_ID ??
      ""
  )
    .trim()
    .replace(/^['"]|['"]$/g, "");
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function hasConfiguredInstitutionId() {
  return Boolean(getConfiguredInstitutionId());
}

export function isPlatformHost(host: string | null | undefined) {
  const hostname = normalizeTenantHost(host);
  return Boolean(hostname && getPlatformHosts().includes(hostname));
}

export function getTenantSlugFromHost(host: string | null | undefined) {
  const hostname = normalizeTenantHost(host);
  if (!hostname || isPlatformHost(hostname)) return null;

  for (const suffix of getConfiguredDomainSuffixes()) {
    if (hostname === suffix || !hostname.endsWith(`.${suffix}`)) continue;
    const subdomain = hostname.slice(0, -suffix.length - 1).split(".")[0];
    return subdomain || null;
  }

  return null;
}

export async function getInstitutionTenantByHost(db: Queryable, host: string | null | undefined) {
  await ensureInstitutionDomainSchema(db);
  const configuredInstitutionId = getConfiguredInstitutionId();
  if (configuredInstitutionId) {
    const institutionResult = await db.query<InstitutionTenant>(`
      SELECT
        ip.id AS institution_id,
        ip.name AS institution_name,
        ip.slug AS institution_slug,
        NULL::text AS domain,
        TRUE AS is_primary,
        '{}'::jsonb AS config
      FROM institution_profiles ip
      WHERE ip.id = $1
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      LIMIT 1
    `, [configuredInstitutionId]);

    return institutionResult.rows[0] ?? null;
  }

  const hostname = normalizeTenantHost(host);
  if (!hostname || isPlatformHost(hostname)) return null;

  const domainResult = await db.query<InstitutionTenant>(`
    SELECT
      ip.id AS institution_id,
      ip.name AS institution_name,
      ip.slug AS institution_slug,
      domain.domain,
      domain.is_primary,
      domain.config
    FROM institution_domains domain
    INNER JOIN institution_profiles ip
      ON ip.id = domain.institution_id
      AND COALESCE(ip.is_deleted, FALSE) = FALSE
    WHERE domain.domain = $1
      AND domain.is_active = TRUE
    LIMIT 1
  `, [hostname]);

  if (domainResult.rows[0]) return domainResult.rows[0];

  const slug = getTenantSlugFromHost(hostname);
  if (!slug) return null;

  const slugResult = await db.query<InstitutionTenant>(`
    SELECT
      ip.id AS institution_id,
      ip.name AS institution_name,
      ip.slug AS institution_slug,
      NULL::text AS domain,
      TRUE AS is_primary,
      '{}'::jsonb AS config
    FROM institution_profiles ip
    WHERE (
        ip.slug = $1
        OR trim(both '-' from regexp_replace(lower(trim(ip.name)), '[^a-z0-9]+', '-', 'g')) = $1
      )
      AND COALESCE(ip.is_deleted, FALSE) = FALSE
    LIMIT 1
  `, [slug]);

  return slugResult.rows[0] ?? null;
}

export function getRequestHost(req: Request) {
  return (
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    ""
  );
}
