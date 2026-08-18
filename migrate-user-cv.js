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
    console.log("Adding company_name and institution_name columns...");
    await pool.query(`
      ALTER TABLE user_experience ADD COLUMN IF NOT EXISTS company_name TEXT;
      ALTER TABLE user_education ADD COLUMN IF NOT EXISTS institution_name TEXT;
    `);
    console.log("Success!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

main();
