const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    // Find note-related tables
    const noteTablesRes = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%note%' ORDER BY table_name`
    );
    console.log('Note tables:', noteTablesRes.rows.map(r => r.table_name));

    // Find exam/quiz related tables
    const examTablesRes = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%exam%' OR table_name ILIKE '%quiz%' OR table_name ILIKE '%practice%') ORDER BY table_name`
    );
    console.log('Exam tables:', examTablesRes.rows.map(r => r.table_name));

    // Check practice_exam_templates for current rows
    const examCount = await client.query(
      `SELECT exam_kind, is_government_exam, COUNT(*) FROM practice_exam_templates WHERE COALESCE(is_deleted,false)=false GROUP BY exam_kind, is_government_exam ORDER BY exam_kind`
    );
    console.log('\npractice_exam_templates breakdown:', examCount.rows);

    // Check assignment_templates
    const assignCount = await client.query(
      `SELECT COUNT(*) FROM assignment_templates WHERE COALESCE(is_deleted,false)=false`
    );
    console.log('assignment_templates count:', assignCount.rows[0].count);

  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
