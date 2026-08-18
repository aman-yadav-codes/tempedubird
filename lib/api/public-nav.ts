import { db } from "@/lib/db/db";
import {
  ensureInstitutionDomainSchema,
  normalizeTenantHost,
  type InstitutionTenant,
} from "@/lib/tenancy/institution-domain";

export type PublicInstitutionNavItem = {
  id: number;
  name: string;
  href: string;
  isCurrent: boolean;
};

export type PublicNavbarBrand = {
  name: string;
  logoUrl: string | null;
  isInstitution: boolean;
};

type InstitutionNavRow = {
  id: number;
  name: string | null;
  slug: string | null;
  website: string | null;
  domain: string | null;
  is_current: boolean;
};

function configuredDomainSuffix() {
  return String(
    process.env.INSTITUTION_DOMAIN_SUFFIXES ??
      process.env.NEXT_PUBLIC_INSTITUTION_DOMAIN_SUFFIXES ??
      "",
  )
    .split(",")
    .map(normalizeTenantHost)
    .find(Boolean);
}

function publicInstitutionHref(row: InstitutionNavRow, currentHost: string) {
  const currentHostname = normalizeTenantHost(currentHost);
  const website = row.website?.trim();
  if (website) {
    const href = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    const websiteHost = normalizeTenantHost(href);
    return websiteHost && websiteHost === currentHostname ? "/" : href;
  }

  const domain = normalizeTenantHost(row.domain);

  if (domain) {
    return domain === currentHostname ? "/" : `https://${domain}`;
  }

  const slug = row.slug?.trim();
  const suffix = configuredDomainSuffix();
  if (slug && suffix) {
    const host = `${slug}.${suffix}`;
    return host === currentHostname ? "/" : `https://${host}`;
  }

  return `/institutes/${row.id}`;
}

export async function getPublicInstitutionNavItems(
  tenant: InstitutionTenant | null,
  currentHost: string,
): Promise<PublicInstitutionNavItem[]> {
  if (!tenant?.institution_id) return [];

  await ensureInstitutionDomainSchema(db);

  const result = await db.query<InstitutionNavRow>(
    `
      WITH tenant_admins AS (
        SELECT DISTINCT membership.user_id
        FROM institution_memberships membership
        INNER JOIN roles role
          ON role.id = membership.role_id
         AND role.code = 'institution_admin'
        INNER JOIN users admin_user
          ON admin_user.id = membership.user_id
         AND admin_user.is_active = TRUE
         AND COALESCE(admin_user.is_deleted, FALSE) = FALSE
        WHERE membership.institution_id = $1
          AND membership.is_active = TRUE
          AND COALESCE(membership.is_deleted, FALSE) = FALSE
      )
      SELECT
        institution.id,
        COALESCE(institution.name, institution.slug, 'Institution ' || institution.id::text) AS name,
        institution.slug,
        institution.website,
        primary_domain.domain,
        institution.id = $1 AS is_current
      FROM institution_profiles institution
      INNER JOIN institution_memberships membership
        ON membership.institution_id = institution.id
       AND membership.is_active = TRUE
       AND COALESCE(membership.is_deleted, FALSE) = FALSE
      INNER JOIN roles role
        ON role.id = membership.role_id
       AND role.code = 'institution_admin'
      INNER JOIN tenant_admins tenant_admin
        ON tenant_admin.user_id = membership.user_id
      LEFT JOIN LATERAL (
        SELECT domain.domain
        FROM institution_domains domain
        WHERE domain.institution_id = institution.id
          AND domain.is_active = TRUE
        ORDER BY domain.is_primary DESC, domain.id ASC
        LIMIT 1
      ) primary_domain ON TRUE
      WHERE institution.is_active = TRUE
        AND COALESCE(institution.is_deleted, FALSE) = FALSE
      GROUP BY institution.id, primary_domain.domain
      ORDER BY (institution.id = $1) DESC, COALESCE(institution.name, institution.slug), institution.id
    `,
    [tenant.institution_id],
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name ?? `Institution ${row.id}`,
    href: publicInstitutionHref(row, currentHost),
    isCurrent: row.is_current,
  }));
}

export async function getPublicNavbarBrand(
  tenant: InstitutionTenant | null,
): Promise<PublicNavbarBrand> {
  if (!tenant?.institution_id) {
    return {
      name: "EduBird",
      logoUrl: "/icons/edubird.webp",
      isInstitution: false,
    };
  }

  const result = await db.query<{ name: string | null; logo_url: string | null }>(
    `
      SELECT
        COALESCE(institution.name, institution.slug, 'Institution ' || institution.id::text) AS name,
        (
          SELECT media.url
          FROM institution_media media
          WHERE media.institution_id = institution.id
            AND COALESCE(media.is_deleted, FALSE) = FALSE
            AND media.url IS NOT NULL
            AND media.url <> ''
            AND (
              lower(COALESCE(media.media_type, '')) = 'logo'
              OR lower(COALESCE(media.title, '')) LIKE '%logo%'
            )
          ORDER BY media.sort_order ASC, media.id ASC
          LIMIT 1
        ) AS logo_url
      FROM institution_profiles institution
      WHERE institution.id = $1
        AND institution.is_active = TRUE
        AND COALESCE(institution.is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [tenant.institution_id],
  );

  const row = result.rows[0];

  return {
    name: row?.name ?? tenant.institution_name ?? "Institution",
    logoUrl: row?.logo_url ?? null,
    isInstitution: true,
  };
}
