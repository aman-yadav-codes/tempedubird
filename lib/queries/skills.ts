import { Pool } from "pg";
import { Skill, ListSkillsOptions, CreateSkillData } from "@/lib/types/skill";

export async function listSkills(
  db: Pool,
  opts: ListSkillsOptions = {}
) {
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;

  const whereClause = `
    WHERE is_deleted = FALSE
    AND (
      $1 = ''
      OR name ILIKE '%' || $1 || '%'
      OR slug ILIKE '%' || $1 || '%'
    )
  `;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `
        SELECT id, name, slug, is_active, is_deleted, created_at
        FROM skills
        ${whereClause}
        ORDER BY name ASC
        LIMIT $2 OFFSET $3
      `,
      [search, limit, offset]
    ),
    db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM skills
        ${whereClause}
      `,
      [search]
    ),
  ]);

  return {
    data: dataResult.rows as Skill[],
    total: countResult.rows[0].count as number,
  };
}

export async function createSkill(
  db: Pool,
  data: CreateSkillData
): Promise<Skill> {
  const result = await db.query(
    `
      INSERT INTO skills (name, slug)
      VALUES ($1, $2)
      RETURNING id, name, slug, is_active, is_deleted, created_at
    `,
    [data.name, data.slug]
  );

  return result.rows[0];
}

export async function updateSkill(
  db: Pool,
  id: number,
  data: Partial<CreateSkillData>
): Promise<Skill> {
  const updates: string[] = [];
  const values: any[] = [id];
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
      "SELECT id, name, slug, is_active, is_deleted, created_at FROM skills WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }

  const result = await db.query(
    `
      UPDATE skills
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, slug, is_active, is_deleted, created_at
    `,
    values
  );

  return result.rows[0];
}

export async function deleteSkill(db: Pool, id: number): Promise<void> {
  await db.query(
    `
      UPDATE skills
      SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [id]
  );
}

export async function toggleSkillStatus(
  db: Pool,
  id: number,
  isActive: boolean
): Promise<Skill> {
  const result = await db.query(
    `
      UPDATE skills
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, slug, is_active, is_deleted, created_at
    `,
    [isActive, id]
  );

  return result.rows[0];
}
