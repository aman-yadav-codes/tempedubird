const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const res = await pool.query(`
    SELECT conname, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'institution_membership_history';
  `);
  console.log('Constraints:', res.rows);
  await pool.end();
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
