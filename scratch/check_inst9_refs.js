process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkReferences() {
  const tables = [
    'institution_memberships', 'user_profiles', 'operations_tasks', 'clients',
    'student_profiles', 'student_enrollments'
  ];
  for (const t of tables) {
    try {
      const res = await pool.query(`SELECT COUNT(*) as c FROM ${t} WHERE institution_id = 9`);
      console.log(`${t} has ${res.rows[0].c} with institution_id = 9`);
    } catch (e) {
      try {
        const res2 = await pool.query(`SELECT COUNT(*) as c FROM ${t} WHERE under_institution_id = 9`);
        console.log(`${t} has ${res2.rows[0].c} with under_institution_id = 9`);
      } catch {}
    }
  }
  await pool.end();
}
checkReferences().catch(console.error);
