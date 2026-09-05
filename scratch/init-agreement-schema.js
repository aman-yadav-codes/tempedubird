const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS institution_agreements (
      id SERIAL PRIMARY KEY,
      institution_id INTEGER UNIQUE REFERENCES institution_profiles(id) ON DELETE CASCADE,
      platform_sale_percentage NUMERIC(5,2) DEFAULT 10.00,
      enquiry_commission NUMERIC(10,2) DEFAULT 50.00,
      affiliate_commission_percentage NUMERIC(5,2) DEFAULT 10.00,
      org_agreement_terms TEXT,
      student_terms TEXT,
      affiliate_terms TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_institution_agreements_inst_id ON institution_agreements(institution_id);
  `);
  console.log('institution_agreements table created successfully');
}

run().catch(console.error).finally(() => pool.end());
