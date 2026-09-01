const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkSubjects() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('subjects', 'master_subjects', 'program_subjects')
      ORDER BY table_name, ordinal_position;
    `);
    console.log("Subject tables:", res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
checkSubjects();
