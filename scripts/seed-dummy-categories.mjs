import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function insertCategoryGroup({ category_type, business_category_id, business_subcategory_id, rootName, rootDesc, children }) {
  const rootSlug = `${category_type}-${slugify(rootName)}`;

  // Check if root exists
  let rootRes = await pool.query(`
    SELECT id, slug FROM categories 
    WHERE category_type = $1 AND name = $2 AND is_deleted = false
    LIMIT 1
  `, [category_type, rootName]);

  let rootId;
  if (rootRes.rows.length === 0) {
    const insertRes = await pool.query(`
      INSERT INTO categories (
        name, slug, parent_id, depth, category_type,
        business_category_id, business_subcategory_id,
        description, is_active, is_deleted, created_at, updated_at
      ) VALUES (
        $1, $2, NULL, 1, $3,
        $4, $5,
        $6, true, false, NOW(), NOW()
      ) RETURNING id, slug
    `, [rootName, rootSlug, category_type, business_category_id, business_subcategory_id, rootDesc || null]);
    rootId = insertRes.rows[0].id;
    console.log(`  ➕ Created Root [${category_type}]: ${rootName} (ID: ${rootId})`);
  } else {
    rootId = rootRes.rows[0].id;
    console.log(`  ℹ️ Root [${category_type}]: ${rootName} already exists (ID: ${rootId})`);
  }

  // Insert children
  for (const childName of children) {
    const childSlug = `${rootSlug}-${slugify(childName)}`;
    const childCheck = await pool.query(`
      SELECT id FROM categories 
      WHERE category_type = $1 AND name = $2 AND parent_id = $3 AND is_deleted = false
      LIMIT 1
    `, [category_type, childName, rootId]);

    if (childCheck.rows.length === 0) {
      const cRes = await pool.query(`
        INSERT INTO categories (
          name, slug, parent_id, depth, category_type,
          business_category_id, business_subcategory_id,
          is_active, is_deleted, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 2, $4,
          $5, $6,
          true, false, NOW(), NOW()
        ) RETURNING id
      `, [childName, childSlug, rootId, category_type, business_category_id, business_subcategory_id]);
      console.log(`     ↳ Created Subcategory: ${childName} (ID: ${cRes.rows[0].id})`);
    } else {
      console.log(`     ↳ Subcategory exists: ${childName}`);
    }
  }
}

async function main() {
  console.log('Seeding dummy categories for Job, Vehicle, Property, Event, Dish, and Room...');

  // 1. VEHICLE CATEGORIES (under Automotive & Transport: 7800)
  console.log('\n--- 1. Vehicle Categories (type=vehicle) ---');
  await insertCategoryGroup({
    category_type: 'vehicle',
    business_category_id: 7800,
    business_subcategory_id: 7803,
    rootName: 'Passenger Cars & SUVs',
    rootDesc: 'Personal sedans, hatchbacks, utility crossovers, and electric vehicles.',
    children: [
      'Compact Sedans & Premium Saloons',
      'Sports Utility Vehicles (SUV)',
      'Hatchbacks & City Commuters',
      'Electric & Hybrid Passenger Vehicles (EV)',
    ]
  });

  await insertCategoryGroup({
    category_type: 'vehicle',
    business_category_id: 7800,
    business_subcategory_id: 7807,
    rootName: 'Commercial & Transport Vehicles',
    rootDesc: 'Heavy trucks, delivery vans, passenger buses, and haulage vehicles.',
    children: [
      'Light Commercial Trucks & Pickups',
      'Heavy Haulage & Cargo Lorries',
      'Mini Passenger Vans & Ambulances',
      'Intercity Travel Buses & Coaches',
    ]
  });

  await insertCategoryGroup({
    category_type: 'vehicle',
    business_category_id: 7800,
    business_subcategory_id: 7802,
    rootName: 'Two-Wheelers & Motorcycles',
    rootDesc: 'Commuter bikes, sports superbikes, cruisers, and electric scooters.',
    children: [
      'Commuter & Economy Bikes',
      'High Performance Sports Bikes',
      'Cruisers & Adventure Tourers',
      'Electric Scooters & Smart Mopeds',
    ]
  });

  await insertCategoryGroup({
    category_type: 'vehicle',
    business_category_id: 7800,
    business_subcategory_id: 7803,
    rootName: 'Luxury & Exotic Automobiles',
    rootDesc: 'Premium grand tourers, sports cars, and vintage classic collectibles.',
    children: [
      'Supercars & Grand Tourers',
      'Vintage & Classic Collectibles',
    ]
  });


  // 2. PROPERTY CATEGORIES (under Real Estate & Construction: 7824)
  console.log('\n--- 2. Property Categories (type=property) ---');
  await insertCategoryGroup({
    category_type: 'property',
    business_category_id: 7824,
    business_subcategory_id: 7825,
    rootName: 'Residential Real Estate',
    rootDesc: 'Apartments, villas, builder floors, and gated housing societies.',
    children: [
      'Multi-Storey Apartments & Flats',
      'Luxury Penthouses & Sky Villas',
      'Gated Community Independent Villas',
      'Studio Apartments & Builder Floors',
    ]
  });

  await insertCategoryGroup({
    category_type: 'property',
    business_category_id: 7824,
    business_subcategory_id: 7825,
    rootName: 'Commercial Properties',
    rootDesc: 'Corporate office spaces, retail showrooms, co-working desks, and shopping units.',
    children: [
      'Grade-A Corporate Office Spaces',
      'High-Street Retail Showrooms & Shops',
      'Co-Working & Shared Office Desks',
      'Mall Retail Outlets & Food Court Units',
    ]
  });

  await insertCategoryGroup({
    category_type: 'property',
    business_category_id: 7824,
    business_subcategory_id: 7826,
    rootName: 'Plots & Development Lands',
    rootDesc: 'Residential plots, highway commercial lands, and agricultural farmhouses.',
    children: [
      'Residential Freehold Plots',
      'Commercial Highway Frontage Plots',
      'Agricultural & Farmhouse Land',
    ]
  });

  await insertCategoryGroup({
    category_type: 'property',
    business_category_id: 7824,
    business_subcategory_id: 7826,
    rootName: 'Industrial & Warehousing Estates',
    rootDesc: 'Logistics hubs, cold storages, industrial sheds, and manufacturing units.',
    children: [
      'Logistics Warehouses & Cold Storages',
      'Factory Sheds & Industrial Plots',
    ]
  });


  // 3. EVENT CATEGORIES (under Hospitality & Events: 7845)
  console.log('\n--- 3. Event Categories (type=event) ---');
  await insertCategoryGroup({
    category_type: 'event',
    business_category_id: 7845,
    business_subcategory_id: 7848,
    rootName: 'Corporate & Industry Events',
    rootDesc: 'Annual summits, conferences, workshops, expos, and networking meets.',
    children: [
      'Annual Business Summits & Conferences',
      'Technical Workshops & Hackathons',
      'Product Launches & Trade Expos',
      'Executive Networking Dinners',
    ]
  });

  await insertCategoryGroup({
    category_type: 'event',
    business_category_id: 7845,
    business_subcategory_id: 7847,
    rootName: 'Weddings & Social Galas',
    rootDesc: 'Destination weddings, sangeet parties, anniversaries, and family celebrations.',
    children: [
      'Destination Royal Weddings',
      'Engagement & Sangeet Ceremonies',
      'Anniversary & Birthday Celebrations',
    ]
  });

  await insertCategoryGroup({
    category_type: 'event',
    business_category_id: 7845,
    business_subcategory_id: 7850,
    rootName: 'Live Entertainment & Cultural Shows',
    rootDesc: 'Music concerts, comedy nights, theatre festivals, and art fairs.',
    children: [
      'Music Concerts & Live Band Gigs',
      'Stand-Up Comedy & Theatrical Plays',
      'Art Exhibitions & Literature Fests',
    ]
  });

  await insertCategoryGroup({
    category_type: 'event',
    business_category_id: 7845,
    business_subcategory_id: 7848,
    rootName: 'Sports & Fitness Tournaments',
    rootDesc: 'Marathons, cricket leagues, football championships, and fitness events.',
    children: [
      'Corporate Cricket Tournaments',
      'City Marathons & Cyclothons',
    ]
  });


  // 4. DISH CATEGORIES (under Food, Dining & Cafes: 7782)
  console.log('\n--- 4. Dish Categories (type=dish) ---');
  await insertCategoryGroup({
    category_type: 'dish',
    business_category_id: 7782,
    business_subcategory_id: 7783,
    rootName: 'Starters & Appetizers',
    rootDesc: 'Tandoori grills, fried bites, soups, and steamed appetizers.',
    children: [
      'Tandoori & Clay Oven Grills',
      'Crispy Fried Finger Bites',
      'Artisanal Soups & Broths',
      'Steamed Dim Sums & Momos',
    ]
  });

  await insertCategoryGroup({
    category_type: 'dish',
    business_category_id: 7782,
    business_subcategory_id: 7783,
    rootName: 'Main Course Curries & Breads',
    rootDesc: 'Royal curries, paneer specialties, dum biryanis, and clay-oven breads.',
    children: [
      'Royal North Indian Gravies',
      'Paneer & Cottage Cheese Delicacies',
      'Dum Biryanis & Fragrant Pulao',
      'Tandoori Naans & Stuffed Kulchas',
      'Italian Pastas & Wood-Fired Pizzas',
    ]
  });

  await insertCategoryGroup({
    category_type: 'dish',
    business_category_id: 7782,
    business_subcategory_id: 7785,
    rootName: 'Bakery, Desserts & Confectionery',
    rootDesc: 'Traditional halwas, celebration cakes, artisanal waffles, and sundaes.',
    children: [
      'Traditional Indian Sweets & Halwa',
      'Celebration Cakes & Pastries',
      'Artisanal Belgian Waffles',
      'Gourmet Sundaes & Gelato',
    ]
  });

  await insertCategoryGroup({
    category_type: 'dish',
    business_category_id: 7782,
    business_subcategory_id: 7784,
    rootName: 'Beverages, Brews & Mocktails',
    rootDesc: 'Specialty coffee roasts, summer coolers, mocktails, and thick shakes.',
    children: [
      'Specialty Espresso & Cold Brews',
      'Refreshing Tropical Mocktails',
      'Signature Thick Shakes & Smoothies',
    ]
  });


  // 5. ROOM CATEGORIES (under Hospitality & Events: 7845 -> Hotels & Resorts: 7846)
  console.log('\n--- 5. Room Categories (type=room) ---');
  await insertCategoryGroup({
    category_type: 'room',
    business_category_id: 7845,
    business_subcategory_id: 7846,
    rootName: 'Hotel Guest Rooms',
    rootDesc: 'Standard, twin, deluxe king, and executive club hotel rooms.',
    children: [
      'Standard Solo / Single Rooms',
      'Superior Twin Sharing Bedrooms',
      'Deluxe King Master Bedrooms',
      'Executive Business Club Rooms',
    ]
  });

  await insertCategoryGroup({
    category_type: 'room',
    business_category_id: 7845,
    business_subcategory_id: 7846,
    rootName: 'Luxury Suites & Penthouses',
    rootDesc: 'Presidential suites, bridal jacuzzi suites, and multi-bedroom penthouses.',
    children: [
      'Presidential Panoramic Suites',
      'Bridal & Honeymoon Jacuzzi Suites',
      'Multi-Bedroom Family Suites',
    ]
  });

  await insertCategoryGroup({
    category_type: 'room',
    business_category_id: 7845,
    business_subcategory_id: 7846,
    rootName: 'Resort Cottages & Heritage Chalets',
    rootDesc: 'Private plunge pool villas, garden cottages, and wooden chalets.',
    children: [
      'Private Plunge Pool Cottages',
      'Heritage Wooden Lakeside Chalets',
      'Garden Villa Stays',
    ]
  });

  await insertCategoryGroup({
    category_type: 'room',
    business_category_id: 7845,
    business_subcategory_id: 7846,
    rootName: 'Budget & Dormitory Stays',
    rootDesc: 'Hostel bunk bed dorms, economy capsules, and compact single rooms.',
    children: [
      'Backpacker Mixed Bunk Dorms',
      'Economy Pods & Capsule Rooms',
    ]
  });


  // 6. JOB CATEGORIES (type=job) - Adding Healthcare, Hospitality, Automotive, and Real Estate jobs
  console.log('\n--- 6. Job Categories (type=job) ---');
  await insertCategoryGroup({
    category_type: 'job',
    business_category_id: 7765,
    business_subcategory_id: 7767,
    rootName: 'Healthcare & Medical Services',
    rootDesc: 'Hospital doctors, clinical nurses, pharmacists, and diagnostic technicians.',
    children: [
      'General Physician / MBBS Doctor',
      'Staff Nurse & Nursing Assistant',
      'Pharmacist & Medical Store Incharge',
      'Medical Lab Technician (DMLT)',
    ]
  });

  await insertCategoryGroup({
    category_type: 'job',
    business_category_id: 7845,
    business_subcategory_id: 7846,
    rootName: 'Hospitality, Restaurant & Culinary',
    rootDesc: 'Hotel front desk, executive chefs, bartenders, and housekeeping personnel.',
    children: [
      'Executive Chef / Head Cook',
      'Hotel Front Desk & Guest Relations',
      'Housekeeping & Facilities Supervisor',
      'Barista & Beverage Specialist',
    ]
  });

  await insertCategoryGroup({
    category_type: 'job',
    business_category_id: 7800,
    business_subcategory_id: 7801,
    rootName: 'Automotive Engineering & Operations',
    rootDesc: 'Automobile technicians, showroom consultants, and service advisors.',
    children: [
      'Senior Automobile Mechanic',
      'Showroom Sales Consultant',
      'Service Advisor & Workshop Supervisor',
    ]
  });

  await insertCategoryGroup({
    category_type: 'job',
    business_category_id: 7824,
    business_subcategory_id: 7825,
    rootName: 'Real Estate & Construction',
    rootDesc: 'Property advisors, civil site engineers, and interior designers.',
    children: [
      'Real Estate Property Advisor',
      'Civil Site Engineer & Supervisor',
      'Interior Designer & Draftsman',
    ]
  });

  console.log('\n🎉 Finished seeding all dummy categories successfully!');
  await pool.end();
}

main().catch(console.error);
