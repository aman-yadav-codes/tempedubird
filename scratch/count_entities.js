const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const students = await pool.query(`
      SELECT u.id, u.full_name, u.email, r.code as role_code
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.is_active = TRUE
      LIMIT 20
    `);
    console.log("Active users for review authors:", students.rows);

    const distinctCourseIds = await pool.query(`SELECT id, title, institution_id FROM institution_programs WHERE COALESCE(is_deleted, FALSE) = FALSE`);
    console.log("Total active courses:", distinctCourseIds.rows.length);

    const distinctInstIds = await pool.query(`SELECT id, name FROM institution_profiles WHERE COALESCE(is_deleted, FALSE) = FALSE`);
    console.log("Total active institutions:", distinctInstIds.rows.length);

    const distinctExams = await pool.query(`SELECT id, exam_name, institution_id FROM entrance_exams`);
    console.log("Total entrance exams:", distinctExams.rows.length);

    const distinctPractice = await pool.query(`SELECT id, title, institution_id FROM practice_tests`);
    console.log("Total practice tests:", distinctPractice.rows.length);

    const distinctPracticeExams = await pool.query(`SELECT id, title, institution_id FROM practice_exams WHERE COALESCE(is_deleted, FALSE) = FALSE`);
    console.log("Total practice exams:", distinctPracticeExams.rows.length);

    const distinctNotes = await pool.query(`SELECT id, title, institution_id FROM study_notes WHERE COALESCE(is_deleted, FALSE) = FALSE`);
    console.log("Total study notes:", distinctNotes.rows.length);

    const distinctNotesOld = await pool.query(`SELECT id, institution_id FROM notes WHERE COALESCE(is_active, TRUE) = TRUE`);
    console.log("Total notes table:", distinctNotesOld.rows.length);

    const distinctTeachers = await pool.query(`
      SELECT DISTINCT ON (u.id) u.id, u.full_name, im.institution_id
      FROM users u
      LEFT JOIN institution_memberships im ON im.user_id = u.id
      LEFT JOIN roles r ON r.id = im.role_id
      WHERE r.code ILIKE '%teacher%' OR r.code ILIKE '%faculty%' OR u.email ILIKE '%teacher%'
    `);
    console.log("Total teacher users:", distinctTeachers.rows.length);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
