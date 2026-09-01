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
    console.log("Migrating vendors table...");
    await pool.query(`
      ALTER TABLE vendors 
      ADD COLUMN IF NOT EXISTS institution_id INT,
      ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(50) DEFAULT 'vendor',
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
      ADD COLUMN IF NOT EXISTS website VARCHAR(255),
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);

    // Verify columns
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vendors';
    `);
    console.log("Updated vendors table columns:", cols.rows.map(c => c.column_name));
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

main();
