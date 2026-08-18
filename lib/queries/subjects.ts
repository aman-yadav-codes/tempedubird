// lib/queries/subjects.ts
import { Pool } from "pg";

import {
  Subject,
  ListSubjectsOptions,
  CreateSubjectData,
} from "@/lib/types/subject";

export async function listSubjects(
  db: Pool,
  opts: ListSubjectsOptions
) {
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;

  const whereClause = `
    WHERE category_id = $1
      AND board_id = $2
      AND is_deleted = FALSE
      AND (
        $3 = ''
        OR name ILIKE '%' || $3 || '%'
        OR slug ILIKE '%' || $3 || '%'
      )
  `;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `
        SELECT id, category_id, board_id, name, slug, is_active, is_deleted, created_at
        FROM subjects
        ${whereClause}
        ORDER BY name ASC
        LIMIT $4 OFFSET $5
      `,
      [opts.categoryId, opts.boardId, search, limit, offset]
    ),
    db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM subjects
        ${whereClause}
      `,
      [opts.categoryId, opts.boardId, search]
    ),
  ]);

  return {
    data: dataResult.rows as Subject[],
    total: countResult.rows[0].count as number,
  };
}

export async function createSubject(
  db: Pool,
  data: CreateSubjectData
): Promise<Subject> {
  const res = await db.query(
    `
      INSERT INTO subjects (category_id, board_id, name, slug)
      VALUES ($1, $2, $3, $4)
      RETURNING id, category_id, board_id, name, slug, is_active, is_deleted, created_at
    `,
    [data.categoryId, data.boardId, data.name, data.slug]
  );

  return res.rows[0];
}

export async function softDeleteSubject(
  db: Pool,
  subjectId: number,
  deletedBy?: number | null
) {
  const res = await db.query(
    `
    UPDATE subjects
    SET
      is_deleted = TRUE,
      deleted_at = CURRENT_TIMESTAMP,
      deleted_by = $2
    WHERE id = $1
    RETURNING id
    `,
    [subjectId, deletedBy ?? null]
  );

  return res.rows[0] || null;
}

export async function toggleSubjectActive(
  db: Pool,
  subjectId: number,
  isActive: boolean
) {
  const res = await db.query(
    `
    UPDATE subjects
    SET
      is_active = $1
    WHERE id = $2
    RETURNING id
    `,
    [isActive, subjectId]
  );

  return res.rows[0] || null;
}


// lib/queries/subjects.ts

export async function getSubjectTreeNodes(
  db: Pool,
  categoryId: number,
  boardId: number
) {
  const res = await db.query(
    `
    SELECT
      subjects.id,
      subjects.category_id,
      subjects.board_id,
      subjects.name,
      subjects.slug,
      c.name AS parent_name,
      b.name AS board_name,
      subjects.is_active,
      subjects.is_deleted,
      subjects.created_at

    FROM subjects

    INNER JOIN categories c
      ON c.id = subjects.category_id

    INNER JOIN boards b
      ON b.id = subjects.board_id

    WHERE subjects.category_id = $1
      AND subjects.board_id = $2
      AND subjects.is_deleted = FALSE

    ORDER BY subjects.name ASC
    `,
    [categoryId, boardId]
  );

  return res.rows;
}
