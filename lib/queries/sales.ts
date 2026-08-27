import type { Pool } from "pg";

export type SalesContactInput = {
  contact_type: string;
  full_name: string;
  emails: string[];
  phones: Array<{ number: string; is_whatsapp: boolean }>;
  website: string | null;
  business_name: string | null;
  business_is_active: boolean;
  designation: string | null;
  address: string | null;
  lead_source: string;
  sales_stage: string;
  pipeline_stage: string;
  next_follow_up_date: string | null;
  assigned_to: number | null;
  assigned_package_id: number | null;
  remarks: string | null;
};

export type SalesPackageInput = {
  name: string;
  package_for: string;
  package_for_types: string[];
  price: number;
  price_unit: string;
  storage_limit_gb: number | null;
  validity_count: number;
  validity_unit: string;
  description: string | null;
  is_active: boolean;
};

export type SalesStageUpdateInput = Pick<SalesContactInput, "sales_stage" | "pipeline_stage" | "next_follow_up_date" | "assigned_to" | "assigned_package_id" | "remarks">;

type Queryable = Pick<Pool, "query">;

let schemaReady: Promise<void> | null = null;

const SALES_STATUS_VALUES = [
  "lead",
  "called",
  "call_later",
  "not_received_call",
  "not_interested",
  "meeting_demo",
  "need_proposal",
  "proposal_sent",
  "interested_to_pay",
  "send_invoice",
  "paid",
  "access_given",
  "client_approved",
];

export const CONTACT_TYPES = new Set(["individual", "student", "school", "coaching_institute", "university"]);
export const LEAD_SOURCES = new Set(["google", "website", "social_media", "lead", "mtm", "promotion"]);
export const SALES_STAGES = new Set(SALES_STATUS_VALUES);
export const PIPELINE_STAGES = new Set(SALES_STATUS_VALUES);
export const PRICE_UNITS = new Set(["month", "year", "once"]);
export const VALIDITY_UNITS = new Set(["month", "year"]);

const FOLLOW_UP_REQUIRED_STAGES = new Set([
  "called",
  "call_later",
  "meeting_demo",
  "need_proposal",
  "proposal_sent",
  "interested_to_pay",
  "send_invoice",
]);

const STATUS_PRIORITY_SQL = `
  CASE COALESCE(NULLIF(sc.sales_stage, ''), NULLIF(sc.pipeline_stage, ''), 'lead')
    WHEN 'lead' THEN 1
    WHEN 'called' THEN 2
    WHEN 'call_later' THEN 3
    WHEN 'not_received_call' THEN 4
    WHEN 'not_interested' THEN 5
    WHEN 'meeting_demo' THEN 6
    WHEN 'need_proposal' THEN 7
    WHEN 'proposal_sent' THEN 8
    WHEN 'interested_to_pay' THEN 9
    WHEN 'send_invoice' THEN 10
    WHEN 'paid' THEN 11
    WHEN 'access_given' THEN 12
    WHEN 'client_approved' THEN 13
    ELSE 99
  END
`;

export async function ensureSalesSchema(db: Queryable) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS sales_packages (
          id SERIAL PRIMARY KEY,
          name VARCHAR(160) NOT NULL,
          package_for VARCHAR(160) NOT NULL,
          package_for_types JSONB NOT NULL DEFAULT '[]'::jsonb,
          price NUMERIC(12,2) NOT NULL DEFAULT 0,
          price_unit VARCHAR(20) NOT NULL DEFAULT 'month',
          storage_limit_gb NUMERIC(12,2),
          validity_count INTEGER NOT NULL DEFAULT 1,
          validity_unit VARCHAR(20) NOT NULL DEFAULT 'month',
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
          deleted_at TIMESTAMP,
          deleted_by INTEGER REFERENCES users(id),
          created_by INTEGER REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS sales_contacts (
          id SERIAL PRIMARY KEY,
          contact_type VARCHAR(40) NOT NULL,
          full_name VARCHAR(180) NOT NULL,
          emails JSONB NOT NULL DEFAULT '[]'::jsonb,
          phones JSONB NOT NULL DEFAULT '[]'::jsonb,
          website VARCHAR(240),
          business_name VARCHAR(180),
          business_is_active BOOLEAN NOT NULL DEFAULT FALSE,
          designation VARCHAR(160),
          address TEXT,
          lead_source VARCHAR(40) NOT NULL,
          sales_stage VARCHAR(40) NOT NULL DEFAULT 'lead',
          pipeline_stage VARCHAR(40) NOT NULL DEFAULT 'meeting_demo',
          next_follow_up_date DATE,
          assigned_to INTEGER REFERENCES users(id),
          assigned_package_id INTEGER REFERENCES sales_packages(id),
          remarks TEXT,
          is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
          deleted_at TIMESTAMP,
          deleted_by INTEGER REFERENCES users(id),
          created_by INTEGER REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS sales_contact_changes (
          id BIGSERIAL PRIMARY KEY,
          contact_id INTEGER REFERENCES sales_contacts(id),
          action VARCHAR(40) NOT NULL,
          before_data JSONB,
          after_data JSONB,
          changed_by INTEGER REFERENCES users(id),
          changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_sales_contacts_search ON sales_contacts (is_deleted, sales_stage, lead_source, updated_at DESC)`);
      await db.query(`ALTER TABLE sales_contacts ADD COLUMN IF NOT EXISTS next_follow_up_date DATE`);
      await db.query(`
        ALTER TABLE sales_packages
          ADD COLUMN IF NOT EXISTS package_for_types JSONB NOT NULL DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS storage_limit_gb NUMERIC(12,2),
          ADD COLUMN IF NOT EXISTS validity_count INTEGER NOT NULL DEFAULT 1,
          ADD COLUMN IF NOT EXISTS validity_unit VARCHAR(20) NOT NULL DEFAULT 'month'
      `);
      await db.query(`
        UPDATE sales_packages
        SET package_for_types = jsonb_build_array(package_for)
        WHERE package_for_types = '[]'::jsonb
          AND COALESCE(NULLIF(package_for, ''), '') <> ''
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_sales_contacts_follow_up ON sales_contacts (is_deleted, next_follow_up_date) WHERE next_follow_up_date IS NOT NULL`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_sales_packages_active ON sales_packages (is_deleted, is_active, name)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_sales_packages_target_types ON sales_packages USING GIN (package_for_types)`);
      await db.query(`ALTER TABLE sales_contacts ALTER COLUMN pipeline_stage SET DEFAULT 'lead'`);
      // Multi-pricing: per-period price columns on a single package
      await db.query(`
        ALTER TABLE sales_packages
          ADD COLUMN IF NOT EXISTS price_monthly NUMERIC(12,2),
          ADD COLUMN IF NOT EXISTS price_yearly  NUMERIC(12,2),
          ADD COLUMN IF NOT EXISTS price_once    NUMERIC(12,2)
      `);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function normalizeText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeFollowUpDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("Select a valid next follow-up date");
  const timestamp = Date.parse(`${text}T00:00:00Z`);
  if (Number.isNaN(timestamp)) throw new Error("Select a valid next follow-up date");
  return text;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10;
}

export function parseContactInput(body: Record<string, unknown>): SalesContactInput {
  const contactType = String(body.contact_type ?? "").trim();
  const leadSource = String(body.lead_source ?? "").trim();
  const salesStage = String(body.sales_stage ?? body.pipeline_stage ?? "lead").trim();
  const pipelineStage = String(body.pipeline_stage ?? body.sales_stage ?? "lead").trim();
  const nextFollowUpDate = normalizeFollowUpDate(body.next_follow_up_date);
  const emails = Array.isArray(body.emails)
    ? Array.from(new Set(body.emails.map((item) => String(item).trim()).filter(Boolean)))
    : [];
  const phones = Array.isArray(body.phones)
    ? body.phones
        .map((item, index) => {
          const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
          return {
            number: String(record.number ?? "").replace(/\D/g, ""),
            is_whatsapp: Boolean(record.is_whatsapp) || index === 0,
          };
        })
        .filter((item) => item.number)
    : [];

  if (!CONTACT_TYPES.has(contactType)) throw new Error("Select a valid contact type");
  if (!normalizeText(body.full_name)) throw new Error("Full name is required");
  if (!emails.length) throw new Error("Add at least one email address");
  if (emails.some((email) => !isValidEmail(email))) throw new Error("Enter a valid email address");
  if (!phones.length) throw new Error("Add at least one phone number");
  if (phones.some((phone) => !isValidPhone(phone.number))) throw new Error("Enter a 10 digit phone number");
  if (!LEAD_SOURCES.has(leadSource)) throw new Error("Select a valid lead source");
  if (!SALES_STAGES.has(salesStage)) throw new Error("Select a valid status");
  if (!PIPELINE_STAGES.has(pipelineStage)) throw new Error("Select a valid status");
  if (FOLLOW_UP_REQUIRED_STAGES.has(salesStage) && !nextFollowUpDate) throw new Error("Select next follow-up date");
  if (!(Number.isInteger(Number(body.assigned_to)) && Number(body.assigned_to) > 0)) {
    throw new Error("Select an assigned platform admin");
  }

  return {
    contact_type: contactType,
    full_name: normalizeText(body.full_name) ?? "",
    emails,
    phones: phones.map((phone, index) => ({ ...phone, is_whatsapp: index === 0 ? Boolean(phone.is_whatsapp) : false })),
    website: normalizeText(body.website),
    business_name: normalizeText(body.business_name),
    business_is_active: Boolean(body.business_is_active),
    designation: normalizeText(body.designation),
    address: normalizeText(body.address),
    lead_source: leadSource,
    sales_stage: salesStage,
    pipeline_stage: salesStage,
    next_follow_up_date: FOLLOW_UP_REQUIRED_STAGES.has(salesStage) ? nextFollowUpDate : null,
    assigned_to: Number.isInteger(Number(body.assigned_to)) && Number(body.assigned_to) > 0 ? Number(body.assigned_to) : null,
    assigned_package_id: Number.isInteger(Number(body.assigned_package_id)) && Number(body.assigned_package_id) > 0 ? Number(body.assigned_package_id) : null,
    remarks: normalizeText(body.remarks),
  };
}

export function parsePackageInput(body: Record<string, unknown>): SalesPackageInput {
  const priceUnit = String(body.price_unit ?? "month").trim();
  const validityUnit = String(body.validity_unit ?? body.validityUnit ?? (priceUnit === "year" ? "year" : "month")).trim();
  const price = Number(body.price ?? 0);
  const storageValue = body.storage_limit_gb ?? body.storageLimitGb;
  const storageLimit =
    storageValue === null || storageValue === undefined || storageValue === ""
      ? null
      : Number(storageValue);
  const validityCount = Number(body.validity_count ?? body.validityCount ?? 1);
  const rawPackageTypes = Array.isArray(body.package_for_types)
    ? body.package_for_types
    : Array.isArray(body.packageForTypes)
      ? body.packageForTypes
      : [];
  const packageForTypes = Array.from(
    new Set(
      rawPackageTypes
        .map((value) => normalizeText(value))
        .filter((value): value is string => Boolean(value))
    )
  );
  const legacyPackageFor = normalizeText(body.package_for);
  const normalizedPackageTypes = packageForTypes.length
    ? packageForTypes
    : legacyPackageFor
      ? [legacyPackageFor]
      : [];

  if (!normalizeText(body.name)) throw new Error("Package name is required");
  if (normalizedPackageTypes.length === 0) throw new Error("Select at least one package institution type");
  if (!PRICE_UNITS.has(priceUnit)) throw new Error("Select a valid price unit");
  if (!VALIDITY_UNITS.has(validityUnit)) throw new Error("Select a valid validity unit");
  if (!Number.isFinite(price) || price <= 0) throw new Error("Enter a valid package price greater than 0");
  if (!Number.isInteger(validityCount) || validityCount <= 0) throw new Error("Enter a valid plan validity");
  if (storageLimit !== null && (!Number.isFinite(storageLimit) || storageLimit < 0)) throw new Error("Enter a valid storage limit");
  if (!normalizeText(body.description)) throw new Error("Package details are required");

  return {
    name: normalizeText(body.name) ?? "",
    package_for: normalizedPackageTypes.join(", "),
    package_for_types: normalizedPackageTypes,
    price,
    price_unit: priceUnit,
    storage_limit_gb: storageLimit,
    validity_count: validityCount,
    validity_unit: validityUnit,
    description: normalizeText(body.description),
    is_active: typeof body.is_active === "boolean" ? body.is_active : true,
  };
}

export function parseStageUpdateInput(body: Record<string, unknown>): SalesStageUpdateInput {
  const salesStage = String(body.sales_stage ?? body.pipeline_stage ?? "").trim();
  const nextFollowUpDate = normalizeFollowUpDate(body.next_follow_up_date);

  if (!SALES_STAGES.has(salesStage)) throw new Error("Select a valid status");
  if (FOLLOW_UP_REQUIRED_STAGES.has(salesStage) && !nextFollowUpDate) throw new Error("Select next follow-up date");
  if (!(Number.isInteger(Number(body.assigned_to)) && Number(body.assigned_to) > 0)) {
    throw new Error("Select an assigned platform admin");
  }

  return {
    sales_stage: salesStage,
    pipeline_stage: salesStage,
    next_follow_up_date: FOLLOW_UP_REQUIRED_STAGES.has(salesStage) ? nextFollowUpDate : null,
    assigned_to: Number(body.assigned_to),
    assigned_package_id: Number.isInteger(Number(body.assigned_package_id)) && Number(body.assigned_package_id) > 0 ? Number(body.assigned_package_id) : null,
    remarks: normalizeText(body.remarks),
  };
}

export async function listSalesContacts(db: Queryable, opts: {
  search: string;
  salesStage: string;
  limit: number;
  offset: number;
}) {
  await ensureSalesSchema(db);
  const searchValue = `%${opts.search}%`;
  const params: unknown[] = [opts.limit, opts.offset, opts.search, searchValue];
  const countParams: unknown[] = [opts.search, searchValue];
  const where = [
    "sc.is_deleted = FALSE",
    "($3 = '' OR sc.full_name ILIKE $4 OR COALESCE(sc.business_name, '') ILIKE $4 OR COALESCE(sc.website, '') ILIKE $4 OR sc.emails::text ILIKE $4 OR sc.phones::text ILIKE $4)",
  ];
  const countWhere = [
    "sc.is_deleted = FALSE",
    "($1 = '' OR sc.full_name ILIKE $2 OR COALESCE(sc.business_name, '') ILIKE $2 OR COALESCE(sc.website, '') ILIKE $2 OR sc.emails::text ILIKE $2 OR sc.phones::text ILIKE $2)",
  ];
  if (opts.salesStage) {
    params.push(opts.salesStage);
    where.push(`sc.sales_stage = $${params.length}`);
    countParams.push(opts.salesStage);
    countWhere.push(`sc.sales_stage = $${countParams.length}`);
  }
  const whereSql = where.join(" AND ");
  const countWhereSql = countWhere.join(" AND ");
  const data = await db.query(`
    SELECT sc.*, assignee.full_name AS assigned_to_name, assignee.email AS assigned_to_email,
           sp.name AS package_name, sp.price AS package_price, sp.price_unit AS package_price_unit,
           creator.full_name AS created_by_name, updater.full_name AS updated_by_name
    FROM sales_contacts sc
    LEFT JOIN users assignee ON assignee.id = sc.assigned_to
    LEFT JOIN sales_packages sp ON sp.id = sc.assigned_package_id
    LEFT JOIN users creator ON creator.id = sc.created_by
    LEFT JOIN users updater ON updater.id = sc.updated_by
    WHERE ${whereSql}
    ORDER BY ${STATUS_PRIORITY_SQL} ASC, sc.updated_at DESC
    LIMIT $1 OFFSET $2
  `, params);
  const count = await db.query<{ count: string }>(`SELECT COUNT(*) FROM sales_contacts sc WHERE ${countWhereSql}`, countParams);
  return { data: data.rows, total: Number(count.rows[0]?.count ?? 0) };
}

export async function listSalesPackages(db: Queryable, opts: { search: string; limit: number; offset: number }) {
  await ensureSalesSchema(db);
  const searchValue = `%${opts.search}%`;
  const data = await db.query(`
    SELECT sp.*, creator.full_name AS created_by_name, updater.full_name AS updated_by_name
    FROM sales_packages sp
    LEFT JOIN users creator ON creator.id = sp.created_by
    LEFT JOIN users updater ON updater.id = sp.updated_by
    WHERE sp.is_deleted = FALSE
      AND ($3 = '' OR sp.name ILIKE $4 OR sp.package_for ILIKE $4 OR sp.package_for_types::text ILIKE $4 OR COALESCE(sp.description, '') ILIKE $4)
    ORDER BY sp.name ASC
    LIMIT $1 OFFSET $2
  `, [opts.limit, opts.offset, opts.search, searchValue]);
  const count = await db.query<{ count: string }>(`
    SELECT COUNT(*) FROM sales_packages sp
    WHERE sp.is_deleted = FALSE
      AND ($1 = '' OR sp.name ILIKE $2 OR sp.package_for ILIKE $2 OR sp.package_for_types::text ILIKE $2 OR COALESCE(sp.description, '') ILIKE $2)
  `, [opts.search, searchValue]);
  return { data: data.rows, total: Number(count.rows[0]?.count ?? 0) };
}

export async function getSalesContactDetail(db: Queryable, id: number) {
  await ensureSalesSchema(db);
  const contact = await db.query(`
    SELECT sc.*, assignee.full_name AS assigned_to_name, assignee.email AS assigned_to_email,
           sp.name AS package_name, sp.price AS package_price, sp.price_unit AS package_price_unit,
           creator.full_name AS created_by_name, updater.full_name AS updated_by_name
    FROM sales_contacts sc
    LEFT JOIN users assignee ON assignee.id = sc.assigned_to
    LEFT JOIN sales_packages sp ON sp.id = sc.assigned_package_id
    LEFT JOIN users creator ON creator.id = sc.created_by
    LEFT JOIN users updater ON updater.id = sc.updated_by
    WHERE sc.id = $1 AND sc.is_deleted = FALSE
    LIMIT 1
  `, [id]);
  if (!contact.rowCount) return null;

  const history = await db.query(`
    SELECT scc.id, scc.action, scc.before_data, scc.after_data, scc.changed_by,
           scc.changed_at, changer.full_name AS changed_by_name, changer.email AS changed_by_email,
           before_assignee.full_name AS before_assigned_to_name,
           before_assignee.email AS before_assigned_to_email,
           after_assignee.full_name AS after_assigned_to_name,
           after_assignee.email AS after_assigned_to_email,
           before_package.name AS before_package_name,
           after_package.name AS after_package_name
    FROM sales_contact_changes scc
    LEFT JOIN users changer ON changer.id = scc.changed_by
    LEFT JOIN users before_assignee ON before_assignee.id = NULLIF(scc.before_data->>'assigned_to', '')::int
    LEFT JOIN users after_assignee ON after_assignee.id = NULLIF(scc.after_data->>'assigned_to', '')::int
    LEFT JOIN sales_packages before_package ON before_package.id = NULLIF(scc.before_data->>'assigned_package_id', '')::int
    LEFT JOIN sales_packages after_package ON after_package.id = NULLIF(scc.after_data->>'assigned_package_id', '')::int
    WHERE scc.contact_id = $1
    ORDER BY scc.changed_at ASC, scc.id ASC
  `, [id]);

  return { ...contact.rows[0], history: history.rows };
}

export async function createSalesContact(db: Queryable, input: SalesContactInput, userId: number) {
  await ensureSalesSchema(db);
  const result = await db.query(`
    INSERT INTO sales_contacts (
      contact_type, full_name, emails, phones, website, business_name, business_is_active,
      designation, address, lead_source, sales_stage, pipeline_stage, assigned_to,
      assigned_package_id, remarks, next_follow_up_date, created_by, updated_by
    )
    VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)
    RETURNING *
  `, [
    input.contact_type, input.full_name, JSON.stringify(input.emails), JSON.stringify(input.phones),
    input.website, input.business_name, input.business_is_active, input.designation, input.address,
    input.lead_source, input.sales_stage, input.pipeline_stage, input.assigned_to,
    input.assigned_package_id, input.remarks, input.next_follow_up_date, userId,
  ]);
  await db.query(`INSERT INTO sales_contact_changes (contact_id, action, after_data, changed_by) VALUES ($1, 'create', $2::jsonb, $3)`, [result.rows[0].id, JSON.stringify(result.rows[0]), userId]);
  return result.rows[0];
}

export async function updateSalesContact(db: Queryable, id: number, input: SalesContactInput, userId: number) {
  await ensureSalesSchema(db);
  const before = await db.query(`SELECT * FROM sales_contacts WHERE id = $1 AND is_deleted = FALSE`, [id]);
  if (!before.rowCount) return null;
  const result = await db.query(`
    UPDATE sales_contacts
    SET contact_type=$2, full_name=$3, emails=$4::jsonb, phones=$5::jsonb, website=$6,
        business_name=$7, business_is_active=$8, designation=$9, address=$10, lead_source=$11,
        sales_stage=$12, pipeline_stage=$13, assigned_to=$14, assigned_package_id=$15, remarks=$16,
        next_follow_up_date=$17, updated_by=$18, updated_at=CURRENT_TIMESTAMP
    WHERE id=$1 AND is_deleted = FALSE
    RETURNING *
  `, [
    id, input.contact_type, input.full_name, JSON.stringify(input.emails), JSON.stringify(input.phones),
    input.website, input.business_name, input.business_is_active, input.designation, input.address,
    input.lead_source, input.sales_stage, input.pipeline_stage, input.assigned_to,
    input.assigned_package_id, input.remarks, input.next_follow_up_date, userId,
  ]);
  await db.query(`INSERT INTO sales_contact_changes (contact_id, action, before_data, after_data, changed_by) VALUES ($1, 'update', $2::jsonb, $3::jsonb, $4)`, [id, JSON.stringify(before.rows[0]), JSON.stringify(result.rows[0]), userId]);
  return result.rows[0];
}

export async function updateSalesContactStage(db: Queryable, id: number, input: SalesStageUpdateInput, userId: number) {
  await ensureSalesSchema(db);
  const before = await db.query(`SELECT * FROM sales_contacts WHERE id = $1 AND is_deleted = FALSE`, [id]);
  if (!before.rowCount) return null;
  const result = await db.query(`
    UPDATE sales_contacts
    SET sales_stage = $2,
        pipeline_stage = $3,
        assigned_to = $4,
        assigned_package_id = $5,
        remarks = $6,
        next_follow_up_date = $7,
        updated_by = $8,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND is_deleted = FALSE
    RETURNING *
  `, [id, input.sales_stage, input.pipeline_stage, input.assigned_to, input.assigned_package_id, input.remarks, input.next_follow_up_date, userId]);
  await db.query(`INSERT INTO sales_contact_changes (contact_id, action, before_data, after_data, changed_by) VALUES ($1, 'stage_update', $2::jsonb, $3::jsonb, $4)`, [id, JSON.stringify(before.rows[0]), JSON.stringify(result.rows[0]), userId]);
  return result.rows[0];
}

export async function createSalesPackage(db: Queryable, input: SalesPackageInput, userId: number) {
  await ensureSalesSchema(db);
  const result = await db.query(`
    INSERT INTO sales_packages (
      name, package_for, package_for_types, price, price_unit, storage_limit_gb,
      validity_count, validity_unit, description, is_active, created_by, updated_by
    )
    VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10,$11,$11)
    RETURNING *
  `, [
    input.name,
    input.package_for,
    JSON.stringify(input.package_for_types),
    input.price,
    input.price_unit,
    input.storage_limit_gb,
    input.validity_count,
    input.validity_unit,
    input.description,
    input.is_active,
    userId,
  ]);
  return result.rows[0];
}

export async function updateSalesPackage(db: Queryable, id: number, input: Partial<SalesPackageInput>, userId: number) {
  await ensureSalesSchema(db);
  const result = await db.query(`
    UPDATE sales_packages
    SET name = COALESCE($2, name),
        package_for = COALESCE($3, package_for),
        package_for_types = COALESCE($4::jsonb, package_for_types),
        price = COALESCE($5, price),
        price_unit = COALESCE($6, price_unit),
        storage_limit_gb = $7,
        validity_count = COALESCE($8, validity_count),
        validity_unit = COALESCE($9, validity_unit),
        description = $10,
        is_active = COALESCE($11, is_active),
        updated_by = $12,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND is_deleted = FALSE
    RETURNING *
  `, [
    id,
    input.name ?? null,
    input.package_for ?? null,
    input.package_for_types ? JSON.stringify(input.package_for_types) : null,
    input.price ?? null,
    input.price_unit ?? null,
    input.storage_limit_gb ?? null,
    input.validity_count ?? null,
    input.validity_unit ?? null,
    input.description ?? null,
    input.is_active ?? null,
    userId,
  ]);
  return result.rows[0] ?? null;
}

export async function softDeleteSalesContacts(db: Queryable, ids: number[], userId: number) {
  await ensureSalesSchema(db);
  const before = await db.query(`SELECT * FROM sales_contacts WHERE id = ANY($1::int[]) AND is_deleted = FALSE`, [ids]);
  const result = await db.query(`
    UPDATE sales_contacts
    SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $2,
        updated_by = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = ANY($1::int[]) AND is_deleted = FALSE
    RETURNING id
  `, [ids, userId]);
  for (const row of before.rows) {
    await db.query(`INSERT INTO sales_contact_changes (contact_id, action, before_data, changed_by) VALUES ($1, 'delete', $2::jsonb, $3)`, [row.id, JSON.stringify(row), userId]);
  }
  return result.rowCount ?? 0;
}

export async function softDeleteSalesPackages(db: Queryable, ids: number[], userId: number) {
  await ensureSalesSchema(db);
  const result = await db.query(`
    UPDATE sales_packages
    SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $2,
        updated_by = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = ANY($1::int[]) AND is_deleted = FALSE
    RETURNING id
  `, [ids, userId]);
  return result.rowCount ?? 0;
}

export async function bulkUpdateSalesContacts(db: Queryable, ids: number[], patch: Partial<Pick<SalesContactInput, "sales_stage" | "pipeline_stage" | "assigned_to" | "assigned_package_id">>, userId: number) {
  await ensureSalesSchema(db);
  const before = await db.query(`SELECT * FROM sales_contacts WHERE id = ANY($1::int[]) AND is_deleted = FALSE`, [ids]);
  const result = await db.query(`
    UPDATE sales_contacts
    SET sales_stage = COALESCE($2, sales_stage),
        pipeline_stage = COALESCE($3, pipeline_stage),
        assigned_to = COALESCE($4, assigned_to),
        assigned_package_id = COALESCE($5, assigned_package_id),
        updated_by = $6,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ANY($1::int[]) AND is_deleted = FALSE
    RETURNING *
  `, [ids, patch.sales_stage ?? null, patch.pipeline_stage ?? null, patch.assigned_to ?? null, patch.assigned_package_id ?? null, userId]);
  const beforeById = new Map(before.rows.map((row) => [row.id, row]));
  for (const row of result.rows) {
    await db.query(
      `INSERT INTO sales_contact_changes (contact_id, action, before_data, after_data, changed_by) VALUES ($1, 'stage_update', $2::jsonb, $3::jsonb, $4)`,
      [row.id, JSON.stringify(beforeById.get(row.id) ?? null), JSON.stringify(row), userId],
    );
  }
  return result.rowCount ?? 0;
}
