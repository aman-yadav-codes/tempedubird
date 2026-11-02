const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%invoice%'");
  console.log('Invoice tables:', tables.rows);
  const taskCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'operations_tasks'");
  console.log('operations_tasks columns:', taskCols.rows.map(r => r.column_name));
  await pool.end();
}
check().catch(console.error);

