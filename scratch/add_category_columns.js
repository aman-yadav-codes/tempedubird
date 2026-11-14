process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log("Adding category_type, business_category_id, business_subcategory_id to categories...");
  await pool.query(`
    ALTER TABLE categories 
    ADD COLUMN IF NOT EXISTS category_type TEXT DEFAULT 'business',
    ADD COLUMN IF NOT EXISTS business_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS business_subcategory_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_categories_category_type ON categories(category_type);
    CREATE INDEX IF NOT EXISTS idx_categories_biz_cat ON categories(business_category_id);
    CREATE INDEX IF NOT EXISTS idx_categories_biz_subcat ON categories(business_subcategory_id);
  `);
  console.log("Columns added successfully!");

  // Check top level categories
  const r = await pool.query(`
    SELECT id, name, slug, parent_id, depth, category_type 
    FROM categories 
    WHERE parent_id IS NULL OR depth <= 1
    ORDER BY id ASC
    LIMIT 20
  `);
  console.log("Root categories sample:", r.rows);

  await pool.end();
}

main().catch(err => {
  console.error("Migration error:", err);
  pool.end();
  process.exit(1);
});

