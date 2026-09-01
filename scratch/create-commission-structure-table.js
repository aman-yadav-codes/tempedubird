const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_commission_structures (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        commission_type VARCHAR(50) DEFAULT 'RULES_BASED',
        commission_rate NUMERIC(10, 2) DEFAULT 0,
        commission_trigger VARCHAR(100) DEFAULT 'course_admission',
        minimum_threshold NUMERIC(12, 2),
        payout_frequency VARCHAR(50) DEFAULT 'MONTHLY',
        notes TEXT,
        rules JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_staff_commission_user UNIQUE (user_id)
      );
    `);
    console.log("Successfully created or verified staff_commission_structures table.");

    await pool.query(`
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS commission_data JSONB DEFAULT NULL;
    `);
    console.log("Successfully added commission_data column to user_profiles.");
  } catch (err) {
    console.error("Error creating commission tables:", err);
  } finally {
    await pool.end();
  }
}

main();
