import { Pool, PoolClient } from "pg";
type Queryable = Pool | PoolClient;
import { InstitutionBranch, CreateInstitutionBranchInput } from "@/lib/types/institution";

let schemaReadyPromise: Promise<void> | null = null;

export async function ensureInstitutionBranchesSchema(db: Queryable): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS institution_branches (
          id SERIAL PRIMARY KEY,
          institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
          branch_name VARCHAR(255) NOT NULL,
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(100),
          pincode VARCHAR(20),
          working_hours VARCHAR(255),
          phones JSONB DEFAULT '[]'::jsonb,
          emails JSONB DEFAULT '[]'::jsonb,
          is_primary BOOLEAN DEFAULT FALSE,
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_institution_branches_inst_id
          ON institution_branches(institution_id);
      `);
    })();
  }
  return schemaReadyPromise;
}

export async function getInstitutionBranches(db: Queryable, institutionId: number): Promise<InstitutionBranch[]> {
  await ensureInstitutionBranchesSchema(db);
  const res = await db.query<InstitutionBranch>(
    `
    SELECT * FROM institution_branches
    WHERE institution_id = $1 AND COALESCE(is_active, TRUE) = TRUE
    ORDER BY is_primary DESC, sort_order ASC, id ASC
    `,
    [institutionId]
  );
  return res.rows.map((row) => ({
    ...row,
    phones: Array.isArray(row.phones) ? row.phones : [],
    emails: Array.isArray(row.emails) ? row.emails : [],
  }));
}

export async function createInstitutionBranch(db: Queryable, input: CreateInstitutionBranchInput): Promise<InstitutionBranch> {
  await ensureInstitutionBranchesSchema(db);

  if (input.isPrimary) {
    await db.query(
      `UPDATE institution_branches SET is_primary = FALSE WHERE institution_id = $1`,
      [input.institutionId]
    );
  }

  const res = await db.query<InstitutionBranch>(
    `
    INSERT INTO institution_branches (
      institution_id, branch_name, address, city, state, pincode,
      working_hours, phones, emails, is_primary, sort_order, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12)
    RETURNING *
    `,
    [
      input.institutionId,
      input.branchName.trim(),
      input.address || null,
      input.city || null,
      input.state || null,
      input.pincode || null,
      input.workingHours || null,
      JSON.stringify(input.phones || []),
      JSON.stringify(input.emails || []),
      input.isPrimary ?? false,
      input.sortOrder ?? 0,
      input.isActive ?? true,
    ]
  );

  const row = res.rows[0];
  return {
    ...row,
    phones: Array.isArray(row.phones) ? row.phones : [],
    emails: Array.isArray(row.emails) ? row.emails : [],
  };
}

export async function updateInstitutionBranch(db: Queryable, id: number, input: Partial<CreateInstitutionBranchInput>): Promise<InstitutionBranch | null> {
  await ensureInstitutionBranchesSchema(db);

  if (input.isPrimary && input.institutionId) {
    await db.query(
      `UPDATE institution_branches SET is_primary = FALSE WHERE institution_id = $1 AND id <> $2`,
      [input.institutionId, id]
    );
  }

  const fields: string[] = [];
  const params: unknown[] = [id];

  if (input.branchName !== undefined) {
    params.push(input.branchName.trim());
    fields.push(`branch_name = $${params.length}`);
  }
  if (input.address !== undefined) {
    params.push(input.address || null);
    fields.push(`address = $${params.length}`);
  }
  if (input.city !== undefined) {
    params.push(input.city || null);
    fields.push(`city = $${params.length}`);
  }
  if (input.state !== undefined) {
    params.push(input.state || null);
    fields.push(`state = $${params.length}`);
  }
  if (input.pincode !== undefined) {
    params.push(input.pincode || null);
    fields.push(`pincode = $${params.length}`);
  }
  if (input.workingHours !== undefined) {
    params.push(input.workingHours || null);
    fields.push(`working_hours = $${params.length}`);
  }
  if (input.phones !== undefined) {
    params.push(JSON.stringify(input.phones || []));
    fields.push(`phones = $${params.length}::jsonb`);
  }
  if (input.emails !== undefined) {
    params.push(JSON.stringify(input.emails || []));
    fields.push(`emails = $${params.length}::jsonb`);
  }
  if (input.isPrimary !== undefined) {
    params.push(input.isPrimary);
    fields.push(`is_primary = $${params.length}`);
  }
  if (input.sortOrder !== undefined) {
    params.push(input.sortOrder);
    fields.push(`sort_order = $${params.length}`);
  }
  if (input.isActive !== undefined) {
    params.push(input.isActive);
    fields.push(`is_active = $${params.length}`);
  }

  if (fields.length === 0) {
    const existing = await db.query<InstitutionBranch>(`SELECT * FROM institution_branches WHERE id = $1`, [id]);
    return existing.rows[0] || null;
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);

  const res = await db.query<InstitutionBranch>(
    `
    UPDATE institution_branches
    SET ${fields.join(", ")}
    WHERE id = $1
    RETURNING *
    `,
    params
  );

  const row = res.rows[0];
  if (!row) return null;
  return {
    ...row,
    phones: Array.isArray(row.phones) ? row.phones : [],
    emails: Array.isArray(row.emails) ? row.emails : [],
  };
}

export async function deleteInstitutionBranch(db: Queryable, id: number): Promise<boolean> {
  await ensureInstitutionBranchesSchema(db);
  const res = await db.query(`DELETE FROM institution_branches WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}
