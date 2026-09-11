const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    // Check study_notes columns
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'study_notes' ORDER BY ordinal_position`
    );
    console.log('study_notes columns:', cols.rows.map(r => r.column_name).join(', '));

    // Check notes columns
    const cols2 = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'notes' ORDER BY ordinal_position`
    );
    console.log('notes columns:', cols2.rows.map(r => r.column_name).join(', '));

    // Check entrance_exams columns
    const cols3 = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'entrance_exams' ORDER BY ordinal_position`
    );
    console.log('entrance_exams columns:', cols3.rows.map(r => r.column_name).join(', '));

    // Show a sample study_notes row to understand the structure
    const sample = await client.query(`SELECT * FROM study_notes LIMIT 1`);
    console.log('\nstudy_notes sample:', sample.rows[0]);

  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
