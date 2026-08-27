import { db } from "@/lib/db/db";
import { ensureSalesSchema } from "@/lib/queries/sales";

export type MarketingPackageRow = {
  id: number;
  name: string;
  package_for: string;
  package_for_types: string[];
  price: number;
  price_unit: string;
  price_monthly: number | null;
  price_yearly: number | null;
  price_once: number | null;
  storage_limit_gb: number | null;
  validity_count: number;
  validity_unit: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function listMarketingPackages(options?: {
  activeOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ packages: MarketingPackageRow[]; total: number }> {
  await ensureSalesSchema(db);

  const activeOnly = options?.activeOnly ?? false;
  const limit = Math.min(options?.limit ?? 20, 100);
  const offset = options?.offset ?? 0;
  const where: string[] = ["COALESCE(is_deleted, FALSE) = FALSE"];
  const params: unknown[] = [];

  if (activeOnly) {
    where.push(`is_active = TRUE`);
  }

  if (options?.search && options.search.trim()) {
    params.push(`%${options.search.trim()}%`);
    where.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length} OR package_for ILIKE $${params.length})`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const countRes = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM sales_packages ${whereSql}`,
    params
  );
  const total = parseInt(countRes.rows[0]?.count ?? "0", 10);

  const dataRes = await db.query<MarketingPackageRow>(
    `
      SELECT 
        id,
        name,
        package_for,
        COALESCE(package_for_types, '[]'::jsonb) AS package_for_types,
        CAST(price AS DOUBLE PRECISION) AS price,
        price_unit,
        CAST(price_monthly AS DOUBLE PRECISION) AS price_monthly,
        CAST(price_yearly  AS DOUBLE PRECISION) AS price_yearly,
        CAST(price_once    AS DOUBLE PRECISION) AS price_once,
        CAST(storage_limit_gb AS DOUBLE PRECISION) AS storage_limit_gb,
        validity_count,
        validity_unit,
        description,
        is_active,
        created_at,
        updated_at
      FROM sales_packages
      ${whereSql}
      ORDER BY id ASC
      LIMIT ${limit} OFFSET ${offset}
    `,
    params
  );

  return { packages: dataRes.rows, total };
}

export async function createMarketingPackage(input: {
  name: string;
  packageFor: string;
  packageForTypes?: string[];
  price: number;
  priceUnit?: string;
  priceMonthly?: number | null;
  priceYearly?: number | null;
  priceOnce?: number | null;
  storageLimitGb?: number | null;
  validityCount?: number;
  validityUnit?: string;
  description?: string | null;
  isActive?: boolean;
}): Promise<MarketingPackageRow> {
  await ensureSalesSchema(db);

  const res = await db.query<MarketingPackageRow>(
    `
      INSERT INTO sales_packages (
        name, package_for, package_for_types, price, price_unit,
        price_monthly, price_yearly, price_once,
        storage_limit_gb, validity_count, validity_unit, description, is_active
      )
      VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING 
        id, name, package_for, package_for_types,
        CAST(price AS DOUBLE PRECISION) AS price, price_unit,
        CAST(price_monthly AS DOUBLE PRECISION) AS price_monthly,
        CAST(price_yearly  AS DOUBLE PRECISION) AS price_yearly,
        CAST(price_once    AS DOUBLE PRECISION) AS price_once,
        CAST(storage_limit_gb AS DOUBLE PRECISION) AS storage_limit_gb,
        validity_count, validity_unit, description, is_active, created_at, updated_at
    `,
    [
      input.name.trim(),
      input.packageFor || "institute",
      JSON.stringify(input.packageForTypes || []),
      input.price || 0,
      input.priceUnit || "month",
      input.priceMonthly ?? null,
      input.priceYearly  ?? null,
      input.priceOnce    ?? null,
      input.storageLimitGb ?? null,
      input.validityCount || 1,
      input.validityUnit || "month",
      input.description || null,
      input.isActive ?? true,
    ]
  );

  return res.rows[0];
}

export async function updateMarketingPackage(
  id: number,
  input: {
    name?: string;
    packageFor?: string;
    packageForTypes?: string[];
    price?: number;
    priceUnit?: string;
    priceMonthly?: number | null;
    priceYearly?: number | null;
    priceOnce?: number | null;
    storageLimitGb?: number | null;
    validityCount?: number;
    validityUnit?: string;
    description?: string | null;
    isActive?: boolean;
  }
): Promise<MarketingPackageRow | null> {
  await ensureSalesSchema(db);

  const res = await db.query<MarketingPackageRow>(
    `
      UPDATE sales_packages
      SET 
        name             = COALESCE($1,  name),
        package_for      = COALESCE($2,  package_for),
        package_for_types = CASE WHEN $3::jsonb IS NOT NULL THEN $3::jsonb ELSE package_for_types END,
        price            = COALESCE($4,  price),
        price_unit       = COALESCE($5,  price_unit),
        price_monthly    = $6,
        price_yearly     = $7,
        price_once       = $8,
        storage_limit_gb = $9,
        validity_count   = COALESCE($10, validity_count),
        validity_unit    = COALESCE($11, validity_unit),
        description      = COALESCE($12, description),
        is_active        = COALESCE($13, is_active),
        updated_at       = NOW()
      WHERE id = $14 AND COALESCE(is_deleted, FALSE) = FALSE
      RETURNING 
        id, name, package_for, package_for_types,
        CAST(price AS DOUBLE PRECISION) AS price, price_unit,
        CAST(price_monthly AS DOUBLE PRECISION) AS price_monthly,
        CAST(price_yearly  AS DOUBLE PRECISION) AS price_yearly,
        CAST(price_once    AS DOUBLE PRECISION) AS price_once,
        CAST(storage_limit_gb AS DOUBLE PRECISION) AS storage_limit_gb,
        validity_count, validity_unit, description, is_active, created_at, updated_at
    `,
    [
      input.name ? input.name.trim() : null,
      input.packageFor || null,
      input.packageForTypes ? JSON.stringify(input.packageForTypes) : null,
      input.price !== undefined ? input.price : null,
      input.priceUnit || null,
      input.priceMonthly !== undefined ? input.priceMonthly : null,
      input.priceYearly  !== undefined ? input.priceYearly  : null,
      input.priceOnce    !== undefined ? input.priceOnce    : null,
      input.storageLimitGb !== undefined ? input.storageLimitGb : null,
      input.validityCount || null,
      input.validityUnit || null,
      input.description !== undefined ? input.description : null,
      input.isActive !== undefined ? input.isActive : null,
      id,
    ]
  );

  return res.rows[0] ?? null;
}

export async function deleteMarketingPackage(id: number): Promise<boolean> {
  await ensureSalesSchema(db);
  const res = await db.query(
    `UPDATE sales_packages SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1`,
    [id]
  );
  return (res.rowCount ?? 0) > 0;
}

// ─────────────────────────────────────────────────────────────
// Working Course / Program Fee Management for Institution Admin
// ─────────────────────────────────────────────────────────────

export type ProgramFeeRow = {
  id: number;
  institution_id: number;
  institution_name: string;
  course_name: string;
  program_type_name: string | null;
  duration_value: number | null;
  duration_unit: string | null;
  fee_amount: number;
  fee_unit: string;
  admission_fee: number;
  teaching_method: string | null;
  seats_available: number | null;
  is_active: boolean;
};

export async function ensureProgramFeeColumns(): Promise<void> {
  await db.query(`
    ALTER TABLE institution_programs ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(10,2) DEFAULT 25000.00;
    ALTER TABLE institution_programs ADD COLUMN IF NOT EXISTS fee_unit VARCHAR(50) DEFAULT 'year';
    ALTER TABLE institution_programs ADD COLUMN IF NOT EXISTS admission_fee NUMERIC(10,2) DEFAULT 2500.00;
  `);
}

export async function listProgramCourseFees(options?: {
  institutionId?: number | null;
  userId?: number | null;
  search?: string;
}): Promise<ProgramFeeRow[]> {
  await ensureProgramFeeColumns();

  const params: unknown[] = [];
  const where: string[] = ["COALESCE(ip.is_deleted, FALSE) = FALSE"];

  if (options?.institutionId) {
    params.push(options.institutionId);
    where.push(`ip.institution_id = $${params.length}`);
  }

  if (options?.userId) {
    params.push(options.userId);
    where.push(`(
      ip.created_by = $${params.length} 
      OR ip.institution_id IN (
        SELECT institution_id FROM institution_memberships WHERE user_id = $${params.length}
      )
      OR ip.institution_id IN (
        SELECT id FROM institution_profiles WHERE created_by = $${params.length}
      )
    )`);
  }

  if (options?.search && options.search.trim()) {
    params.push(`%${options.search.trim()}%`);
    where.push(`(ip.title ILIKE $${params.length} OR inst.name ILIKE $${params.length})`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const res = await db.query<ProgramFeeRow>(
    `
      SELECT 
        ip.id,
        ip.institution_id,
        COALESCE(inst.name, inst.slug) AS institution_name,
        ip.title AS course_name,
        pt.name AS program_type_name,
        ip.duration_value,
        ip.duration_unit,
        CAST(COALESCE(ip.fee_amount, 25000) AS DOUBLE PRECISION) AS fee_amount,
        COALESCE(ip.fee_unit, 'year') AS fee_unit,
        CAST(COALESCE(ip.admission_fee, 2500) AS DOUBLE PRECISION) AS admission_fee,
        ip.teaching_method,
        ip.seats_available,
        ip.is_active
      FROM institution_programs ip
      INNER JOIN institution_profiles inst ON inst.id = ip.institution_id
      LEFT JOIN program_types pt ON pt.id = ip.program_type_id
      ${whereSql}
      ORDER BY ip.id DESC
      LIMIT 100
    `,
    params
  );

  return res.rows;
}

export async function updateProgramCourseFee(
  programId: number,
  feeAmount: number,
  feeUnit: string,
  admissionFee: number
): Promise<boolean> {
  await ensureProgramFeeColumns();
  const res = await db.query(
    `
      UPDATE institution_programs
      SET 
        fee_amount = $1,
        fee_unit = $2,
        admission_fee = $3,
        updated_at = NOW()
      WHERE id = $4 AND COALESCE(is_deleted, FALSE) = FALSE
    `,
    [feeAmount, feeUnit || "year", admissionFee || 0, programId]
  );
  return (res.rowCount ?? 0) > 0;
}

