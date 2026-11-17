// lib/queries/category.ts

import { Pool } from "pg";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

import {
  Category,
  ListCategoriesOptions,
  CreateCategoryData,
} from "@/lib/types/category";

type CategoryTreeRow = Category & {
  parent_name?: string | null;
  has_children: boolean;
};

const PG_INT_MAX = 2147483647;

// ─────────────────────────────────────────────────────────────
// List Categories
// ─────────────────────────────────────────────────────────────

export const listCategories = async (
  db: Pool,
  options: ListCategoriesOptions = {}
) => {
  const {
    search = "",
    onlyRoot = false,
    showRootsFirst = false,
    onlyClass = false,
    onlyLeaf = false,
    limit = 10,
    offset = 0,
    category_type,
  } = options;

  const parsedSearchId = /^\d+$/.test(search) ? Number(search) : null;
  const searchId =
    parsedSearchId !== null &&
    Number.isSafeInteger(parsedSearchId) &&
    parsedSearchId > 0 &&
    parsedSearchId <= PG_INT_MAX
      ? parsedSearchId
      : null;

  const baseConditions = ["c.is_deleted = FALSE"];
  const params: unknown[] = [];

  if (category_type && category_type !== 'all') {
    if (category_type === 'course' || category_type === 'courses') {
      baseConditions.push(`c.category_type IN ('course', 'courses', 'academic')`);
    } else if (category_type === 'job' || category_type === 'jobs') {
      baseConditions.push(`c.category_type IN ('job', 'jobs')`);
    } else {
      params.push(category_type);
      baseConditions.push(`c.category_type = $${params.length}`);
    }
  }

  if (options.business_category_id) {
    params.push(options.business_category_id);
    baseConditions.push(`COALESCE(c.business_category_id, p.business_category_id) = $${params.length}`);
  }

  if (options.business_subcategory_id) {
    params.push(options.business_subcategory_id);
    baseConditions.push(`COALESCE(c.business_subcategory_id, p.business_subcategory_id) = $${params.length}`);
  }

  if (options.parentId !== undefined) {
    if (options.parentId === null) {
      baseConditions.push("c.parent_id IS NULL");
    } else {
      params.push(options.parentId);
      baseConditions.push(`c.parent_id = $${params.length}`);
    }
  }

  if (onlyClass) {
    baseConditions.push(`
      c.depth = 2
      AND p.name ILIKE 'CLASS%'
    `);
  }

  if (onlyLeaf) {
    baseConditions.push(`NOT EXISTS (
      SELECT 1 FROM categories sub
      WHERE sub.parent_id = c.id
        AND sub.is_deleted = FALSE
    )`);
  }

  if (onlyRoot) {
    baseConditions.push("c.parent_id IS NULL");
  } else if (showRootsFirst && !search) {
    baseConditions.push("c.depth = 1");
  }

  if (search) {
    params.push(`%${search}%`);
    baseConditions.push(`(
      c.name ILIKE $${params.length}
      OR c.slug ILIKE $${params.length}
      OR ($${params.length + 1}::int IS NOT NULL AND c.id = $${params.length + 1})
    )`);
    params.push(searchId);
  }

  const whereClause = `WHERE ${baseConditions.join(" AND ")}`;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.parent_id,
        c.depth,
        c.category_type,
        COALESCE(c.business_category_id, p.business_category_id) AS business_category_id,
        COALESCE(c.business_subcategory_id, p.business_subcategory_id) AS business_subcategory_id,
        bc.name AS business_category_name,
        bsc.name AS business_subcategory_name,
        c.icon_url,
        c.image_url,
        c.description,
        c.seo_title,
        c.meta_description,
        c.display_order,
        c.countries,
        c.synonyms,
        c.is_active,
        c.is_deleted,
        c.created_at,
        c.updated_at,

        EXISTS (
          SELECT 1
          FROM category_boards cb
          WHERE cb.category_id = c.id
        ) AS is_mapped,

        (
          SELECT string_agg(b.name, ', ' ORDER BY b.name)
          FROM category_boards cb
          JOIN boards b
            ON b.id = cb.board_id
          WHERE cb.category_id = c.id
            AND b.is_deleted = FALSE
        ) AS mapped_board_names,

        p.name AS parent_name

      FROM categories c

      LEFT JOIN categories p
        ON p.id = c.parent_id

      LEFT JOIN categories bc
        ON bc.id = COALESCE(c.business_category_id, p.business_category_id)

      LEFT JOIN categories bsc
        ON bsc.id = COALESCE(c.business_subcategory_id, p.business_subcategory_id)

      ${whereClause}

      ORDER BY
        NULLIF(
          REGEXP_REPLACE(c.name, '[^0-9]', '', 'g'),
          ''
        )::NUMERIC ASC NULLS LAST,
        c.depth ASC,
        c.name ASC

      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    ),

    db.query(
      `
      SELECT COUNT(*)::int AS count

      FROM categories c

      LEFT JOIN categories p
        ON p.id = c.parent_id

      ${whereClause}
      `,
      params
    ),
  ]);

  return {
    data: dataResult.rows,
    total: countResult.rows[0].count,
  };
};

// ─────────────────────────────────────────────────────────────
// Flat Categories
// ─────────────────────────────────────────────────────────────

export const getAllCategoriesFlat = async (
  db: Pool
): Promise<Category[]> => {
  const res = await db.query(`
    SELECT
      id,
      name,
      slug,
      parent_id,
      depth,
      is_active,
      is_deleted,
      created_at,
      updated_at

    FROM categories

    WHERE is_deleted = FALSE

    ORDER BY depth ASC, name ASC
  `);

  return res.rows;
};

// ─────────────────────────────────────────────────────────────
// Get Category By ID
// ─────────────────────────────────────────────────────────────

export const getCategoryById = async (
  db: Pool,
  id: number
): Promise<Category | null> => {
  const res = await db.query(
    `
    SELECT
      c.id,
      c.name,
      c.slug,
      c.parent_id,
      c.depth,
      c.category_type,
      COALESCE(c.business_category_id, p.business_category_id) AS business_category_id,
      COALESCE(c.business_subcategory_id, p.business_subcategory_id) AS business_subcategory_id,
      bc.name AS business_category_name,
      bsc.name AS business_subcategory_name,
      c.icon_url,
      c.image_url,
      c.description,
      c.seo_title,
      c.meta_description,
      c.display_order,
      c.countries,
      c.synonyms,
      c.is_active,
      c.is_deleted,
      c.created_at,
      c.updated_at,
      p.name AS parent_name

    FROM categories c

    LEFT JOIN categories p
      ON p.id = c.parent_id

    LEFT JOIN categories bc
      ON bc.id = COALESCE(c.business_category_id, p.business_category_id)

    LEFT JOIN categories bsc
      ON bsc.id = COALESCE(c.business_subcategory_id, p.business_subcategory_id)

    WHERE c.id = $1
    `,
    [id]
  );

  return res.rows[0] || null;
};

// ─────────────────────────────────────────────────────────────
// Insert Category
// ─────────────────────────────────────────────────────────────

export const insertCategory = async (
  db: Pool,
  data: CreateCategoryData
): Promise<Category> => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    let depth = 1;

    if (data.parentId !== null) {
      const parentRes = await client.query(
        `
        SELECT depth
        FROM categories
        WHERE id = $1
        `,
        [data.parentId]
      );

      if (!parentRes.rows[0]) {
        throw new Error("Parent category not found");
      }

      depth = parentRes.rows[0].depth + 1;
    }

    const catRes = await client.query(
      `
      INSERT INTO categories (
        name,
        slug,
        parent_id,
        depth,
        category_type,
        business_category_id,
        business_subcategory_id,
        icon_url,
        image_url,
        description,
        seo_title,
        meta_description,
        display_order,
        countries,
        synonyms
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)

      RETURNING
        id,
        name,
        slug,
        parent_id,
        depth,
        category_type,
        business_category_id,
        business_subcategory_id,
        is_active,
        is_deleted,
        created_at,
        updated_at
      `,
      [
        data.name,
        data.slug,
        data.parentId,
        depth,
        data.category_type || "business",
        data.business_category_id || null,
        data.business_subcategory_id || null,
        data.icon_url || null,
        data.image_url || null,
        data.description || null,
        data.seo_title || null,
        data.meta_description || null,
        data.display_order || 0,
        JSON.stringify(data.countries || ["IN", "US"]),
        JSON.stringify(data.synonyms || [])
      ]
    );

    const newCat: Category = catRes.rows[0];

    await client.query(
      `
      INSERT INTO category_closure (
        ancestor_id,
        descendant_id,
        depth
      )
      VALUES ($1, $1, 0)
      `,
      [newCat.id]
    );

    if (data.parentId !== null) {
      await client.query(
        `
        INSERT INTO category_closure (
          ancestor_id,
          descendant_id,
          depth
        )

        SELECT
          cc.ancestor_id,
          $1,
          cc.depth + 1

        FROM category_closure cc

        WHERE cc.descendant_id = $2
        `,
        [newCat.id, data.parentId]
      );
    }

    await client.query("COMMIT");

    return newCat;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
// Get Category Children (for tree view)
// ─────────────────────────────────────────────────────────────

// lib/queries/category.ts
export const getCategoryChildren = async (
  db: Pool,
  parentId: number | null = null
): Promise<CategoryTreeRow[]> => {
  const res = await db.query(
    `
    SELECT
      c.id,
      c.name,
      c.slug,
      c.parent_id,
      p.name AS parent_name,
      c.depth,
      c.is_active,
      c.is_deleted,
      c.created_at,
      c.updated_at,
EXISTS (
  SELECT 1
  FROM categories ch
  WHERE ch.parent_id = c.id
    AND ch.is_deleted = FALSE
    AND ch.is_active = TRUE
)
OR (
  c.depth = 2
  AND EXISTS (
    SELECT 1
    FROM category_boards cb
    INNER JOIN boards b
      ON b.id = cb.board_id
    WHERE cb.category_id = c.id
      AND b.is_deleted = FALSE
      AND b.is_active = TRUE
  )
) AS has_children
    FROM categories c
    LEFT JOIN categories p
      ON p.id = c.parent_id
    WHERE c.is_deleted = FALSE
      AND c.is_active = TRUE
      AND (
        ($1::int IS NULL AND c.parent_id IS NULL)
        OR c.parent_id = $1
      )
    ORDER BY
      NULLIF(REGEXP_REPLACE(c.name, '[^0-9]', '', 'g'), '')::INTEGER ASC NULLS LAST,
      c.name ASC
    `,
    [parentId]
  );

  return res.rows as CategoryTreeRow[];
};

// ─────────────────────────────────────────────────────────────
// Check if category has children
// ─────────────────────────────────────────────────────────────

export const checkCategoryHasChildren = async (
  db: Pool,
  categoryId: number
): Promise<boolean> => {
  const res = await db.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM categories
      WHERE 
        parent_id = $1
        AND is_deleted = FALSE
        AND is_active = TRUE
    ) as has_children
    `,
    [categoryId]
  );

  return res.rows[0].has_children;
};

// ─────────────────────────────────────────────────────────────
// Soft Delete Category
// ─────────────────────────────────────────────────────────────

export const softDeleteCategory = async (
  db: Pool,
  id: number,
  deletedBy?: number | null
): Promise<void> => {
  await db.query(
    `
    UPDATE categories
    SET
      is_deleted = TRUE,
      deleted_at = NOW(),
      deleted_by = $2,
      updated_at = NOW()
    WHERE id = $1
    `,
    [id, deletedBy ?? null]
  );
};

// ─────────────────────────────────────────────────────────────
// Toggle Category Active
// ─────────────────────────────────────────────────────────────

export const toggleCategoryActive = async (
  db: Pool,
  id: number,
  isActive: boolean
): Promise<void> => {
  await db.query(
    `
    UPDATE categories
    SET
      is_active = $1,
      updated_at = NOW()
    WHERE id = $2
    `,
    [isActive, id]
  );
};

export async function updateCategory(
  db: Pool,
  input: {
    id: number;
    name: string;
    slug: string;
    parentId: number | null;
    category_type?: string;
    business_category_id?: number | null;
    business_subcategory_id?: number | null;
    icon_url?: string | null;
    description?: string | null;
    synonyms?: string[] | string | null;
  }
) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `
      SELECT id
      FROM categories
      WHERE id = $1
      LIMIT 1
      `,
      [input.id]
    );

    if (!existing.rows.length) {
      throw new Error("Category not found");
    }

    if (input.parentId && input.parentId === input.id) {
      throw new Error("Category cannot be its own parent");
    }

    // subtree before move: root + all descendants
    const subtreeRes = await client.query<{
      descendant_id: number;
      depth: number;
    }>(
      `
      SELECT descendant_id, depth
      FROM category_closure
      WHERE ancestor_id = $1
      ORDER BY depth ASC
      `,
      [input.id]
    );

    const subtreeIds: number[] = subtreeRes.rows.map((row) =>
      Number(row.descendant_id)
    );

    // prevent moving under its own descendant
    if (input.parentId && subtreeIds.includes(input.parentId)) {
      throw new Error("Category cannot be moved inside its own subtree");
    }

    const duplicate = await client.query(
      `
      SELECT id
      FROM categories
      WHERE slug = $1
        AND COALESCE(parent_id, 0) = COALESCE($2, 0)
        AND id != $3
      LIMIT 1
      `,
      [input.slug, input.parentId, input.id]
    );

    if (duplicate.rows.length) {
      const err = new Error("Duplicate category slug") as Error & {
        code?: string;
      };
      err.code = "23505";
      throw err;
    }

    // cache internal closure rows inside subtree before deleting them
    const internalClosureRes = await client.query(
      `
      SELECT ancestor_id, descendant_id, depth
      FROM category_closure
      WHERE ancestor_id = ANY($1::int[])
        AND descendant_id = ANY($1::int[])
      ORDER BY depth ASC
      `,
      [subtreeIds]
    );

    const synonymsArr = input.synonyms !== undefined
      ? (Array.isArray(input.synonyms)
          ? input.synonyms.map((s) => String(s).trim()).filter(Boolean)
          : typeof input.synonyms === "string"
          ? input.synonyms.split(",").map((s) => s.trim()).filter(Boolean)
          : [])
      : null;

    // update the moved category itself
    await client.query(
      `
      UPDATE categories
      SET
        name = $1,
        slug = $2,
        parent_id = $3,
        category_type = COALESCE($5, category_type),
        business_category_id = $6,
        business_subcategory_id = $7,
        icon_url = COALESCE($8, icon_url),
        description = COALESCE($9, description),
        synonyms = COALESCE($10, synonyms),
        updated_at = NOW()
      WHERE id = $4
      `,
      [
        input.name,
        input.slug,
        input.parentId,
        input.id,
        input.category_type || null,
        input.business_category_id !== undefined ? input.business_category_id : null,
        input.business_subcategory_id !== undefined ? input.business_subcategory_id : null,
        input.icon_url || null,
        input.description || null,
        synonymsArr,
      ]
    );

    // If updating a root category, propagate the business classification to its child categories
    if (input.business_category_id !== undefined && !input.parentId) {
      await client.query(
        `
        UPDATE categories
        SET
          business_category_id = $1,
          business_subcategory_id = COALESCE($2, business_subcategory_id),
          updated_at = NOW()
        WHERE parent_id = $3
        `,
        [
          input.business_category_id,
          input.business_subcategory_id !== undefined ? input.business_subcategory_id : null,
          input.id,
        ]
      );
    }

    // remove old closure rows for the whole subtree
    await client.query(
      `
      DELETE FROM category_closure
      WHERE descendant_id = ANY($1::int[])
      `,
      [subtreeIds]
    );

    // restore internal subtree closure exactly as it was
    for (const row of internalClosureRes.rows) {
      await client.query(
        `
        INSERT INTO category_closure (
          ancestor_id,
          descendant_id,
          depth
        )
        VALUES ($1, $2, $3)
        `,
        [
          Number(row.ancestor_id),
          Number(row.descendant_id),
          Number(row.depth),
        ]
      );
    }

    // attach subtree to new parent, if any
    if (input.parentId) {
      const parentAncestors = await client.query(
        `
        SELECT ancestor_id, depth
        FROM category_closure
        WHERE descendant_id = $1
        ORDER BY depth ASC
        `,
        [input.parentId]
      );

      for (const anc of parentAncestors.rows) {
        for (const node of subtreeRes.rows) {
          await client.query(
            `
            INSERT INTO category_closure (
              ancestor_id,
              descendant_id,
              depth
            )
            VALUES ($1, $2, $3)
            `,
            [
              Number(anc.ancestor_id),
              Number(node.descendant_id),
              Number(anc.depth) + 1 + Number(node.depth),
            ]
          );
        }
      }
    }

    // recalculate depth for affected subtree categories
    await client.query(
      `
      UPDATE categories c
      SET depth = sub.depth + 1
      FROM (
        SELECT
          descendant_id,
          MAX(depth) AS depth
        FROM category_closure
        WHERE descendant_id = ANY($1::int[])
        GROUP BY descendant_id
      ) sub
      WHERE sub.descendant_id = c.id
      `,
      [subtreeIds]
    );

    const result = await client.query(
      `
      SELECT *
      FROM categories
      WHERE id = $1
      `,
      [input.id]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
