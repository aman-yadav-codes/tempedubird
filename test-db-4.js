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
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'institution_profiles'
      ORDER BY ordinal_position;
    `);
    console.log("Institution Profiles columns:", tableInfo.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
