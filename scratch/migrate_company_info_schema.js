const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  await pool.query(`
    ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS certified_or_affiliated_with TEXT;
    ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS cin_number VARCHAR(100);
  `);
  console.log('Successfully altered platform_company_info table with certified_or_affiliated_with and cin_number.');
  await pool.end();
}
migrate();

