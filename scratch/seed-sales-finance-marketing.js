const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString && (connectionString.includes("localhost") || connectionString.includes("127.0.0.1")) ? false : { rejectUnauthorized: false },
});

let PRE_COMPUTED_HASH = null;

async function getHashedPassword() {
  if (!PRE_COMPUTED_HASH) {
    const salt = await bcrypt.genSalt(4);
    PRE_COMPUTED_HASH = await bcrypt.hash("DemoPass123", salt);
  }
  return PRE_COMPUTED_HASH;
}

async function getOrCreateUser(fullName, email, phone) {
  const hashed = await getHashedPassword();
  const res = await pool.query(
    `INSERT INTO users (full_name, email, password, phone, is_active, is_verified, is_profile_complete, created_at, updated_at)
     VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW()
     RETURNING id`,
    [fullName, email, hashed, phone]
  );
  return res.rows[0].id;
}

async function initSchemas() {
  console.log("🛠️ Initializing Sales & Finance Schemas...");

  // Sales Tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_packages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      package_for VARCHAR(160) NOT NULL,
      package_for_types JSONB NOT NULL DEFAULT '[]'::jsonb,
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      price_unit VARCHAR(20) NOT NULL DEFAULT 'month',
      storage_limit_gb NUMERIC(12,2),
      validity_count INTEGER NOT NULL DEFAULT 1,
      validity_unit VARCHAR(20) NOT NULL DEFAULT 'month',
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      deleted_at TIMESTAMP,
      deleted_by INTEGER REFERENCES users(id),
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_contacts (
      id SERIAL PRIMARY KEY,
      contact_type VARCHAR(40) NOT NULL,
      full_name VARCHAR(180) NOT NULL,
      emails JSONB NOT NULL DEFAULT '[]'::jsonb,
      phones JSONB NOT NULL DEFAULT '[]'::jsonb,
      website VARCHAR(240),
      business_name VARCHAR(180),
      business_is_active BOOLEAN NOT NULL DEFAULT FALSE,
      designation VARCHAR(160),
      address TEXT,
      lead_source VARCHAR(40) NOT NULL,
      sales_stage VARCHAR(40) NOT NULL DEFAULT 'lead',
      pipeline_stage VARCHAR(40) NOT NULL DEFAULT 'meeting_demo',
      next_follow_up_date DATE,
      assigned_to INTEGER REFERENCES users(id),
      assigned_package_id INTEGER REFERENCES sales_packages(id),
      remarks TEXT,
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      deleted_at TIMESTAMP,
      deleted_by INTEGER REFERENCES users(id),
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_contact_changes (
      id BIGSERIAL PRIMARY KEY,
      contact_id INTEGER REFERENCES sales_contacts(id),
      action VARCHAR(40) NOT NULL,
      before_data JSONB,
      after_data JSONB,
      changed_by INTEGER REFERENCES users(id),
      changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Finance Tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_income_categories (
      id SERIAL PRIMARY KEY,
      scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
      institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
      name VARCHAR(160) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_income_entries (
      id BIGSERIAL PRIMARY KEY,
      scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
      institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES finance_income_categories(id) ON DELETE SET NULL,
      payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','upi','net_banking')),
      paid_to VARCHAR(80) NOT NULL,
      paid_to_label VARCHAR(180) NOT NULL,
      amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      income_date DATE NOT NULL,
      invoice_url TEXT,
      invoice_public_id TEXT,
      invoice_resource_type VARCHAR(50),
      invoice_file_name VARCHAR(240),
      description TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_expense_categories (
      id SERIAL PRIMARY KEY,
      scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
      institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
      name VARCHAR(160) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_expense_entries (
      id BIGSERIAL PRIMARY KEY,
      scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
      institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES finance_expense_categories(id) ON DELETE SET NULL,
      payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','upi','net_banking')),
      payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('paid','due')),
      paid_by VARCHAR(80) NOT NULL,
      paid_by_label VARCHAR(180) NOT NULL,
      amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      expense_date DATE NOT NULL,
      invoice_url TEXT,
      invoice_public_id TEXT,
      invoice_resource_type VARCHAR(50),
      invoice_file_name VARCHAR(240),
      description TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_recurring_expenses (
      id BIGSERIAL PRIMARY KEY,
      scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
      institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
      title VARCHAR(180) NOT NULL,
      category_ids INTEGER[] NOT NULL DEFAULT '{}',
      payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','upi','net_banking')),
      paid_by VARCHAR(80) NOT NULL,
      paid_by_label VARCHAR(180) NOT NULL,
      amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('monthly','yearly')),
      due_day SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
      start_date DATE NOT NULL,
      end_date DATE,
      payment_status VARCHAR(20) NOT NULL DEFAULT 'due',
      reminder_days_before SMALLINT NOT NULL DEFAULT 3,
      next_due_date DATE NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      description TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_allowance_entries (
      id BIGSERIAL PRIMARY KEY,
      scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
      institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','upi','net_banking')),
      amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      allowance_date DATE NOT NULL,
      invoice_url TEXT,
      invoice_public_id TEXT,
      invoice_resource_type VARCHAR(50),
      invoice_file_name VARCHAR(240),
      description TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_allowance_spend_entries (
      id BIGSERIAL PRIMARY KEY,
      allowance_id BIGINT NOT NULL REFERENCES finance_allowance_entries(id) ON DELETE CASCADE,
      scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
      institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','upi','net_banking')),
      amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      spend_date DATE NOT NULL,
      invoice_url TEXT,
      invoice_public_id TEXT,
      invoice_resource_type VARCHAR(50),
      invoice_file_name VARCHAR(240),
      description TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function main() {
  await initSchemas();
  console.log("🚀 Seeding Dummy Records for Platform Admin and Demo Professional...");

  // Get Admin Users
  const platformAdminId = await getOrCreateUser("Demo Platform Admin", "demo.platform_admin@edubird.com", "9876543210");
  const professionalAdminId = await getOrCreateUser("Demo Professional", "demo.professional@edubird.com", "9876543212");

  // Get Demo Professional Institutions
  const instsRes = await pool.query(`SELECT id, name FROM institution_profiles WHERE created_by = $1 AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 2`, [professionalAdminId]);
  const instIds = instsRes.rows.map(r => r.id);

  console.log(`👤 Platform Admin ID: ${platformAdminId}`);
  console.log(`👤 Demo Professional Admin ID: ${professionalAdminId} (Institutions: ${instIds.join(", ")})`);

  // ==============================================================
  // 1. SEED SALES PACKAGES & LEADS (PLATFORM & DEMO PROF)
  // ==============================================================
  console.log("\n📦 Seeding Sales Packages & Marketing Plans...");
  const PACKAGES_DATA = [
    { name: "EduBird Enterprise University Suite", for: "University", types: ["university", "school"], price: 49999, unit: "month", storage: 500, validity: 12, vUnit: "month", desc: "Complete ERP, AI Exam Evaluation, Multi-Campus Management & Analytics." },
    { name: "Growth Professional Institute Plan", for: "Coaching Center", types: ["coaching_institute", "school"], price: 19999, unit: "month", storage: 250, validity: 12, vUnit: "month", desc: "Advanced Student Portal, Fee Tracking, Batch Scheduling & Mobile App." },
    { name: "Academic Coaching Starter Pack", for: "Coaching Center", types: ["coaching_institute"], price: 9999, unit: "month", storage: 100, validity: 6, vUnit: "month", desc: "Core Attendance, Notes Share, Online Mock Tests & Parents Notifications." },
    { name: "School Digital Management Bundle", for: "School", types: ["school"], price: 14999, unit: "month", storage: 150, validity: 12, vUnit: "month", desc: "Report Cards, TC Generator, Fee Receipt System & Attendance SMS." },
    { name: "Custom AI & Analytics Premium Add-on", for: "Individual", types: ["individual", "school"], price: 4999, unit: "month", storage: 50, validity: 1, vUnit: "month", desc: "AI Question Generator, Custom Performance Analytics & Proctoring." },
  ];

  const packageIds = [];
  for (const pkg of PACKAGES_DATA) {
    const pRes = await pool.query(
      `INSERT INTO sales_packages (name, package_for, package_for_types, price, price_unit, storage_limit_gb, validity_count, validity_unit, description, is_active, created_by, updated_by)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, TRUE, $10, $10)
       RETURNING id`,
      [pkg.name, pkg.for, JSON.stringify(pkg.types), pkg.price, pkg.unit, pkg.storage, pkg.validity, pkg.vUnit, pkg.desc, platformAdminId]
    );
    packageIds.push(pRes.rows[0].id);
  }
  console.log(`   ✓ ${packageIds.length} Sales Packages created.`);

  console.log("🎯 Seeding Sales Leads & Pipeline Deals...");
  const SALES_LEADS = [
    { name: "Dr. Vikramaditya Sen", cType: "university", biz: "Oxford International University", email: "admissions@oxforduniv.edu", phone: "9876500001", web: "oxforduniv.edu", source: "google", stage: "paid", pStage: "client_approved", pkg: packageIds[0] },
    { name: "Prof. Sunita Deshmukh", cType: "school", biz: "DPS Modern Public School", email: "principal@dpsmodern.edu", phone: "9876500002", web: "dpsmodern.edu", source: "website", stage: "interested_to_pay", pStage: "send_invoice", pkg: packageIds[3] },
    { name: "Rajesh Khandelwal", cType: "coaching_institute", biz: "Resonance Career Classes", email: "contact@resonancecareer.com", phone: "9876500003", web: "resonancecareer.com", source: "social_media", stage: "meeting_demo", pStage: "need_proposal", pkg: packageIds[1] },
    { name: "Anand Rathi", cType: "coaching_institute", biz: "Allen Competitive Academy", email: "info@allencompetitive.com", phone: "9876500004", web: "allencompetitive.com", source: "promotion", stage: "proposal_sent", pStage: "interested_to_pay", pkg: packageIds[1] },
    { name: "Pooja Malhotra", cType: "individual", biz: "Scholars Tutorial Hub", email: "pooja@scholarstutorial.org", phone: "9876500005", web: "scholarstutorial.org", source: "lead", stage: "called", pStage: "call_later", pkg: packageIds[2] },
    { name: "Dr. Arvind Swamy", cType: "university", biz: "Sri Ramachandra Tech University", email: "vc@sriramachandra.edu", phone: "9876500006", web: "sriramachandra.edu", source: "mtm", stage: "client_approved", pStage: "client_approved", pkg: packageIds[0] },
    { name: "Meenakshi Sundaram", cType: "school", biz: "St. Thomas Higher Secondary School", email: "admin@stthomas.edu", phone: "9876500007", web: "stthomas.edu", source: "google", stage: "access_given", pStage: "access_given", pkg: packageIds[3] },
    { name: "Vikas Aggarwal", cType: "coaching_institute", biz: "Pinnacle Target NEET Academy", email: "head@pinnacleneet.in", phone: "9876500008", web: "pinnacleneet.in", source: "website", stage: "lead", pStage: "meeting_demo", pkg: packageIds[2] },
  ];

  for (const lead of SALES_LEADS) {
    const cRes = await pool.query(
      `INSERT INTO sales_contacts (
        contact_type, full_name, emails, phones, website, business_name, business_is_active, designation,
        address, lead_source, sales_stage, pipeline_stage, next_follow_up_date, assigned_to, assigned_package_id,
        remarks, created_by, updated_by, created_at, updated_at
      ) VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, TRUE, 'Director / Founder',
        'Varanasi, Uttar Pradesh', $7, $8, $9, '2026-08-25', $10, $11,
        'High intent lead interested in multi-campus portal and automated exam grading.', $10, $10, NOW(), NOW())
      RETURNING id`,
      [
        lead.cType,
        lead.name,
        JSON.stringify([lead.email]),
        JSON.stringify([{ number: lead.phone, is_whatsapp: true }]),
        lead.web,
        lead.biz,
        lead.source,
        lead.stage,
        lead.pStage,
        platformAdminId,
        lead.pkg,
      ]
    );
    const contactId = cRes.rows[0].id;

    // Contact stage audit log
    await pool.query(
      `INSERT INTO sales_contact_changes (contact_id, action, before_data, after_data, changed_by, changed_at)
       VALUES ($1, 'stage_change', '{"sales_stage": "lead"}'::jsonb, $2::jsonb, $3, NOW())`,
      [contactId, JSON.stringify({ sales_stage: lead.stage, pipeline_stage: lead.pStage }), platformAdminId]
    );
  }
  console.log(`   ✓ ${SALES_LEADS.length} Sales Leads & Pipeline Deals seeded with Audit Trail.`);

  // ==============================================================
  // 2. SEED PLATFORM FINANCE RECORDS (SCOPE = PLATFORM)
  // ==============================================================
  console.log("\n💳 Seeding PLATFORM Finance Records (Super Admin Scope)...");

  // Income Category
  const pIncCatRes = await pool.query(
    `INSERT INTO finance_income_categories (scope_type, name, is_active, created_by)
     VALUES ('platform', 'SaaS Enterprise Subscription Revenue', TRUE, $1) RETURNING id`,
    [platformAdminId]
  );
  const pIncCatId = pIncCatRes.rows[0].id;

  // Expense Category
  const pExpCatRes = await pool.query(
    `INSERT INTO finance_expense_categories (scope_type, name, is_active, created_by)
     VALUES ('platform', 'Cloud Infrastructure & AI API Services', TRUE, $1) RETURNING id`,
    [platformAdminId]
  );
  const pExpCatId = pExpCatRes.rows[0].id;

  // Platform Income Entries
  const PLATFORM_INCOMES = [
    { amount: 49999, label: "University Enterprise Annual Plan - Oxford Univ", method: "net_banking", date: "2026-08-01" },
    { amount: 19999, label: "Coaching Center Growth Plan - Resonance Academy", method: "upi", date: "2026-08-05" },
    { amount: 14999, label: "School Management License - DPS Modern School", method: "net_banking", date: "2026-08-10" },
    { amount: 125000, label: "Custom AI Proctoring Contract - AKTU University", method: "net_banking", date: "2026-08-12" },
    { amount: 4999, label: "AI Token API License Package - Individual Scholar", method: "upi", date: "2026-08-14" },
  ];

  for (const inc of PLATFORM_INCOMES) {
    await pool.query(
      `INSERT INTO finance_income_entries (
        scope_type, category_id, payment_method, paid_to, paid_to_label, amount, income_date, description, created_by, created_at
      ) VALUES ('platform', $1, $2, 'EduBird Treasury', $3, $4, $5, 'Platform SaaS License Fee Deposit', $6, NOW())`,
      [pIncCatId, inc.method, inc.label, inc.amount, inc.date, platformAdminId]
    );
  }
  console.log(`   ✓ Platform Income Entries created.`);

  // Platform Expense Entries
  const PLATFORM_EXPENSES = [
    { amount: 35000, label: "AWS Cloud Server Hosting & Database Cluster", method: "net_banking", date: "2026-08-02", status: "paid" },
    { amount: 18500, label: "Qwen / OpenAI LLM Inference API Billing", method: "net_banking", date: "2026-08-04", status: "paid" },
    { amount: 45000, label: "Digital Growth & Google Search Ad Marketing", method: "net_banking", date: "2026-08-08", status: "paid" },
    { amount: 22000, label: "Twilio SMS & WhatsApp Gateway Credits", method: "upi", date: "2026-08-11", status: "paid" },
  ];

  for (const exp of PLATFORM_EXPENSES) {
    await pool.query(
      `INSERT INTO finance_expense_entries (
        scope_type, category_id, payment_method, payment_status, paid_by, paid_by_label, amount, expense_date, description, created_by, created_at
      ) VALUES ('platform', $1, $2, $3, 'Finance Operations', $4, $5, $6, 'Operational Infrastructure Expense', $7, NOW())`,
      [pExpCatId, exp.method, exp.status, exp.label, exp.amount, exp.date, platformAdminId]
    );
  }
  console.log(`   ✓ Platform Expense Entries created.`);

  // Platform Recurring Expenses
  const PLATFORM_RECURRING = [
    { title: "AWS Multi-Region Server Cluster Billing", amount: 35000, day: 1, freq: "monthly", due: "2026-09-01" },
    { title: "Twilio Enterprise Messaging API Gateway", amount: 15000, day: 5, freq: "monthly", due: "2026-09-05" },
    { title: "Google Workspace & Suite Enterprise Licenses", amount: 8500, day: 10, freq: "monthly", due: "2026-09-10" },
    { title: "Cloudflare Enterprise Security & CDN Shield", amount: 12000, day: 15, freq: "monthly", due: "2026-09-15" },
  ];

  for (const rec of PLATFORM_RECURRING) {
    await pool.query(
      `INSERT INTO finance_recurring_expenses (
        scope_type, title, category_ids, payment_method, paid_by, paid_by_label, amount, frequency, due_day, start_date, payment_status, reminder_days_before, next_due_date, is_active, description, created_by, created_at
      ) VALUES ('platform', $1, ARRAY[$2]::integer[], 'net_banking', 'Corporate Admin', 'Recurring Subscriptions', $3, $4, $5, '2026-01-01', 'due', 3, $6, TRUE, 'Monthly recurring vendor billing', $7, NOW())`,
      [rec.title, pExpCatId, rec.amount, rec.freq, rec.day, rec.due, platformAdminId]
    );
  }
  console.log(`   ✓ Platform Recurring Expenses created.`);

  // Platform Staff Allowances
  const pAllowRes = await pool.query(
    `INSERT INTO finance_allowance_entries (
      scope_type, user_id, payment_method, amount, allowance_date, description, created_by, created_at
    ) VALUES ('platform', $1, 'net_banking', 25000, '2026-08-01', 'Senior Sales Executive Client Onboarding & Travel Stipend', $2, NOW())
    RETURNING id`,
    [platformAdminId, platformAdminId]
  );
  const pAllowId = pAllowRes.rows[0].id;

  await pool.query(
    `INSERT INTO finance_allowance_spend_entries (
      allowance_id, scope_type, user_id, payment_method, amount, spend_date, description, created_by, created_at
    ) VALUES ($1, 'platform', $2, 'upi', 4500, '2026-08-06', 'Client Meeting Lunch & Demo Presentation Flight Booking', $2, NOW())`,
    [pAllowId, platformAdminId]
  );
  console.log(`   ✓ Platform Staff Allowances & Spend Entries created.`);

  // ==============================================================
  // 3. SEED INSTITUTION FINANCE RECORDS (DEMO PROFESSIONAL SCOPE)
  // ==============================================================
  console.log("\n🏢 Seeding INSTITUTION Finance Records (Demo Professional Scope)...");

  for (const instId of instIds) {
    // Institution Income Category
    const iIncCatRes = await pool.query(
      `INSERT INTO finance_income_categories (scope_type, institution_id, name, is_active, created_by)
       VALUES ('institution', $1, 'Academic Tuition & Lab Fee Receipts', TRUE, $2) RETURNING id`,
      [instId, professionalAdminId]
    );
    const iIncCatId = iIncCatRes.rows[0].id;

    // Institution Expense Category
    const iExpCatRes = await pool.query(
      `INSERT INTO finance_expense_categories (scope_type, institution_id, name, is_active, created_by)
       VALUES ('institution', $1, 'Faculty Salary & Campus Maintenance', TRUE, $2) RETURNING id`,
      [instId, professionalAdminId]
    );
    const iExpCatId = iExpCatRes.rows[0].id;

    // Institution Incomes
    const INST_INCOMES = [
      { amount: 450000, label: "Batch A Semester Tuition Fee Deposit", method: "net_banking", date: "2026-08-03" },
      { amount: 280000, label: "Batch B Laboratory & Library Security Fee", method: "upi", date: "2026-08-07" },
      { amount: 150000, label: "Annual Sports Complex & Transport Charges", method: "net_banking", date: "2026-08-11" },
    ];

    for (const inc of INST_INCOMES) {
      await pool.query(
        `INSERT INTO finance_income_entries (
          scope_type, institution_id, category_id, payment_method, paid_to, paid_to_label, amount, income_date, description, created_by, created_at
        ) VALUES ('institution', $1, $2, $3, 'Accounts Office', $4, $5, $6, 'Student Fee Collection Deposit', $7, NOW())`,
        [instId, iIncCatId, inc.method, inc.label, inc.amount, inc.date, professionalAdminId]
      );
    }

    // Institution Expenses
    const INST_EXPENSES = [
      { amount: 185000, label: "Senior Professor & Teaching Faculty Monthly Salary", method: "net_banking", date: "2026-08-01", status: "paid" },
      { amount: 42000, label: "Computer Science AI Lab Hardware Servicing", method: "net_banking", date: "2026-08-05", status: "paid" },
      { amount: 15000, label: "Campus Cafeteria Food Inventory Purchase", method: "cash", date: "2026-08-09", status: "paid" },
    ];

    for (const exp of INST_EXPENSES) {
      await pool.query(
        `INSERT INTO finance_expense_entries (
          scope_type, institution_id, category_id, payment_method, payment_status, paid_by, paid_by_label, amount, expense_date, description, created_by, created_at
        ) VALUES ('institution', $1, $2, $3, $4, 'Bursar Office', $5, $6, $7, 'Campus Maintenance & Staff Payroll', $8, NOW())`,
        [instId, iExpCatId, exp.method, exp.status, exp.label, exp.amount, exp.date, professionalAdminId]
      );
    }

    // Institution Recurring Expenses
    const INST_RECURRING = [
      { title: "Campus High-Speed Leased Line Internet", amount: 18000, day: 5, freq: "monthly", due: "2026-09-05" },
      { title: "State Electricity Board Campus Power Bill", amount: 45000, day: 10, freq: "monthly", due: "2026-09-10" },
      { title: "Bus Fleet Diesel & Preventive Servicing", amount: 28000, day: 15, freq: "monthly", due: "2026-09-15" },
    ];

    for (const rec of INST_RECURRING) {
      await pool.query(
        `INSERT INTO finance_recurring_expenses (
          scope_type, institution_id, title, category_ids, payment_method, paid_by, paid_by_label, amount, frequency, due_day, start_date, payment_status, reminder_days_before, next_due_date, is_active, description, created_by, created_at
        ) VALUES ('institution', $1, $2, ARRAY[$3]::integer[], 'net_banking', 'Admin Department', 'Monthly Campus Utilities', $4, $5, $6, '2026-01-01', 'due', 3, $7, TRUE, 'Utility maintenance bill', $8, NOW())`,
        [instId, rec.title, iExpCatId, rec.amount, rec.freq, rec.day, rec.due, professionalAdminId]
      );
    }

    // Institution Allowances
    const iAllowRes = await pool.query(
      `INSERT INTO finance_allowance_entries (
        scope_type, institution_id, user_id, payment_method, amount, allowance_date, description, created_by, created_at
      ) VALUES ('institution', $1, $2, 'net_banking', 15000, '2026-08-01', 'Head of Department Academic Conference & Paper Publication Grant', $2, NOW())
      RETURNING id`,
      [instId, professionalAdminId]
    );
    const iAllowId = iAllowRes.rows[0].id;

    await pool.query(
      `INSERT INTO finance_allowance_spend_entries (
        allowance_id, scope_type, institution_id, user_id, payment_method, amount, spend_date, description, created_by, created_at
      ) VALUES ($1, 'institution', $2, $3, 'upi', 3200, '2026-08-07', 'International AI Seminar Registration & Travel', $3, NOW())`,
      [iAllowId, instId, professionalAdminId]
    );
  }
  console.log(`   ✓ Institution Finance Entries created for all demo institutions.`);

  console.log(`\n🎉 SEEDING COMPLETE! Rich dummy records inserted across Finance, Sales, and Sales & Marketing for Platform Admin & Demo Professional!`);
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Seeding Error:", err);
  process.exit(1);
});
