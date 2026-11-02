process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkRoles() {
  const constraints = await pool.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'roles'::regclass
  `);
  console.log('Roles constraints:', constraints.rows);

  const roles = await pool.query(`SELECT id, name, code, institution_id FROM roles`);
  console.log('All roles in DB:');
  console.table(roles.rows);

  await pool.end();
}
checkRoles().catch(console.error);
