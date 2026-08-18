// lib/queries/boards.ts
import { Pool } from "pg";

import {
  Board,
  ListBoardsOptions,
  CreateBoardData,
} from "@/lib/types/board";

export async function listBoards(
  db: Pool,
  opts: ListBoardsOptions = {}
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
        FROM boards
        ${whereClause}
        ORDER BY name ASC
        LIMIT $2 OFFSET $3
      `,
      [search, limit, offset]
    ),
    db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM boards
        ${whereClause}
      `,
      [search]
    ),
  ]);

  return {
    data: dataResult.rows as Board[],
    total: countResult.rows[0].count as number,
  };
}

export async function createBoard(
  db: Pool,
  data: CreateBoardData
): Promise<Board> {
  const res = await db.query(
    `
      INSERT INTO boards (name, slug)
      VALUES ($1, $2)
      RETURNING id, name, slug, is_active, is_deleted, created_at
    `,
    [data.name, data.slug]
  );

  return res.rows[0];
}

export async function getBoardById(
  db: Pool,
  id: number
): Promise<Board | null> {
  const res = await db.query(
    `
      SELECT id, name, slug, is_active, is_deleted, created_at
      FROM boards
      WHERE id = $1
    `,
    [id]
  );

  return res.rows[0] || null;
}

export async function toggleBoardActive(
  db: Pool,
  id: number,
  isActive: boolean
) {
  await db.query(
    `
      UPDATE boards
      SET is_active = $1
      WHERE id = $2
    `,
    [isActive, id]
  );
}

export async function softDeleteBoard(
  db: Pool,
  id: number,
  deletedBy?: number | null
) {
  await db.query(
    `
      UPDATE boards
      SET is_deleted = TRUE,
          deleted_at = CURRENT_TIMESTAMP,
          deleted_by = $2
      WHERE id = $1
    `,
    [id, deletedBy ?? null]
  );
}

export async function getBoardsForCategory(
  db: Pool,
  categoryId: number
) {
  const res = await db.query(
    `
    SELECT
      b.id,
      b.name,
      b.slug,
      b.is_active,
      b.is_deleted,
      b.created_at

    FROM category_boards cb

    INNER JOIN boards b
      ON b.id = cb.board_id

    WHERE cb.category_id = $1
      AND b.is_deleted = FALSE

    ORDER BY b.name ASC
    `,
    [categoryId]
  );

  return res.rows;
}

export async function mapBoardToCategory(
  db: Pool,
  categoryId: number,
  boardId: number
) {
  await db.query(
    `
    INSERT INTO category_boards (
      category_id,
      board_id
    )
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    `,
    [categoryId, boardId]
  );
}

export async function unmapBoardFromCategory(
  db: Pool,
  categoryId: number,
  boardId: number
) {
  await db.query(
    `
    DELETE FROM category_boards
    WHERE category_id = $1
      AND board_id = $2
    `,
    [categoryId, boardId]
  );
}


// lib/queries/boards.ts

export async function getBoardTreeNodes(
  db: Pool,
  categoryId: number
) {
  const res = await db.query(
    `
    SELECT
      b.id,
      b.name,
      b.slug,
      c.name AS parent_name,
      b.is_active,
      b.is_deleted,
      b.created_at,

      EXISTS (
        SELECT 1
        FROM subjects s
        WHERE s.category_id = $1
          AND s.board_id = b.id
          AND s.is_deleted = FALSE
      ) AS has_children

    FROM category_boards cb

    INNER JOIN boards b
      ON b.id = cb.board_id

    INNER JOIN categories c
      ON c.id = cb.category_id

    WHERE cb.category_id = $1
      AND b.is_deleted = FALSE

    ORDER BY b.name ASC
    `,
    [categoryId]
  );

  return res.rows;
}
