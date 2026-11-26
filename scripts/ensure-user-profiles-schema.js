const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await pool.query(`
    ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS blood_group VARCHAR(20),
    ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
  `);
  console.log('user_profiles columns ensured.');
  pool.end();
}

migrate().catch(err => {
  console.error(err);
  pool.end();
});
