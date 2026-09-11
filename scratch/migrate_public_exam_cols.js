const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  await pool.query(`
    ALTER TABLE practice_exam_templates
      ADD COLUMN IF NOT EXISTS conducting_body TEXT,
      ADD COLUMN IF NOT EXISTS exam_category TEXT,
      ADD COLUMN IF NOT EXISTS official_website_url TEXT,
      ADD COLUMN IF NOT EXISTS apply_url TEXT,
      ADD COLUMN IF NOT EXISTS notification_pdf_url TEXT,
      ADD COLUMN IF NOT EXISTS application_start_date DATE,
      ADD COLUMN IF NOT EXISTS application_end_date DATE,
      ADD COLUMN IF NOT EXISTS admit_card_date DATE,
      ADD COLUMN IF NOT EXISTS eligibility_criteria TEXT,
      ADD COLUMN IF NOT EXISTS application_fee NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_government_exam BOOLEAN DEFAULT FALSE NOT NULL;
  `);
  const r = await pool.query('SELECT id, title, conducting_body, exam_category, is_government_exam, is_public, exam_date FROM practice_exam_templates ORDER BY id DESC LIMIT 5');
  console.log('Success! Columns added. Templates in DB:', r.rows);
  await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
