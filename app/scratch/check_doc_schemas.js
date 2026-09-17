const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    const t1 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'student_documents'");
    console.log('student_documents cols:', t1.rows.map(r => `${r.column_name} (${r.data_type})`));
    
    const t2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'institution_generated_documents'");
    console.log('institution_generated_documents cols:', t2.rows.map(r => `${r.column_name} (${r.data_type})`));
    
    const t3 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'student_id_cards'");
    console.log('student_id_cards cols:', t3.rows.map(r => `${r.column_name} (${r.data_type})`));

    // Sample data
    const d1 = await pool.query("SELECT * FROM student_documents LIMIT 3");
    console.log('sample student_documents:', d1.rows);

    const d2 = await pool.query("SELECT id, title, document_type, reference_type, reference_id, image_url, pdf_url, created_at FROM institution_generated_documents LIMIT 3");
    console.log('sample institution_generated_documents:', d2.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
