const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function testQuery(search = '') {
  const searchId = /^\d+$/.test(search) ? Number(search) : null;
  const baseConditions = ["c.is_deleted = FALSE"];
  const params = [];

  // onlyLeaf = true
  baseConditions.push(`NOT EXISTS (
    SELECT 1 FROM categories sub
    WHERE sub.parent_id = c.id
      AND sub.is_deleted = FALSE
  )`);

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

  try {
    console.log(`Executing query with search='${search}'`);
    const q1 = `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.parent_id,
        c.depth,
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

      ${whereClause}

      ORDER BY
        NULLIF(
          REGEXP_REPLACE(c.name, '[^0-9]', '', 'g'),
          ''
        )::INTEGER ASC NULLS LAST,
        c.depth ASC,
        c.name ASC

      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;
    console.log("SQL (Data):", q1);
    const r1 = await pool.query(q1, [...params, 15, 0]);
    console.log("Data result count:", r1.rows.length);

    const q2 = `
      SELECT COUNT(*)::int AS count

      FROM categories c

      LEFT JOIN categories p
        ON p.id = c.parent_id

      ${whereClause}
    `;
    console.log("SQL (Count):", q2);
    const r2 = await pool.query(q2, params);
    console.log("Count result:", r2.rows[0].count);
  } catch (err) {
    console.error("ERROR IN QUERY:", err.message);
    console.error(err.stack);
  }
}

async function main() {
  await testQuery('');
  await testQuery('Aromatherapy');
  await pool.end();
}

main();
