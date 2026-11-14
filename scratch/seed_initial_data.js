process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// 1. BUSINESS CATEGORIES & SUBCATEGORIES (20 items)
const BUSINESS_DATA = [
  {
    name: "Beauty, Salon & Personal Care",
    subs: ["Hair Salon", "Beauty Parlour", "Makeup Studio", "Spa & Wellness Centre", "Nail Salon", "Barber Shop", "Skincare Clinic", "Tattoo & Piercing Studio"]
  },
  {
    name: "Healthcare & Medical",
    subs: ["Hospital", "Multispeciality Clinic", "Dental Clinic", "Diagnostic Centre", "Physiotherapy Centre", "Pharmacy", "Eye Clinic", "Veterinary Clinic"]
  },
  {
    name: "Education & Training",
    subs: ["School", "College", "University", "Coaching Institute", "Training Centre", "Online Education Platform", "Language Institute", "Computer Institute"]
  },
  {
    name: "IT & Technology",
    subs: ["Software Development Company", "Web Development Agency", "Mobile App Development Company", "Digital Marketing Agency", "IT Consultancy", "Hosting Provider", "Cybersecurity Company", "AI & Automation Company"]
  },
  {
    name: "Food & Restaurants",
    subs: ["Restaurant", "Cafe", "Bakery", "Sweet Shop", "Cloud Kitchen", "Catering Company", "Food Manufacturer"]
  },
  {
    name: "Retail & Shopping",
    subs: ["Clothing Store", "Grocery Store", "Electronics Store", "Mobile Shop", "Furniture Store", "Jewellery Store", "Footwear Store", "Departmental Store", "Online Store"]
  },
  {
    name: "Construction & Real Estate",
    subs: ["Construction Company", "Architecture Firm", "Interior Design Company", "Property Dealer", "Real Estate Agency", "Building Material Supplier", "Civil Contractor", "Property Management Company"]
  },
  {
    name: "Automotive & Transportation",
    subs: ["Car Dealer", "Bike Dealer", "Automobile Workshop", "Car Rental", "Taxi Service", "Transport Company", "Auto Parts Shop", "Driving School"]
  },
  {
    name: "Finance & Insurance",
    subs: ["Accounting Firm", "CA Firm", "Financial Consultancy", "Insurance Agency", "Loan Consultancy", "Investment Consultancy", "Tax Consultancy"]
  },
  {
    name: "Travel & Hospitality",
    subs: ["Hotel", "Guest House", "Resort", "Hostel", "Travel Agency", "Tour Operator", "Homestay", "Event Venue"]
  },
  {
    name: "Home & Maintenance",
    subs: ["Plumbing Company", "Electrical Contractor", "AC Repair Company", "Cleaning Company", "Pest Control Company", "Painting Contractor", "Home Maintenance Company", "Security Services"]
  },
  {
    name: "Manufacturing & Industrial",
    subs: ["Textile Manufacturer", "Food Manufacturer", "Furniture Manufacturer", "Electronics Manufacturer", "Machinery Manufacturer", "Packaging Company", "Industrial Supplier"]
  },
  {
    name: "Agriculture & Farming",
    subs: ["Agriculture Farm", "Dairy Farm", "Poultry Farm", "Organic Farming", "Nursery", "Seeds & Fertilizer Shop", "Agricultural Equipment Supplier"]
  },
  {
    name: "Events & Entertainment",
    subs: ["Event Management Company", "Wedding Planner", "Photography Studio", "Film Production Company", "Music Studio", "DJ Company", "Entertainment Agency"]
  },
  {
    name: "Legal & Professional Services",
    subs: ["Law Firm", "Legal Consultancy", "HR Consultancy", "Recruitment Agency", "Business Consultancy", "Management Consultancy", "Research Agency"]
  },
  {
    name: "Sports & Fitness",
    subs: ["Gym", "Fitness Centre", "Yoga Studio", "Sports Academy", "Swimming Pool", "Dance Academy", "Martial Arts Centre"]
  },
  {
    name: "Pets & Animals",
    subs: ["Pet Shop", "Pet Grooming Centre", "Veterinary Hospital", "Pet Boarding", "Animal Breeder", "Pet Food Store"]
  },
  {
    name: "Logistics & Delivery",
    subs: ["Courier Company", "Logistics Company", "Packers & Movers", "Warehousing Company", "Freight Forwarder", "Delivery Service"]
  },
  {
    name: "Media & Creative",
    subs: ["Advertising Agency", "Graphic Design Studio", "Printing Press", "Digital Media Company", "Publishing House", "Animation Studio", "Content Production Company"]
  },
  {
    name: "Other Businesses",
    subs: ["NGO", "Social Enterprise", "Community Organisation", "Other Business"]
  }
];

// 2. PROFESSIONAL CATEGORIES & SUBCATEGORIES (16 items)
const PROFESSIONAL_DATA = [
  {
    name: "IT & Software Professionals",
    subs: ["PHP Developer", "Laravel Developer", "WordPress Developer", "React Developer", "Node.js Developer", "Flutter Developer", "Android Developer", "iOS Developer", "UI/UX Designer", "Graphic Designer", "Software Architect", "AI Engineer", "Data Scientist", "Cybersecurity Specialist"]
  },
  {
    name: "Marketing Professionals",
    subs: ["SEO Specialist", "Digital Marketer", "Social Media Manager", "Google Ads Specialist", "Facebook Ads Specialist", "Content Marketer", "Email Marketing Specialist", "Marketing Consultant", "Growth Hacker"]
  },
  {
    name: "Healthcare Professionals",
    subs: ["General Physician", "Cardiologist", "Dentist", "Dermatologist", "Physiotherapist", "Nutritionist", "Psychologist", "Nurse", "Pharmacist", "Veterinary Doctor"]
  },
  {
    name: "Education Professionals",
    subs: ["School Teacher", "College Professor", "Online Tutor", "Mathematics Teacher", "Science Teacher", "English Teacher", "Career Counsellor", "Academic Consultant", "Language Trainer"]
  },
  {
    name: "Beauty Professionals",
    subs: ["Hair Stylist", "Makeup Artist", "Beautician", "Nail Technician", "Skin Therapist", "Tattoo Artist", "Massage Therapist"]
  },
  {
    name: "Business & Finance Professionals",
    subs: ["Chartered Accountant", "Accountant", "Financial Advisor", "Tax Consultant", "Business Consultant", "HR Consultant", "Investment Advisor", "Insurance Advisor"]
  },
  {
    name: "Legal Professionals",
    subs: ["Advocate", "Lawyer", "Legal Advisor", "Corporate Lawyer", "Criminal Lawyer", "Civil Lawyer", "Legal Consultant"]
  },
  {
    name: "Engineering Professionals",
    subs: ["Civil Engineer", "Mechanical Engineer", "Electrical Engineer", "Software Engineer", "Electronics Engineer", "Architect", "Structural Engineer"]
  },
  {
    name: "Construction & Home Professionals",
    subs: ["Electrician", "Plumber", "Carpenter", "Painter", "Interior Designer", "AC Technician", "Civil Contractor", "Mason"]
  },
  {
    name: "Creative Professionals",
    subs: ["Photographer", "Videographer", "Video Editor", "Animator", "3D Artist", "Illustrator", "Content Writer", "Copywriter", "Musician", "Singer"]
  },
  {
    name: "Fitness & Sports Professionals",
    subs: ["Personal Trainer", "Yoga Instructor", "Fitness Coach", "Sports Coach", "Dance Instructor", "Swimming Instructor", "Nutrition Coach"]
  },
  {
    name: "Automotive Professionals",
    subs: ["Car Mechanic", "Bike Mechanic", "Automobile Technician", "Auto Electrician", "Driving Instructor", "Car Detailer"]
  },
  {
    name: "Real Estate Professionals",
    subs: ["Real Estate Agent", "Property Consultant", "Property Manager", "Real Estate Valuer", "Rental Consultant"]
  },
  {
    name: "Hospitality Professionals",
    subs: ["Chef", "Baker", "Bartender", "Hotel Manager", "Tour Guide", "Travel Consultant", "Event Planner"]
  },
  {
    name: "Sales & Customer Support",
    subs: ["Sales Executive", "Business Development Manager", "Telecaller", "Customer Support Executive", "Account Manager", "Lead Generation Specialist"]
  },
  {
    name: "Other Professionals",
    subs: ["Researcher", "Writer", "Translator", "Freelancer", "Consultant", "Other Professional"]
  }
];

// 3. PRODUCT CATEGORIES & SUBCATEGORIES (16 items)
const PRODUCT_DATA = [
  {
    name: "Electronics",
    subs: ["Mobile Phones", "Laptops", "Computers", "Tablets", "Televisions", "Cameras", "Audio Devices", "Computer Accessories"]
  },
  {
    name: "Fashion & Clothing",
    subs: ["Men's Clothing", "Women's Clothing", "Kids' Clothing", "Sarees", "Shoes", "Bags", "Watches", "Fashion Accessories"]
  },
  {
    name: "Beauty & Personal Care",
    subs: ["Skincare Products", "Haircare Products", "Makeup", "Perfumes", "Personal Hygiene", "Beauty Equipment"]
  },
  {
    name: "Health & Medical",
    subs: ["Medical Equipment", "Healthcare Devices", "Fitness Equipment", "Mobility Aids", "Healthcare Supplies"]
  },
  {
    name: "Home & Furniture",
    subs: ["Sofas", "Beds", "Tables", "Chairs", "Kitchen Furniture", "Home Decor", "Lighting", "Mattresses"]
  },
  {
    name: "Food & Beverages",
    subs: ["Packaged Food", "Snacks", "Bakery Products", "Dairy Products", "Beverages", "Organic Food", "Spices"]
  },
  {
    name: "Automobile Products",
    subs: ["Car Accessories", "Bike Accessories", "Spare Parts", "Tyres", "Batteries", "Lubricants", "Automotive Tools"]
  },
  {
    name: "Industrial & Machinery",
    subs: ["Industrial Machines", "Construction Equipment", "Electrical Equipment", "Power Tools", "Manufacturing Equipment", "Safety Equipment"]
  },
  {
    name: "Education & Stationery",
    subs: ["Books", "Notebooks", "School Supplies", "Office Supplies", "Educational Equipment", "Learning Materials"]
  },
  {
    name: "Sports & Fitness",
    subs: ["Gym Equipment", "Sports Wear", "Sports Accessories", "Fitness Equipment", "Outdoor Equipment"]
  },
  {
    name: "Agriculture",
    subs: ["Seeds", "Plants", "Fertilizers", "Farming Equipment", "Irrigation Equipment", "Agricultural Supplies"]
  },
  {
    name: "Toys & Baby Products",
    subs: ["Toys", "Baby Clothing", "Baby Care", "Baby Furniture", "Educational Toys"]
  },
  {
    name: "Jewellery & Accessories",
    subs: ["Gold Jewellery", "Silver Jewellery", "Artificial Jewellery", "Diamonds", "Watches", "Fashion Accessories"]
  },
  {
    name: "Hardware & Building Materials",
    subs: ["Cement", "Paints", "Tiles", "Pipes", "Electrical Fittings", "Plumbing Materials", "Doors & Windows"]
  },
  {
    name: "Pet Products",
    subs: ["Pet Food", "Pet Accessories", "Pet Toys", "Pet Grooming Products", "Pet Care Supplies"]
  },
  {
    name: "Other Products",
    subs: ["Gifts", "Handicrafts", "Art & Collectibles", "Other Products"]
  }
];

// 4. SERVICE CATEGORIES & SUBCATEGORIES (14 items)
const SERVICE_DATA = [
  {
    name: "IT & Technology Services",
    subs: ["Website Development", "Mobile App Development", "Software Development", "WordPress Development", "UI/UX Design", "Website Maintenance", "Hosting Services", "Cybersecurity", "AI Automation"]
  },
  {
    name: "Digital Marketing",
    subs: ["SEO Services", "Local SEO", "Social Media Management", "Google Ads", "Facebook & Instagram Ads", "Content Marketing", "Email Marketing", "Lead Generation"]
  },
  {
    name: "Beauty & Personal Care",
    subs: ["Haircut", "Hair Styling", "Hair Coloring", "Facial", "Makeup", "Manicure", "Pedicure", "Nail Art", "Bridal Makeup", "Spa & Massage"]
  },
  {
    name: "Healthcare Services",
    subs: ["General Consultation", "Dental Consultation", "Physiotherapy", "Health Checkup", "Diagnostic Services", "Nutrition Consultation", "Home Nursing"]
  },
  {
    name: "Education & Training",
    subs: ["Home Tuition", "Online Tuition", "Coaching", "Exam Preparation", "Language Training", "Computer Training", "Corporate Training", "Career Counselling"]
  },
  {
    name: "Construction & Home Services",
    subs: ["Plumbing", "Electrical Repair", "Painting", "Interior Design", "Home Renovation", "AC Installation", "AC Repair", "Carpentry", "Cleaning"]
  },
  {
    name: "Professional & Consulting",
    subs: ["Accounting", "Tax Filing", "Legal Consultation", "Business Consultancy", "Financial Planning", "HR Consultancy", "Company Registration"]
  },
  {
    name: "Creative & Media Services",
    subs: ["Photography", "Videography", "Video Editing", "Graphic Designing", "Logo Designing", "Animation", "3D Modelling", "Content Writing", "Voice Over"]
  },
  {
    name: "Automotive Services",
    subs: ["Car Repair", "Bike Repair", "Vehicle Servicing", "Car Washing", "Car Detailing", "Vehicle Towing", "Vehicle Inspection"]
  },
  {
    name: "Event & Wedding Services",
    subs: ["Wedding Planning", "Event Management", "Catering", "Decoration", "DJ Services", "Photography", "Wedding Makeup"]
  },
  {
    name: "Travel & Transportation",
    subs: ["Taxi Services", "Car Rental", "Airport Transfer", "Tour Packages", "Travel Planning", "Courier Services", "Packers & Movers"]
  },
  {
    name: "Fitness & Wellness",
    subs: ["Personal Training", "Yoga Classes", "Gym Training", "Dance Classes", "Sports Coaching", "Diet Planning"]
  },
  {
    name: "Business Support Services",
    subs: ["Data Entry", "Virtual Assistance", "Customer Support", "Telecalling", "Lead Generation", "Recruitment", "Administrative Support"]
  },
  {
    name: "Other Services",
    subs: ["Repair Services", "Home Assistance", "Pet Grooming", "Laundry", "Tailoring", "Other Services"]
  }
];

// 5. PRODUCT UNITS (27 units)
const PRODUCT_UNITS = [
  { name: "Piece", symbol: "pc" },
  { name: "Kilogram", symbol: "kg" },
  { name: "Gram", symbol: "g" },
  { name: "Milligram", symbol: "mg" },
  { name: "Litre", symbol: "L" },
  { name: "Millilitre", symbol: "mL" },
  { name: "Meter", symbol: "m" },
  { name: "Centimeter", symbol: "cm" },
  { name: "Square Foot", symbol: "sq ft" },
  { name: "Square Meter", symbol: "sq m" },
  { name: "Cubic Meter", symbol: "cu m" },
  { name: "Box", symbol: "box" },
  { name: "Pack", symbol: "pk" },
  { name: "Carton", symbol: "ctn" },
  { name: "Dozen", symbol: "dz" },
  { name: "Pair", symbol: "pr" },
  { name: "Set", symbol: "set" },
  { name: "Roll", symbol: "roll" },
  { name: "Bundle", symbol: "bdl" },
  { name: "Ton", symbol: "ton" },
  { name: "Bag", symbol: "bag" },
  { name: "Bottle", symbol: "btl" },
  { name: "Packet", symbol: "pkt" },
  { name: "Jar", symbol: "jar" },
  { name: "Can", symbol: "can" },
  { name: "Sheet", symbol: "sheet" },
  { name: "Unit", symbol: "unit" }
];

// 6. SERVICE UNITS (19 units)
const SERVICE_UNITS = [
  { name: "Per Service", symbol: "service" },
  { name: "Per Visit", symbol: "visit" },
  { name: "Per Hour", symbol: "hr" },
  { name: "Per Day", symbol: "day" },
  { name: "Per Week", symbol: "wk" },
  { name: "Per Month", symbol: "mo" },
  { name: "Per Year", symbol: "yr" },
  { name: "Per Person", symbol: "person" },
  { name: "Per Session", symbol: "session" },
  { name: "Per Kilometre", symbol: "km" },
  { name: "Per Square Foot", symbol: "sq ft" },
  { name: "Per Square Meter", symbol: "sq m" },
  { name: "Per Project", symbol: "project" },
  { name: "Per Item", symbol: "item" },
  { name: "Per Consultation", symbol: "consult" },
  { name: "Per Booking", symbol: "booking" },
  { name: "Per Trip", symbol: "trip" },
  { name: "Custom Quotation", symbol: "quote" },
  { name: "Free", symbol: "free" }
];

// 7. CURRENCIES (8 items)
const CURRENCIES = [
  { code: "INR", name: "Indian Rupee", symbol: "₹", order: 1 },
  { code: "USD", name: "US Dollar", symbol: "$", order: 2 },
  { code: "ZAR", name: "South African Rand", symbol: "R", order: 3 },
  { code: "GBP", name: "British Pound", symbol: "£", order: 4 },
  { code: "EUR", name: "Euro", symbol: "€", order: 5 },
  { code: "AED", name: "UAE Dirham", symbol: "AED", order: 6 },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", order: 7 },
  { code: "AUD", name: "Australian Dollar", symbol: "AU$", order: 8 }
];

// 8. INITIAL BRANDS
const INITIAL_BRANDS = [
  { name: "Dove", website: "https://dove.com" },
  { name: "UltraTech", website: "https://ultratechcement.com" },
  { name: "HP", website: "https://hp.com" },
  { name: "Apple", website: "https://apple.com" },
  { name: "Samsung", website: "https://samsung.com" },
  { name: "Sony", website: "https://sony.com" },
  { name: "Nike", website: "https://nike.com" },
  { name: "Tata", website: "https://tata.com" },
  { name: "Generic / Unbranded", website: "" }
];

async function seedCategories(type, dataList) {
  let catCount = 0;
  let subCount = 0;

  for (let i = 0; i < dataList.length; i++) {
    const item = dataList[i];
    const catSlug = `${slugify(item.name)}-${type}`;

    let catRes = await pool.query(
      `SELECT id FROM categories WHERE category_type = $1 AND (slug = $2 OR LOWER(TRIM(name)) = $3) LIMIT 1`,
      [type, catSlug, item.name.toLowerCase().trim()]
    );

    let catId;
    if (catRes.rows.length === 0) {
      const ins = await pool.query(
        `INSERT INTO categories (name, slug, category_type, parent_id, depth, display_order, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, NULL, 0, $4, TRUE, NOW(), NOW())
         RETURNING id`,
        [item.name, catSlug, type, i + 1]
      );
      catId = ins.rows[0].id;
    } else {
      catId = catRes.rows[0].id;
      await pool.query(
        `UPDATE categories SET category_type = $1, display_order = $2, is_active = TRUE, updated_at = NOW() WHERE id = $3`,
        [type, i + 1, catId]
      );
    }
    catCount++;

    // Subcategories
    for (let j = 0; j < item.subs.length; j++) {
      const subName = item.subs[j];
      const subSlug = `${slugify(subName)}-${catId}`;

      let subRes = await pool.query(
        `SELECT id FROM categories WHERE parent_id = $1 AND (slug = $2 OR LOWER(TRIM(name)) = $3) LIMIT 1`,
        [catId, subSlug, subName.toLowerCase().trim()]
      );

      if (subRes.rows.length === 0) {
        await pool.query(
          `INSERT INTO categories (name, slug, category_type, parent_id, depth, display_order, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 1, $5, TRUE, NOW(), NOW())`,
          [subName, subSlug, type, catId, j + 1]
        );
      } else {
        await pool.query(
          `UPDATE categories SET category_type = $1, parent_id = $2, depth = 1, display_order = $3, is_active = TRUE WHERE id = $4`,
          [type, catId, j + 1, subRes.rows[0].id]
        );
      }
      subCount++;
    }
  }

  console.log(`[OK] Seeded ${catCount} categories and ${subCount} subcategories for type: '${type}'`);
}

async function main() {
  console.log("=== Seeding Platform Admin Initial Catalog & Categories ===");

  // Seed Categories
  await seedCategories('business', BUSINESS_DATA);
  await seedCategories('professional', PROFESSIONAL_DATA);
  await seedCategories('product', PRODUCT_DATA);
  await seedCategories('service', SERVICE_DATA);

  // Seed Product Units
  let pUnitCount = 0;
  for (let i = 0; i < PRODUCT_UNITS.length; i++) {
    const u = PRODUCT_UNITS[i];
    await pool.query(
      `INSERT INTO units (name, short_symbol, unit_type, display_order, is_active, created_at, updated_at)
       VALUES ($1, $2, 'product', $3, TRUE, NOW(), NOW())
       ON CONFLICT (LOWER(TRIM(name)), unit_type) 
       DO UPDATE SET short_symbol = EXCLUDED.short_symbol, display_order = EXCLUDED.display_order, is_active = TRUE`,
      [u.name, u.symbol, i + 1]
    );
    pUnitCount++;
  }
  console.log(`[OK] Seeded ${pUnitCount} product units`);

  // Seed Service Units
  let sUnitCount = 0;
  for (let i = 0; i < SERVICE_UNITS.length; i++) {
    const u = SERVICE_UNITS[i];
    await pool.query(
      `INSERT INTO units (name, short_symbol, unit_type, display_order, is_active, created_at, updated_at)
       VALUES ($1, $2, 'service', $3, TRUE, NOW(), NOW())
       ON CONFLICT (LOWER(TRIM(name)), unit_type) 
       DO UPDATE SET short_symbol = EXCLUDED.short_symbol, display_order = EXCLUDED.display_order, is_active = TRUE`,
      [u.name, u.symbol, i + 1]
    );
    sUnitCount++;
  }
  console.log(`[OK] Seeded ${sUnitCount} service units`);

  // Seed Currencies
  for (const c of CURRENCIES) {
    await pool.query(
      `INSERT INTO currencies (code, name, symbol, is_active, display_order, created_at, updated_at)
       VALUES ($1, $2, $3, TRUE, $4, NOW(), NOW())
       ON CONFLICT (code)
       DO UPDATE SET name = EXCLUDED.name, symbol = EXCLUDED.symbol, display_order = EXCLUDED.display_order, is_active = TRUE`,
      [c.code, c.name, c.symbol, c.order]
    );
  }
  console.log(`[OK] Seeded ${CURRENCIES.length} currencies`);

  // Seed Brands
  for (const b of INITIAL_BRANDS) {
    const bSlug = slugify(b.name);
    await pool.query(
      `INSERT INTO brands (name, slug, website, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, TRUE, NOW(), NOW())
       ON CONFLICT (slug)
       DO UPDATE SET website = EXCLUDED.website, is_active = TRUE`,
      [b.name, bSlug, b.website]
    );
  }
  console.log(`[OK] Seeded ${INITIAL_BRANDS.length} initial brands`);

  console.log("\nAll Master Seed Data Initialized Successfully!");
  await pool.end();
}

main().catch(err => {
  console.error("Seed error:", err);
  pool.end();
  process.exit(1);
});

