const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clients'");
  console.log('Columns in clients table:', cols.rows.map(r => r.column_name));

  const sample = await pool.query("SELECT id, name, company_name, email, phone, user_id FROM clients LIMIT 5");
  console.log('Sample clients:', sample.rows);

  const dinoUser = await pool.query("SELECT id, email, full_name, role_id FROM users WHERE email ILIKE '%dino%' OR full_name ILIKE '%dino%'");
  console.log('Dino user:', dinoUser.rows);

  await pool.end();
}
check();

