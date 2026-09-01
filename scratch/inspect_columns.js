const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name IN ('program_sections', 'institution_class_sections', 'program_languages', 'program_fee_components', 'institution_courses', 'languages', 'program_subjects')
      ORDER BY table_name, ordinal_position;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
