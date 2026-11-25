const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log('Ensuring necessary columns exist...');
  
  // 1. institution_courses
  await pool.query(`
    ALTER TABLE institution_courses 
    ADD COLUMN IF NOT EXISTS business_profile_id INT,
    ADD COLUMN IF NOT EXISTS master_course_id INT,
    ADD COLUMN IF NOT EXISTS slug TEXT,
    ADD COLUMN IF NOT EXISTS category_id INT,
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS icon_url TEXT;
  `);
  console.log('institution_courses updated.');

  // 2. staff_job_postings
  await pool.query(`
    ALTER TABLE staff_job_postings 
    ADD COLUMN IF NOT EXISTS business_profile_id INT;
  `);
  console.log('staff_job_postings updated.');

  // Check if store 96 has any foreign keys or columns needed
  const res = await pool.query(`SELECT id, name FROM business_profiles WHERE id = 96`);
  console.log('Found store 96:', res.rows[0]);

  pool.end();
}

migrate().catch(err => {
  console.error('Migration error:', err);
  pool.end();
});
