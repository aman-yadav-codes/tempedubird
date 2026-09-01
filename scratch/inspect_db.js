const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const tables = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name IN ('program_sections', 'sections', 'institution_programs', 'batches', 'course_batches', 'fees_structures', 'modules', 'course_modules')
      ORDER BY table_name, ordinal_position;
    `);
    console.log(JSON.stringify(tables.rows, null, 2));

    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND (table_name LIKE '%batch%' OR table_name LIKE '%section%' OR table_name LIKE '%program%' OR table_name LIKE '%course%' OR table_name LIKE '%module%' OR table_name LIKE '%fee%');
    `);
    console.log("Matching tables:", allTables.rows.map(r => r.table_name));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
