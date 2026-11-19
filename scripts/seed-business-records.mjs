import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  console.log("🌱 Starting Seeding of Dynamic Business Records linked to Master Data...");
  await client.connect();

  // Find business_id 160 or fallback to first business profile
  const bizCheck = await client.query("SELECT id, name, institution_profile_id FROM business_profiles WHERE id = 160 LIMIT 1");
  const biz = bizCheck.rows[0] || (await client.query("SELECT id, name, institution_profile_id FROM business_profiles ORDER BY id ASC LIMIT 1")).rows[0];
  if (!biz) {
    console.error("No business profile found in database!");
    return;
  }
  const bizId = biz.id;
  const instId = biz.institution_profile_id || biz.id;
  console.log(`Using Business #${bizId} ("${biz.name}") / Inst #${instId}`);

  // Fetch Master Data references helper
  async function getMaster(typeCode, search = "") {
    let sql = `
      SELECT r.id, r.name, r.slug
      FROM master_records r
      JOIN master_types mt ON mt.id = r.master_type_id
      WHERE LOWER(mt.code) = LOWER($1)
    `;
    const params = [typeCode];
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND r.name ILIKE $2`;
    }
    sql += ` ORDER BY r.id ASC LIMIT 1`;
    const res = await client.query(sql, params);
    return res.rows[0] || null;
  }

  async function getMasterList(typeCode, limit = 5) {
    const sql = `
      SELECT r.id, r.name, r.slug
      FROM master_records r
      JOIN master_types mt ON mt.id = r.master_type_id
      WHERE LOWER(mt.code) = LOWER($1)
      ORDER BY r.display_order ASC, r.id ASC LIMIT $2
    `;
    const res = await client.query(sql, [typeCode, limit]);
    return res.rows;
  }

  await client.query("BEGIN;");

  try {
    // --------------------------------------------------------------------------
    // A. SEED VEHICLES
    // --------------------------------------------------------------------------
    console.log("🚗 Seeding Vehicles...");
    const vTypes = await getMasterList("vehicle_types", 3);
    const vBrands = await getMasterList("vehicle_brands", 3);
    const vModels = await getMasterList("vehicle_models", 3);
    const vVariants = await getMasterList("vehicle_variants", 3);
    const vFuel = await getMaster("fuel_types", "Petrol") || await getMaster("fuel_types");
    const vTrans = await getMaster("transmission_types", "Automatic") || await getMaster("transmission_types");
    const vBody = await getMaster("body_types", "SUV") || await getMaster("body_types");
    const vCond = await getMaster("vehicle_conditions", "Used") || await getMaster("vehicle_conditions");

    const vehicleItems = [
      {
        title: "2024 Toyota Fortuner Legender 4x4",
        slug: "2024-toyota-fortuner-legender-4x4",
        price: 4650000,
        year: 2024,
        regYear: 2024,
        color: "Pearl White",
        engine: "2755 cc",
        mileage: "14.2 kmpl",
        kms: 12000,
        regNo: "UP65-DF-9988",
        featuredImg: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
        desc: "Mint condition Toyota Fortuner Legender. Single owner, dealer serviced with zero accident history.",
      },
      {
        title: "2023 Hyundai Creta SX (O) Turbo Petrol",
        slug: "2023-hyundai-creta-sx-o-turbo-petrol",
        price: 1850000,
        year: 2023,
        regYear: 2023,
        color: "Phantom Black",
        engine: "1482 cc",
        mileage: "17.4 kmpl",
        kms: 18500,
        regNo: "UP65-AK-1234",
        featuredImg: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
        desc: "Fully loaded Hyundai Creta with panoramic sunroof, Bose audio, ventilated seats, and ADAS.",
      },
      {
        title: "2022 Honda City ZX CVT i-VTEC",
        slug: "2022-honda-city-zx-cvt-i-vtec",
        price: 1320000,
        year: 2022,
        regYear: 2022,
        color: "Radiant Red",
        engine: "1498 cc",
        mileage: "18.4 kmpl",
        kms: 28000,
        regNo: "UP65-BC-5678",
        featuredImg: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
        desc: "Immaculate Honda City top-end automatic sedan. Complete service records at authorized dealership.",
      }
    ];

    for (const v of vehicleItems) {
      const rec = await client.query(`
        INSERT INTO business_records (
          business_id, institution_id, vertical_id, vertical_code, title, slug,
          description, status, is_active, is_featured, currency, price, featured_image
        ) VALUES (
          $1, $2, 1, 'vehicles', $3, $4, $5, 'published', TRUE, TRUE, 'INR', $6, $7
        )
        ON CONFLICT (business_id, slug, is_deleted) DO UPDATE SET price = EXCLUDED.price
        RETURNING id
      `, [bizId, instId, v.title, v.slug, v.desc, v.price, v.featuredImg]);

      const recId = rec.rows[0].id;

      await client.query(`
        INSERT INTO vehicle_details (
          record_id, vehicle_type_id, brand_id, model_id, variant_id,
          fuel_type_id, transmission_type_id, body_type_id, vehicle_condition_id,
          manufacturing_year, registration_year, color, engine_capacity,
          mileage, kilometers_driven, registration_number, is_negotiable, financing_available,
          location, contact_info
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, TRUE, TRUE, 'Varanasi, UP', '+91 98765 43210'
        )
        ON CONFLICT (record_id) DO NOTHING
      `, [
        recId,
        vTypes[0]?.id || null,
        vBrands[0]?.id || null,
        vModels[0]?.id || null,
        vVariants[0]?.id || null,
        vFuel?.id || null,
        vTrans?.id || null,
        vBody?.id || null,
        vCond?.id || null,
        v.year,
        v.regYear,
        v.color,
        v.engine,
        v.mileage,
        v.kms,
        v.regNo,
      ]);

      await client.query(`
        INSERT INTO business_record_media (record_id, media_type, url, title, is_featured)
        VALUES ($1, 'image', $2, 'Exterior View', TRUE)
        ON CONFLICT DO NOTHING
      `, [recId, v.featuredImg]);
    }

    // --------------------------------------------------------------------------
    // B. SEED PROPERTIES
    // --------------------------------------------------------------------------
    console.log("🏢 Seeding Properties...");
    const pCat = await getMaster("property_categories", "Residential") || await getMaster("property_categories");
    const pSubcat = await getMaster("property_subcategories", "Apartment") || await getMaster("property_subcategories");
    const pType = await getMaster("property_types", "Apartment") || await getMaster("property_types");
    const pListing = await getMaster("listing_types", "For Sale") || await getMaster("listing_types");
    const pFurnish = await getMaster("furnishing_types", "Fully Furnished") || await getMaster("furnishing_types");
    const pConst = await getMaster("construction_status", "Ready to Move") || await getMaster("construction_status");
    const pAmenities = await getMasterList("amenities", 4);
    const amenityIds = pAmenities.map(a => a.id);

    const propertyItems = [
      {
        title: "Luxury 3 BHK High-Rise Apartment in Pandeypur",
        slug: "luxury-3-bhk-high-rise-apartment-pandeypur",
        price: 8500000,
        beds: 3,
        baths: 3,
        balconies: 2,
        area: 1650,
        floor: 7,
        totalFloors: 14,
        img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
        desc: "Spacious 3 BHK luxury apartment featuring modular kitchen, Italian marble flooring, 24/7 security, club house, and dedicated covered car parking.",
        address: "Block B, Heights Residency, Pandeypur, Varanasi",
      },
      {
        title: "Commercial Retail Space & Showroom - Main Road",
        slug: "commercial-retail-space-showroom-main-road",
        price: 14500000,
        beds: 0,
        baths: 2,
        balconies: 0,
        area: 2400,
        floor: 1,
        totalFloors: 4,
        img: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
        desc: "Prime front-facing commercial showroom space with 40 ft frontage on main arterial road. High footfall commercial hub.",
        address: "Near Circuit House, Cantonment, Varanasi",
      }
    ];

    for (const p of propertyItems) {
      const rec = await client.query(`
        INSERT INTO business_records (
          business_id, institution_id, vertical_id, vertical_code, title, slug,
          description, category_id, subcategory_id, status, is_active, is_featured,
          currency, price, featured_image
        ) VALUES (
          $1, $2, 2, 'properties', $3, $4, $5, $6, $7, 'published', TRUE, TRUE, 'INR', $8, $9
        )
        ON CONFLICT (business_id, slug, is_deleted) DO UPDATE SET price = EXCLUDED.price
        RETURNING id
      `, [bizId, instId, p.title, p.slug, p.desc, pCat?.id || null, pSubcat?.id || null, p.price, p.img]);

      const recId = rec.rows[0].id;

      await client.query(`
        INSERT INTO property_details (
          record_id, property_type_id, listing_type_id, furnishing_type_id,
          construction_status_id, bedrooms, bathrooms, balconies, built_up_area,
          floor_number, total_floors, amenities, street_address, city, state, country
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Varanasi', 'Uttar Pradesh', 'India'
        )
        ON CONFLICT (record_id) DO NOTHING
      `, [
        recId,
        pType?.id || null,
        pListing?.id || null,
        pFurnish?.id || null,
        pConst?.id || null,
        p.beds,
        p.baths,
        p.balconies,
        p.area,
        p.floor,
        p.totalFloors,
        amenityIds.length > 0 ? amenityIds : null,
        p.address,
      ]);
    }

    // --------------------------------------------------------------------------
    // C. SEED RESTAURANT MENU CATEGORIES & DISHES
    // --------------------------------------------------------------------------
    console.log("🍽️ Seeding Restaurant Menu & Dishes...");
    const menuCats = [
      { name: "Starters & Appetizers", slug: "starters-and-appetizers", desc: "Crisp and flavorful snacks to kick off your dining" },
      { name: "Main Course Specialties", slug: "main-course-specialties", desc: "Rich and authentic North Indian & Mughlai gravies" },
      { name: "Artisanal Desserts & Shakes", slug: "desserts-and-shakes", desc: "Sweet delicacies and chilled premium thick shakes" },
    ];

    const catIdMap = {};
    for (let i = 0; i < menuCats.length; i++) {
      const mc = menuCats[i];
      const inserted = await client.query(`
        INSERT INTO menu_categories (business_id, institution_id, name, slug, description, display_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        RETURNING id
      `, [bizId, instId, mc.name, mc.slug, mc.desc, i + 1]);
      catIdMap[mc.slug] = inserted.rows[0].id;
    }

    const dishItems = [
      {
        title: "Paneer Tikka Angara",
        slug: "paneer-tikka-angara",
        catSlug: "starters-and-appetizers",
        price: 320,
        discounted: 280,
        spice: "Spicy",
        prepTime: 20,
        desc: "Smoked cottage cheese cubes marinated in Kashmiri chili and aromatic whole spices, roasted in charcoal clay tandoor.",
        img: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80",
        variants: [
          { name: "Half (6 Pcs)", price: 180, discounted: 160 },
          { name: "Full (12 Pcs)", price: 320, discounted: 280, isDefault: true },
        ]
      },
      {
        title: "Dal Makhani Dum Pukht",
        slug: "dal-makhani-dum-pukht",
        catSlug: "main-course-specialties",
        price: 360,
        discounted: 320,
        spice: "Mild",
        prepTime: 25,
        desc: "Slow-cooked black lentils simmered overnight on live embers with churned white butter and vine-ripened tomatoes.",
        img: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
        variants: [
          { name: "Regular Bowl (400ml)", price: 360, discounted: 320, isDefault: true },
          { name: "Family Handi (800ml)", price: 650, discounted: 580 },
        ]
      },
      {
        title: "Royal Shahi Kesar Kulfi Falooda",
        slug: "royal-shahi-kesar-kulfi-falooda",
        catSlug: "desserts-and-shakes",
        price: 220,
        discounted: 199,
        spice: "Sweet",
        prepTime: 10,
        desc: "Traditional matka kulfi infused with saffron and pistachios, served over vermicelli falooda and rose syrup.",
        img: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80",
        variants: [
          { name: "Single Scoop Cup", price: 120, discounted: 110 },
          { name: "Special Falooda Platter", price: 220, discounted: 199, isDefault: true },
        ]
      }
    ];

    for (const d of dishItems) {
      const rec = await client.query(`
        INSERT INTO business_records (
          business_id, institution_id, vertical_id, vertical_code, title, slug,
          description, status, is_active, is_featured, currency, price, featured_image
        ) VALUES (
          $1, $2, 3, 'restaurants', $3, $4, $5, 'published', TRUE, TRUE, 'INR', $6, $7
        )
        ON CONFLICT (business_id, slug, is_deleted) DO UPDATE SET price = EXCLUDED.price
        RETURNING id
      `, [bizId, instId, d.title, d.slug, d.desc, d.price, d.img]);

      const recId = rec.rows[0].id;
      const menuCatId = catIdMap[d.catSlug];

      const dishRes = await client.query(`
        INSERT INTO dishes (
          record_id, menu_category_id, discounted_price, prep_time_minutes,
          spice_level, is_available
        ) VALUES (
          $1, $2, $3, $4, $5, TRUE
        )
        ON CONFLICT (record_id) DO NOTHING
        RETURNING id
      `, [recId, menuCatId, d.discounted, d.prepTime, d.spice]);

      const dishId = dishRes.rows[0]?.id;
      if (dishId && d.variants) {
        for (const v of d.variants) {
          await client.query(`
            INSERT INTO dish_variants (dish_id, variant_name, price, discounted_price, is_default)
            VALUES ($1, $2, $3, $4, $5)
          `, [dishId, v.name, v.price, v.discounted, Boolean(v.isDefault)]);
        }
      }
    }

    // --------------------------------------------------------------------------
    // D. SEED HOTEL ROOMS
    // --------------------------------------------------------------------------
    console.log("🏨 Seeding Hotel Rooms...");
    const rCat = await getMaster("room_categories", "Deluxe") || await getMaster("room_categories");
    const rType = await getMaster("room_types", "Deluxe Double") || await getMaster("room_types");
    const rBed = await getMaster("bed_types", "King") || await getMaster("bed_types");
    const rMeal = await getMaster("meal_plans", "CP") || await getMaster("meal_plans");

    const roomItems = [
      {
        title: "Executive Deluxe King Room with River View",
        slug: "executive-deluxe-king-room-river-view",
        roomNo: "301",
        price: 4500,
        weekendPrice: 5200,
        size: 380,
        adults: 2,
        children: 1,
        img: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
        desc: "Elegantly styled luxury room featuring plush king bed, private balcony overlooking Ganges, marble bathroom, high-speed WiFi, and 55-inch smart TV.",
      },
      {
        title: "Presidential Heritage Suite with Private Lounge",
        slug: "presidential-heritage-suite-private-lounge",
        roomNo: "405",
        price: 9500,
        weekendPrice: 11000,
        size: 720,
        adults: 3,
        children: 2,
        img: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
        desc: "Opulent suite offering separate living lounge, dining area, jacuzzi, round-the-clock butler service, and complimentary buffet breakfast.",
      }
    ];

    for (const r of roomItems) {
      const rec = await client.query(`
        INSERT INTO business_records (
          business_id, institution_id, vertical_id, vertical_code, title, slug,
          description, status, is_active, is_featured, currency, price, featured_image
        ) VALUES (
          $1, $2, 4, 'hotels', $3, $4, $5, 'published', TRUE, TRUE, 'INR', $6, $7
        )
        ON CONFLICT (business_id, slug, is_deleted) DO UPDATE SET price = EXCLUDED.price
        RETURNING id
      `, [bizId, instId, r.title, r.slug, r.desc, r.price, r.img]);

      const recId = rec.rows[0].id;

      await client.query(`
        INSERT INTO hotel_rooms (
          record_id, room_number, room_category_id, room_type_id, bed_type_id,
          meal_plan_id, room_size_sqft, max_adults, max_children, price_per_night,
          weekend_price, check_in_time, check_out_time
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '14:00', '11:00'
        )
        ON CONFLICT (record_id) DO NOTHING
      `, [
        recId,
        r.roomNo,
        r.roomCat?.id || null,
        rType?.id || null,
        rBed?.id || null,
        rMeal?.id || null,
        r.size,
        r.adults,
        r.children,
        r.price,
        r.weekendPrice
      ]);
    }

    // --------------------------------------------------------------------------
    // E. SEED EVENTS & TICKETS
    // --------------------------------------------------------------------------
    console.log("🎟️ Seeding Events & Tickets...");
    const eCat = await getMaster("event_categories", "Conference") || await getMaster("event_categories");
    const eType = await getMaster("event_types", "Tech") || await getMaster("event_types");
    const eFormat = await getMaster("event_formats", "Hybrid") || await getMaster("event_formats");

    const eventItems = [
      {
        title: "National Tech & AI Innovation Summit 2026",
        slug: "national-tech-ai-innovation-summit-2026",
        price: 1499,
        startDate: "2026-12-10",
        endDate: "2026-12-12",
        startTime: "09:30",
        endTime: "18:00",
        venue: "Varanasi Trade Facilitation Centre, Bada Lalpur",
        city: "Varanasi",
        img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
        desc: "Annual 3-day premier tech convergence featuring keynote speeches by industry pioneers, AI developer hackathons, and investor pitch sessions.",
        tickets: [
          { name: "Student Pass", price: 499, capacity: 200 },
          { name: "Professional General Admission", price: 1499, capacity: 500 },
          { name: "VIP All-Access & Networking Dinner", price: 4999, capacity: 100 },
        ]
      }
    ];

    for (const e of eventItems) {
      const rec = await client.query(`
        INSERT INTO business_records (
          business_id, institution_id, vertical_id, vertical_code, title, slug,
          description, status, is_active, is_featured, currency, price, featured_image
        ) VALUES (
          $1, $2, 7, 'events', $3, $4, $5, 'published', TRUE, TRUE, 'INR', $6, $7
        )
        ON CONFLICT (business_id, slug, is_deleted) DO UPDATE SET price = EXCLUDED.price
        RETURNING id
      `, [bizId, instId, e.title, e.slug, e.desc, e.price, e.img]);

      const recId = rec.rows[0].id;

      const eventRes = await client.query(`
        INSERT INTO events (
          record_id, event_category_id, event_type_id, event_format_id,
          organizer_name, start_date, end_date, start_time, end_time,
          venue_name, city, state, country
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Uttar Pradesh', 'India'
        )
        ON CONFLICT (record_id) DO NOTHING
        RETURNING id
      `, [
        recId,
        eCat?.id || null,
        eType?.id || null,
        eFormat?.id || null,
        biz.name,
        e.startDate,
        e.endDate,
        e.startTime,
        e.endTime,
        e.venue,
        e.city
      ]);

      const eventId = eventRes.rows[0]?.id;
      if (eventId && e.tickets) {
        for (const t of e.tickets) {
          await client.query(`
            INSERT INTO event_tickets (event_id, name, price, total_capacity, available_capacity)
            VALUES ($1, $2, $3, $4, $4)
          `, [eventId, t.name, t.price, t.capacity]);
        }
      }
    }

    // --------------------------------------------------------------------------
    // F. SEED STUDENTS (EDUCATION)
    // --------------------------------------------------------------------------
    console.log("🎓 Seeding Students...");
    const eduLevel = await getMaster("education_levels", "Higher Secondary") || await getMaster("education_levels");
    const eduCourse = await getMaster("courses", "Science") || await getMaster("courses");
    const eduStatus = await getMaster("student_status_types", "Active") || await getMaster("student_status_types");

    const studentItems = [
      {
        name: "Rahul Sharma",
        slug: "rahul-sharma-adm2026-001",
        admNo: "MSI-2026-001",
        gender: "Male",
        dob: "2007-08-15",
        phone: "+91 98765 11223",
        email: "rahul.sharma@gmail.com",
        grade: "Class 12",
        section: "A",
        guardian: "Ramesh Sharma",
        guardianPhone: "+91 98765 44332",
        img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
      },
      {
        name: "Ananya Patel",
        slug: "ananya-patel-adm2026-002",
        admNo: "MSI-2026-002",
        gender: "Female",
        dob: "2008-03-22",
        phone: "+91 98765 55443",
        email: "ananya.patel@gmail.com",
        grade: "Class 11",
        section: "B",
        guardian: "Mahesh Patel",
        guardianPhone: "+91 98765 66778",
        img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
      }
    ];

    for (const s of studentItems) {
      const rec = await client.query(`
        INSERT INTO business_records (
          business_id, institution_id, vertical_id, vertical_code, title, slug,
          description, status, is_active, is_featured, currency, price, featured_image
        ) VALUES (
          $1, $2, 5, 'education', $3, $4, 'Enrolled student record', 'published', TRUE, FALSE, 'INR', 0, $5
        )
        ON CONFLICT (business_id, slug, is_deleted) DO NOTHING
        RETURNING id
      `, [bizId, instId, s.name, s.slug, s.img]);

      if (rec.rows.length > 0) {
        const recId = rec.rows[0].id;
        await client.query(`
          INSERT INTO students (
            record_id, admission_number, education_level_id, course_id, student_status_id,
            dob, gender, contact_number, email, class_grade, section, academic_year,
            admission_date, guardian_name, guardian_phone, city, state
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '2026-2027', CURRENT_DATE, $12, $13, 'Varanasi', 'UP'
          )
          ON CONFLICT (record_id) DO NOTHING
        `, [
          recId,
          s.admNo,
          eduLevel?.id || null,
          eduCourse?.id || null,
          eduStatus?.id || null,
          s.dob,
          s.gender,
          s.phone,
          s.email,
          s.grade,
          s.section,
          s.guardian,
          s.guardianPhone
        ]);
      }
    }

    // --------------------------------------------------------------------------
    // G. SEED PATIENTS (HEALTHCARE)
    // --------------------------------------------------------------------------
    console.log("🏥 Seeding Patients...");
    const pDept = await getMaster("medical_departments", "General") || await getMaster("medical_departments");
    const pSpec = await getMaster("medical_specialties", "Physician") || await getMaster("medical_specialties");
    const pConsult = await getMaster("consultation_types", "OPD") || await getMaster("consultation_types");

    const patientItems = [
      {
        name: "Vikram Malhotra",
        slug: "vikram-malhotra-pt2026-101",
        ident: "PT-2026-101",
        gender: "Male",
        dob: "1985-06-12",
        phone: "+91 99887 76655",
        email: "vikram.m@gmail.com",
        bloodGroup: "B+",
        doctor: "Dr. S. K. Verma, MD",
        allergies: "Penicillin",
        img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      },
      {
        name: "Pooja Gupta",
        slug: "pooja-gupta-pt2026-102",
        ident: "PT-2026-102",
        gender: "Female",
        dob: "1992-11-29",
        phone: "+91 99887 11223",
        email: "pooja.g@gmail.com",
        bloodGroup: "O+",
        doctor: "Dr. Neha Agarwal, MS",
        allergies: "None",
        img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
      }
    ];

    for (const pt of patientItems) {
      const rec = await client.query(`
        INSERT INTO business_records (
          business_id, institution_id, vertical_id, vertical_code, title, slug,
          description, status, is_active, is_featured, currency, price, featured_image
        ) VALUES (
          $1, $2, 6, 'healthcare', $3, $4, 'Patient confidential record', 'published', TRUE, FALSE, 'INR', 0, $5
        )
        ON CONFLICT (business_id, slug, is_deleted) DO NOTHING
        RETURNING id
      `, [bizId, instId, pt.name, pt.slug, pt.img]);

      if (rec.rows.length > 0) {
        const recId = rec.rows[0].id;
        await client.query(`
          INSERT INTO patients (
            record_id, patient_identifier, medical_department_id, medical_specialty_id,
            consultation_type_id, dob, gender, phone, email, blood_group, assigned_doctor,
            known_allergies, city, state, is_confidential
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Varanasi', 'UP', TRUE
          )
          ON CONFLICT (record_id) DO NOTHING
        `, [
          recId,
          pt.ident,
          pDept?.id || null,
          pSpec?.id || null,
          pConsult?.id || null,
          pt.dob,
          pt.gender,
          pt.phone,
          pt.email,
          pt.bloodGroup,
          pt.doctor,
          pt.allergies
        ]);
      }
    }

    await client.query("COMMIT;");
    console.log("🎉 ALL DYNAMIC BUSINESS RECORDS SEEDED SUCCESSFULLY!");
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("❌ Seeding failed:", err);
  } finally {
    await client.end();
  }
}

seed().catch(console.error);
