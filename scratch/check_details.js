process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkDetails() {
  const profiles = await pool.query(`
    SELECT up.user_id, up.under_institution_id, u.full_name, u.email
    FROM user_profiles up
    JOIN users u ON u.id = up.user_id
    WHERE up.under_institution_id IS NULL OR up.under_institution_id != 1
  `);
  console.log('Profiles not under institution 1 count:', profiles.rows.length);
  console.log('Profiles not under institution 1:', profiles.rows);

  const tables = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND (
      table_name ILIKE '%finance%' OR
      table_name ILIKE '%expense%' OR
      table_name ILIKE '%income%' OR
      table_name ILIKE '%company%' OR
      table_name ILIKE '%client%' OR
      table_name ILIKE '%task%' OR
      table_name ILIKE '%invoice%'
    )
  `);
  console.log('Relevant tables:', tables.rows.map(r => r.table_name));

  await pool.end();
}
checkDetails().catch(console.error);
