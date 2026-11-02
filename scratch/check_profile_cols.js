const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const res = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_profiles' ORDER BY ordinal_position"
  );
  console.log('user_profiles columns:');
  res.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

  // Check user Ram
  const userRes = await pool.query("SELECT id, full_name, email FROM users WHERE full_name ILIKE '%ram%'");
  console.log('\nUsers matching ram:', userRes.rows);

  // Test what happens if we simulate updating salary account for Ram
  if (userRes.rows.length > 0) {
    const ram = userRes.rows[0];
    console.log('\nTesting query for user:', ram.id, ram.full_name);
    try {
      await pool.query(`
        INSERT INTO user_profiles (
          user_id, payment_mode, bank_name, account_holder_name, account_number,
          ifsc_code, branch_name, account_type, upi_id,
          pan_number, uan_number, esi_number, salary_notes, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          payment_mode = COALESCE(EXCLUDED.payment_mode, user_profiles.payment_mode),
          bank_name = EXCLUDED.bank_name,
          account_holder_name = EXCLUDED.account_holder_name,
          account_number = EXCLUDED.account_number,
          ifsc_code = EXCLUDED.ifsc_code,
          branch_name = EXCLUDED.branch_name,
          account_type = COALESCE(EXCLUDED.account_type, user_profiles.account_type),
          upi_id = EXCLUDED.upi_id,
          pan_number = EXCLUDED.pan_number,
          uan_number = EXCLUDED.uan_number,
          esi_number = EXCLUDED.esi_number,
          salary_notes = EXCLUDED.salary_notes,
          updated_at = NOW();
      `, [
        ram.id,
        "BANK_TRANSFER",
        "SBI",
        "Ram",
        "4343534434343434",
        "SBIN0093",
        "mumbai",
        "SAVINGS",
        null,
        "SDWW434RW",
        null,
        null,
        "test remarks"
      ]);
      console.log('Query succeeded!');
    } catch (e) {
      console.error('Query failed with error:', e.message);
    }
  }
}

check().catch(console.error).finally(() => pool.end());
