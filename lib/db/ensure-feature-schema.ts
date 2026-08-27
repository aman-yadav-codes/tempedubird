import { db } from "@/lib/db/db";

let schemaReady = false;

export async function ensureFeatureSchema() {
  if (schemaReady) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS platform_branches (
        id SERIAL PRIMARY KEY,
        branch_name VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(150),
        map_url TEXT,
        manager_name VARCHAR(150),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(150),
        profile_image TEXT,
        address TEXT,
        city VARCHAR(100),
        location VARCHAR(150),
        map_url TEXT,
        rating NUMERIC(3, 1) DEFAULT 4.5,
        status VARCHAR(50) DEFAULT 'active',
        description TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ads_campaigns (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        creative_url TEXT NOT NULL,
        target_url TEXT,
        placement_zone VARCHAR(100) NOT NULL,
        start_date DATE,
        end_date DATE,
        impressions INT DEFAULT 0,
        clicks INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body_html TEXT NOT NULL,
        body_json JSONB DEFAULT '{}'::jsonb,
        category VARCHAR(100) DEFAULT 'general',
        variables JSONB DEFAULT '[]'::jsonb,
        institution_id INT,
        created_by INT,
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS seo_meta_tags (
        id SERIAL PRIMARY KEY,
        route_path VARCHAR(255) UNIQUE,
        entity_type VARCHAR(100),
        entity_id INT,
        meta_title VARCHAR(255),
        meta_description TEXT,
        meta_keywords TEXT,
        og_image TEXT,
        canonical_url TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS institution_offers (
        id SERIAL PRIMARY KEY,
        institution_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        discount_percentage NUMERIC(5, 2),
        discount_amount NUMERIC(10, 2),
        coupon_code VARCHAR(50),
        banner_url TEXT,
        start_date DATE,
        end_date DATE,
        applicable_courses JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS institution_blogs (
        id SERIAL PRIMARY KEY,
        institution_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        cover_image TEXT,
        excerpt TEXT,
        content TEXT NOT NULL,
        author_name VARCHAR(150),
        tags JSONB DEFAULT '[]'::jsonb,
        is_published BOOLEAN DEFAULT TRUE,
        views_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cert_issuing_authorities (
        id SERIAL PRIMARY KEY,
        institution_id INT,
        authority_name VARCHAR(255) NOT NULL,
        designation VARCHAR(150),
        signature_url TEXT,
        stamp_url TEXT,
        is_platform BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS business_analytics_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT,
        institution_id INT,
        search_keyword VARCHAR(255),
        page_path VARCHAR(255),
        duration_seconds INT DEFAULT 0,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      DO $$
      BEGIN
        -- Add columns to marketing_packages
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_packages') THEN
          ALTER TABLE marketing_packages ADD COLUMN IF NOT EXISTS target_role VARCHAR(50) DEFAULT 'institution_admin';
          ALTER TABLE marketing_packages ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
          ALTER TABLE marketing_packages ADD COLUMN IF NOT EXISTS badge_text VARCHAR(100);
        END IF;

        -- Add columns to subscriptions
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
          ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS role_target VARCHAR(50);
          ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
          ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);
          ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);
          ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id INT;
        END IF;

        -- Add columns to enquiries
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enquiries') THEN
          ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'institution_website';
          ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS parent_name VARCHAR(150);
          ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50);
          ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS parent_email VARCHAR(150);
          ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS child_name VARCHAR(150);
          ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS child_id INT;
          ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS employee_id INT;
        END IF;

        -- Add columns to enrollments
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments') THEN
          ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'institution_website';
          ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS parent_name VARCHAR(150);
          ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50);
          ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS parent_email VARCHAR(150);
          ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS child_name VARCHAR(150);
          ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS child_id INT;
          ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS employee_id INT;
        END IF;

        -- Add columns to entrance_exams / exams
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'entrance_exams') THEN
          ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS exam_type VARCHAR(50) DEFAULT 'competitive';
          ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50) DEFAULT 'platform_admin';
        END IF;

        -- Add columns to practice_tests
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'practice_tests') THEN
          ALTER TABLE practice_tests ADD COLUMN IF NOT EXISTS exam_type VARCHAR(50) DEFAULT 'institutional';
          ALTER TABLE practice_tests ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50) DEFAULT 'institution_admin';
        END IF;

        -- Ensure sales commission columns
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_commissions') THEN
          ALTER TABLE sales_commissions ADD COLUMN IF NOT EXISTS employee_id INT;
          ALTER TABLE sales_commissions ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
          ALTER TABLE sales_commissions ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 2) DEFAULT 10.00;
          ALTER TABLE sales_commissions ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12, 2) DEFAULT 0.00;
          ALTER TABLE sales_commissions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
        END IF;
      END $$;
    `);

    // Seed default authorities if none exist
    const authCheck = await db.query(`SELECT COUNT(*) as count FROM cert_issuing_authorities`);
    if (parseInt(authCheck.rows[0]?.count || "0") === 0) {
      await db.query(`
        INSERT INTO cert_issuing_authorities (authority_name, designation, is_platform)
        VALUES 
          ('EduBird Central Examination Board', 'Chief Controller of Examinations', true),
          ('National Skill Assessment Council', 'Director General', true),
          ('State Technical Education Council', 'Registrar', true),
          ('Institution Academic Dean', 'Dean of Academics', false)
      `);
    }

    // Seed default platform branches if none exist
    const branchCheck = await db.query(`SELECT COUNT(*) as count FROM platform_branches`);
    if (parseInt(branchCheck.rows[0]?.count || "0") === 0) {
      await db.query(`
        INSERT INTO platform_branches (branch_name, city, address, phone, email, manager_name, status)
        VALUES 
          ('EduBird Headquarters', 'New Delhi', '124, Connaught Place, Central Delhi, 110001', '+91 98765 43210', 'delhi@edubird.com', 'Vikram Malhotra', 'active'),
          ('EduBird Tech Hub', 'Bengaluru', 'Plot 45, Electronic City Phase 1, Bengaluru, 560100', '+91 98765 43211', 'bangalore@edubird.com', 'Pooja Hegde', 'active'),
          ('EduBird Western Regional Office', 'Mumbai', 'Level 4, Bandra Kurla Complex, Mumbai, 400051', '+91 98765 43212', 'mumbai@edubird.com', 'Rohit Shinde', 'active')
      `);
    }

    // Seed initial vendors if none exist
    const vendorCheck = await db.query(`SELECT COUNT(*) as count FROM vendors`);
    if (parseInt(vendorCheck.rows[0]?.count || "0") === 0) {
      await db.query(`
        INSERT INTO vendors (name, category, phone, email, address, city, location, rating, description)
        VALUES 
          ('Sparkle House Cleaning & Sanitization', 'House Cleaner', '+91 91234 56780', 'sparkleclean@edubird.net', 'Shop 12, Student Lane, Sector 15', 'Noida', 'Knowledge Park', 4.8, 'Professional room and apartment deep cleaning for students and faculty.'),
          ('QuickWash Dhobi & Steam Laundry', 'Dhobi / Cloth Cleaner', '+91 91234 56781', 'quickwash@edubird.net', 'Opposite North Campus Gate 3', 'Delhi', 'North Campus', 4.6, 'Daily pickup & drop laundry with steam pressing.'),
          ('Annapurna Student Mess & Cook Services', 'Cook / Catering', '+91 91234 56782', 'annapurna@edubird.net', 'Plot 88, Kothrud', 'Pune', 'Kothrud', 4.9, 'Hygienic home-style food delivery and private cook placements.'),
          ('Comfort Stay PG for Boys & Girls', 'PG Owners', '+91 91234 56783', 'comfortpg@edubird.net', '14/B, Koramangala 4th Block', 'Bengaluru', 'Koramangala', 4.7, 'AC rooms with high speed Wi-Fi, study desks, and biometric entry.'),
          ('Shree Sai Student Hostel', 'Hostel Owners', '+91 91234 56784', 'saistudenthostel@edubird.net', 'Rajeev Gandhi Nagar', 'Kota', 'Indraprastha Area', 4.5, 'Spacious 2-sharing rooms with mess and 24/7 security.'),
          ('Silence 24x7 Digital Study Library', 'Library Owners', '+91 91234 56785', 'silencelib@edubird.net', '2nd Floor, Near Metro Pillar 420, Laxmi Nagar', 'Delhi', 'Laxmi Nagar', 4.9, 'Soundproof air-conditioned study cubicles with high-speed fiber internet.'),
          ('Vidya Book Depot & Stationery', 'Books & Stationery', '+91 91234 56786', 'vidyabooks@edubird.net', 'College Road, Near City Center', 'Indore', 'Bhawarkua', 4.8, 'Standard competitive exam textbooks, engineering guides, and office supplies.'),
          ('NextGen Laptops & Tech Devices', 'Tech Product Providers', '+91 91234 56787', 'nextgentech@edubird.net', 'Nehru Place Plaza 5th Floor', 'Delhi', 'Nehru Place', 4.7, 'Student discount laptops, graphic tablets, and accessories.'),
          ('ChipLevel Laptop & Computer Repair', 'Computer Repairing Service', '+91 91234 56788', 'chiprepair@edubird.net', 'Sector 62, Fortis Cross', 'Noida', 'Sector 62', 4.8, 'On-site diagnostics, SSD upgrades, and motherboard repairs.'),
          ('Speedy Mobile Care & Screen Fix', 'Mobile Repair', '+91 91234 56789', 'speedymobile@edubird.net', 'MG Road, Shop 4', 'Gurugram', 'MG Road', 4.6, 'Express 30-minute display and battery replacements with warranty.'),
          ('Apex Career & Job Placement Consultancy', 'Job Consultancy', '+91 91234 56790', 'apexcareers@edubird.net', 'World Trade Center, Tower 2', 'Pune', 'Kharadi', 4.9, 'Direct internship connections and campus hiring placements for top MNCs.')
      `);
    }

    schemaReady = true;
  } catch (error) {
    console.error("[ensureFeatureSchema] Error updating schema:", error);
  }
}
