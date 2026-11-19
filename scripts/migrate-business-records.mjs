import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  console.log("🚀 Starting Dynamic Business Records Schema Migration...");
  await client.connect();

  await client.query("BEGIN;");

  try {
    // 1. Core Polymorphic Business Records Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_records (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
        institution_id INTEGER,
        vertical_id INTEGER NOT NULL REFERENCES master_verticals(id),
        vertical_code VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        description TEXT,
        category_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        subcategory_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'published',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_featured BOOLEAN NOT NULL DEFAULT FALSE,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        price NUMERIC(15, 2),
        featured_image TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by INTEGER,
        updated_by INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_business_record_slug_biz UNIQUE (business_id, slug, is_deleted)
      );

      CREATE INDEX IF NOT EXISTS idx_biz_rec_biz_vertical ON business_records(business_id, vertical_code);
      CREATE INDEX IF NOT EXISTS idx_biz_rec_vertical_status ON business_records(vertical_code, status, is_active, is_deleted);
      CREATE INDEX IF NOT EXISTS idx_biz_rec_cat ON business_records(category_id, subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_biz_rec_slug ON business_records(slug);
    `);
    console.log("✅ Created business_records table & indexes");

    // 2. Dynamic Custom Attributes for Business Records
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_record_attributes (
        id SERIAL PRIMARY KEY,
        record_id INTEGER NOT NULL REFERENCES business_records(id) ON DELETE CASCADE,
        attribute_id INTEGER REFERENCES master_attributes(id) ON DELETE CASCADE,
        attribute_code VARCHAR(100) NOT NULL,
        value_text TEXT,
        value_number NUMERIC(15, 4),
        value_boolean BOOLEAN,
        value_json JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_biz_rec_attr UNIQUE (record_id, attribute_code)
      );

      CREATE INDEX IF NOT EXISTS idx_biz_rec_attr_rec ON business_record_attributes(record_id);
    `);
    console.log("✅ Created business_record_attributes table");

    // 3. Media Gallery for Business Records
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_record_media (
        id SERIAL PRIMARY KEY,
        record_id INTEGER NOT NULL REFERENCES business_records(id) ON DELETE CASCADE,
        media_type VARCHAR(50) NOT NULL DEFAULT 'image',
        url TEXT NOT NULL,
        title VARCHAR(255),
        display_order INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_biz_rec_media_rec ON business_record_media(record_id);
    `);
    console.log("✅ Created business_record_media table");

    // 4. Vehicle Details
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicle_details (
        id SERIAL PRIMARY KEY,
        record_id INTEGER NOT NULL UNIQUE REFERENCES business_records(id) ON DELETE CASCADE,
        vehicle_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        brand_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        model_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        variant_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        fuel_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        transmission_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        body_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        vehicle_condition_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        manufacturing_year INTEGER,
        registration_year INTEGER,
        color VARCHAR(50),
        engine_capacity VARCHAR(50),
        mileage VARCHAR(50),
        kilometers_driven INTEGER,
        number_of_owners INTEGER DEFAULT 1,
        seating_capacity INTEGER,
        registration_number VARCHAR(100),
        vin_chassis_number VARCHAR(100),
        is_negotiable BOOLEAN DEFAULT FALSE,
        financing_available BOOLEAN DEFAULT FALSE,
        warranty_info TEXT,
        location TEXT,
        contact_info TEXT,
        specifications JSONB DEFAULT '{}'::jsonb
      );

      CREATE INDEX IF NOT EXISTS idx_vehicle_brand_model ON vehicle_details(brand_id, model_id, variant_id);
    `);
    console.log("✅ Created vehicle_details table");

    // 5. Property Details
    await client.query(`
      CREATE TABLE IF NOT EXISTS property_details (
        id SERIAL PRIMARY KEY,
        record_id INTEGER NOT NULL UNIQUE REFERENCES business_records(id) ON DELETE CASCADE,
        property_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        listing_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        ownership_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        furnishing_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        construction_status_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        property_condition_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        land_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        bedrooms INTEGER,
        bathrooms INTEGER,
        balconies INTEGER,
        parking_spaces INTEGER,
        total_floors INTEGER,
        floor_number INTEGER,
        built_up_area NUMERIC(12, 2),
        plot_area NUMERIC(12, 2),
        area_unit VARCHAR(50) DEFAULT 'sq ft',
        amenities INTEGER[],
        rental_amount NUMERIC(15, 2),
        security_deposit NUMERIC(15, 2),
        maintenance_charges NUMERIC(15, 2),
        country VARCHAR(100) DEFAULT 'India',
        state VARCHAR(100),
        city VARCHAR(100),
        suburb VARCHAR(150),
        street_address TEXT,
        latitude NUMERIC(10, 6),
        longitude NUMERIC(10, 6),
        availability_status VARCHAR(50) DEFAULT 'available'
      );

      CREATE INDEX IF NOT EXISTS idx_property_location ON property_details(city, state);
    `);
    console.log("✅ Created property_details table");

    // 6. Restaurant Menu Categories & Dishes
    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_categories (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
        institution_id INTEGER,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        master_category_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        master_subcategory_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        description TEXT,
        image_url TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_menu_cat_biz ON menu_categories(business_id, is_active);

      CREATE TABLE IF NOT EXISTS dishes (
        id SERIAL PRIMARY KEY,
        record_id INTEGER NOT NULL UNIQUE REFERENCES business_records(id) ON DELETE CASCADE,
        menu_category_id INTEGER REFERENCES menu_categories(id) ON DELETE SET NULL,
        cuisine_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        dietary_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        food_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        serving_unit_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        meal_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        discounted_price NUMERIC(12, 2),
        portion_size VARCHAR(50),
        ingredients TEXT,
        allergens INTEGER[],
        prep_time_minutes INTEGER,
        spice_level VARCHAR(50) DEFAULT 'Medium',
        calories INTEGER,
        is_available BOOLEAN DEFAULT TRUE,
        category_ids INTEGER[]
      );

      CREATE INDEX IF NOT EXISTS idx_dish_menu_cat ON dishes(menu_category_id);

      CREATE TABLE IF NOT EXISTS dish_variants (
        id SERIAL PRIMARY KEY,
        dish_id INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
        variant_name VARCHAR(100) NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        discounted_price NUMERIC(12, 2),
        is_default BOOLEAN DEFAULT FALSE
      );

      CREATE INDEX IF NOT EXISTS idx_dish_variants_dish ON dish_variants(dish_id);
    `);
    console.log("✅ Created menu_categories, dishes, dish_variants tables");

    // 7. Hotel Rooms & Inventory
    await client.query(`
      CREATE TABLE IF NOT EXISTS hotel_rooms (
        id SERIAL PRIMARY KEY,
        record_id INTEGER NOT NULL UNIQUE REFERENCES business_records(id) ON DELETE CASCADE,
        room_number VARCHAR(100),
        room_category_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        room_subcategory_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        room_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        bed_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        view_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        occupancy_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        meal_plan_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        accommodation_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        room_size_sqft INTEGER,
        max_adults INTEGER DEFAULT 2,
        max_children INTEGER DEFAULT 1,
        number_of_beds INTEGER DEFAULT 1,
        amenities INTEGER[],
        price_per_night NUMERIC(12, 2) NOT NULL,
        weekend_price NUMERIC(12, 2),
        seasonal_price NUMERIC(12, 2),
        extra_guest_charge NUMERIC(12, 2),
        check_in_time VARCHAR(20) DEFAULT '14:00',
        check_out_time VARCHAR(20) DEFAULT '11:00',
        cancellation_policy TEXT
      );

      CREATE TABLE IF NOT EXISTS hotel_room_inventory (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES hotel_rooms(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        total_units INTEGER DEFAULT 1,
        available_units INTEGER DEFAULT 1,
        price_override NUMERIC(12, 2),
        is_blocked BOOLEAN DEFAULT FALSE,
        CONSTRAINT uq_room_date UNIQUE (room_id, date)
      );

      CREATE INDEX IF NOT EXISTS idx_room_inv_date ON hotel_room_inventory(room_id, date);
    `);
    console.log("✅ Created hotel_rooms & hotel_room_inventory tables");

    // 8. Events, Tickets & Registrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        record_id INTEGER NOT NULL UNIQUE REFERENCES business_records(id) ON DELETE CASCADE,
        event_category_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        event_subcategory_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        event_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        event_format_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        audience_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        organizer_name VARCHAR(255),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        start_time VARCHAR(20),
        end_time VARCHAR(20),
        time_zone VARCHAR(100) DEFAULT 'Asia/Kolkata',
        registration_deadline TIMESTAMP WITH TIME ZONE,
        venue_name VARCHAR(255),
        complete_address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'India',
        online_meeting_url TEXT,
        speakers TEXT,
        performers TEXT,
        amenities INTEGER[],
        age_restrictions VARCHAR(100),
        terms_conditions TEXT,
        is_free BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS event_tickets (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        ticket_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        name VARCHAR(150) NOT NULL,
        price NUMERIC(12, 2) DEFAULT 0,
        total_capacity INTEGER NOT NULL DEFAULT 100,
        available_capacity INTEGER NOT NULL DEFAULT 100,
        is_active BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS event_registrations (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        ticket_id INTEGER REFERENCES event_tickets(id) ON DELETE SET NULL,
        attendee_name VARCHAR(255) NOT NULL,
        attendee_email VARCHAR(255) NOT NULL,
        attendee_phone VARCHAR(50),
        registration_number VARCHAR(100) UNIQUE NOT NULL,
        tickets_count INTEGER DEFAULT 1,
        amount_paid NUMERIC(12, 2) DEFAULT 0,
        payment_status VARCHAR(50) DEFAULT 'completed',
        check_in_status BOOLEAN DEFAULT FALSE,
        checked_in_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_event_reg_event ON event_registrations(event_id, attendee_email);
    `);
    console.log("✅ Created events, event_tickets, event_registrations tables");

    // 9. Students & Academic Records (Education Management)
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        record_id INTEGER NOT NULL UNIQUE REFERENCES business_records(id) ON DELETE CASCADE,
        admission_number VARCHAR(100) NOT NULL,
        student_category_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        student_subcategory_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        education_level_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        course_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        department_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        academic_program_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        learning_mode_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        examination_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        student_status_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        dob DATE,
        gender VARCHAR(20),
        contact_number VARCHAR(50),
        email VARCHAR(255),
        blood_group VARCHAR(10),
        class_grade VARCHAR(50),
        section VARCHAR(50),
        academic_year VARCHAR(50),
        admission_date DATE,
        guardian_name VARCHAR(255),
        guardian_relation VARCHAR(100),
        guardian_phone VARCHAR(50),
        emergency_contact VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS student_academic_records (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        term VARCHAR(100),
        academic_year VARCHAR(50),
        gpa_score NUMERIC(5, 2),
        attendance_percentage NUMERIC(5, 2),
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_student_adm_no ON students(admission_number);
    `);
    console.log("✅ Created students & student_academic_records tables");

    // 10. Patients & Medical Records (Healthcare Management)
    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        record_id INTEGER NOT NULL UNIQUE REFERENCES business_records(id) ON DELETE CASCADE,
        patient_identifier VARCHAR(100) NOT NULL,
        patient_category_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        patient_subcategory_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        medical_department_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        medical_specialty_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        consultation_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        treatment_category_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        patient_visit_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        admission_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        care_type_id INTEGER REFERENCES master_records(id) ON DELETE SET NULL,
        dob DATE,
        gender VARCHAR(20),
        phone VARCHAR(50),
        email VARCHAR(255),
        blood_group VARCHAR(10),
        assigned_doctor VARCHAR(255),
        registration_date DATE DEFAULT CURRENT_DATE,
        referral_source VARCHAR(255),
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(50),
        known_allergies TEXT,
        medical_alerts TEXT,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        is_confidential BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS patient_medical_records (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        visit_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        doctor_name VARCHAR(255),
        diagnosis TEXT,
        prescription TEXT,
        treatment_notes TEXT,
        lab_results TEXT,
        confidential_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_patient_ident ON patients(patient_identifier);
    `);
    console.log("✅ Created patients & patient_medical_records tables");

    // 11. Audit Logs for Business Records
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_record_audit_logs (
        id SERIAL PRIMARY KEY,
        record_id INTEGER REFERENCES business_records(id) ON DELETE CASCADE,
        business_id INTEGER NOT NULL,
        user_id INTEGER,
        action VARCHAR(50) NOT NULL,
        changes JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_biz_rec_audit ON business_record_audit_logs(record_id, business_id);
    `);
    console.log("✅ Created business_record_audit_logs table");

    await client.query("COMMIT;");
    console.log("🎉 ALL DYNAMIC BUSINESS RECORDS TABLES SUCCESSFULLY MIGRATED!");
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("❌ Migration failed:", err);
    throw err;
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
