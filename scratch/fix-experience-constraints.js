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
    await pool.query(`ALTER TABLE user_experience ALTER COLUMN from_month DROP NOT NULL;`);
    await pool.query(`ALTER TABLE user_experience ALTER COLUMN from_year DROP NOT NULL;`);
    console.log("Successfully altered user_experience columns to DROP NOT NULL.");

    await pool.query(`ALTER TABLE user_education ALTER COLUMN from_year DROP NOT NULL;`);
    await pool.query(`ALTER TABLE user_education ALTER COLUMN to_year DROP NOT NULL;`);
    console.log("Successfully altered user_education columns to DROP NOT NULL.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
