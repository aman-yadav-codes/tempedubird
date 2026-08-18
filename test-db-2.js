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
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log("Tables list:", tableInfo.rows.map(r => r.table_name));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
