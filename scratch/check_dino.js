const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const mems = await pool.query(`SELECT * FROM institution_memberships WHERE user_id = 29`);
  console.log('Memberships:', mems.rows);
  const roles = await pool.query(`SELECT r.* FROM roles r JOIN institution_memberships im ON im.role_id = r.id WHERE im.user_id = 29`);
  console.log('Roles:', roles.rows);
}
check().catch(console.error).finally(() => pool.end());
