const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const roles = await pool.query("SELECT id, code, name FROM roles WHERE code ILIKE '%business%' OR code ILIKE '%profess%' ORDER BY id");
  console.log(roles.rows);
  await pool.end();
}
run().catch(console.error);
