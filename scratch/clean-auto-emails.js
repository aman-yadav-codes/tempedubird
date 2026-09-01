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
    // 1. Drop NOT NULL constraint on users.email so users (e.g. students) don't require emails
    await pool.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL;`);
    console.log("Successfully altered users table: email column is now nullable.");

    // 2. Clear auto-generated student emails
    const res = await pool.query(`
      UPDATE users
      SET email = NULL
      WHERE email LIKE '%@student.edubird.internal'
      RETURNING id, full_name, email;
    `);

    console.log(`Cleaned up ${res.rowCount} auto-generated student emails:`, res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
