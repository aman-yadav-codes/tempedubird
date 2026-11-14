process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log("Starting Master Platform Admin Database Migration...");

  // 1. Extend business_profiles
  await pool.query(`
    ALTER TABLE business_profiles
      ADD COLUMN IF NOT EXISTS category_ids INTEGER[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS subcategory_ids INTEGER[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS business_started_date DATE,
      ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';
  `);
  console.log("[OK] Updated business_profiles table");

  // 2. Extend professional_profiles
  await pool.query(`
    ALTER TABLE professional_profiles
      ADD COLUMN IF NOT EXISTS category_ids INTEGER[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS subcategory_ids INTEGER[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS portfolio_images TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
  `);
  console.log("[OK] Updated professional_profiles table");

  // 3. Create brands table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS brands (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      logo_url TEXT,
      description TEXT,
      website VARCHAR(255),
      is_active BOOLEAN DEFAULT TRUE,
      category_ids INTEGER[] DEFAULT '{}',
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_name_lower ON brands (LOWER(TRIM(name)));
    CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_slug ON brands (slug);
  `);
  console.log("[OK] Created/verified brands table");

  // 4. Create units table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS units (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      short_symbol VARCHAR(50) NOT NULL,
      unit_type VARCHAR(20) NOT NULL, -- 'product' or 'service'
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      display_order INTEGER DEFAULT 0,
      category_ids INTEGER[] DEFAULT '{}',
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_units_name_type ON units (LOWER(TRIM(name)), unit_type);
  `);
  console.log("[OK] Created/verified units table");

  // 5. Create currencies table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS currencies (
      code VARCHAR(10) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      symbol VARCHAR(10) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    );
  `);
  console.log("[OK] Created/verified currencies table");

  // 6. Extend master_products table
  await pool.query(`
    ALTER TABLE master_products
      ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS profile_type VARCHAR(20) DEFAULT 'business',
      ADD COLUMN IF NOT EXISTS business_profile_id INTEGER REFERENCES business_profiles(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS professional_profile_id INTEGER REFERENCES professional_profiles(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS regular_price NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discounted_price NUMERIC,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
      ADD COLUMN IF NOT EXISTS unit_quantity NUMERIC DEFAULT 1,
      ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS tax_gst NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS listing_status VARCHAR(50) DEFAULT 'published',
      ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
  `);
  console.log("[OK] Extended master_products table");

  // 7. Extend master_services table
  await pool.query(`
    ALTER TABLE master_services
      ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS profile_type VARCHAR(20) DEFAULT 'business',
      ADD COLUMN IF NOT EXISTS business_profile_id INTEGER REFERENCES business_profiles(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS professional_profile_id INTEGER REFERENCES professional_profiles(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS regular_price NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discounted_price NUMERIC,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
      ADD COLUMN IF NOT EXISTS unit_quantity NUMERIC DEFAULT 1,
      ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(100),
      ADD COLUMN IF NOT EXISTS service_location VARCHAR(100) DEFAULT 'Online',
      ADD COLUMN IF NOT EXISTS tax_gst NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS packages JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(50) DEFAULT 'fixed_price',
      ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS listing_status VARCHAR(50) DEFAULT 'published',
      ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
  `);
  console.log("[OK] Extended master_services table");

  // 8. Add indexes for fast lookup and relational integrity
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(category_type);
    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
    CREATE INDEX IF NOT EXISTS idx_mp_brand ON master_products(brand_id);
    CREATE INDEX IF NOT EXISTS idx_mp_unit ON master_products(unit_id);
    CREATE INDEX IF NOT EXISTS idx_mp_business_profile ON master_products(business_profile_id);
    CREATE INDEX IF NOT EXISTS idx_mp_prof_profile ON master_products(professional_profile_id);
    CREATE INDEX IF NOT EXISTS idx_ms_unit ON master_services(unit_id);
    CREATE INDEX IF NOT EXISTS idx_ms_business_profile ON master_services(business_profile_id);
    CREATE INDEX IF NOT EXISTS idx_ms_prof_profile ON master_services(professional_profile_id);
  `);
  console.log("[OK] Created relational indexes");

  console.log("\nMaster Migration Completed Successfully!");
  await pool.end();
}

main().catch(err => {
  console.error("Migration error:", err);
  pool.end();
  process.exit(1);
});

