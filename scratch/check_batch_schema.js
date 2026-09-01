const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'program_sections'
      ORDER BY ordinal_position;
    `);
    console.log('program_sections columns:', res.rows);

    const res2 = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'sections'
      ORDER BY ordinal_position;
    `);
    console.log('sections columns:', res2.rows);

    const sample = await pool.query(`SELECT * FROM program_sections LIMIT 5;`);
    console.log('program_sections sample:', sample.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
