process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log("Checking and adding business_category_id and business_subcategory_id to categories...");
  await pool.query(`
    ALTER TABLE categories 
    ADD COLUMN IF NOT EXISTS business_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS business_subcategory_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_categories_biz_cat ON categories(business_category_id);
    CREATE INDEX IF NOT EXISTS idx_categories_biz_subcat ON categories(business_subcategory_id);
    CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(category_type);
  `);
  console.log("Columns and indexes added successfully!");
  await pool.end();
}
main().catch(err => {
  console.error("Migration error:", err);
  pool.end();
  process.exit(1);
});

