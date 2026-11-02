const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const res = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'operations_tasks' 
    ORDER BY ordinal_position;
  `);
  console.log('Columns in operations_tasks:', res.rows);

  const sample = await pool.query(`SELECT * FROM operations_tasks LIMIT 1;`);
  console.log('Sample task row:', sample.rows[0]);

  // Also check clients table
  const clientsRes = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'clients' 
    ORDER BY ordinal_position;
  `);
  console.log('Columns in clients:', clientsRes.rows);

  const sampleClients = await pool.query(`SELECT id, name, company_name, email, phone FROM clients LIMIT 5;`);
  console.log('Sample clients:', sampleClients.rows);

  await pool.end();
}

check().catch(e => { console.error(e); pool.end(); });

