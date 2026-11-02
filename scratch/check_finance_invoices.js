const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const invCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'finance_invoices'");
  console.log('finance_invoices columns:', invCols.rows);
  await pool.end();
}
check().catch(console.error);

