const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  try {
    console.log("Running migration for program_sections...");
    await pool.query(`
      ALTER TABLE program_sections
      ADD COLUMN IF NOT EXISTS batch_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS section_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS language_id INTEGER,
      ADD COLUMN IF NOT EXISTS language_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS seats_available INTEGER,
      ADD COLUMN IF NOT EXISTS max_students INTEGER,
      ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS installments_count INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS start_time VARCHAR(20),
      ADD COLUMN IF NOT EXISTS end_time VARCHAR(20),
      ADD COLUMN IF NOT EXISTS class_frequency VARCHAR(100),
      ADD COLUMN IF NOT EXISTS teaching_method VARCHAR(100),
      ADD COLUMN IF NOT EXISTS module_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS module_details TEXT,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}
migrate();
