import { Pool } from "pg";

export async function ensureSubscriptionSchema(pool: Pool) {
  // 1. Ensure sales_packages has all modern growth package columns
  await pool.query(`
    ALTER TABLE sales_packages 
    ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'starter',
    ADD COLUMN IF NOT EXISTS listing_limit_monthly INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS target_audience TEXT,
    ADD COLUMN IF NOT EXISTS features_list JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS services_list JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS overage_price_per_listing NUMERIC(10,2) DEFAULT 0.50,
    ADD COLUMN IF NOT EXISTS auto_overage_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 14,
    ADD COLUMN IF NOT EXISTS price_annual NUMERIC(12,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_custom_enterprise BOOLEAN DEFAULT FALSE;
  `);

  // 2. Ensure subscriptions table has modern tracking fields
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      package_id INTEGER REFERENCES sales_packages(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'active',
      starts_at DATE DEFAULT CURRENT_DATE,
      expires_at DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month')::date,
      price NUMERIC(12,2) DEFAULT 0.00,
      price_unit VARCHAR(20) DEFAULT 'USD',
      billing_cycle VARCHAR(20) DEFAULT 'monthly',
      listing_allowance INTEGER DEFAULT 100,
      listings_used INTEGER DEFAULT 0,
      additional_credits INTEGER DEFAULT 0,
      is_recurring BOOLEAN DEFAULT TRUE,
      razorpay_payment_id VARCHAR(255),
      razorpay_order_id VARCHAR(255),
      plan_name VARCHAR(255),
      last_notification_sent_level INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS listing_allowance INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS listings_used INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS additional_credits INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_notification_sent_level INTEGER DEFAULT 0;
  `);

  // 3. Unique listing usage tracking to prevent duplicate usage counting
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscription_listing_usage (
      id SERIAL PRIMARY KEY,
      subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL,
      listing_id VARCHAR(100) NOT NULL,
      listing_type VARCHAR(50) DEFAULT 'business',
      listing_name VARCHAR(255),
      billing_cycle_start DATE NOT NULL,
      billing_cycle_end DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_sub_listing_cycle UNIQUE (subscription_id, listing_id, billing_cycle_start)
    );
    CREATE INDEX IF NOT EXISTS idx_sub_usage_sub_id ON subscription_listing_usage(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_sub_usage_cycle ON subscription_listing_usage(billing_cycle_start, billing_cycle_end);
  `);

  // 4. Invoices and credit topups table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscription_invoices (
      id SERIAL PRIMARY KEY,
      subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL,
      invoice_number VARCHAR(100) UNIQUE NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      currency VARCHAR(20) DEFAULT 'USD',
      status VARCHAR(50) DEFAULT 'paid',
      plan_name VARCHAR(255),
      billing_period_start DATE,
      billing_period_end DATE,
      payment_method VARCHAR(100) DEFAULT 'Card / Razorpay',
      receipt_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS package_credit_topups (
      id SERIAL PRIMARY KEY,
      subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL,
      credits_added INTEGER NOT NULL,
      price_paid NUMERIC(10,2) NOT NULL,
      payment_id VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 5. Seed or Update the Four Core Business Growth Packages if missing
  const check = await pool.query(`
    SELECT id, tier FROM sales_packages WHERE tier IN ('starter', 'growth', 'professional', 'enterprise')
  `);

  if (check.rows.length < 4) {
    // 1. Starter
    await pool.query(`
      INSERT INTO sales_packages (
        name, package_for, tier, price, price_monthly, price_annual, price_unit,
        listing_limit_monthly, is_popular, is_active, target_audience,
        description, features_list, services_list, overage_price_per_listing, validity_count, validity_unit
      ) VALUES (
        'Starter Plan',
        'Individuals, Startups & New Businesses',
        'starter',
        49.00,
        49.00,
        490.00,
        'USD',
        100,
        FALSE,
        TRUE,
        'For individuals, startups and newly established businesses.',
        'Essential tools, profile establishment, and listing management to launch your business presence properly.',
        $1::jsonb,
        $2::jsonb,
        0.60,
        1,
        'month'
      ) ON CONFLICT DO NOTHING
    `, [
      JSON.stringify([
        "Basic business setup guidance",
        "Business profile and listing management",
        "Basic branding guidance",
        "Basic marketing support",
        "Basic sales management",
        "Basic business operations",
        "Customer and lead management",
        "Basic business analytics",
        "Access to essential business tools",
        "100 unique listing data records/month"
      ]),
      JSON.stringify([
        { title: "Business Setup", status: "Basic Guidance" },
        { title: "Branding", status: "Essential Pack" },
        { title: "Marketing", status: "Organic / Directory" },
        { title: "Team Management", status: "Up to 3 Users" },
        { title: "Support", status: "Standard Email Support" }
      ])
    ]);

    // 2. Growth (Most Popular)
    await pool.query(`
      INSERT INTO sales_packages (
        name, package_for, tier, price, price_monthly, price_annual, price_unit,
        listing_limit_monthly, is_popular, is_active, target_audience,
        description, features_list, services_list, overage_price_per_listing, validity_count, validity_unit
      ) VALUES (
        'Growth Plan',
        'Small Businesses & Growing Teams',
        'growth',
        99.00,
        99.00,
        990.00,
        'USD',
        500,
        TRUE,
        TRUE,
        'For small businesses looking to grow their customer base and sales.',
        'Accelerate sales, hiring, campaign promotions, and expand your market footprint with 500 listings/mo.',
        $1::jsonb,
        $2::jsonb,
        0.50,
        1,
        'month'
      ) ON CONFLICT DO NOTHING
    `, [
      JSON.stringify([
        "Everything in Starter, plus:",
        "Advanced business setup assistance",
        "Hiring and recruitment support",
        "Employee and team management",
        "Sales pipeline management",
        "Lead generation support",
        "Marketing campaign management",
        "Social media marketing support",
        "Branding improvement",
        "Customer follow-up management",
        "Advanced business analytics",
        "500 unique listing data records/month"
      ]),
      JSON.stringify([
        { title: "Business Setup", status: "Assisted Setup" },
        { title: "Hiring & Recruitment", status: "Job Postings & Candidate Pipeline" },
        { title: "Marketing Campaigns", status: "Campaign & Social Integration" },
        { title: "CRM & Follow-up", status: "Automated Lead Pipeline" },
        { title: "Support", status: "Chat & Priority Email" }
      ])
    ]);

    // 3. Professional
    await pool.query(`
      INSERT INTO sales_packages (
        name, package_for, tier, price, price_monthly, price_annual, price_unit,
        listing_limit_monthly, is_popular, is_active, target_audience,
        description, features_list, services_list, overage_price_per_listing, validity_count, validity_unit
      ) VALUES (
        'Professional Plan',
        'Established Businesses & Scale-ups',
        'professional',
        199.00,
        199.00,
        1990.00,
        'USD',
        2000,
        FALSE,
        TRUE,
        'For established businesses looking to scale their operations.',
        'Scale departments, strategic marketing campaigns, dedicated BPM, and comprehensive performance analytics.',
        $1::jsonb,
        $2::jsonb,
        0.40,
        1,
        'month'
      ) ON CONFLICT DO NOTHING
    `, [
      JSON.stringify([
        "Everything in Growth, plus:",
        "Advanced hiring and recruitment management",
        "Team and department management",
        "Advanced sales management",
        "Marketing strategy and execution",
        "Brand development and positioning",
        "Business process management (BPM)",
        "Customer relationship management",
        "Advanced reporting and analytics",
        "Business performance monitoring",
        "Priority VIP support",
        "2,000 unique listing data records/month"
      ]),
      JSON.stringify([
        { title: "Strategic Marketing", status: "Multi-channel Campaigns" },
        { title: "Team & Departments", status: "Role-based Team Workflows" },
        { title: "Process Management", status: "Custom Operations SOPs" },
        { title: "Performance Monitoring", status: "Real-time KPI Dashboard" },
        { title: "Support", status: "Priority 24/7 Support" }
      ])
    ]);

    // 4. Enterprise
    await pool.query(`
      INSERT INTO sales_packages (
        name, package_for, tier, price, price_monthly, price_annual, price_unit,
        listing_limit_monthly, is_popular, is_active, target_audience,
        description, features_list, services_list, overage_price_per_listing, validity_count, validity_unit, is_custom_enterprise
      ) VALUES (
        'Enterprise Suite',
        'Large Organizations, Agencies & Multi-Location',
        'enterprise',
        499.00,
        499.00,
        4990.00,
        'USD',
        5000,
        FALSE,
        TRUE,
        'For large businesses, agencies and multi-location organizations.',
        'Custom enterprise workflows, dedicated account management, unlimited scale, and tailored integrations.',
        $1::jsonb,
        $2::jsonb,
        0.30,
        1,
        'month',
        TRUE
      ) ON CONFLICT DO NOTHING
    `, [
      JSON.stringify([
        "Everything in Professional, plus:",
        "Dedicated business growth support",
        "Customized business setup assistance",
        "Large-scale recruitment management",
        "Advanced sales and marketing management",
        "Multi-location business management",
        "Advanced branding strategy",
        "Customized business workflows",
        "Enterprise analytics and reporting",
        "Dedicated account manager",
        "Custom integrations and automation",
        "Priority enterprise support",
        "5,000+ listing records/month (Configurable)"
      ]),
      JSON.stringify([
        { title: "Multi-Location", status: "Unlimited Branches / Stores" },
        { title: "Account Manager", status: "Dedicated Growth Advisor" },
        { title: "Custom Integrations", status: "API & Webhook Webhooks" },
        { title: "Security & SLA", status: "99.9% Uptime & Custom SLA" },
        { title: "Support", status: "Direct Phone & Slack Channel" }
      ])
    ]);
  }
}
