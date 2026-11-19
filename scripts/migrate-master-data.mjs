import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true',
});

export const VERTICALS_CONFIG = [
  {
    code: 'vehicles',
    name: 'Vehicle Management',
    description: 'Vehicle types, categories, subcategories, brands, models, variants, fuel, and transmission masters.',
    icon: 'Car',
    display_order: 1,
    master_types: [
      { code: 'vehicle_types', name: 'Vehicle Types', level: 1, parent: null, icon: 'Car', is_hierarchical: true },
      { code: 'vehicle_categories', name: 'Vehicle Categories', level: 2, parent: 'vehicle_types', icon: 'Boxes', is_hierarchical: true },
      { code: 'vehicle_subcategories', name: 'Vehicle Subcategories', level: 3, parent: 'vehicle_categories', icon: 'Layers', is_hierarchical: true },
      { code: 'vehicle_brands', name: 'Vehicle Brands / Manufacturers', level: 4, parent: 'vehicle_subcategories', icon: 'BadgeCheck', is_hierarchical: true },
      { code: 'vehicle_models', name: 'Vehicle Models', level: 5, parent: 'vehicle_brands', icon: 'Sparkles', is_hierarchical: true },
      { code: 'vehicle_variants', name: 'Vehicle Variants', level: 6, parent: 'vehicle_models', icon: 'SlidersHorizontal', is_hierarchical: true },
      { code: 'fuel_types', name: 'Fuel Types', level: 1, parent: null, icon: 'Activity', is_hierarchical: false },
      { code: 'transmission_types', name: 'Transmission Types', level: 1, parent: null, icon: 'GitFork', is_hierarchical: false },
      { code: 'body_types', name: 'Body Types', level: 1, parent: null, icon: 'LayoutGrid', is_hierarchical: false },
      { code: 'vehicle_conditions', name: 'Vehicle Conditions', level: 1, parent: null, icon: 'ShieldCheck', is_hierarchical: false },
    ],
  },
  {
    code: 'properties',
    name: 'Property Management',
    description: 'Real estate categories, subcategories, property types, ownership, furnishing, and amenities.',
    icon: 'Building2',
    display_order: 2,
    master_types: [
      { code: 'property_categories', name: 'Property Categories', level: 1, parent: null, icon: 'Building2', is_hierarchical: true },
      { code: 'property_subcategories', name: 'Property Subcategories', level: 2, parent: 'property_categories', icon: 'FolderTree', is_hierarchical: true },
      { code: 'property_types', name: 'Property Types', level: 3, parent: 'property_subcategories', icon: 'Building', is_hierarchical: true },
      { code: 'ownership_types', name: 'Ownership Types', level: 1, parent: null, icon: 'FileText', is_hierarchical: false },
      { code: 'furnishing_types', name: 'Furnishing Types', level: 1, parent: null, icon: 'Layers', is_hierarchical: false },
      { code: 'construction_status', name: 'Construction Status', level: 1, parent: null, icon: 'Activity', is_hierarchical: false },
      { code: 'property_conditions', name: 'Property Conditions', level: 1, parent: null, icon: 'ShieldCheck', is_hierarchical: false },
      { code: 'amenities', name: 'Amenities', level: 1, parent: null, icon: 'Sparkles', is_hierarchical: false },
      { code: 'land_types', name: 'Land Types', level: 1, parent: null, icon: 'MapPin', is_hierarchical: false },
      { code: 'listing_types', name: 'Listing Types', level: 1, parent: null, icon: 'Tags', is_hierarchical: false },
    ],
  },
  {
    code: 'restaurants',
    name: 'Restaurant & Food Management',
    description: 'Menu categories, subcategories, dishes, cuisines, dietary types, ingredients, and allergens.',
    icon: 'UtensilsCrossed',
    display_order: 3,
    master_types: [
      { code: 'menu_categories', name: 'Menu Categories', level: 1, parent: null, icon: 'FolderTree', is_hierarchical: true },
      { code: 'menu_subcategories', name: 'Menu Subcategories', level: 2, parent: 'menu_categories', icon: 'Layers', is_hierarchical: true },
      { code: 'dishes', name: 'Dishes', level: 3, parent: 'menu_subcategories', icon: 'UtensilsCrossed', is_hierarchical: true, allow_multiple_parents: true },
      { code: 'cuisines', name: 'Cuisines', level: 1, parent: null, icon: 'Globe', is_hierarchical: false },
      { code: 'dietary_types', name: 'Dietary Types', level: 1, parent: null, icon: 'HeartPulse', is_hierarchical: false },
      { code: 'food_types', name: 'Food Types', level: 1, parent: null, icon: 'Package', is_hierarchical: false },
      { code: 'serving_units', name: 'Serving Units', level: 1, parent: null, icon: 'SlidersHorizontal', is_hierarchical: false },
      { code: 'meal_types', name: 'Meal Types', level: 1, parent: null, icon: 'Clock', is_hierarchical: false },
      { code: 'ingredients', name: 'Ingredients', level: 1, parent: null, icon: 'Boxes', is_hierarchical: false },
      { code: 'allergen_types', name: 'Allergen Types', level: 1, parent: null, icon: 'AlertTriangle', is_hierarchical: false },
    ],
  },
  {
    code: 'hotels',
    name: 'Hotel Management',
    description: 'Room categories, subcategories, room types, bed types, room amenities, view types, and meal plans.',
    icon: 'BedDouble',
    display_order: 4,
    master_types: [
      { code: 'room_categories', name: 'Room Categories', level: 1, parent: null, icon: 'BedDouble', is_hierarchical: true },
      { code: 'room_subcategories', name: 'Room Subcategories', level: 2, parent: 'room_categories', icon: 'Layers', is_hierarchical: true },
      { code: 'room_types', name: 'Room Types', level: 3, parent: 'room_subcategories', icon: 'Building', is_hierarchical: true },
      { code: 'bed_types', name: 'Bed Types', level: 1, parent: null, icon: 'BedDouble', is_hierarchical: false },
      { code: 'room_amenities', name: 'Room Amenities', level: 1, parent: null, icon: 'Sparkles', is_hierarchical: false },
      { code: 'view_types', name: 'View Types', level: 1, parent: null, icon: 'Eye', is_hierarchical: false },
      { code: 'occupancy_types', name: 'Occupancy Types', level: 1, parent: null, icon: 'Users', is_hierarchical: false },
      { code: 'meal_plans', name: 'Meal Plans', level: 1, parent: null, icon: 'UtensilsCrossed', is_hierarchical: false },
      { code: 'accommodation_types', name: 'Accommodation Types', level: 1, parent: null, icon: 'Building2', is_hierarchical: false },
      { code: 'room_conditions', name: 'Room Conditions', level: 1, parent: null, icon: 'ShieldCheck', is_hierarchical: false },
    ],
  },
  {
    code: 'education',
    name: 'Student & Education Management',
    description: 'Student categories, education levels, courses, academic programs, examination types, and status.',
    icon: 'GraduationCap',
    display_order: 5,
    master_types: [
      { code: 'student_categories', name: 'Student Categories', level: 1, parent: null, icon: 'GraduationCap', is_hierarchical: true },
      { code: 'student_subcategories', name: 'Student Subcategories', level: 2, parent: 'student_categories', icon: 'Layers', is_hierarchical: true },
      { code: 'education_levels', name: 'Education Levels', level: 1, parent: null, icon: 'BookOpen', is_hierarchical: false },
      { code: 'courses', name: 'Courses', level: 1, parent: null, icon: 'BookCheck', is_hierarchical: false },
      { code: 'departments', name: 'Departments', level: 1, parent: null, icon: 'Building2', is_hierarchical: false },
      { code: 'qualifications', name: 'Qualifications', level: 1, parent: null, icon: 'BadgeCheck', is_hierarchical: false },
      { code: 'academic_programs', name: 'Academic Programs', level: 1, parent: null, icon: 'ClipboardList', is_hierarchical: false },
      { code: 'learning_modes', name: 'Learning Modes', level: 1, parent: null, icon: 'Globe', is_hierarchical: false },
      { code: 'examination_types', name: 'Examination Types', level: 1, parent: null, icon: 'ClipboardCheck', is_hierarchical: false },
      { code: 'student_status_types', name: 'Student Status Types', level: 1, parent: null, icon: 'UserCheck', is_hierarchical: false },
    ],
  },
  {
    code: 'healthcare',
    name: 'Patient & Healthcare Management',
    description: 'Patient categories, medical departments, specialties, consultation types, admission, and care types.',
    icon: 'HeartPulse',
    display_order: 6,
    master_types: [
      { code: 'patient_categories', name: 'Patient Categories', level: 1, parent: null, icon: 'Users', is_hierarchical: true },
      { code: 'patient_subcategories', name: 'Patient Subcategories', level: 2, parent: 'patient_categories', icon: 'Layers', is_hierarchical: true },
      { code: 'medical_departments', name: 'Medical Departments', level: 1, parent: null, icon: 'Building2', is_hierarchical: false },
      { code: 'medical_specialties', name: 'Medical Specialties', level: 1, parent: null, icon: 'HeartPulse', is_hierarchical: false },
      { code: 'consultation_types', name: 'Consultation Types', level: 1, parent: null, icon: 'MessageSquare', is_hierarchical: false },
      { code: 'treatment_categories', name: 'Treatment Categories', level: 1, parent: null, icon: 'Activity', is_hierarchical: false },
      { code: 'patient_visit_types', name: 'Patient Visit Types', level: 1, parent: null, icon: 'Clock', is_hierarchical: false },
      { code: 'admission_types', name: 'Admission Types', level: 1, parent: null, icon: 'BedDouble', is_hierarchical: false },
      { code: 'care_types', name: 'Care Types', level: 1, parent: null, icon: 'ShieldCheck', is_hierarchical: false },
      { code: 'medical_services', name: 'Medical Services', level: 1, parent: null, icon: 'Sparkles', is_hierarchical: false },
    ],
  },
  {
    code: 'events',
    name: 'Event Management',
    description: 'Event categories, subcategories, event types, event formats, audience types, amenities, and tickets.',
    icon: 'CalendarDays',
    display_order: 7,
    master_types: [
      { code: 'event_categories', name: 'Event Categories', level: 1, parent: null, icon: 'CalendarDays', is_hierarchical: true },
      { code: 'event_subcategories', name: 'Event Subcategories', level: 2, parent: 'event_categories', icon: 'Layers', is_hierarchical: true },
      { code: 'event_types', name: 'Event Types', level: 1, parent: null, icon: 'Tags', is_hierarchical: false },
      { code: 'event_formats', name: 'Event Formats', level: 1, parent: null, icon: 'Globe', is_hierarchical: false },
      { code: 'audience_types', name: 'Audience Types', level: 1, parent: null, icon: 'Users', is_hierarchical: false },
      { code: 'event_amenities', name: 'Event Amenities', level: 1, parent: null, icon: 'Sparkles', is_hierarchical: false },
      { code: 'ticket_types', name: 'Ticket Types', level: 1, parent: null, icon: 'Receipt', is_hierarchical: false },
      { code: 'event_status_types', name: 'Event Status Types', level: 1, parent: null, icon: 'Activity', is_hierarchical: false },
      { code: 'event_participation_types', name: 'Event Participation Types', level: 1, parent: null, icon: 'UserCheck', is_hierarchical: false },
      { code: 'event_access_types', name: 'Event Access Types', level: 1, parent: null, icon: 'Lock', is_hierarchical: false },
    ],
  },
];

export async function migrateMasterData() {
  console.log('🚀 Starting Centralized Master Data Schema Migration...');

  await pool.query(`
    -- 1. Master Verticals
    CREATE TABLE IF NOT EXISTS master_verticals (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      display_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 2. Master Types
    CREATE TABLE IF NOT EXISTS master_types (
      id SERIAL PRIMARY KEY,
      vertical_id INT NOT NULL REFERENCES master_verticals(id) ON DELETE CASCADE,
      code VARCHAR(80) NOT NULL,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      hierarchy_level INT DEFAULT 1,
      parent_master_type_id INT REFERENCES master_types(id) ON DELETE SET NULL,
      icon VARCHAR(50),
      is_hierarchical BOOLEAN DEFAULT FALSE,
      allow_multiple_parents BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      display_order INT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT uq_vertical_master_type_code UNIQUE (vertical_id, code)
    );

    -- 3. Master Records (Universal hierarchical table)
    CREATE TABLE IF NOT EXISTS master_records (
      id SERIAL PRIMARY KEY,
      vertical_id INT NOT NULL REFERENCES master_verticals(id) ON DELETE CASCADE,
      master_type_id INT NOT NULL REFERENCES master_types(id) ON DELETE CASCADE,
      parent_id INT REFERENCES master_records(id) ON DELETE SET NULL,
      code VARCHAR(100),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT,
      image_url TEXT,
      icon VARCHAR(100),
      display_order INT DEFAULT 0,
      status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
      is_system BOOLEAN DEFAULT FALSE,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_by INT,
      updated_by INT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT uq_master_type_slug UNIQUE (master_type_id, slug)
    );

    CREATE INDEX IF NOT EXISTS idx_master_records_vertical_type ON master_records(vertical_id, master_type_id);
    CREATE INDEX IF NOT EXISTS idx_master_records_parent ON master_records(parent_id);
    CREATE INDEX IF NOT EXISTS idx_master_records_status ON master_records(status);
    CREATE INDEX IF NOT EXISTS idx_master_records_slug ON master_records(slug);

    -- 4. Many-to-Many Relationships between master records (e.g. Dish -> multiple menu categories)
    CREATE TABLE IF NOT EXISTS master_record_relationships (
      id SERIAL PRIMARY KEY,
      record_id INT NOT NULL REFERENCES master_records(id) ON DELETE CASCADE,
      related_record_id INT NOT NULL REFERENCES master_records(id) ON DELETE CASCADE,
      relationship_type VARCHAR(50) DEFAULT 'belongs_to',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT uq_master_record_rel UNIQUE (record_id, related_record_id, relationship_type)
    );

    CREATE INDEX IF NOT EXISTS idx_master_record_rel_record ON master_record_relationships(record_id);
    CREATE INDEX IF NOT EXISTS idx_master_record_rel_related ON master_record_relationships(related_record_id);

    -- 5. Master Attributes (Dynamic custom fields)
    CREATE TABLE IF NOT EXISTS master_attributes (
      id SERIAL PRIMARY KEY,
      vertical_id INT NOT NULL REFERENCES master_verticals(id) ON DELETE CASCADE,
      master_type_id INT REFERENCES master_types(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      label VARCHAR(150) NOT NULL,
      field_type VARCHAR(50) NOT NULL,
      placeholder VARCHAR(255),
      options JSONB DEFAULT '[]'::jsonb,
      is_required BOOLEAN DEFAULT FALSE,
      validation_rules JSONB DEFAULT '{}'::jsonb,
      display_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT uq_master_type_attr_name UNIQUE (master_type_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_master_attributes_type ON master_attributes(master_type_id);

    -- 6. Master Record Attribute Values
    CREATE TABLE IF NOT EXISTS master_record_attribute_values (
      id SERIAL PRIMARY KEY,
      record_id INT NOT NULL REFERENCES master_records(id) ON DELETE CASCADE,
      attribute_id INT NOT NULL REFERENCES master_attributes(id) ON DELETE CASCADE,
      value_text TEXT,
      value_number NUMERIC,
      value_boolean BOOLEAN,
      value_json JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT uq_record_attribute UNIQUE (record_id, attribute_id)
    );

    CREATE INDEX IF NOT EXISTS idx_master_record_attr_rec ON master_record_attribute_values(record_id);

    -- 7. Master Audit Logs
    CREATE TABLE IF NOT EXISTS master_audit_logs (
      id SERIAL PRIMARY KEY,
      vertical_id INT REFERENCES master_verticals(id) ON DELETE SET NULL,
      master_type_id INT REFERENCES master_types(id) ON DELETE SET NULL,
      record_id INT,
      record_name VARCHAR(255),
      action VARCHAR(50) NOT NULL,
      changed_fields JSONB DEFAULT '{}'::jsonb,
      performed_by INT,
      performed_by_name VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_master_audit_logs_vertical ON master_audit_logs(vertical_id);
    CREATE INDEX IF NOT EXISTS idx_master_audit_logs_record ON master_audit_logs(record_id);
  `);

  console.log('✅ Tables and indexes created successfully.');

  // Seed Verticals and Master Types
  console.log('🌱 Seeding verticals and master types...');
  for (const vert of VERTICALS_CONFIG) {
    const vRes = await pool.query(`
      INSERT INTO master_verticals (code, name, description, icon, display_order)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          display_order = EXCLUDED.display_order,
          updated_at = NOW()
      RETURNING id;
    `, [vert.code, vert.name, vert.description, vert.icon, vert.display_order]);
    const verticalId = vRes.rows[0].id;

    // First pass: insert master types without parent references
    const typeIdMap = {};
    for (let i = 0; i < vert.master_types.length; i++) {
      const mt = vert.master_types[i];
      const mtRes = await pool.query(`
        INSERT INTO master_types (vertical_id, code, name, description, hierarchy_level, icon, is_hierarchical, allow_multiple_parents, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (vertical_id, code) DO UPDATE
        SET name = EXCLUDED.name,
            hierarchy_level = EXCLUDED.hierarchy_level,
            icon = EXCLUDED.icon,
            is_hierarchical = EXCLUDED.is_hierarchical,
            allow_multiple_parents = EXCLUDED.allow_multiple_parents,
            display_order = EXCLUDED.display_order,
            updated_at = NOW()
        RETURNING id;
      `, [verticalId, mt.code, mt.name, `${mt.name} configuration for ${vert.name}`, mt.level, mt.icon, Boolean(mt.is_hierarchical), Boolean(mt.allow_multiple_parents), i + 1]);
      typeIdMap[mt.code] = mtRes.rows[0].id;
    }

    // Second pass: link parent_master_type_id
    for (const mt of vert.master_types) {
      if (mt.parent && typeIdMap[mt.parent]) {
        await pool.query(`
          UPDATE master_types
          SET parent_master_type_id = $1
          WHERE id = $2;
        `, [typeIdMap[mt.parent], typeIdMap[mt.code]]);
      }
    }
  }

  console.log('✅ Verticals and Master Types seeded successfully.');

  // Sync all sequences
  await pool.query(`
    SELECT setval(pg_get_serial_sequence('master_verticals', 'id'), COALESCE((SELECT MAX(id) FROM master_verticals), 1), true);
    SELECT setval(pg_get_serial_sequence('master_types', 'id'), COALESCE((SELECT MAX(id) FROM master_types), 1), true);
    SELECT setval(pg_get_serial_sequence('master_records', 'id'), COALESCE((SELECT MAX(id) FROM master_records), 1), true);
    SELECT setval(pg_get_serial_sequence('master_attributes', 'id'), COALESCE((SELECT MAX(id) FROM master_attributes), 1), true);
  `);

  console.log('🎉 Centralized Master Data Schema Ready!');
}

if (process.argv[1]?.endsWith('migrate-master-data.mjs')) {
  migrateMasterData()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Migration failed:', err);
      pool.end();
      process.exit(1);
    });
}
