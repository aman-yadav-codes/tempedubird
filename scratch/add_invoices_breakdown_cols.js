const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  console.log("Adding invoices, base_price, extra_cost columns to operations_tasks...");
  await pool.query(`
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS invoices JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT 0;
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS extra_cost NUMERIC DEFAULT 0;
  `);

  // Backfill base_price from cost or price if base_price is 0 or null
  await pool.query(`
    UPDATE operations_tasks 
    SET base_price = COALESCE(NULLIF(cost, 0), NULLIF(price, 0), 0)
    WHERE base_price IS NULL OR base_price = 0;
  `);

  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'operations_tasks' 
      AND column_name IN ('invoices', 'base_price', 'extra_cost');
  `);
  console.log("Verified columns:", res.rows);
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  pool.end();
});

