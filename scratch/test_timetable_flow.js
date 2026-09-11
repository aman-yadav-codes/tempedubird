require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const programs = await pool.query(`SELECT id, title, institution_id FROM institution_programs WHERE is_deleted = FALSE LIMIT 5`);
    console.log('Programs:', programs.rows);

    if (programs.rows.length > 0) {
      const pid = programs.rows[0].id;
      const batches = await pool.query(`
        SELECT ps.program_id, ps.section_id, ps.batch_name, ps.section_name, s.name as original_section_name
        FROM program_sections ps
        LEFT JOIN sections s ON s.id = ps.section_id
        WHERE ps.program_id = $1
      `, [pid]);
      console.log('Batches for program', pid, ':', batches.rows);

      const classTeachers = await pool.query(`
        SELECT psct.id, psct.program_id, psct.section_id, COALESCE(ps.batch_name, s.name) as batch_name, s.name as section_name, u.full_name as teacher_name
        FROM program_section_class_teachers psct
        INNER JOIN sections s ON s.id = psct.section_id
        LEFT JOIN program_sections ps ON ps.program_id = psct.program_id AND ps.section_id = psct.section_id
        INNER JOIN users u ON u.id = psct.teacher_id
        LIMIT 5
      `);
      console.log('Sample Class Teachers with batch:', classTeachers.rows);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
