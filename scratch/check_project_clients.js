const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const tasksCols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'operations_tasks' AND column_name LIKE '%client%'
    ORDER BY column_name;
  `);
  console.log('client columns in operations_tasks:', tasksCols.rows);
}
check().catch(console.error).finally(() => pool.end());
