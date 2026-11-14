process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const BUSINESS_TAXONOMY = [
  {
    name: "Healthcare & Medical",
    slug: "healthcare-and-medical",
    subs: ["Clinics & Poly Clinics", "Hospitals", "Dental Clinics", "Pharmacies & Medical Stores", "Diagnostic Centers & Labs", "Eye & Optical Centers", "Physiotherapy Centers", "Ayurvedic & Homeopathy Centers"]
  },
  {
    name: "Salons & Personal Care",
    slug: "salons-and-personal-care",
    subs: ["Hair & Beauty Salons", "Beauty Parlours", "Spas & Massage Centers", "Nail & Lash Studios", "Barbershops", "Tattoo & Piercing Studios", "Skin & Laser Clinics"]
  },
  {
    name: "Food, Dining & Cafes",
    slug: "food-dining-and-cafes",
    subs: ["Fine Dining Restaurants", "Cafes & Coffee Shops", "Bakeries & Cake Shops", "Cloud Kitchens", "Sweet & Confectionery Shops", "Catering Services", "Fast Food & Quick Bites", "Bars & Pubs"]
  },
  {
    name: "Retail & Shopping",
    slug: "retail-and-shopping",
    subs: ["Supermarkets & Groceries", "Clothing & Fashion Apparel", "Electronics & Mobile Stores", "Jewellery & Watches", "Furniture & Home Decor", "Footwear Stores", "Bookstores & Stationery", "Hardware & Electricals"]
  },
  {
    name: "Automotive & Transport",
    slug: "automotive-and-transport",
    subs: ["Car Repair & Garages", "Two-Wheeler Service Centers", "Car Dealerships & Showrooms", "Car Wash & Detailing", "Tours & Travel Agencies", "Taxi & Cab Services", "Logistics & Packers-Movers"]
  },
  {
    name: "Fitness & Sports",
    slug: "fitness-and-sports",
    subs: ["Gyms & Fitness Centers", "Yoga & Pilates Studios", "Swimming Academies", "Martial Arts & Boxing", "Sports Clubs & Academies", "CrossFit Centers", "Zumba & Aerobics Studios"]
  },
  {
    name: "Education & Coaching",
    slug: "education-and-coaching",
    subs: ["Coaching & Tuition Institutes", "Schools & Daycares", "Colleges & Degree Institutes", "Computer & IT Training", "Language & Foreign Studies", "Dance & Music Academies", "Art & Craft Centers"]
  },
  {
    name: "Real Estate & Construction",
    slug: "real-estate-and-construction",
    subs: ["Real Estate Agencies", "Builders & Developers", "Architecture & Interior Design Firms", "Building Material Suppliers", "Painting & Waterproofing Contractors", "Sanitary & Tiles Stores"]
  },
  {
    name: "IT & Digital Agencies",
    slug: "it-and-digital-agencies",
    subs: ["Software Development Agencies", "Web Design & Development", "Digital Marketing & SEO", "Mobile App Development", "IT Support & Networking", "Computer Hardware & Sales"]
  },
  {
    name: "Professional & Financial Services",
    slug: "professional-and-financial-services",
    subs: ["CA & Accounting Firms", "Law Firms & Legal Agencies", "Tax & Financial Consultancies", "Insurance Agencies", "Loan & Mortgage Consultancies", "HR & Placement Agencies"]
  },
  {
    name: "Hospitality & Events",
    slug: "hospitality-and-events",
    subs: ["Hotels & Resorts", "Banquet Halls & Party Lawns", "Event & Wedding Planners", "Photography & Video Studios", "DJ & Sound Rental", "Caterers & Decorators"]
  },
  {
    name: "Home Services & Maintenance",
    slug: "home-services-and-maintenance",
    subs: ["AC Repair & Servicing", "Plumbing Services", "Electrical Maintenance", "Carpentry & Furniture Repair", "Deep Cleaning & Sanitization", "Pest Control Services", "Appliance Repair"]
  }
];

const PROFESSIONAL_TAXONOMY = [
  {
    name: "Doctors & Healthcare Specialists",
    slug: "doctors-and-healthcare-specialists",
    subs: ["General Physician", "Dentist & Orthodontist", "Pediatrician (Child Specialist)", "Dermatologist (Skin Specialist)", "Gynecologist & Obstetrician", "Orthopedic Surgeon", "Cardiologist", "ENT Specialist", "Psychiatrist & Psychologist", "Physiotherapist", "Dietitian & Clinical Nutritionist", "Ayurvedic Doctor", "Homeopathic Doctor"]
  },
  {
    name: "Legal, Law & Compliance Experts",
    slug: "legal-law-and-compliance-experts",
    subs: ["Civil Advocate", "Criminal Defense Lawyer", "Corporate & Business Lawyer", "Property & Real Estate Lawyer", "Family & Matrimonial Lawyer", "Tax & GST Advocate", "Cyber Law Specialist", "Notary & Legal Consultant", "Patent & Trademark Attorney"]
  },
  {
    name: "Chartered Accountants & Financial Advisors",
    slug: "chartered-accountants-and-financial-advisors",
    subs: ["Chartered Accountant (CA)", "Company Secretary (CS)", "Tax Consultant & GST Practitioner", "Certified Financial Planner (CFP)", "Statutory & Internal Auditor", "Investment & Mutual Fund Advisor", "Corporate Finance Consultant", "Bookkeeper & Accountant"]
  },
  {
    name: "Software, IT & Technology Specialists",
    slug: "software-it-and-technology-specialists",
    subs: ["Full Stack Developer", "Frontend Developer (React/Next)", "Backend Developer (Node/Python/Go)", "Mobile App Developer (Flutter/iOS/Android)", "UI/UX & Product Designer", "DevOps & Cloud Engineer", "Data Scientist & AI Specialist", "Cybersecurity Consultant", "Software QA & Test Automation Engineer"]
  },
  {
    name: "Design, Architecture & Creative Experts",
    slug: "design-architecture-and-creative-experts",
    subs: ["Architectural Consultant", "Interior Designer", "Landscape Architect", "Graphic Designer & Brand Stylist", "Fashion Designer & Stylist", "3D Visualizer & Animator", "Motion Graphics Designer", "Video Editor & Colourist"]
  },
  {
    name: "Academic, Tutors & Education Specialists",
    slug: "academic-tutors-and-education-specialists",
    subs: ["Mathematics Home & Online Tutor", "Science & Physics Faculty", "Chemistry Faculty", "Biology & NEET Specialist", "Commerce & Accountancy Tutor", "English & Verbal Trainer", "Foreign Language Tutor", "Classical & Modern Music Teacher", "Vocal & Instrument Trainer", "Career & College Counselor"]
  },
  {
    name: "Fitness, Wellness & Sports Trainers",
    slug: "fitness-wellness-and-sports-trainers",
    subs: ["Personal Gym & Strength Trainer", "Certified Yoga Instructor", "Pilates Coach", "Sports Coach (Cricket/Football/Badminton)", "Martial Arts & Self Defense Coach", "Mindfulness & Meditation Coach", "Rehabilitation & Posture Specialist"]
  },
  {
    name: "Beauty, Hair & Styling Artists",
    slug: "beauty-hair-and-styling-artists",
    subs: ["Bridal Makeup Artist", "Celebrity Hair Stylist", "Cosmetologist", "Nail Art Specialist", "Microblading & Semi-Permanent Makeup Artist", "Personal Wardrobe Stylist"]
  },
  {
    name: "Business, Strategy & Management Consultants",
    slug: "business-strategy-and-management-consultants",
    subs: ["Business Growth & Strategy Consultant", "HR & Talent Acquisition Consultant", "Digital Marketing & Brand Strategist", "Public Relations (PR) Specialist", "Supply Chain & Operations Consultant", "Sales Coach & Corporate Trainer"]
  },
  {
    name: "Photography, Film & Content Creators",
    slug: "photography-film-and-content-creators",
    subs: ["Wedding & Event Photographer", "Commercial & Fashion Photographer", "Cinematographer & Drone Pilot", "Professional Voiceover Artist", "Scriptwriter & Content Creator", "Sound Engineer & Producer"]
  }
];

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function upsertCategory(name, slug, parentId, depth, categoryType, businessCatId = null) {
  const existing = await pool.query(
    "SELECT id FROM categories WHERE slug = $1 LIMIT 1",
    [slug]
  );
  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    await pool.query(`
      UPDATE categories 
      SET name = $1, parent_id = $2, depth = $3, category_type = $4, business_category_id = $5, is_active = true, is_deleted = false, updated_at = NOW()
      WHERE id = $6
    `, [name, parentId, depth, categoryType, businessCatId, id]);
    return id;
  } else {
    const ins = await pool.query(`
      INSERT INTO categories (name, slug, parent_id, depth, category_type, business_category_id, is_active, is_deleted, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, true, false, NOW(), NOW())
      RETURNING id
    `, [name, slug, parentId, depth, categoryType, businessCatId]);
    return ins.rows[0].id;
  }
}

async function seed() {
  console.log("Seeding comprehensive business and professional categories...");

  // 1. Seed Business categories
  for (const cat of BUSINESS_TAXONOMY) {
    const parentId = await upsertCategory(cat.name, cat.slug, null, 1, 'business', null);
    for (const sub of cat.subs) {
      const subSlug = slugify(`${cat.slug}-${sub}`);
      await upsertCategory(sub, subSlug, parentId, 2, 'business', parentId);
    }
  }

  // 2. Seed Professional categories
  for (const cat of PROFESSIONAL_TAXONOMY) {
    const parentId = await upsertCategory(cat.name, cat.slug, null, 1, 'professional', null);
    for (const sub of cat.subs) {
      const subSlug = slugify(`${cat.slug}-${sub}`);
      await upsertCategory(sub, subSlug, parentId, 2, 'professional', parentId);
    }
  }

  console.log("Categories taxonomy successfully seeded!");

  const counts = await pool.query(`
    SELECT category_type, count(*) 
    FROM categories 
    WHERE COALESCE(is_deleted, false) = false 
    GROUP BY category_type
  `);
  console.log("Counts:", counts.rows);

  await pool.end();
}

seed().catch(err => {
  console.error("Error seeding categories:", err);
  pool.end();
  process.exit(1);
});
