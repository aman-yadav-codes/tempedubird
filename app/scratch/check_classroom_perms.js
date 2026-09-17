const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const res = await pool.query("SELECT id, name, description FROM permissions WHERE name ILIKE '%classroom%'");
  console.log('Classroom permissions:', res.rows);
  await pool.end();
}
run().catch(console.error);
