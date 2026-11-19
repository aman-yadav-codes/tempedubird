import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const { db } = await import("../../lib/db/db.js");

  console.log("Running marketing features migration...");

  await db.query(`
    CREATE TABLE IF NOT EXISTS marketing_vehicles (
      id SERIAL PRIMARY KEY,
      institution_id INT,
      business_profile_id INT,
      created_by INT,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255),
      brand VARCHAR(100),
      model VARCHAR(100),
      vehicle_type VARCHAR(50),
      fuel_type VARCHAR(50),
      transmission VARCHAR(50),
      seating_capacity INT DEFAULT 5,
      year INT,
      registration_number VARCHAR(100),
      price NUMERIC(12, 2),
      rental_price_per_day NUMERIC(12, 2),
      rental_price_per_hour NUMERIC(12, 2),
      mileage VARCHAR(50),
      color VARCHAR(50),
      features JSONB DEFAULT '[]'::jsonb,
      image_url TEXT,
      gallery JSONB DEFAULT '[]'::jsonb,
      description TEXT,
      status VARCHAR(50) DEFAULT 'available',
      is_featured BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS marketing_properties (
      id SERIAL PRIMARY KEY,
      institution_id INT,
      business_profile_id INT,
      created_by INT,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255),
      property_type VARCHAR(100),
      listing_type VARCHAR(50) DEFAULT 'For Sale',
      price NUMERIC(14, 2) NOT NULL DEFAULT 0,
      price_prefix VARCHAR(50) DEFAULT '₹',
      price_suffix VARCHAR(50) DEFAULT '',
      bedrooms INT DEFAULT 2,
      bathrooms INT DEFAULT 2,
      balconies INT DEFAULT 1,
      area_sqft NUMERIC(10, 2),
      carpet_area_sqft NUMERIC(10, 2),
      furnishing VARCHAR(50) DEFAULT 'Semi-Furnished',
      floor_number VARCHAR(50),
      facing VARCHAR(50),
      address TEXT,
      locality VARCHAR(150),
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(20),
      amenities JSONB DEFAULT '[]'::jsonb,
      image_url TEXT,
      gallery JSONB DEFAULT '[]'::jsonb,
      description TEXT,
      possession_status VARCHAR(50) DEFAULT 'Ready to Move',
      status VARCHAR(50) DEFAULT 'available',
      is_featured BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS marketing_events (
      id SERIAL PRIMARY KEY,
      institution_id INT,
      business_profile_id INT,
      created_by INT,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255),
      event_category VARCHAR(100),
      event_type VARCHAR(50) DEFAULT 'Venue Package',
      price NUMERIC(12, 2) DEFAULT 0,
      price_model VARCHAR(50) DEFAULT 'per_package',
      guest_capacity_min INT DEFAULT 50,
      guest_capacity_max INT DEFAULT 500,
      start_date TIMESTAMP,
      end_date TIMESTAMP,
      duration VARCHAR(100),
      venue_name VARCHAR(150),
      venue_type VARCHAR(50),
      location TEXT,
      inclusions JSONB DEFAULT '[]'::jsonb,
      image_url TEXT,
      gallery JSONB DEFAULT '[]'::jsonb,
      description TEXT,
      status VARCHAR(50) DEFAULT 'active',
      is_featured BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS marketing_dishes (
      id SERIAL PRIMARY KEY,
      institution_id INT,
      business_profile_id INT,
      created_by INT,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255),
      category VARCHAR(100),
      diet_type VARCHAR(50) DEFAULT 'veg',
      price NUMERIC(10, 2) NOT NULL DEFAULT 0,
      sale_price NUMERIC(10, 2),
      preparation_time VARCHAR(50),
      portion_size VARCHAR(50),
      spice_level VARCHAR(50) DEFAULT 'Medium',
      calories VARCHAR(50),
      dietary_tags JSONB DEFAULT '[]'::jsonb,
      ingredients TEXT,
      image_url TEXT,
      description TEXT,
      status VARCHAR(50) DEFAULT 'available',
      is_featured BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS marketing_rooms (
      id SERIAL PRIMARY KEY,
      institution_id INT,
      business_profile_id INT,
      created_by INT,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255),
      room_type VARCHAR(100),
      price_per_night NUMERIC(10, 2) NOT NULL DEFAULT 0,
      weekend_price NUMERIC(10, 2),
      max_adults INT DEFAULT 2,
      max_children INT DEFAULT 1,
      bed_type VARCHAR(100) DEFAULT '1 King Bed',
      room_size_sqft NUMERIC(8, 2),
      view_type VARCHAR(100),
      amenities JSONB DEFAULT '[]'::jsonb,
      check_in_time VARCHAR(50) DEFAULT '02:00 PM',
      check_out_time VARCHAR(50) DEFAULT '11:00 AM',
      image_url TEXT,
      gallery JSONB DEFAULT '[]'::jsonb,
      description TEXT,
      status VARCHAR(50) DEFAULT 'available',
      is_featured BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Insert modules into system_modules if they don't exist
  const modulesToInsert = [
    {
      module_key: "marketing_vehicles",
      module_name: "Vehicles",
      parent_module_id: 18,
      route: "/admin/marketing/vehicles",
      icon: "Car",
      display_order: 12,
      description: "Manage vehicles, car rentals, transport, fleet listings and details.",
    },
    {
      module_key: "marketing_properties",
      module_name: "Properties",
      parent_module_id: 18,
      route: "/admin/marketing/properties",
      icon: "Building2",
      display_order: 13,
      description: "Manage real estate, commercial and residential property listings.",
    },
    {
      module_key: "marketing_events",
      module_name: "Events",
      parent_module_id: 18,
      route: "/admin/marketing/events",
      icon: "CalendarDays",
      display_order: 14,
      description: "Manage event packages, banquet bookings, venue packages and celebrations.",
    },
    {
      module_key: "marketing_dishes",
      module_name: "Dishes & Menu",
      parent_module_id: 18,
      route: "/admin/marketing/dishes",
      icon: "UtensilsCrossed",
      display_order: 15,
      description: "Manage restaurant dishes, food menus, beverages and dining catalog.",
    },
    {
      module_key: "marketing_rooms",
      module_name: "Rooms & Stays",
      parent_module_id: 18,
      route: "/admin/marketing/rooms",
      icon: "BedDouble",
      display_order: 16,
      description: "Manage hotel rooms, resort suites, guest stays and room amenities.",
    },
  ];

  for (const m of modulesToInsert) {
    const existing = await db.query(
      "SELECT id FROM system_modules WHERE module_key = $1",
      [m.module_key]
    );
    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO system_modules (module_key, module_name, parent_module_id, route, icon, display_order, description, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())`,
        [m.module_key, m.module_name, m.parent_module_id, m.route, m.icon, m.display_order, m.description]
      );
      console.log(`Inserted system_module: ${m.module_key}`);
    } else {
      console.log(`System module already exists: ${m.module_key}`);
    }
  }

  console.log("Migration finished successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
