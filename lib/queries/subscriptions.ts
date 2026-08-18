import type { Pool } from "pg";

import { ensureSalesSchema } from "@/lib/queries/sales";

type Queryable = Pick<Pool, "query">;

export type InstitutionSubscriptionRow = {
  id: number | null;
  institution_id: number;
  institution_name: string;
  institution_type_name: string | null;
  package_id: number | null;
  package_name: string | null;
  package_description: string | null;
  status: string | null;
  starts_at: string | null;
  expires_at: string | null;
  price: string | number | null;
  price_unit: string | null;
  storage_limit_gb: string | number | null;
  validity_count: number | null;
  validity_unit: string | null;
  is_valid: boolean;
  requested_by_name: string | null;
  approved_by_name: string | null;
  requested_at: string | null;
  approved_at: string | null;
  updated_at: string | null;
};

export type SubscriptionPlanRow = {
  id: number;
  name: string;
  package_for: string;
  package_for_types: string[];
  price: string | number;
  price_unit: string;
  storage_limit_gb: string | number | null;
  validity_count: number;
  validity_unit: string;
  description: string | null;
};

type SubscriptionUser = {
  memberships?: Array<{
    institution_id: number;
    role_code?: string | null;
  }>;
  role_codes?: string[];
  is_super_admin?: boolean;
};

function addValidity(startDate: Date, count: number, unit: string) {
  const next = new Date(startDate);
  if (unit === "year") {
    next.setFullYear(next.getFullYear() + count);
  } else {
    next.setMonth(next.getMonth() + count);
  }
  return next.toISOString().slice(0, 10);
}

export async function ensureSubscriptionSchema(db: Queryable) {
  await ensureSalesSchema(db);
  await db.query(`
    CREATE TABLE IF NOT EXISTS institution_subscriptions (
      id SERIAL PRIMARY KEY,
      institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      package_id INTEGER NOT NULL REFERENCES sales_packages(id) ON DELETE RESTRICT,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      starts_at DATE NOT NULL DEFAULT CURRENT_DATE,
      expires_at DATE NOT NULL,
      storage_limit_gb NUMERIC(12,2),
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      price_unit VARCHAR(20) NOT NULL DEFAULT 'month',
      validity_count INTEGER NOT NULL DEFAULT 1,
      validity_unit VARCHAR(20) NOT NULL DEFAULT 'month',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      requested_at TIMESTAMP,
      approved_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE institution_subscriptions
      ALTER COLUMN starts_at DROP NOT NULL,
      ALTER COLUMN expires_at DROP NOT NULL,
      ADD COLUMN IF NOT EXISTS requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_institution_subscriptions_institution ON institution_subscriptions(institution_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_institution_subscriptions_status_expiry ON institution_subscriptions(status, expires_at)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_institution_subscriptions_pending ON institution_subscriptions(status, requested_at) WHERE status = 'pending'`);
}

async function getInstitutionTarget(db: Queryable, institutionId: number) {
  const result = await db.query<{
    id: number;
    name: string;
    institution_type_name: string | null;
  }>(`
    SELECT ip.id, ip.name, it.name AS institution_type_name
    FROM institution_profiles ip
    LEFT JOIN institution_types it ON it.id = ip.institution_type_id
    WHERE ip.id = $1 AND COALESCE(ip.is_deleted, FALSE) = FALSE
    LIMIT 1
  `, [institutionId]);
  return result.rows[0] ?? null;
}

function subscriptionSelectSql() {
  return `
    SELECT
      sub.id,
      ip.id AS institution_id,
      ip.name AS institution_name,
      it.name AS institution_type_name,
      sub.package_id,
      sp.name AS package_name,
      sp.description AS package_description,
      sub.status,
      sub.starts_at,
      sub.expires_at,
      sub.price,
      sub.price_unit,
      sub.storage_limit_gb,
      sub.validity_count,
      sub.validity_unit,
      requester.full_name AS requested_by_name,
      approver.full_name AS approved_by_name,
      sub.requested_at,
      sub.approved_at,
      sub.updated_at,
      (sub.status = 'active' AND sub.expires_at IS NOT NULL AND sub.expires_at >= CURRENT_DATE) AS is_valid
    FROM institution_subscriptions sub
    JOIN institution_profiles ip ON ip.id = sub.institution_id
    LEFT JOIN institution_types it ON it.id = ip.institution_type_id
    JOIN sales_packages sp ON sp.id = sub.package_id
    LEFT JOIN users requester ON requester.id = sub.requested_by
    LEFT JOIN users approver ON approver.id = sub.approved_by
  `;
}

export async function getActiveInstitutionSubscription(db: Queryable, institutionId: number) {
  await ensureSubscriptionSchema(db);
  const result = await db.query<InstitutionSubscriptionRow>(`
    ${subscriptionSelectSql()}
    WHERE sub.institution_id = $1
      AND sub.status = 'active'
      AND sub.expires_at >= CURRENT_DATE
    ORDER BY sub.expires_at DESC, sub.id DESC
    LIMIT 1
  `, [institutionId]);
  return result.rows[0] ?? null;
}

export async function getInstitutionSubscriptionState(db: Queryable, institutionId: number) {
  await ensureSubscriptionSchema(db);
  const institution = await getInstitutionTarget(db, institutionId);
  if (!institution) return null;

  const latest = await db.query<InstitutionSubscriptionRow>(`
    ${subscriptionSelectSql()}
    WHERE sub.institution_id = $1
    ORDER BY
      CASE WHEN sub.status = 'pending' THEN 0 WHEN sub.status = 'active' THEN 1 ELSE 2 END,
      sub.expires_at DESC NULLS LAST,
      sub.requested_at DESC NULLS LAST,
      sub.id DESC
    LIMIT 1
  `, [institutionId]);

  return {
    institution,
    subscription: latest.rows[0] ?? null,
    is_valid: Boolean(latest.rows[0]?.is_valid),
  };
}

export async function listPlansForInstitution(db: Queryable, institutionId: number) {
  await ensureSubscriptionSchema(db);
  const institution = await getInstitutionTarget(db, institutionId);
  if (!institution) return { institution: null, plans: [] as SubscriptionPlanRow[] };

  const typeName = institution.institution_type_name ?? "";
  const result = await db.query<SubscriptionPlanRow>(`
    SELECT
      sp.id,
      sp.name,
      sp.package_for,
      sp.package_for_types,
      sp.price,
      sp.price_unit,
      sp.storage_limit_gb,
      sp.validity_count,
      sp.validity_unit,
      sp.description
    FROM sales_packages sp
    WHERE sp.is_deleted = FALSE
      AND sp.is_active = TRUE
      AND (
        $1 = ''
        OR sp.package_for_types ? $1
        OR LOWER(sp.package_for) = LOWER($1)
        OR LOWER(sp.package_for) LIKE LOWER($2)
      )
    ORDER BY sp.price ASC, sp.name ASC
  `, [typeName, `%${typeName}%`]);

  return { institution, plans: result.rows };
}

export async function activateInstitutionSubscription(
  db: Queryable,
  institutionId: number,
  packageId: number,
  userId: number
) {
  await ensureSubscriptionSchema(db);
  const { institution, plans } = await listPlansForInstitution(db, institutionId);
  if (!institution) throw new Error("Institution not found");

  const selectedPlan = plans.find((plan) => plan.id === packageId);
  if (!selectedPlan) throw new Error("Selected plan is not available for this institution type");

  const today = new Date();
  const startsAt = today.toISOString().slice(0, 10);
  const expiresAt = addValidity(today, selectedPlan.validity_count, selectedPlan.validity_unit);

  await db.query(`
    UPDATE institution_subscriptions
    SET status = 'replaced', updated_by = $2, updated_at = CURRENT_TIMESTAMP
    WHERE institution_id = $1 AND status = 'active'
  `, [institutionId, userId]);

  const inserted = await db.query<InstitutionSubscriptionRow>(`
    INSERT INTO institution_subscriptions (
      institution_id, package_id, status, starts_at, expires_at, storage_limit_gb,
      price, price_unit, validity_count, validity_unit, created_by, updated_by
    )
    VALUES ($1,$2,'active',$3,$4,$5,$6,$7,$8,$9,$10,$10)
    RETURNING *
  `, [
    institutionId,
    packageId,
    startsAt,
    expiresAt,
    selectedPlan.storage_limit_gb,
    selectedPlan.price,
    selectedPlan.price_unit,
    selectedPlan.validity_count,
    selectedPlan.validity_unit,
    userId,
  ]);

  return getActiveInstitutionSubscription(db, inserted.rows[0].institution_id);
}

export async function requestInstitutionSubscription(
  db: Queryable,
  institutionId: number,
  packageId: number,
  userId: number
) {
  await ensureSubscriptionSchema(db);
  const { institution, plans } = await listPlansForInstitution(db, institutionId);
  if (!institution) throw new Error("Institution not found");

  const selectedPlan = plans.find((plan) => plan.id === packageId);
  if (!selectedPlan) throw new Error("Selected plan is not available for this institution type");

  const existing = await db.query<InstitutionSubscriptionRow>(`
    ${subscriptionSelectSql()}
    WHERE sub.institution_id = $1
      AND sub.package_id = $2
      AND sub.status = 'pending'
    ORDER BY sub.requested_at DESC, sub.id DESC
    LIMIT 1
  `, [institutionId, packageId]);
  if (existing.rows[0]) return existing.rows[0];

  const inserted = await db.query<{ id: number }>(`
    INSERT INTO institution_subscriptions (
      institution_id, package_id, status, starts_at, expires_at, storage_limit_gb,
      price, price_unit, validity_count, validity_unit,
      requested_by, requested_at, created_by, updated_by
    )
    VALUES ($1,$2,'pending',NULL,NULL,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,$8,$8)
    RETURNING id
  `, [
    institutionId,
    packageId,
    selectedPlan.storage_limit_gb,
    selectedPlan.price,
    selectedPlan.price_unit,
    selectedPlan.validity_count,
    selectedPlan.validity_unit,
    userId,
  ]);

  const result = await db.query<InstitutionSubscriptionRow>(`
    ${subscriptionSelectSql()}
    WHERE sub.id = $1
    LIMIT 1
  `, [inserted.rows[0].id]);
  return result.rows[0] ?? null;
}

export async function approveInstitutionSubscription(
  db: Queryable,
  subscriptionId: number,
  userId: number
) {
  await ensureSubscriptionSchema(db);
  const pending = await db.query<InstitutionSubscriptionRow>(`
    ${subscriptionSelectSql()}
    WHERE sub.id = $1 AND sub.status = 'pending'
    LIMIT 1
  `, [subscriptionId]);
  const request = pending.rows[0];
  if (!request) throw new Error("Pending subscription request not found");
  if (!request.validity_count || !request.validity_unit) throw new Error("Subscription request is missing validity");

  const today = new Date();
  const startsAt = today.toISOString().slice(0, 10);
  const expiresAt = addValidity(today, request.validity_count, request.validity_unit);

  await db.query(`
    UPDATE institution_subscriptions
    SET status = 'replaced', updated_by = $2, updated_at = CURRENT_TIMESTAMP
    WHERE institution_id = $1 AND status = 'active'
  `, [request.institution_id, userId]);

  await db.query(`
    UPDATE institution_subscriptions
    SET status = 'active',
        starts_at = $2,
        expires_at = $3,
        approved_by = $4,
        approved_at = CURRENT_TIMESTAMP,
        updated_by = $4,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND status = 'pending'
  `, [subscriptionId, startsAt, expiresAt, userId]);

  return getActiveInstitutionSubscription(db, request.institution_id);
}

export async function revokeInstitutionSubscription(
  db: Queryable,
  subscriptionId: number,
  userId: number
) {
  await ensureSubscriptionSchema(db);
  const active = await db.query<InstitutionSubscriptionRow>(`
    ${subscriptionSelectSql()}
    WHERE sub.id = $1 AND sub.status = 'active'
    LIMIT 1
  `, [subscriptionId]);
  if (!active.rows[0]) throw new Error("Active subscription not found");

  await db.query(`
    UPDATE institution_subscriptions
    SET status = 'revoked',
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND status = 'active'
  `, [subscriptionId, userId]);

  const result = await db.query<InstitutionSubscriptionRow>(`
    ${subscriptionSelectSql()}
    WHERE sub.id = $1
    LIMIT 1
  `, [subscriptionId]);
  return result.rows[0] ?? null;
}

export async function listInstitutionSubscriptions(db: Queryable, opts: {
  search: string;
  limit: number;
  offset: number;
}) {
  await ensureSubscriptionSchema(db);
  const searchValue = `%${opts.search}%`;
  const data = await db.query<InstitutionSubscriptionRow>(`
    SELECT
      sub.id,
      ip.id AS institution_id,
      ip.name AS institution_name,
      it.name AS institution_type_name,
      sub.package_id,
      sp.name AS package_name,
      sp.description AS package_description,
      sub.status,
      sub.starts_at,
      sub.expires_at,
      sub.price,
      sub.price_unit,
      sub.storage_limit_gb,
      sub.validity_count,
      sub.validity_unit,
      requester.full_name AS requested_by_name,
      approver.full_name AS approved_by_name,
      sub.requested_at,
      sub.approved_at,
      sub.updated_at,
      COALESCE(sub.status = 'active' AND sub.expires_at IS NOT NULL AND sub.expires_at >= CURRENT_DATE, FALSE) AS is_valid
    FROM institution_profiles ip
    LEFT JOIN institution_types it ON it.id = ip.institution_type_id
    LEFT JOIN LATERAL (
      SELECT latest.*
      FROM institution_subscriptions latest
      WHERE latest.institution_id = ip.id
      ORDER BY
        CASE WHEN latest.status = 'pending' THEN 0 WHEN latest.status = 'active' THEN 1 ELSE 2 END,
        latest.expires_at DESC NULLS LAST,
        latest.requested_at DESC NULLS LAST,
        latest.id DESC
      LIMIT 1
    ) sub ON TRUE
    LEFT JOIN sales_packages sp ON sp.id = sub.package_id
    LEFT JOIN users requester ON requester.id = sub.requested_by
    LEFT JOIN users approver ON approver.id = sub.approved_by
    WHERE COALESCE(ip.is_deleted, FALSE) = FALSE
      AND ($3 = '' OR ip.name ILIKE $4 OR COALESCE(it.name, '') ILIKE $4 OR COALESCE(sp.name, '') ILIKE $4)
    ORDER BY ip.name ASC
    LIMIT $1 OFFSET $2
  `, [opts.limit, opts.offset, opts.search, searchValue]);

  const count = await db.query<{ count: string }>(`
    SELECT COUNT(*) AS count
    FROM institution_profiles ip
    LEFT JOIN institution_types it ON it.id = ip.institution_type_id
    LEFT JOIN LATERAL (
      SELECT latest.*
      FROM institution_subscriptions latest
      WHERE latest.institution_id = ip.id
      ORDER BY
        CASE WHEN latest.status = 'pending' THEN 0 WHEN latest.status = 'active' THEN 1 ELSE 2 END,
        latest.expires_at DESC NULLS LAST,
        latest.requested_at DESC NULLS LAST,
        latest.id DESC
      LIMIT 1
    ) sub ON TRUE
    LEFT JOIN sales_packages sp ON sp.id = sub.package_id
    WHERE COALESCE(ip.is_deleted, FALSE) = FALSE
      AND ($1 = '' OR ip.name ILIKE $2 OR COALESCE(it.name, '') ILIKE $2 OR COALESCE(sp.name, '') ILIKE $2)
  `, [opts.search, searchValue]);

  return { data: data.rows, total: Number(count.rows[0]?.count ?? 0) };
}

export async function getSubscriptionRedirectForUser(db: Queryable, user: SubscriptionUser) {
  if (user.is_super_admin || user.role_codes?.includes("platform_admin")) return null;
  if (!user.role_codes?.includes("institution_admin")) return null;

  const institutionId = user.memberships?.find((membership) =>
    membership.role_code === "institution_admin" &&
    Number.isInteger(Number(membership.institution_id)) &&
    Number(membership.institution_id) > 0
  )?.institution_id ?? null;

  if (!institutionId) return null;

  const activeSubscription = await getActiveInstitutionSubscription(db, institutionId);
  return activeSubscription
    ? null
    : `/admin/settings/subscription?required=1&institutionId=${institutionId}`;
}
