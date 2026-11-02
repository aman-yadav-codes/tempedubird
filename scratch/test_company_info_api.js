const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  await pool.query(`
    UPDATE platform_company_info
    SET certified_or_affiliated_with = 'ISO 9001:2015 Certified, UGC & CBSE Recognized'
    WHERE id = 1
  `);
  const res = await pool.query("SELECT id, company_name, logo_url, registration_no, gstin, certified_or_affiliated_with FROM platform_company_info WHERE id = 1");
  console.log('Saved row:', res.rows[0]);
  await pool.end();
}
test();

