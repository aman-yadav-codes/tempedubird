const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  // Find a program and section to test with
  const progRes = await pool.query(`
    SELECT ip.id as program_id, s.id as section_id, ay.id as academic_year_id
    FROM institution_programs ip
    JOIN program_sections ps ON ps.program_id = ip.id
    JOIN sections s ON s.id = ps.section_id
    JOIN academic_years ay ON ay.institution_id = ip.institution_id
    LIMIT 1;
  `);

  if (!progRes.rows.length) {
    console.log('No program/section/academic_year found');
    await pool.end();
    return;
  }

  const { program_id, section_id, academic_year_id } = progRes.rows[0];
  console.log('Testing with:', { program_id, section_id, academic_year_id });

  const query = `
    SELECT
      te.id,
      te.day_of_week,
      te.slot_id,
      te.subject_id,
      s.name AS subject_name,
      COALESCE(te.teacher_id, pst.teacher_id) AS teacher_id,
      u.full_name AS teacher_name
    FROM timetable_entries te
    LEFT JOIN subjects s ON s.id = te.subject_id
    LEFT JOIN program_subject_teachers pst
      ON pst.program_id = te.program_id
      AND pst.section_id = te.section_id
      AND pst.academic_year_id = te.academic_year_id
      AND pst.subject_id = te.subject_id
    LEFT JOIN users u ON u.id = COALESCE(te.teacher_id, pst.teacher_id)
    WHERE te.program_id = $1
      AND te.section_id = $2
      AND te.academic_year_id = $3
    ORDER BY te.day_of_week ASC, te.slot_id ASC
  `;

  const res = await pool.query(query, [program_id, section_id, academic_year_id]);
  console.log('Query executed successfully! Rows returned:', res.rows.length);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
