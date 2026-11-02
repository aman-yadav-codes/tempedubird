const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles'
      ORDER BY column_name;
    `);
    console.log('Columns in user_profiles:', res.rows.map(r => r.column_name));
    
    // Check if commission_data exists
    const hasComm = res.rows.some(r => r.column_name === 'commission_data');
    console.log('Has commission_data:', hasComm);

    // If not, add it immediately
    if (!hasComm) {
      console.log('Adding commission_data to user_profiles...');
      await pool.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS commission_data JSONB DEFAULT NULL;`);
      console.log('Added commission_data successfully!');
    }

    // Also check salary columns in user_profiles
    const salaryCols = [
      'payment_mode', 'bank_name', 'account_holder_name', 'account_number',
      'ifsc_code', 'branch_name', 'account_type', 'upi_id', 'pan_number',
      'uan_number', 'esi_number', 'salary_notes'
    ];
    for (const col of salaryCols) {
      const exists = res.rows.some(r => r.column_name === col);
      if (!exists) {
        console.log(`Adding ${col} to user_profiles...`);
        await pool.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ${col} TEXT;`);
        console.log(`Added ${col} successfully!`);
      }
    }

    // Check staff_documents, generated_letters, etc.
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Tables:', tablesRes.rows.map(r => r.table_name));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

check();

