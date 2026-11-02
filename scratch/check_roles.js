process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const cons = await pool.query(`
    SELECT conname, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'roles'
  `);
  console.log('Constraints on roles:', cons.rows);

  const roles = await pool.query('SELECT id, name, code, scope_id, is_system, is_deleted FROM roles ORDER BY id');
  console.log('Roles in DB:');
  console.table(roles.rows);
  await pool.end();
}
check().catch(console.error);
