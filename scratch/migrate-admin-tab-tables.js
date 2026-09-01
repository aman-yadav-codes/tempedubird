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
    console.log("Creating inventory_items and internal_team_members tables...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100),
        category VARCHAR(100) NOT NULL DEFAULT 'General',
        quantity INT DEFAULT 0,
        min_quantity INT DEFAULT 5,
        unit VARCHAR(50) DEFAULT 'units',
        unit_price NUMERIC(12, 2) DEFAULT 0.00,
        supplier_vendor_id INT REFERENCES vendors(id) ON DELETE SET NULL,
        supplier_name VARCHAR(255),
        location VARCHAR(150),
        condition VARCHAR(50) DEFAULT 'new',
        status VARCHAR(50) DEFAULT 'in_stock',
        description TEXT,
        institution_id INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_inventory_institution_id ON inventory_items(institution_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
      CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);

      CREATE TABLE IF NOT EXISTS internal_team_members (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(150),
        phone VARCHAR(50),
        role_title VARCHAR(150) NOT NULL,
        department VARCHAR(100) DEFAULT 'Administration',
        access_level VARCHAR(50) DEFAULT 'admin',
        status VARCHAR(50) DEFAULT 'active',
        joined_date DATE DEFAULT CURRENT_DATE,
        profile_image TEXT,
        notes TEXT,
        institution_id INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_team_institution_id ON internal_team_members(institution_id);
      CREATE INDEX IF NOT EXISTS idx_team_department ON internal_team_members(department);
      CREATE INDEX IF NOT EXISTS idx_team_status ON internal_team_members(status);
    `);

    console.log("Tables created successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

main();
