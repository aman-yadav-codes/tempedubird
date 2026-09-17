const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  for (const t of ['student_practice_exam_attempts', 'student_practice_exam_results', 'student_assignments', 'student_attendance']) {
    const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [t]);
    console.log(`Table: ${t}`, cols.rows.map(c => `${c.column_name}(${c.data_type})`).join(', '));
  }
  await pool.end();
}
run().catch(console.error);
