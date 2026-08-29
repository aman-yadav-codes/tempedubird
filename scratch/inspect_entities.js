const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM institution_programs) AS programs_count,
        (SELECT COUNT(*) FROM institution_profiles) AS institutions_count,
        (SELECT COUNT(*) FROM entrance_exams) AS exams_count,
        (SELECT COUNT(*) FROM practice_tests) AS practice_tests_count,
        (SELECT COUNT(*) FROM practice_exams) AS practice_exams_count,
        (SELECT COUNT(*) FROM study_notes) AS study_notes_count,
        (SELECT COUNT(*) FROM notes) AS notes_count,
        (SELECT COUNT(*) FROM users) AS users_count,
        (SELECT COUNT(*) FROM entity_reviews) AS entity_reviews_count
    `);
    console.log("Counts:", counts.rows[0]);

    const samplePrograms = await pool.query(`SELECT id, name, institution_id FROM institution_programs LIMIT 10`);
    console.log("Sample programs:", samplePrograms.rows);

    const sampleInst = await pool.query(`SELECT id, name FROM institution_profiles LIMIT 10`);
    console.log("Sample institutions:", sampleInst.rows);

    const sampleExams = await pool.query(`SELECT id, exam_name, institution_id FROM entrance_exams LIMIT 10`);
    console.log("Sample entrance_exams:", sampleExams.rows);

    const samplePractice = await pool.query(`SELECT id, title, institution_id FROM practice_tests LIMIT 10`);
    console.log("Sample practice_tests:", samplePractice.rows);

    const sampleNotes = await pool.query(`SELECT id, institution_id, subject_id FROM study_notes LIMIT 10`);
    console.log("Sample study_notes:", sampleNotes.rows);

    const sampleTeachers = await pool.query(`
      SELECT DISTINCT ON (u.id) u.id, u.full_name, im.institution_id
      FROM users u
      LEFT JOIN institution_memberships im ON im.user_id = u.id
      LEFT JOIN roles r ON r.id = im.role_id
      WHERE r.code ILIKE '%teacher%' OR r.code ILIKE '%faculty%' OR u.email ILIKE '%teacher%'
      LIMIT 10
    `);
    console.log("Sample teachers:", sampleTeachers.rows);

    const sampleUsers = await pool.query(`
      SELECT id, full_name, email, role_id FROM users ORDER BY id ASC LIMIT 10
    `);
    console.log("Sample users for reviewer:", sampleUsers.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
