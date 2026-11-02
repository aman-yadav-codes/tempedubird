const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'platform_company_info'");
  console.log('Columns in platform_company_info:', res.rows.map(r => r.column_name));

  const row = await pool.query("SELECT * FROM platform_company_info LIMIT 1");
  console.log('Current row:', row.rows[0]);

  const branches = await pool.query("SELECT * FROM platform_branches LIMIT 3");
  console.log('Sample branches:', branches.rows);

  await pool.end();
}
check();

