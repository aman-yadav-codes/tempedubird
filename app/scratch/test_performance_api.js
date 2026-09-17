const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log('Testing queries...');
  // Find an active enrollment
  const enRes = await pool.query(`
    SELECT se.id, se.student_id, se.institution_id, se.program_id, se.section_id, se.academic_year_id, u.full_name
    FROM student_enrollments se
    INNER JOIN student_profiles sp ON sp.id = se.student_id
    INNER JOIN users u ON u.id = sp.user_id
    WHERE COALESCE(se.is_deleted, FALSE) = FALSE
    LIMIT 1
  `);
  console.log('Sample enrollment:', enRes.rows[0]);

  if (!enRes.rows[0]) {
    console.log('No enrollments found');
    return;
  }

  const en = enRes.rows[0];

  // Test practice exams query
  const practiceRes = await pool.query(`
    SELECT COUNT(*) FROM practice_exams WHERE institution_id = $1 AND COALESCE(exam_kind, 'practice') = 'practice'
  `, [en.institution_id]);
  console.log('Practice exams count:', practiceRes.rows[0].count);

  // Test attendance
  const attRes = await pool.query(`
    SELECT COUNT(*) FROM student_attendance WHERE student_id = $1
  `, [en.student_id]);
  console.log('Attendance records:', attRes.rows[0].count);

  // Test assignments
  const assignRes = await pool.query(`
    SELECT COUNT(*) FROM assignments WHERE institution_id = $1
  `, [en.institution_id]);
  console.log('Assignments count:', assignRes.rows[0].count);

  // Test study notes
  const notesRes = await pool.query(`
    SELECT COUNT(*) FROM study_notes WHERE institution_id = $1 OR is_public = TRUE
  `, [en.institution_id]);
  console.log('Study notes count:', notesRes.rows[0].count);

  // Create table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_note_reading_sessions (
      id BIGSERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
      enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE CASCADE,
      note_id INTEGER NOT NULL,
      reading_time_seconds INTEGER NOT NULL DEFAULT 0,
      last_read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_student_note_enrollment UNIQUE (student_id, note_id, enrollment_id)
    );
  `);
  console.log('Table student_note_reading_sessions verified/created');

  // Insert a sample reading session if empty
  const checkReading = await pool.query('SELECT COUNT(*) FROM student_note_reading_sessions WHERE student_id = $1', [en.student_id]);
  if (parseInt(checkReading.rows[0].count, 10) === 0) {
    const sampleNote = await pool.query('SELECT id FROM study_notes LIMIT 1');
    const noteId = sampleNote.rows[0]?.id || 1;
    await pool.query(`
      INSERT INTO student_note_reading_sessions (student_id, enrollment_id, note_id, reading_time_seconds, is_completed)
      VALUES ($1, $2, $3, 2400, TRUE)
      ON CONFLICT DO NOTHING
    `, [en.student_id, en.id, noteId]);
    console.log('Inserted sample reading session for student');
  }

  await pool.end();
  console.log('All queries succeeded!');
}

run().catch(console.error);
