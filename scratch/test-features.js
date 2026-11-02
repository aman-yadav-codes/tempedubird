const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  console.log('Testing Database records and queries...');

  // 1. Check user 88 (Ram)
  const userRes = await pool.query(`SELECT id, full_name, email FROM users WHERE id = 88;`);
  console.log('User 88:', userRes.rows[0]);

  // 2. Test user_profiles salary fields update
  await pool.query(`
    UPDATE user_profiles 
    SET bank_name = 'State Bank of India',
        account_holder_name = 'Ram',
        account_number = '4343534434343434',
        ifsc_code = 'SBIN0093',
        branch_name = 'Mumbai Main',
        pan_number = 'SDWW434RW',
        salary_notes = 'Verified bank account'
    WHERE user_id = 88;
  `);
  console.log('Updated user 88 salary account in DB successfully!');

  // Verify read back
  const readRes = await pool.query(`
    SELECT bank_name, account_holder_name, account_number, ifsc_code, pan_number, salary_notes
    FROM user_profiles WHERE user_id = 88;
  `);
  console.log('Read back salary account for 88:', readRes.rows[0]);

  // 3. Test salary slip table
  const slipCount = await pool.query(`SELECT COUNT(*)::int as count FROM staff_generated_letters WHERE letter_type = 'salary_slip';`);
  console.log('Current salary slips count:', slipCount.rows[0].count);

  await pool.end();
}

test().catch(err => {
  console.error('Test error:', err);
  pool.end();
});

