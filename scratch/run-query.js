const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT id, name, slug, parent_id, depth, is_deleted, is_active
      FROM categories
      WHERE name IN ('Aromatherapy', 'Art Therapy')
    `);
    console.log("Categories:", res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
