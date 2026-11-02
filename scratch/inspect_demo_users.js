process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const res = await pool.query("SELECT id, full_name, email, is_deleted FROM users WHERE email ILIKE '%demo%' OR full_name ILIKE '%demo%'");
  console.log('Demo users:', res.rows);
  await pool.end();
}
check().catch(console.error);
