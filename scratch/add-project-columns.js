const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function addColumns() {
  await pool.query(`
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS project_for VARCHAR(50) DEFAULT 'own_company';
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) DEFAULT 'EduBird';
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS cost NUMERIC DEFAULT 0;
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS live_url TEXT;
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS demo_url TEXT;
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS project_leader_id INTEGER;
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS project_leader_name VARCHAR(255);
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS agreement_document_url TEXT;
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS agreement_document_name VARCHAR(255);
  `);
  console.log('Columns added successfully to operations_tasks!');
  await pool.end();
}

addColumns().catch(e => { console.error(e); pool.end(); });

