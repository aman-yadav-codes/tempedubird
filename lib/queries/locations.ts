import { Pool } from "pg";
import { CreateLocationData, Location, ListLocationsOptions } from "@/lib/types/location";

const LOCATION_SELECT = `
  SELECT
    l.id,
    l.name,
    l.slug,
    l.type,
    l.parent_id,
    p.name AS parent_name,
    l.latitude,
    l.longitude,
    l.is_active,
    l.is_deleted,
    l.created_at,
    l.location_scope
  FROM locations l
  LEFT JOIN locations p ON p.id = l.parent_id
`;

export async function listLocations(
  db: Pool,
  opts: ListLocationsOptions = {}
) {
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;
  const scopes = opts.scopes;

  let dataParams: any[] = [search];
  let countParams: any[] = [search];
  let dataParamIndex = 2;
  let countParamIndex = 2;

  let dataScopeCondition = "";
  let countScopeCondition = "";

  if (scopes && scopes.length > 0) {
    dataScopeCondition = `AND l.location_scope = ANY($${dataParamIndex++})`;
    dataParams.push(scopes);

    countScopeCondition = `AND l.location_scope = ANY($${countParamIndex++})`;
    countParams.push(scopes);
  }

  const limitParam = dataParamIndex++;
  const offsetParam = dataParamIndex++;
  dataParams.push(limit, offset);

  const dataWhereClause = `
    WHERE l.is_deleted = FALSE
    AND (
      $1 = ''
      OR l.name ILIKE '%' || $1 || '%'
      OR l.slug ILIKE '%' || $1 || '%'
      OR l.type ILIKE '%' || $1 || '%'
    )
    ${dataScopeCondition}
  `;

  const countWhereClause = `
    WHERE l.is_deleted = FALSE
    AND (
      $1 = ''
      OR l.name ILIKE '%' || $1 || '%'
      OR l.slug ILIKE '%' || $1 || '%'
      OR l.type ILIKE '%' || $1 || '%'
    )
    ${countScopeCondition}
  `;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `
        ${LOCATION_SELECT}
        ${dataWhereClause}
        ORDER BY l.type ASC, l.name ASC
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `,
      dataParams
    ),
    db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM locations l
        LEFT JOIN locations p ON p.id = l.parent_id
        ${countWhereClause}
      `,
      countParams
    ),
  ]);

  return {
    data: dataResult.rows as Location[],
    total: countResult.rows[0].count as number,
  };
}

export async function createLocation(
  db: Pool,
  data: CreateLocationData
): Promise<Location> {
  const result = await db.query(
    `
      INSERT INTO locations (name, slug, type, parent_id, latitude, longitude, location_scope)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
    [
      data.name,
      data.slug,
      data.type,
      data.parent_id ?? null,
      data.latitude ?? null,
      data.longitude ?? null,
      data.location_scope ?? "global",
    ]
  );

  return getLocationById(db, result.rows[0].id);
}

export async function updateLocation(
  db: Pool,
  id: number,
  data: Partial<CreateLocationData>
): Promise<Location> {
  const updates: string[] = [];
  const values: unknown[] = [id];
  let paramIndex = 2;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.slug !== undefined) {
    updates.push(`slug = $${paramIndex++}`);
    values.push(data.slug);
  }
  if (data.type !== undefined) {
    updates.push(`type = $${paramIndex++}`);
    values.push(data.type);
  }
  if (data.parent_id !== undefined) {
    updates.push(`parent_id = $${paramIndex++}`);
    values.push(data.parent_id);
  }
  if (data.latitude !== undefined) {
    updates.push(`latitude = $${paramIndex++}`);
    values.push(data.latitude);
  }
  if (data.longitude !== undefined) {
    updates.push(`longitude = $${paramIndex++}`);
    values.push(data.longitude);
  }
  if (data.location_scope !== undefined) {
    updates.push(`location_scope = $${paramIndex++}`);
    values.push(data.location_scope);
  }

  if (updates.length > 0) {
    await db.query(
      `
        UPDATE locations
        SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      values
    );
  }

  return getLocationById(db, id);
}

export async function deleteLocation(db: Pool, id: number): Promise<void> {
  await db.query(
    `
      UPDATE locations
      SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [id]
  );
}

export async function toggleLocationStatus(
  db: Pool,
  id: number,
  isActive: boolean
): Promise<Location> {
  await db.query(
    `
      UPDATE locations
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
    [isActive, id]
  );

  return getLocationById(db, id);
}

export async function getLocationById(db: Pool, id: number): Promise<Location> {
  const result = await db.query(
    `
      ${LOCATION_SELECT}
      WHERE l.id = $1
    `,
    [id]
  );

  return result.rows[0] as Location;
}
