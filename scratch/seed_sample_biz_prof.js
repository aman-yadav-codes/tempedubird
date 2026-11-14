process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require("pg");
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const bizCheck = await pool.query("SELECT COUNT(*) as c FROM business_profiles");
  if (parseInt(bizCheck.rows[0].c) === 0) {
    console.log("Seeding sample business profile...");
    const ins = await pool.query(`
      INSERT INTO business_profiles (
        name, slug, business_type, country_code, state, city, locality, address,
        phone, whatsapp, email, website, about, established_year, is_verified, is_featured, is_active,
        banner_url, logo_url
      ) VALUES (
        'Sharma Legal & Associates', 'sharma-legal-associates', 'Legal & Professional Services', 'IN', 'Maharashtra', 'Mumbai', 'Nariman Point', '101, Express Towers, Nariman Point',
        '+91 98765 43210', '919876543210', 'contact@sharmalegal.com', 'https://sharmalegal.com',
        'Sharma Legal & Associates is a full-service commercial law and corporate advisory firm providing comprehensive legal solutions for startups, enterprises, and individual clients.',
        2015, true, true, true,
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=300&q=80'
      ) RETURNING id;
    `);
    const bizId = ins.rows[0].id;

    // Seed products for this business
    await pool.query(`
      INSERT INTO master_products (
        name, slug, brand, regular_price, discounted_price, currency, default_image_url, description, business_profile_id, is_active
      ) VALUES 
      (
        'Comprehensive Corporate Legal Kit', 'corporate-legal-kit', 'Sharma Legal', 4500, 3499, 'INR',
        'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=500&q=80',
        'Complete set of standard NDAs, Founder Agreements, Employment Contracts, and IP Assignment Templates.',
        $1, true
      ),
      (
        'Startup Compliance & Regulatory Handbook', 'startup-compliance-handbook', 'Sharma Legal', 1200, 999, 'INR',
        'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=500&q=80',
        'A comprehensive guide to regulatory compliances, GST, and corporate governance for new businesses in India.',
        $1, true
      );
    `, [bizId]);

    // Seed services for this business
    await pool.query(`
      INSERT INTO master_services (
        name, slug, pricing_model, regular_price, discounted_price, currency, estimated_duration, service_location, default_image_url, description, business_profile_id, is_active
      ) VALUES
      (
        'Corporate Legal Audit & Retainer Consultation', 'corporate-legal-audit', 'Fixed Retainer', 15000, 12000, 'INR',
        '2 Hours', 'Online & In-Person',
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=500&q=80',
        'Detailed audit of commercial agreements, employment policies, and regulatory filing compliance for companies.',
        $1, true
      ),
      (
        'Trademark & IP Registration Advisory', 'trademark-registration', 'Package', 7500, 5999, 'INR',
        '1 Hour Consultation', 'Online',
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=500&q=80',
        'End-to-end trademark search, documentation preparation, and government filing assistance.',
        $1, true
      );
    `, [bizId]);

    console.log("Sample business profile and products/services created!");
  }

  const profCheck = await pool.query("SELECT COUNT(*) as c FROM professional_profiles");
  if (parseInt(profCheck.rows[0].c) === 0) {
    console.log("Seeding sample professional profile...");
    const bizRes = await pool.query("SELECT id FROM business_profiles LIMIT 1");
    const bizId = bizRes.rows[0]?.id || null;

    const insProf = await pool.query(`
      INSERT INTO professional_profiles (
        name, slug, profession_type, designation, professional_title, skills, experience_years,
        country_code, state, city, locality, address, phone, whatsapp, email, website,
        about, introduction, is_verified, is_featured, is_active, business_profile_id,
        avatar_url, banner_url
      ) VALUES (
        'Advocate Rajesh Sharma', 'advocate-rajesh-sharma', 'Legal Consultant', 'Senior Corporate Counsel', 'Advocate & Legal Strategist',
        ARRAY['Corporate Law', 'Contract Negotiation', 'IP & Trademark', 'Mergers & Acquisitions', 'Commercial Arbitration'],
        14, 'IN', 'Maharashtra', 'Mumbai', 'Bandra West', 'Bandra Kurla Complex (BKC)',
        '+91 98765 43211', '919876543211', 'rajesh@sharmalegal.com', 'https://sharmalegal.com/rajesh',
        'Advocate Rajesh Sharma is a Senior Corporate Counsel with over 14 years of experience advising technology startups, enterprises, and venture funds on cross-border transactions, intellectual property, and commercial disputes.',
        'Experienced Advocate providing bespoke legal counsel and strategic guidance.',
        true, true, true, $1,
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
        'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=1200&q=80'
      ) RETURNING id;
    `, [bizId]);
    const profId = insProf.rows[0].id;

    // Seed consultation services for this professional
    await pool.query(`
      INSERT INTO master_services (
        name, slug, pricing_model, regular_price, discounted_price, currency, estimated_duration, service_location, default_image_url, description, professional_profile_id, is_active
      ) VALUES
      (
        '1-on-1 Strategic Legal Advisory', 'strategic-legal-advisory', 'Per Session', 3500, 2999, 'INR',
        '45 Minutes', 'Video Call / Online',
        'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=500&q=80',
        'Direct consultation on commercial contracts, shareholder disputes, founder vesting, or IP strategy.',
        $1, true
      ),
      (
        'Contract Review & Risk Assessment', 'contract-review-risk-assessment', 'Document Review', 6000, 4999, 'INR',
        '1 - 2 Business Days', 'Online',
        'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=500&q=80',
        'Thorough redlining, clause-by-clause review, and liability protection for MSAs, Vendor, or Employment agreements.',
        $1, true
      );
    `, [profId]);

    console.log("Sample professional profile and services created!");
  }

  await pool.end();
}

run().catch(err => {
  console.error("Seed error:", err);
  pool.end();
});

