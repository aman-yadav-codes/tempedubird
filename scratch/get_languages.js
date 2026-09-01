const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function getLangs() {
  try {
    const res = await pool.query(`SELECT id, name, slug FROM languages WHERE COALESCE(is_deleted, false) = false ORDER BY name ASC LIMIT 20;`);
    console.log("Languages:", res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
getLangs();
