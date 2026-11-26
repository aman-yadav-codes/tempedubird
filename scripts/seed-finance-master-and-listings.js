require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

function slugify(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function run() {
  console.log("=== Seeding Finance Master Categories and Listings ===");

  // Business Category ID for "Professional & Financial Services" is 7838
  const bizCatRes = await pool.query(
    "SELECT id, name FROM categories WHERE (id = 7838 OR name ILIKE '%Professional%Financial%') AND category_type = 'business' LIMIT 1"
  );
  const businessCategoryId = bizCatRes.rows[0]?.id || 7838;
  console.log(`Using Business Category ID: ${businessCategoryId} (${bizCatRes.rows[0]?.name || 'Professional & Financial Services'})`);

  const financeGroups = [
    {
      rootName: "Commercial & Business Loans",
      rootDesc: "MSME project funding, working capital, CGTMSE collateral-free loans, and property mortgages.",
      children: [
        "MSME Project Loans & Machinery Finance",
        "Commercial Working Capital & Cash Credit (CC) Limits",
        "Home Loans & Commercial Property Mortgages",
        "Collateral-Free CGTMSE Business Loans",
        "Personal Loans & Gold Credit Facilities",
      ],
    },
    {
      rootName: "Taxation & Corporate Compliance",
      rootDesc: "GST filing, income tax returns, company incorporation, and ROC statutory compliance.",
      children: [
        "GST Registration, Filing & Annual Audit",
        "Income Tax Return (ITR) & TDS Management",
        "Company & LLP Incorporation Services",
        "Trademark, ISO & Startup India Registration",
        "Import Export Code (IEC) & Trade Licensing",
      ],
    },
    {
      rootName: "Wealth Management & Investment Advisory",
      rootDesc: "Mutual fund SIPs, stock market portfolio advisory, pension schemes, and wealth creation.",
      children: [
        "Mutual Funds & Systematic Investment Plans (SIP)",
        "Direct Equity & Portfolio Management (PMS)",
        "Fixed Deposits & Corporate Bonds Advisory",
        "Retirement Planning & Pension Schemes (NPS)",
      ],
    },
    {
      rootName: "Insurance & Risk Management",
      rootDesc: "Health, life, property, commercial fire, and vehicular fleet insurance coverage.",
      children: [
        "Comprehensive Health & Critical Illness Cover",
        "Term Life & Keyman Insurance Protection",
        "Commercial, Factory & Fire Insurance",
        "Motor Fleet & Vehicle Insurance",
      ],
    },
    {
      rootName: "Auditing & Chartered Accountancy",
      rootDesc: "Statutory balance sheet audit, forensic audit, bank net worth, and project CMA reports.",
      children: [
        "Statutory Company & Tax Audit (Sec 44AB)",
        "Internal Audit & Stock Verification",
        "Project CMA Reports & Bank Net Worth Certificates",
        "Valuation & Financial Due Diligence",
      ],
    },
  ];

  const seededCategoryMap = {};

  for (const group of financeGroups) {
    const rootSlug = `finance-${slugify(group.rootName)}`;
    let rootRes = await pool.query(
      "SELECT id FROM categories WHERE category_type = 'finance' AND name = $1 AND is_deleted = false LIMIT 1",
      [group.rootName]
    );

    let rootId;
    if (rootRes.rows.length === 0) {
      const ins = await pool.query(
        `INSERT INTO categories (
          name, slug, parent_id, depth, category_type,
          business_category_id, description, is_active, is_deleted, created_at, updated_at
        ) VALUES ($1, $2, NULL, 1, 'finance', $3, $4, true, false, NOW(), NOW()) RETURNING id`,
        [group.rootName, rootSlug, businessCategoryId, group.rootDesc]
      );
      rootId = ins.rows[0].id;
      console.log(` [+] Root Finance Category created: ${group.rootName} (ID: ${rootId})`);
    } else {
      rootId = rootRes.rows[0].id;
      console.log(` [=] Root Finance Category exists: ${group.rootName} (ID: ${rootId})`);
    }

    seededCategoryMap[group.rootName] = rootId;

    for (const child of group.children) {
      const childSlug = `${rootSlug}-${slugify(child)}`;
      let childRes = await pool.query(
        "SELECT id FROM categories WHERE category_type = 'finance' AND name = $1 AND parent_id = $2 AND is_deleted = false LIMIT 1",
        [child, rootId]
      );

      let childId;
      if (childRes.rows.length === 0) {
        const cIns = await pool.query(
          `INSERT INTO categories (
            name, slug, parent_id, depth, category_type,
            business_category_id, is_active, is_deleted, created_at, updated_at
          ) VALUES ($1, $2, $3, 2, 'finance', $4, true, false, NOW(), NOW()) RETURNING id`,
          [child, childSlug, rootId, businessCategoryId]
        );
        childId = cIns.rows[0].id;
        console.log(`     ↳ Created subcategory: ${child} (ID: ${childId})`);
      } else {
        childId = childRes.rows[0].id;
        console.log(`     ↳ Exists: ${child} (ID: ${childId})`);
      }
      seededCategoryMap[child] = childId;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. SEED FINANCIAL BUSINESS PROFILES (STOREFRONTS)
  // ─────────────────────────────────────────────────────────────
  console.log("\n-> Seeding Finance Business Profiles in Varanasi...");

  const storeConfigs = [
    {
      name: "Apex Capital & Financial Advisory Services",
      slug: "apex-capital-financial-advisory-varanasi",
      locality: "Sigra",
      address: "Shop 12-14, Kuber Complex, Sigra, Varanasi, Uttar Pradesh 221002",
      phone: "+91 98390 12345",
      email: "contact@apexcapitalvns.com",
      tagline: "Premier MSME Loans, Project Finance & Wealth Advisory in Varanasi",
      about: "Apex Capital is a leading financial consultancy firm in Varanasi with over 15 years of excellence in facilitating MSME project loans, banking finance, GST/taxation compliance, and portfolio advisory.",
      establishedYear: 2009,
    },
    {
      name: "Varanasi Wealth Partners & Chartered Accountants",
      slug: "varanasi-wealth-partners-ca",
      locality: "Rathyatra",
      address: "3rd Floor, Mahavir Tower, Rathyatra Crossing, Varanasi, Uttar Pradesh 221010",
      phone: "+91 94152 67890",
      email: "info@vnswealthpartners.in",
      tagline: "Trusted Tax Auditors, Financial Planners & Corporate Advisors",
      about: "Varanasi Wealth Partners brings together top chartered accountants, investment advisors, and corporate compliance professionals serving businesses and families across Purvanchal.",
      establishedYear: 2012,
    },
  ];

  const storeIds = [];

  for (const st of storeConfigs) {
    const existing = await pool.query("SELECT id FROM business_profiles WHERE slug = $1 LIMIT 1", [st.slug]);
    let storeId;
    if (existing.rows.length > 0) {
      storeId = existing.rows[0].id;
      console.log(` [=] Business Profile exists: ${st.name} (ID: ${storeId})`);
    } else {
      const ins = await pool.query(
        `INSERT INTO business_profiles (
          name, slug, category_id, business_type, country_code, state, district,
          city, locality, address, postal_code, phone, whatsapp, email,
          tagline, about, established_year, is_verified, verification_status,
          is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'services', 'IN', 'Uttar Pradesh', 'Varanasi',
          'Varanasi', $4, $5, '221002', $6, $6, $7,
          $8, $9, $10, true, 'verified',
          true, NOW(), NOW()
        ) RETURNING id`,
        [
          st.name,
          st.slug,
          businessCategoryId,
          st.locality,
          st.address,
          st.phone,
          st.email,
          st.tagline,
          st.about,
          st.establishedYear,
        ]
      );
      storeId = ins.rows[0].id;
      console.log(` [+] Created Business Profile: ${st.name} (ID: ${storeId})`);
    }
    storeIds.push(storeId);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. SEED MASTER SERVICES & BUSINESS SERVICES (FINANCIAL LISTINGS)
  // ─────────────────────────────────────────────────────────────
  console.log("\n-> Seeding Financial Service Listings...");

  const finServiceListings = [
    {
      name: "MSME Business Loan & Project Finance Advisory",
      slug: "msme-business-loan-project-finance-advisory",
      catName: "Commercial & Business Loans",
      description: "End-to-end MSME bank loan documentation, project report (DPR) preparation, CMA data generation, and CGTMSE collateral-free loan sanction support with leading public and private banks.",
      price: 4999,
      image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=600&fit=crop",
    },
    {
      name: "Statutory Financial Audit & CA Balance Sheet Certification",
      slug: "statutory-financial-audit-ca-certification-vns",
      catName: "Auditing & Chartered Accountancy",
      description: "Comprehensive balance sheet audit by qualified FCAs, Section 44AB tax audit reporting, net worth certificates, and financial health diagnostics for tenders and bank credit.",
      price: 8500,
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
    },
    {
      name: "Income Tax Return (ITR) & Annual GST Audit Filing",
      slug: "income-tax-itr-gst-annual-audit-filing",
      catName: "Taxation & Corporate Compliance",
      description: "Professional preparation and e-filing of ITR-1 through ITR-7, GSTR-9/9C reconciliation, scrutiny assessment representation, and legal tax saving optimization for business owners.",
      price: 2499,
      image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&h=600&fit=crop",
    },
    {
      name: "Mutual Fund Portfolio Review & Wealth Management Advisory",
      slug: "mutual-fund-portfolio-review-wealth-advisory",
      catName: "Wealth Management & Investment Advisory",
      description: "Goal-based investment planning, automated SIP structuring, risk profile asset allocation, tax-saving ELSS investments, and regular portfolio rebalancing by certified planners.",
      price: 1499,
      image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=600&fit=crop",
    },
    {
      name: "Commercial Working Capital & Cash Credit (CC) Loan Documentation",
      slug: "commercial-working-capital-cc-loan-documentation",
      catName: "Commercial & Business Loans",
      description: "Preparation of stock statements, monthly drawing power calculations, CMA projections, and working capital enhancement proposals for manufacturing and trading firms.",
      price: 7500,
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
    },
    {
      name: "Private Limited Company (Pvt Ltd) & LLP Incorporation Package",
      slug: "pvt-ltd-company-llp-incorporation-full-package",
      catName: "Taxation & Corporate Compliance",
      description: "Complete corporate legal setup including MCA name reservation, Director DIN & DSC, MOA/AOA drafting, Certificate of Incorporation, PAN/TAN, and opening bank current accounts.",
      price: 6999,
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop",
    },
    {
      name: "Comprehensive Health & Critical Illness Insurance Advisory",
      slug: "health-critical-illness-insurance-advisory",
      catName: "Insurance & Risk Management",
      description: "Independent comparison of top IRDAI-approved cashless health insurance policies, super top-up plans, family floater coverage, and claim settlement support.",
      price: 999,
      image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&h=600&fit=crop",
    },
  ];

  for (let i = 0; i < finServiceListings.length; i++) {
    const s = finServiceListings[i];
    const catId = seededCategoryMap[s.catName] || businessCategoryId;
    const storeId = storeIds[i % storeIds.length];

    const existMs = await pool.query("SELECT id FROM master_services WHERE slug = $1 LIMIT 1", [s.slug]);
    let msId;
    if (existMs.rows.length > 0) {
      msId = existMs.rows[0].id;
      console.log(` [=] Master Service exists: ${s.name} (ID: ${msId})`);
    } else {
      const ins = await pool.query(
        `INSERT INTO master_services (
          name, slug, category_id, description, suggested_price_inr,
          default_image_url, is_active, is_available, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, true, NOW(), NOW()) RETURNING id`,
        [s.name, s.slug, catId, s.description, s.price, s.image]
      );
      msId = ins.rows[0].id;
      console.log(` [+] Created Master Service: ${s.name} (ID: ${msId})`);
    }

    // Link to business service
    await pool.query(
      `INSERT INTO business_services (business_id, master_service_id, price, currency, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, 'INR', true, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [storeId, msId, s.price]
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. SEED FINANCIAL PROFESSIONALS
  // ─────────────────────────────────────────────────────────────
  console.log("\n-> Seeding Financial Professionals...");

  const finProfessionals = [
    {
      name: "CA Rajiv Agrawal, FCA",
      slug: "ca-rajiv-agrawal-fca-vns",
      designation: "Senior Chartered Accountant & Tax Auditor",
      professionType: "Chartered Accountant & Financial Auditor",
      phone: "+91 98391 22334",
      email: "rajiv@apexcapitalvns.com",
      about: "17+ years handling corporate statutory audit, direct tax litigation, MSME bank debt restructuring, and GST compliance in Varanasi.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      experienceYears: 17,
    },
    {
      name: "Praveen K. Mishra, CFP",
      slug: "praveen-k-mishra-cfp-vns",
      designation: "Certified Financial Planner & Wealth Manager",
      professionType: "Investment & Wealth Management Advisor",
      phone: "+91 94155 77889",
      email: "praveen@vnswealthpartners.in",
      about: "13+ years helping Varanasi families and business owners build wealth via disciplined mutual funds, equities, fixed income securities, and estate planning.",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop",
      experienceYears: 13,
    },
  ];

  for (let i = 0; i < finProfessionals.length; i++) {
    const prof = finProfessionals[i];
    const storeId = storeIds[i % storeIds.length];

    const existProf = await pool.query("SELECT id FROM professional_profiles WHERE slug = $1 LIMIT 1", [prof.slug]);
    if (existProf.rows.length === 0) {
      const ins = await pool.query(
        `INSERT INTO professional_profiles (
          name, slug, profession_type, designation, phone, email,
          city, state, locality, address, category_id, business_profile_id,
          avatar_url, about, experience_years, is_verified, is_active, is_featured,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          'Varanasi', 'Uttar Pradesh', 'Sigra', 'Kuber Complex, Sigra, Varanasi',
          $7, $8, $9, $10, $11, true, true, true,
          NOW(), NOW()
        ) RETURNING id`,
        [
          prof.name,
          prof.slug,
          prof.professionType,
          prof.designation,
          prof.phone,
          prof.email,
          businessCategoryId,
          storeId,
          prof.avatar,
          prof.about,
          prof.experienceYears,
        ]
      );
      console.log(` [+] Created Financial Professional: ${prof.name} (ID: ${ins.rows[0].id})`);
    } else {
      console.log(` [=] Financial Professional exists: ${prof.name}`);
    }
  }

  console.log("\n=== Seeding of Finance Master Categories and Listings completed successfully! ===");
  await pool.end();
}

run().catch((err) => {
  console.error("Seed script failed:", err);
  pool.end();
  process.exit(1);
});
