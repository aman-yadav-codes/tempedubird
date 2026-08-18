import { Pool } from "pg";
import { Designation, ListDesignationsOptions, CreateDesignationData } from "@/lib/types/designation";

export async function listDesignations(
  db: Pool,
  opts: ListDesignationsOptions = {}
) {
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;
  const numericSearch = /^\d+$/.test(search) ? Number(search) : null;

  const whereClause = `
    WHERE is_deleted = FALSE
    AND (
      $1 = ''
      OR (
        $2::int IS NOT NULL
        AND id = $2::int
      )
      OR (
        $2::int IS NULL
        AND (
          name ILIKE '%' || $1 || '%'
          OR slug ILIKE '%' || $1 || '%'
        )
      )
    )
  `;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `
        SELECT id, name, slug, is_active, is_deleted, created_at
        FROM designations
        ${whereClause}
        ORDER BY id ASC, name ASC
        LIMIT $3 OFFSET $4
      `,
      [search, numericSearch, limit, offset]
    ),
    db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM designations
        ${whereClause}
      `,
      [search, numericSearch]
    ),
  ]);

  return {
    data: dataResult.rows as Designation[],
    total: countResult.rows[0].count as number,
  };
}

export async function getDesignationStats(db: Pool) {
  const result = await db.query<{
    total: number;
    active: number;
    disabled: number;
    deleted: number;
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE is_deleted = FALSE)::int AS total,
      COUNT(*) FILTER (
        WHERE is_deleted = FALSE AND is_active = TRUE
      )::int AS active,
      COUNT(*) FILTER (
        WHERE is_deleted = FALSE AND is_active = FALSE
      )::int AS disabled,
      COUNT(*) FILTER (WHERE is_deleted = TRUE)::int AS deleted
    FROM designations
  `);

  return result.rows[0] ?? {
    total: 0,
    active: 0,
    disabled: 0,
    deleted: 0,
  };
}

export async function createDesignation(
  db: Pool,
  data: CreateDesignationData
): Promise<Designation> {
  const result = await db.query(
    `
      INSERT INTO designations (name, slug)
      VALUES ($1, $2)
      RETURNING id, name, slug, is_active, is_deleted, created_at
    `,
    [data.name, data.slug]
  );

  return result.rows[0];
}

export async function updateDesignation(
  db: Pool,
  id: number,
  data: Partial<CreateDesignationData>
): Promise<Designation> {
  const updates: string[] = [];
  const values: Array<number | string> = [id];
  let paramIndex = 2;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.slug !== undefined) {
    updates.push(`slug = $${paramIndex++}`);
    values.push(data.slug);
  }

  if (updates.length === 0) {
    const result = await db.query(
      "SELECT id, name, slug, is_active, is_deleted, created_at FROM designations WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }

  const result = await db.query(
    `
      UPDATE designations
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, slug, is_active, is_deleted, created_at
    `,
    values
  );

  return result.rows[0];
}

export async function deleteDesignation(db: Pool, id: number): Promise<void> {
  await db.query(
    `
      UPDATE designations
      SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [id]
  );
}

export async function toggleDesignationStatus(
  db: Pool,
  id: number,
  isActive: boolean
): Promise<Designation> {
  const result = await db.query(
    `
      UPDATE designations
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, slug, is_active, is_deleted, created_at
    `,
    [isActive, id]
  );

  return result.rows[0];
}
