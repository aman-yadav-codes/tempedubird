const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'document_templates' ORDER BY ordinal_position;`);
  console.log('document_templates columns:', res.rows);
  const rows = await pool.query(`SELECT * FROM document_templates LIMIT 5;`);
  console.log('Sample rows:', rows.rows);
  pool.end();
}
run();

