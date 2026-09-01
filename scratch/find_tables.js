const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%batch%' 
             OR table_name LIKE '%course%' 
             OR table_name LIKE '%module%'
             OR table_name LIKE '%section%'
             OR table_name LIKE '%program%')
      ORDER BY table_name;
    `);
    console.log("Matching tables:", res.rows.map(r => r.table_name));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
