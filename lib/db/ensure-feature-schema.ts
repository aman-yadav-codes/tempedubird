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

      CREATE TABLE IF NOT EXISTS vendor_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        icon VARCHAR(100) DEFAULT 'Briefcase',
        description TEXT,
        institution_id INT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_categories_name_inst 
      ON vendor_categories (name, COALESCE(institution_id, 0));

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

      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        package_id INTEGER REFERENCES sales_packages(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        starts_at DATE DEFAULT CURRENT_DATE,
        expires_at DATE,
        price NUMERIC(10,2) DEFAULT 0,
        price_unit VARCHAR(20) DEFAULT 'month',
        is_recurring BOOLEAN DEFAULT TRUE,
        razorpay_payment_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

      CREATE TABLE IF NOT EXISTS user_search_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        entity_type VARCHAR(100) DEFAULT 'general',
        category VARCHAR(100),
        results_count INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_user_search_history_user_id ON user_search_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_search_history_created_at ON user_search_history(created_at DESC);

      CREATE TABLE IF NOT EXISTS product_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(100) DEFAULT 'Package',
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS program_ids JSONB DEFAULT '[]'::jsonb;

      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS institution_id INTEGER;
      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS institution_name VARCHAR(255);
      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS ads_type VARCHAR(100) DEFAULT 'top';
      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS headline VARCHAR(255);
      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS cta_text VARCHAR(100) DEFAULT 'Learn More';
      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMP;
      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMP;
      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS max_impressions INTEGER DEFAULT 0;
      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS max_clicks INTEGER DEFAULT 0;
      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS target_section VARCHAR(100) DEFAULT 'course';
      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS target_entity VARCHAR(100) DEFAULT 'course';
      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS open_in_new_tab BOOLEAN DEFAULT TRUE;
      ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

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
        page_path VARCHAR(255) UNIQUE,
        route_path VARCHAR(255),
        page_type VARCHAR(50) DEFAULT 'static',
        entity_type VARCHAR(100) DEFAULT 'general',
        entity_id INT,
        meta_title VARCHAR(255) NOT NULL,
        meta_description TEXT,
        keywords TEXT[] DEFAULT '{}',
        meta_keywords TEXT,
        og_title VARCHAR(255),
        og_description TEXT,
        og_image TEXT,
        og_url TEXT,
        canonical_url TEXT,
        robots_directive VARCHAR(100) DEFAULT 'index, follow',
        schema_markup_type VARCHAR(100) DEFAULT 'WebPage',
        conditional_rules JSONB DEFAULT '[]'::jsonb,
        template_variables JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE seo_meta_tags ADD COLUMN IF NOT EXISTS page_path VARCHAR(255);
      ALTER TABLE seo_meta_tags ADD COLUMN IF NOT EXISTS route_path VARCHAR(255);
      ALTER TABLE seo_meta_tags ADD COLUMN IF NOT EXISTS page_type VARCHAR(50) DEFAULT 'static';
      ALTER TABLE seo_meta_tags ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';
      ALTER TABLE seo_meta_tags ADD COLUMN IF NOT EXISTS meta_keywords TEXT;
      ALTER TABLE seo_meta_tags ADD COLUMN IF NOT EXISTS og_title VARCHAR(255);
      ALTER TABLE seo_meta_tags ADD COLUMN IF NOT EXISTS og_description TEXT;
      ALTER TABLE seo_meta_tags ADD COLUMN IF NOT EXISTS og_url TEXT;
      ALTER TABLE seo_meta_tags ADD COLUMN IF NOT EXISTS robots_directive VARCHAR(100) DEFAULT 'index, follow';
      ALTER TABLE seo_meta_tags ADD COLUMN IF NOT EXISTS schema_markup_type VARCHAR(100) DEFAULT 'WebPage';
      ALTER TABLE seo_meta_tags ADD COLUMN IF NOT EXISTS conditional_rules JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE seo_meta_tags ADD COLUMN IF NOT EXISTS template_variables JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE seo_meta_tags ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      UPDATE seo_meta_tags SET page_path = route_path WHERE page_path IS NULL AND route_path IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_meta_tags_page_path ON seo_meta_tags(page_path);

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

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        client_type VARCHAR(100) DEFAULT 'corporate',
        institution_id INT,
        country VARCHAR(100) DEFAULT 'India',
        state VARCHAR(100),
        city VARCHAR(100),
        area VARCHAR(100),
        address TEXT,
        website VARCHAR(255),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS operations_tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        client_id INT,
        client_name VARCHAR(255),
        institution_id INT,
        price NUMERIC(12, 2) DEFAULT 0.00,
        details TEXT,
        assigned_employee_id INT,
        assigned_employee_name VARCHAR(150),
        assigned_employee_role VARCHAR(100),
        assigned_employee_email VARCHAR(150),
        estimated_hours NUMERIC(6, 2) DEFAULT 0.00,
        logged_hours NUMERIC(6, 2) DEFAULT 0.00,
        deadline TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) DEFAULT 'pending',
        urgency VARCHAR(50) DEFAULT 'medium',
        sub_tasks JSONB DEFAULT '[]'::jsonb,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS sub_tasks JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS is_daily_recurring BOOLEAN DEFAULT FALSE;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS last_recurring_date DATE;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS daily_recurrence_history JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS points NUMERIC(10, 2) DEFAULT 20.00;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS penalty_points NUMERIC(10, 2) DEFAULT 10.00;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS review_notes TEXT;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS review_image_url TEXT;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS review_submitted_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS review_submitted_by VARCHAR(255);

      -- Staff Performance Points Ledger for positive rewards, negative deductions, and manual admin adjustments
      CREATE TABLE IF NOT EXISTS staff_performance_points_ledger (
        id SERIAL PRIMARY KEY,
        employee_id INT NOT NULL,
        institution_id INT,
        task_id INT,
        subtask_id VARCHAR(100),
        point_type VARCHAR(50) NOT NULL, -- 'task_completed', 'task_failed', 'task_overdue', 'manual_bonus', 'manual_penalty'
        points NUMERIC(10, 2) NOT NULL, -- Positive for reward (+), Negative for deduction (-)
        reason TEXT,
        awarded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_points_ledger_employee_id ON staff_performance_points_ledger(employee_id);
      CREATE INDEX IF NOT EXISTS idx_points_ledger_task_id ON staff_performance_points_ledger(task_id);

      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS institution_id INT;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(50) DEFAULT 'vendor';
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website VARCHAR(255);
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS state VARCHAR(100);
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;

      -- Dedicated Clients Table for Institutional & Corporate Partners
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        institution_id INT,
        name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        contact_person VARCHAR(255),
        category VARCHAR(100) DEFAULT 'Corporate Client',
        client_type VARCHAR(50) DEFAULT 'corporate',
        phone VARCHAR(50),
        email VARCHAR(150),
        website VARCHAR(255),
        profile_image TEXT,
        address TEXT,
        city VARCHAR(100),
        area VARCHAR(150),
        location VARCHAR(150),
        country VARCHAR(100) DEFAULT 'India',
        state VARCHAR(100),
        map_url TEXT,
        rating NUMERIC(3, 1) DEFAULT 4.5,
        description TEXT,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'active',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE clients ADD COLUMN IF NOT EXISTS institution_id INT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Corporate Client';
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type VARCHAR(50) DEFAULT 'corporate';
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS website VARCHAR(255);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS area VARCHAR(150);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS state VARCHAR(100);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS phones JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS emails JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS location_data JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);

      -- Products Table for Platform and Institution Store / Marketing
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        sale_price NUMERIC(12, 2),
        category VARCHAR(100) DEFAULT 'General',
        image_url TEXT,
        gallery JSONB DEFAULT '[]'::jsonb,
        institution_id INT,
        institution_name VARCHAR(255),
        stock_quantity INT DEFAULT 100,
        sku VARCHAR(100),
        badge_text VARCHAR(100),
        features JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(50) DEFAULT 'active',
        is_featured BOOLEAN DEFAULT FALSE,
        created_by INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_products_institution_id ON products(institution_id);
      CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
      CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

      -- Inventory Management Table for Admin Module
      CREATE TABLE IF NOT EXISTS inventory_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        description TEXT,
        institution_id INT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_categories_name_inst 
      ON inventory_categories (name, COALESCE(institution_id, 0));

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

      -- Internal Admin Team Members Table
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

    // Seed initial vendor categories if none exist
    const catCheck = await db.query(`SELECT COUNT(*) as count FROM vendor_categories`);
    if (parseInt(catCheck.rows[0]?.count || "0") === 0) {
      await db.query(`
        INSERT INTO vendor_categories (name, slug, icon, description, institution_id, is_active)
        VALUES
          ('House Cleaner', 'house-cleaner', 'Sparkles', 'Professional room and apartment deep cleaning', NULL, TRUE),
          ('Dhobi / Cloth Cleaner', 'dhobi-laundry', 'Shirt', 'Daily laundry, steam iron and dry cleaning services', NULL, TRUE),
          ('Cook / Catering', 'cook-catering', 'Utensils', 'Student mess, private cook and catering services', NULL, TRUE),
          ('PG Owners', 'pg-owners', 'Home', 'Paying Guest accommodations for students and working professionals', NULL, TRUE),
          ('Hostel Owners', 'hostel-owners', 'Building2', 'Student hostels and residential campus stays', NULL, TRUE),
          ('Library Owners', 'library-owners', 'Library', '24x7 study libraries, self-study spaces and reading rooms', NULL, TRUE),
          ('Books & Stationery', 'books-stationery', 'Building', 'Textbooks, competitive exam guides and stationery supplies', NULL, TRUE),
          ('Tech Product Providers', 'tech-product-providers', 'Laptop', 'Laptops, tablets, accessories and student tech gadgets', NULL, TRUE),
          ('Computer Repairing Service', 'computer-repair', 'Wrench', 'Hardware, motherboard, software and laptop repair services', NULL, TRUE),
          ('Mobile Repair', 'mobile-repair', 'Smartphone', 'Screen replacement, battery and mobile repair services', NULL, TRUE),
          ('Job Consultancy', 'job-consultancy', 'Briefcase', 'Direct internship connections and campus hiring placements', NULL, TRUE)
        ON CONFLICT DO NOTHING;
      `);
    }

    // Seed initial inventory categories if none exist
    const invCatCheck = await db.query(`SELECT COUNT(*) as count FROM inventory_categories`);
    if (parseInt(invCatCheck.rows[0]?.count || "0") === 0) {
      await db.query(`
        INSERT INTO inventory_categories (name, slug, description, institution_id, is_active)
        VALUES
          ('Electronics & IT Hardware', 'electronics-it-hardware', 'Computers, laptops, projectors, monitors and tech hardware', NULL, TRUE),
          ('Books & Study Materials', 'books-study-materials', 'Textbooks, course modules, reference guides and library materials', NULL, TRUE),
          ('Stationery & Office Supplies', 'stationery-office-supplies', 'Pens, markers, paper reams, folders, staplers and desk essentials', NULL, TRUE),
          ('Furniture & Class Fixtures', 'furniture-class-fixtures', 'Desks, chairs, whiteboards, podiums and classroom benches', NULL, TRUE),
          ('Science & Computer Lab', 'science-computer-lab', 'Lab equipment, test tubes, apparatus, microscopes and networking tools', NULL, TRUE),
          ('Sports & Physical Education', 'sports-physical-education', 'Balls, bats, nets, fitness gear and outdoor sports equipment', NULL, TRUE),
          ('Uniforms & Merchandise', 'uniforms-merchandise', 'Student uniforms, lab coats, identity cards, badges and branded items', NULL, TRUE),
          ('Maintenance & Cleaning Supplies', 'maintenance-cleaning-supplies', 'Sanitization kits, disinfectants, mops and electrical spares', NULL, TRUE),
          ('General Supplies', 'general-supplies', 'General administrative assets, pantry stock and miscellaneous inventory', NULL, TRUE)
        ON CONFLICT DO NOTHING;
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

    // Seed default clients into dedicated clients table if none exist
    const clientCheck = await db.query(`SELECT COUNT(*) as count FROM clients`);
    if (parseInt(clientCheck.rows[0]?.count || "0") === 0) {
      await db.query(`
        INSERT INTO clients (name, company_name, contact_person, category, client_type, phone, email, website, city, location, rating, description, notes, status)
        VALUES
          ('Apex Global Technologies', 'Apex Global Technologies Pvt Ltd', 'Rohan Mehra', 'IT Services', 'corporate', '+91 98765 11223', 'partnerships@apexglobal.com', 'https://apexglobal.com', 'Bengaluru', 'Electronic City', 4.9, 'Annual campus placement and technical curriculum training partner.', 'Recruits 50+ students annually.', 'active'),
          ('Metro Student Living Solutions', 'Metro Student Living Pvt Ltd', 'Ananya Sharma', 'Hostel & Housing', 'partner', '+91 98765 33445', 'info@metroliving.in', 'https://metroliving.in', 'Pune', 'Kothrud', 4.8, 'Official off-campus student accommodation partner.', 'Prefers semester-wise billing.', 'active'),
          ('Bright Futures Foundation', 'Bright Futures Educational Trust', 'Dr. S. K. Iyer', 'Scholarship & NGO', 'sponsor', '+91 98765 55667', 'grants@brightfutures.org', 'https://brightfutures.org', 'Delhi', 'Connaught Place', 5.0, 'Merit scholarship funding partner providing fee grants for underprivileged students.', 'Sponsored 25 students this academic year.', 'active')
      `);
    }

    schemaReady = true;
  } catch (error) {
    console.error("[ensureFeatureSchema] Error updating schema:", error);
  }
}
