process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require("pg");
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log("Applying complete Business, Professional, Product & Service schema...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      institution_profile_id INTEGER,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255),
      business_type VARCHAR(100) DEFAULT 'Business',
      category_id INTEGER,
      subcategory_id INTEGER,
      category_ids INTEGER[] DEFAULT '{}',
      subcategory_ids INTEGER[] DEFAULT '{}',
      country_code VARCHAR(10) DEFAULT 'IN',
      state VARCHAR(100),
      district VARCHAR(100),
      city VARCHAR(100),
      locality VARCHAR(150),
      postal_code VARCHAR(30),
      address TEXT,
      latitude NUMERIC,
      longitude NUMERIC,
      phone VARCHAR(50),
      whatsapp VARCHAR(50),
      email VARCHAR(150),
      website VARCHAR(255),
      social_links JSONB DEFAULT '{}'::jsonb,
      opening_hours JSONB DEFAULT '{}'::jsonb,
      branches JSONB DEFAULT '[]'::jsonb,
      logo_url TEXT,
      banner_url TEXT,
      gallery_images TEXT[] DEFAULT '{}',
      about TEXT,
      custom_description TEXT,
      established_year INTEGER,
      business_started_date DATE,
      is_verified BOOLEAN DEFAULT FALSE,
      verification_status VARCHAR(50) DEFAULT 'pending',
      is_featured BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS professional_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      institution_profile_id INTEGER,
      business_profile_id INTEGER,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255),
      profession_type VARCHAR(100) DEFAULT 'Professional',
      designation VARCHAR(150),
      professional_title VARCHAR(150),
      skills TEXT[] DEFAULT '{}',
      category_id INTEGER,
      subcategory_id INTEGER,
      category_ids INTEGER[] DEFAULT '{}',
      subcategory_ids INTEGER[] DEFAULT '{}',
      country_code VARCHAR(10) DEFAULT 'IN',
      state VARCHAR(100),
      district VARCHAR(100),
      city VARCHAR(100),
      locality VARCHAR(150),
      postal_code VARCHAR(30),
      address TEXT,
      latitude NUMERIC,
      longitude NUMERIC,
      phone VARCHAR(50),
      whatsapp VARCHAR(50),
      email VARCHAR(150),
      website VARCHAR(255),
      working_hours JSONB DEFAULT '{}'::jsonb,
      avatar_url TEXT,
      banner_url TEXT,
      portfolio_images TEXT[] DEFAULT '{}',
      introduction TEXT,
      about TEXT,
      experience_years INTEGER DEFAULT 0,
      is_verified BOOLEAN DEFAULT FALSE,
      verification_status VARCHAR(50) DEFAULT 'pending',
      is_featured BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS brands (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255),
      logo_url TEXT,
      description TEXT,
      website VARCHAR(255),
      is_active BOOLEAN DEFAULT TRUE,
      category_ids INTEGER[] DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS units (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      short_symbol VARCHAR(50) NOT NULL,
      unit_type VARCHAR(20) NOT NULL DEFAULT 'product',
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      display_order INTEGER DEFAULT 0,
      category_ids INTEGER[] DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS master_products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255),
      brand_id INTEGER,
      unit_id INTEGER,
      category_id INTEGER,
      subcategory_id INTEGER,
      profile_type VARCHAR(20) DEFAULT 'business',
      business_profile_id INTEGER,
      professional_profile_id INTEGER,
      institution_id INTEGER,
      brand VARCHAR(255),
      model VARCHAR(255),
      regular_price NUMERIC DEFAULT 0,
      discounted_price NUMERIC,
      suggested_price NUMERIC DEFAULT 0,
      suggested_price_inr NUMERIC DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'INR',
      unit_quantity NUMERIC DEFAULT 1,
      stock_quantity INTEGER DEFAULT 0,
      min_order_quantity INTEGER DEFAULT 1,
      default_image_url TEXT,
      images TEXT[] DEFAULT '{}',
      description TEXT,
      synonyms TEXT[] DEFAULT '{}',
      is_available BOOLEAN DEFAULT TRUE,
      is_active BOOLEAN DEFAULT TRUE,
      listing_status VARCHAR(50) DEFAULT 'published',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS master_services (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255),
      category_id INTEGER,
      subcategory_id INTEGER,
      profile_type VARCHAR(20) DEFAULT 'business',
      business_profile_id INTEGER,
      professional_profile_id INTEGER,
      institution_id INTEGER,
      pricing_model VARCHAR(100) DEFAULT 'Fixed Price',
      regular_price NUMERIC DEFAULT 0,
      discounted_price NUMERIC,
      suggested_price NUMERIC DEFAULT 0,
      suggested_price_inr NUMERIC DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'INR',
      estimated_duration VARCHAR(100),
      service_location VARCHAR(100) DEFAULT 'Online & In-Person',
      default_image_url TEXT,
      images TEXT[] DEFAULT '{}',
      description TEXT,
      synonyms TEXT[] DEFAULT '{}',
      is_available BOOLEAN DEFAULT TRUE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_business_profiles_slug ON business_profiles(slug);
    CREATE INDEX IF NOT EXISTS idx_professional_profiles_slug ON professional_profiles(slug);
    CREATE INDEX IF NOT EXISTS idx_master_products_biz ON master_products(business_profile_id);
    CREATE INDEX IF NOT EXISTS idx_master_services_biz ON master_services(business_profile_id);
    CREATE INDEX IF NOT EXISTS idx_master_services_prof ON master_services(professional_profile_id);
  `);

  console.log("Database schema successfully verified and created!");
  await pool.end();
}

run().catch(err => {
  console.error("Migration error:", err);
  pool.end();
  process.exit(1);
});

