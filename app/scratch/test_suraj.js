const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const sId = 1;
    const q1 = await pool.query(
      `SELECT card.id, card.title, card.version, card.created_at
       FROM student_id_cards card
       WHERE card.student_id = $1 AND COALESCE(card.is_deleted, FALSE) = FALSE`,
      [sId]
    );
    console.log('ID cards for Suraj:', q1.rows);

    const q2 = await pool.query(
      `SELECT doc.id, doc.title, doc.reference_type, doc.version, doc.created_at
       FROM institution_generated_documents doc
       WHERE doc.reference_id = $1 AND COALESCE(doc.is_deleted, FALSE) = FALSE`,
      [sId]
    );
    console.log('Generated docs for Suraj:', q2.rows);

    const q3 = await pool.query(
      `SELECT sd.id, sd.document_type, sd.document_number, sd.file_url, sd.is_verified, sd.created_at
       FROM student_documents sd
       WHERE sd.student_id = $1 AND COALESCE(sd.is_deleted, FALSE) = FALSE`,
      [sId]
    );
    console.log('Uploaded docs for Suraj:', q3.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
