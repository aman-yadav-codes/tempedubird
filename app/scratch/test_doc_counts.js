const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const sCards = await pool.query('SELECT student_id, COUNT(*) FROM student_id_cards GROUP BY student_id');
    console.log('student_id_cards by student_id:', sCards.rows);
    const sDocs = await pool.query('SELECT student_id, COUNT(*) FROM student_documents GROUP BY student_id');
    console.log('student_documents by student_id:', sDocs.rows);
    const gDocs = await pool.query('SELECT reference_id, COUNT(*) FROM institution_generated_documents WHERE reference_type = $1 GROUP BY reference_id', ['student']);
    console.log('institution_generated_documents by student_id:', gDocs.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
