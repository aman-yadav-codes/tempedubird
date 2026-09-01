const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function verify() {
  try {
    const res = await pool.query(`
      SELECT 
        ps.program_id,
        ps.section_id,
        ps.batch_name,
        ps.section_name,
        ps.language_name,
        ps.seats_available,
        ps.price,
        ps.discount_percent,
        ps.installments_count,
        ps.start_time,
        ps.end_time,
        ps.class_frequency,
        ps.teaching_method,
        ps.module_name,
        s.name AS section_title
      FROM program_sections ps
      JOIN sections s ON s.id = ps.section_id
      LIMIT 5;
    `);
    console.log("Verified program_sections rows:", res.rows);
  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await pool.end();
  }
}
verify();
