require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

async function main() {
  console.log("Starting comprehensive seeding of 3-5 listings per allowed vertical across all business categories in Varanasi...\n");

  // Helper to fetch first store for a category
  async function getStoreForCat(catId) {
    const res = await pool.query(
      `SELECT id, name, locality, address FROM business_profiles WHERE category_id = $1 AND city ILIKE '%Varanasi%' ORDER BY id DESC LIMIT 1`,
      [catId]
    );
    return res.rows[0] || { id: 1, name: "Varanasi Enterprise", locality: "Sigra", address: "Sigra, Varanasi" };
  }

  // Helper to insert or get Master Product + Business Product
  async function seedProduct(catId, prod) {
    const slug = prod.slug + "-vns";
    let mpId;
    const existing = await pool.query(`SELECT id FROM master_products WHERE slug = $1`, [slug]);
    if (existing.rows.length > 0) {
      mpId = existing.rows[0].id;
    } else {
      const ins = await pool.query(
        `INSERT INTO master_products (name, slug, category_id, description, suggested_price_inr, default_image_url, is_active, is_available, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, true, NOW(), NOW()) RETURNING id`,
        [prod.name, slug, catId, prod.description, prod.price, prod.image]
      );
      mpId = ins.rows[0].id;
    }

    const store = await getStoreForCat(catId);
    await pool.query(
      `INSERT INTO business_products (business_id, business_profile_id, master_product_id, price, currency, in_stock, is_available, inventory_count, created_at, updated_at)
       VALUES ($1, $1, $2, $3, 'INR', true, true, 50, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [store.id, mpId, prod.price]
    );
    return mpId;
  }

  // Helper to insert Master Service + Business Service
  async function seedService(catId, serv) {
    const slug = serv.slug + "-vns";
    let msId;
    const existing = await pool.query(`SELECT id FROM master_services WHERE slug = $1`, [slug]);
    if (existing.rows.length > 0) {
      msId = existing.rows[0].id;
    } else {
      const ins = await pool.query(
        `INSERT INTO master_services (name, slug, category_id, description, suggested_price_inr, default_image_url, is_active, is_available, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, true, NOW(), NOW()) RETURNING id`,
        [serv.name, slug, catId, serv.description, serv.price, serv.image]
      );
      msId = ins.rows[0].id;
    }

    const store = await getStoreForCat(catId);
    await pool.query(
      `INSERT INTO business_services (business_id, master_service_id, price, currency, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, 'INR', true, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [store.id, msId, serv.price]
    );
    return msId;
  }

  // Helper to insert Master Course
  async function seedCourse(catId, crs) {
    const slug = crs.slug + "-vns";
    const existing = await pool.query(`SELECT id FROM master_courses WHERE slug = $1`, [slug]);
    if (existing.rows.length > 0) return existing.rows[0].id;

    const ins = await pool.query(
      `INSERT INTO master_courses (name, slug, code, category_id, authority_type, duration_value, duration_unit, thumbnail_url, description, seats_available, is_active, is_deleted, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'Professional Certification', $5, $6, $7, $8, 40, true, false, NOW(), NOW()) RETURNING id`,
      [crs.name, slug, crs.code || "VNS-CRS", catId, crs.durationValue || 3, crs.durationUnit || "Months", crs.image, crs.description]
    );
    return ins.rows[0].id;
  }

  // Helper to insert Professional Profile
  async function seedProfessional(catId, prof) {
    const slug = prof.slug + "-vns";
    const store = await getStoreForCat(catId);
    const existing = await pool.query(`SELECT id FROM professional_profiles WHERE slug = $1`, [slug]);
    if (existing.rows.length > 0) return existing.rows[0].id;

    const ins = await pool.query(
      `INSERT INTO professional_profiles (name, slug, profession_type, designation, phone, email, city, state, locality, address, category_id, business_profile_id, avatar_url, about, experience_years, is_verified, is_active, is_featured, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'Varanasi', 'Uttar Pradesh', $7, $8, $9, $10, $11, $12, $13, true, true, true, NOW(), NOW()) RETURNING id`,
      [
        prof.name,
        slug,
        prof.professionType,
        prof.designation || prof.professionType,
        prof.phone || "+91 94152 30101",
        prof.email || `${slug}@varanasi-experts.in`,
        store.locality || "Varanasi",
        store.address || "Varanasi, UP",
        catId,
        store.id,
        prof.avatar,
        prof.about,
        prof.experienceYears || 10
      ]
    );
    return ins.rows[0].id;
  }

  // Helper to insert Property (business_records + property_details)
  async function seedProperty(catId, prop) {
    const slug = prop.slug + "-vns";
    const store = await getStoreForCat(catId);
    let recordId;
    const existing = await pool.query(`SELECT id FROM business_records WHERE slug = $1 AND vertical_code = 'properties'`, [slug]);
    if (existing.rows.length > 0) {
      recordId = existing.rows[0].id;
    } else {
      const ins = await pool.query(
        `INSERT INTO business_records (business_id, vertical_id, vertical_code, title, slug, description, category_id, status, is_active, is_featured, currency, price, featured_image, is_deleted, created_at, updated_at)
         VALUES ($1, 2, 'properties', $2, $3, $4, $5, 'published', true, true, 'INR', $6, $7, false, NOW(), NOW()) RETURNING id`,
        [store.id, prop.title, slug, prop.description, prop.masterCatId || 49, prop.price, prop.image]
      );
      recordId = ins.rows[0].id;
    }

    await pool.query(
      `INSERT INTO property_details (record_id, bedrooms, bathrooms, built_up_area, area_unit, rental_amount, country, state, city, street_address, availability_status)
       VALUES ($1, $2, $3, $4, 'sq ft', $5, 'IN', 'Uttar Pradesh', 'Varanasi', $6, 'Ready to Move')
       ON CONFLICT (record_id) DO UPDATE SET
         bedrooms = EXCLUDED.bedrooms,
         bathrooms = EXCLUDED.bathrooms,
         built_up_area = EXCLUDED.built_up_area,
         rental_amount = EXCLUDED.rental_amount,
         street_address = EXCLUDED.street_address`,
      [recordId, prop.bedrooms || 3, prop.bathrooms || 2, prop.builtUpArea || 1500, prop.rentalAmount || prop.price, prop.address || "Varanasi, UP"]
    );
    return recordId;
  }

  // Helper to insert Vehicle (business_records + vehicle_details)
  async function seedVehicle(catId, veh) {
    const slug = veh.slug + "-vns";
    const store = await getStoreForCat(catId);
    let recordId;
    const existing = await pool.query(`SELECT id FROM business_records WHERE slug = $1 AND vertical_code = 'vehicles'`, [slug]);
    if (existing.rows.length > 0) {
      recordId = existing.rows[0].id;
    } else {
      const ins = await pool.query(
        `INSERT INTO business_records (business_id, vertical_id, vertical_code, title, slug, description, category_id, status, is_active, is_featured, currency, price, featured_image, is_deleted, created_at, updated_at)
         VALUES ($1, 1, 'vehicles', $2, $3, $4, $5, 'published', true, true, 'INR', $6, $7, false, NOW(), NOW()) RETURNING id`,
        [store.id, veh.title, slug, veh.description, veh.masterCatId || 4, veh.price, veh.image]
      );
      recordId = ins.rows[0].id;
    }

    await pool.query(
      `INSERT INTO vehicle_details (record_id, manufacturing_year, color, mileage, kilometers_driven, registration_number, location, is_negotiable, financing_available)
       VALUES ($1, $2, $3, $4, $5, $6, 'Varanasi', true, true)
       ON CONFLICT (record_id) DO UPDATE SET
         manufacturing_year = EXCLUDED.manufacturing_year,
         color = EXCLUDED.color,
         mileage = EXCLUDED.mileage,
         kilometers_driven = EXCLUDED.kilometers_driven,
         registration_number = EXCLUDED.registration_number`,
      [recordId, veh.year || 2024, veh.color || "Black", veh.mileage || "16 kmpl", veh.km || 10000, veh.reg || "UP65-AB-1234"]
    );
    return recordId;
  }

  // Helper to insert Event (business_records + events)
  async function seedEvent(catId, evt) {
    const slug = evt.slug + "-vns";
    const store = await getStoreForCat(catId);
    let recordId;
    const existing = await pool.query(`SELECT id FROM business_records WHERE slug = $1 AND vertical_code = 'events'`, [slug]);
    if (existing.rows.length > 0) {
      recordId = existing.rows[0].id;
    } else {
      const ins = await pool.query(
        `INSERT INTO business_records (business_id, vertical_id, vertical_code, title, slug, description, category_id, status, is_active, is_featured, currency, price, featured_image, is_deleted, created_at, updated_at)
         VALUES ($1, 7, 'events', $2, $3, $4, $5, 'published', true, true, 'INR', $6, $7, false, NOW(), NOW()) RETURNING id`,
        [store.id, evt.title, slug, evt.description, evt.masterCatId || 350, evt.price || 0, evt.image]
      );
      recordId = ins.rows[0].id;
    }

    const startDate = new Date(Date.now() + (Math.floor(Math.random() * 30) + 5) * 86400000);
    const endDate = new Date(startDate.getTime() + 2 * 86400000);

    await pool.query(
      `INSERT INTO events (record_id, organizer_name, start_date, end_date, start_time, end_time, venue_name, complete_address, city, state, country, is_free)
       VALUES ($1, $2, $3, $4, '10:00 AM', '07:00 PM', $5, $6, 'Varanasi', 'Uttar Pradesh', 'India', $7)
       ON CONFLICT (record_id) DO UPDATE SET
         organizer_name = EXCLUDED.organizer_name,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         venue_name = EXCLUDED.venue_name,
         complete_address = EXCLUDED.complete_address,
         is_free = EXCLUDED.is_free`,
      [recordId, evt.organizer || store.name, startDate, endDate, evt.venue || "Varanasi Convention Center", evt.address || store.address, evt.price === 0]
    );
    return recordId;
  }

  // =========================================================================
  // 1. REAL ESTATE & CONSTRUCTION (Category 7824)
  // Has: property, product, course, event, professionals (NO vehicles!)
  // =========================================================================
  console.log("-> Seeding [Real Estate & Construction] (7824)...");
  // 5 Properties
  const reProperties = [
    {
      title: "Luxury 3 BHK High-Rise Riverview Apartment",
      slug: "luxury-3bhk-riverview-apartment-sigra",
      description: "1,850 sq.ft ultra-modern 3 BHK apartment with panoramic view of Varanasi, Italian marble flooring, and gated clubhouse amenities.",
      price: 8500000,
      rentalAmount: 32000,
      builtUpArea: 1850,
      bedrooms: 3,
      bathrooms: 3,
      masterCatId: 49,
      address: "Tower B, Heights Residency, Sigra, Varanasi",
      image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=600&fit=crop"
    },
    {
      title: "Prime Commercial Showroom & Corporate Office Space",
      slug: "prime-commercial-showroom-godowlia",
      description: "2,400 sq.ft prime commercial ground floor showroom on main Godowlia road, high footfall, 100% power backup, glass frontage.",
      price: 24000000,
      rentalAmount: 95000,
      builtUpArea: 2400,
      bedrooms: 0,
      bathrooms: 2,
      masterCatId: 50,
      address: "Main Godowlia Crossing, Varanasi",
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=600&fit=crop"
    },
    {
      title: "Ganga Facing Heritage Kothi & Villa",
      slug: "ganga-facing-heritage-villa-assi-ghat",
      description: "Exclusive 4 BHK heritage courtyard villa with rooftop terrace overlooking river Ganga, traditional red-stone architecture.",
      price: 19500000,
      rentalAmount: 65000,
      builtUpArea: 3200,
      bedrooms: 4,
      bathrooms: 4,
      masterCatId: 49,
      address: "Assi Ghat Promenade, Varanasi",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=600&fit=crop"
    },
    {
      title: "1800 Sq.Ft Gated Villa Residential Plot",
      slug: "1800-sqft-gated-villa-plot-sarnath",
      description: "Clear title RERA approved residential plot inside luxury gated township with 40-ft wide blacktop roads, underground electricity and parks.",
      price: 4500000,
      rentalAmount: 0,
      builtUpArea: 1800,
      bedrooms: 0,
      bathrooms: 0,
      masterCatId: 51,
      address: "Ring Road Phase 2, Near Sarnath, Varanasi",
      image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=600&fit=crop"
    },
    {
      title: "Purvanchal Industrial Warehouse & Logistics Estate",
      slug: "purvanchal-industrial-warehouse-bada-lalpur",
      description: "12,000 sq.ft pre-engineered metal building warehouse with heavy vehicle loading docks, 32-ft clear height, and 24/7 security.",
      price: 35000000,
      rentalAmount: 180000,
      builtUpArea: 12000,
      bedrooms: 0,
      bathrooms: 4,
      masterCatId: 408,
      address: "Industrial Corridor, Bada Lalpur, Varanasi",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=600&fit=crop"
    }
  ];
  for (const p of reProperties) await seedProperty(7824, p);

  // 4 Construction Products
  const reProducts = [
    { name: "UltraTech Super Premium Portland Cement (50kg Bag)", slug: "ultratech-super-cement-50kg", description: "Engineered with micro-fine particles for supreme crack resistance, faster setting, and heavy load structures.", price: 395, image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=600&fit=crop" },
    { name: "Kajaria 4x2 Ft Glazed Vitrified Floor Tiles (Pack of 2)", slug: "kajaria-vitrified-floor-tiles-4x2", description: "High-gloss Italian marble finish digital vitrified floor tiles with scratch-resistant surface.", price: 1250, image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&h=600&fit=crop" },
    { name: "Jaquar Queen Chrome Basin Mixer & Bath Tap Set", slug: "jaquar-queen-basin-mixer-tap-set", description: "Solid brass body with advanced chrome plating, ceramic disc cartridge, and smooth water aerator.", price: 3450, image: "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=600&h=600&fit=crop" },
    { name: "Asian Paints Royale Luxury Interior Emulsion (20 Litres)", slug: "asian-paints-royale-luxury-emulsion-20l", description: "Teflon surface protector luxury finish paint with anti-bacterial shield and washable sheen.", price: 7800, image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&h=600&fit=crop" }
  ];
  for (const pr of reProducts) await seedProduct(7824, pr);

  // 3 Real Estate Courses
  const reCourses = [
    { name: "AutoCAD 2D/3D & Revit Architecture BIM Masterclass", slug: "autocad-revit-bim-masterclass", code: "CAD-301", description: "Comprehensive structural drawing, 3D modeling, floor planning, and BIM project workflow training.", image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=500&fit=crop" },
    { name: "Civil Site Engineering & Construction Management Diploma", slug: "civil-site-engineering-management-diploma", code: "CIV-401", description: "Hands-on site execution, RCC inspection, estimation, bar bending schedule, and safety standards.", image: "https://images.unsplash.com/photo-1541888946425-d0fbb1861564?w=800&h=500&fit=crop" },
    { name: "Real Estate Brokerage, RERA Compliance & Property Valuation", slug: "rera-real-estate-brokerage-valuation", code: "REA-201", description: "UP RERA legal certification, land title verification, property valuation techniques, and client closing.", image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=500&fit=crop" }
  ];
  for (const cr of reCourses) await seedCourse(7824, cr);

  // 3 Real Estate Events
  const reEvents = [
    { title: "Purvanchal Mega Property & Home Loan Expo 2026", slug: "purvanchal-property-home-loan-expo", description: "Varanasi's largest real estate summit showcasing 50+ approved residential and commercial projects with spot home loan approvals.", masterCatId: 350, price: 0, image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&h=600&fit=crop" },
    { title: "Varanasi Smart City Construction & Green Architecture Summit", slug: "varanasi-smart-city-green-construction-summit", description: "Conference of architects, civil engineers, and developers discussing sustainable building materials and solar rooftops.", masterCatId: 350, price: 499, image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=600&fit=crop" },
    { title: "Purvanchal Real Estate Investors & Builders Meet", slug: "purvanchal-investors-builders-meet", description: "High-value networking forum connecting prime land investors, NBFC funds, and leading Varanasi real estate builders.", masterCatId: 350, price: 999, image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&h=600&fit=crop" }
  ];
  for (const ev of reEvents) await seedEvent(7824, ev);

  // 3 Real Estate Professionals
  const reProfessionals = [
    { name: "Er. Alok Nath Srivastava", slug: "er-alok-nath-srivastava", professionType: "Civil Structural Consultant", about: "14+ years experience in structural stability audits, multi-story RCC designs, and soil test verifications in Purvanchal.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", experienceYears: 14 },
    { name: "Ar. Sneha Upadhyay", slug: "ar-sneha-upadhyay", professionType: "Senior Licensed Architect", about: "Leading architect in Varanasi specializing in luxury modern villas, sustainable heritage restoration, and 3D interior design.", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop", experienceYears: 10 },
    { name: "Adv. Ramanand Dubey", slug: "adv-ramanand-dubey", professionType: "Real Estate Legal Title Advisor", about: "16+ years experience in Varanasi registry office, 30-year title searches, RERA disputes, and property legal clearance.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop", experienceYears: 16 }
  ];
  for (const pr of reProfessionals) await seedProfessional(7824, pr);

  // =========================================================================
  // 2. SALONS & PERSONAL CARE (Category 7774)
  // Has: services, products, professionals, courses, events (NO vehicles, NO property!)
  // =========================================================================
  console.log("-> Seeding [Salons & Personal Care] (7774)...");
  // 4 Services
  const salonServices = [
    { name: "HD Bridal Glow Makeup & Saree Draping Luxury Package", slug: "hd-bridal-makeup-luxury-package", description: "Flawless HD airbrush makeup with premium international cosmetics, royal hairstyle, floral accessories, and saree draping.", price: 9999, image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&h=600&fit=crop" },
    { name: "Keratin Hair Protein Treatment & Deep Conditioning Spa", slug: "keratin-hair-protein-treatment-spa", description: "Restorative keratin protein infusion that eliminates frizz, provides mirror shine, and strengthens heat-damaged hair for 6 months.", price: 3499, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=600&fit=crop" },
    { name: "Ayurvedic Herbal Full Body Relaxation Massage & Steam", slug: "ayurvedic-herbal-body-massage-steam", description: "Traditional Ayurvedic Abhyanga massage with warm therapeutic medicated oils followed by herbal steam bath for detoxification.", price: 2199, image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&h=600&fit=crop" },
    { name: "Deluxe Hydra-Facial & Anti-Aging Skin Treatment", slug: "deluxe-hydrafacial-antiaging-treatment", description: "Medical-grade hydra-dermabrasion facial with active antioxidant serums to cleanse, extract, and deeply hydrate skin.", price: 2799, image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=600&fit=crop" }
  ];
  for (const s of salonServices) await seedService(7774, s);

  // 4 Products
  const salonProducts = [
    { name: "Moroccan Argan Organic Hair Treatment Serum (100ml)", slug: "moroccan-argan-hair-serum-100ml", description: "Cold-pressed Moroccan Argan oil enriched with vitamin E for silky smooth and tangle-free hair.", price: 899, image: "https://images.unsplash.com/photo-1608248597359-59800e8bc1a3?w=600&h=600&fit=crop" },
    { name: "Kumkumadi Miraculous Ayurvedic Night Beauty Face Oil (30ml)", slug: "kumkumadi-ayurvedic-face-oil-30ml", description: "Formulated with 100% pure Kashmiri saffron and 26 precious herbs for radiant golden complexion.", price: 1499, image: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&h=600&fit=crop" },
    { name: "Professional Ionic Salon Hair Dryer 2200W", slug: "professional-ionic-salon-hair-dryer", description: "Ultra-fast AC motor salon dryer with negative ion technology that locks in hair moisture and prevents heat damage.", price: 2299, image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=600&fit=crop" },
    { name: "Organic Walnut & Apricot Exfoliating Face Scrub (200g)", slug: "organic-walnut-apricot-face-scrub", description: "Gentle herbal face scrub that gently removes blackheads, dead skin cells, and restores skin glow.", price: 499, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop" }
  ];
  for (const pr of salonProducts) await seedProduct(7774, pr);

  // 3 Professionals
  const salonProfessionals = [
    { name: "Kavita Singhania", slug: "kavita-singhania-makeup-artist", professionType: "Celebrity Bridal Makeup Artist", about: "11+ years of expertise in HD bridal makeovers, destination wedding looks, and pre-wedding photo styling.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop", experienceYears: 11 },
    { name: "Sameer Khan", slug: "sameer-khan-hair-stylist", professionType: "Senior Hair Stylist & Colorist", about: "Trained at Toni&Guy with 9+ years experience in hair botox, balayage, keratin smoothing, and precision cuts.", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop", experienceYears: 9 },
    { name: "Pooja Chaurasia", slug: "pooja-chaurasia-aesthetician", professionType: "Ayurvedic Aesthetician & Spa Therapist", about: "Certified Panchakarma therapist offering specialized herbal facials, detox therapies, and bridal skincare.", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop", experienceYears: 8 }
  ];
  for (const pr of salonProfessionals) await seedProfessional(7774, pr);

  // 3 Courses
  const salonCourses = [
    { name: "Professional HD Bridal Makeup & Hair Styling Diploma", slug: "hd-bridal-makeup-hair-diploma", code: "SLN-101", description: "Hands-on airbrush makeup, contouring, color theory, bridal jewelry setting, and vanity business setup.", image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&h=500&fit=crop" },
    { name: "Advanced Hair Dressing, Botox & Balayage Color Masterclass", slug: "hair-dressing-botox-balayage-masterclass", code: "SLN-201", description: "Learn latest balayage lightening, fashion streaks, keratin botox, and client consultation secrets.", image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=500&fit=crop" },
    { name: "Clinical Cosmetology, Skin Aesthetics & Spa Therapy Certification", slug: "clinical-cosmetology-skin-aesthetics", code: "SLN-301", description: "Chemical peels, hydra-facial operations, LED light therapy, and spa management training.", image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=500&fit=crop" }
  ];
  for (const cr of salonCourses) await seedCourse(7774, cr);

  // 3 Events
  const salonEvents = [
    { title: "Kashi Bridal Makeup & Hair Trend Masterclass 2026", slug: "kashi-bridal-makeup-trend-masterclass", description: "Live demonstration by celebrity makeup artists showcasing 2026 royal bridal trends and airbrush techniques.", masterCatId: 352, price: 999, image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&h=600&fit=crop" },
    { title: "Varanasi Organic Skincare & Wellness Workshop", slug: "varanasi-organic-skincare-workshop", description: "Interactive beauty workshop on herbal skin formulations, facial yoga, and toxin-free lifestyle.", masterCatId: 352, price: 499, image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&h=600&fit=crop" },
    { title: "Purvanchal Hair Dressing & Aesthetics Championship", slug: "purvanchal-hair-dressing-championship", description: "Regional competition celebrating top creative hair stylists, creative barbering, and bridal artists.", masterCatId: 352, price: 0, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&h=600&fit=crop" }
  ];
  for (const ev of salonEvents) await seedEvent(7774, ev);

  // =========================================================================
  // 3. AUTOMOTIVE & TRANSPORT (Category 7800)
  // Has: vehicles, products, services, professionals, events (NO property!)
  // =========================================================================
  console.log("-> Seeding [Automotive & Transport] (7800)...");
  // 5 Vehicles
  const autoVehicles = [
    {
      title: "2024 Mahindra Scorpio-N Z8L 4x4 Automatic",
      slug: "2024-mahindra-scorpio-n-z8l-4x4-auto",
      description: "Top model Scorpio-N with 4XPLOR terrain mode, sunroof, Sony 12-speaker 3D audio, and pristine showroom condition.",
      price: 2450000,
      year: 2024,
      color: "Deep Forest",
      mileage: "15.2 kmpl",
      km: 6500,
      reg: "UP65-MN-2024",
      masterCatId: 4,
      image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200&h=600&fit=crop"
    },
    {
      title: "2024 Ather 450X Gen 3 Pro Electric Scooter",
      slug: "2024-ather-450x-gen3-pro-electric",
      description: "Zero-emission smart electric scooter with Warp mode, Google maps dashboard, fast charging, and 146 km true range.",
      price: 145000,
      year: 2024,
      color: "Lunar Grey",
      mileage: "146 km/charge",
      km: 2100,
      reg: "UP65-EV-4501",
      masterCatId: 5,
      image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&h=600&fit=crop"
    },
    {
      title: "2023 Toyota Fortuner Legender 4x4 Diesel Automatic",
      slug: "2023-toyota-fortuner-legender-4x4-diesel",
      description: "Immaculate condition luxury 7-seater SUV with dual-tone pearl white finish, ventilated leather seats, and full company service history.",
      price: 4350000,
      year: 2023,
      color: "White Pearl & Black",
      mileage: "14.4 kmpl",
      km: 18000,
      reg: "UP65-TF-9999",
      masterCatId: 4,
      image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1200&h=600&fit=crop"
    },
    {
      title: "2024 Mahindra Bolero Maxi Truck Plus Commercial Pickup",
      slug: "2024-mahindra-bolero-maxi-truck-commercial",
      description: "High payload commercial cargo pickup with heavy-duty leaf springs, powerful m2DiCR engine, and Varanasi permit ready.",
      price: 760000,
      year: 2024,
      color: "Diamond White",
      mileage: "17.2 kmpl",
      km: 8500,
      reg: "UP65-BT-6611",
      masterCatId: 6,
      image: "https://images.unsplash.com/photo-1586191582056-a4c3f5dc6e7c?w=1200&h=600&fit=crop"
    },
    {
      title: "2024 Royal Enfield Classic 350 Stealth Black",
      slug: "2024-royal-enfield-classic-350-stealth",
      description: "Dual-channel ABS J-series engine Royal Enfield Classic with alloy wheels, tubeless tyres, and custom exhaust.",
      price: 220000,
      year: 2024,
      color: "Stealth Black",
      mileage: "37.5 kmpl",
      km: 4200,
      reg: "UP65-RE-3500",
      masterCatId: 5,
      image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&h=600&fit=crop"
    }
  ];
  for (const v of autoVehicles) await seedVehicle(7800, v);

  // 3 Automotive Products
  const autoProducts = [
    { name: "Mobil 1 Advanced Full Synthetic Engine Oil 5W-40 (4 Litres)", slug: "mobil-1-synthetic-engine-oil-5w40", description: "Ultimate engine protection for modern petrol, diesel, and turbocharged engines with extended drain intervals.", price: 3299, image: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&h=600&fit=crop" },
    { name: "All-Weather 7D Custom Molded Waterproof Car Floor Mats", slug: "all-weather-7d-custom-car-mats", description: "Premium anti-skid leatherette floor mats tailored for luxury sedans and SUVs with removable curly mat layer.", price: 2850, image: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=600&h=600&fit=crop" },
    { name: "Smart GPS Anti-Theft Vehicle Tracker with Live Mobile App", slug: "smart-gps-anti-theft-vehicle-tracker", description: "Real-time 4G GPS locator with engine cut-off immobilizer, geo-fencing, and live route replay.", price: 1899, image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=600&fit=crop" }
  ];
  for (const pr of autoProducts) await seedProduct(7800, pr);

  // 3 Automotive Services
  const autoServices = [
    { name: "9H Nano Ceramic Coating & Full Vehicle Paint Protection", slug: "9h-nano-ceramic-coating-service", description: "3-layer hydrophobic 9H ceramic shield applied after multi-stage paint correction for diamond high-gloss finish.", price: 14999, image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&h=600&fit=crop" },
    { name: "Comprehensive 40-Point Car Servicing & Oil Change", slug: "comprehensive-40-point-car-servicing", description: "Full synthetic oil replacement, oil filter change, brake pad cleaning, spark plug check, and wheel balancing.", price: 3499, image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=600&h=600&fit=crop" },
    { name: "Car AC Deep Foam Jet Cleaning & Refrigerant Top-up", slug: "car-ac-deep-foam-jet-cleaning", description: "Disinfection of cooling coil, antimicrobial evaporator cleaning, cabin filter replacement, and R134a refrigerant refill.", price: 1799, image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=600&fit=crop" }
  ];
  for (const s of autoServices) await seedService(7800, s);

  // 3 Automotive Events
  const autoEvents = [
    { title: "Varanasi Electric Vehicle (EV) Auto Expo & Test Drive Gala", slug: "varanasi-ev-auto-expo-test-drive", description: "Experience the future of mobility with 30+ electric 2-wheelers, 3-wheelers, and electric SUVs with instant subsidy guidance.", masterCatId: 350, price: 0, image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1200&h=600&fit=crop" },
    { title: "Purvanchal Superbike & Classic Vintage Car Rally", slug: "purvanchal-superbike-vintage-car-rally", description: "Spectacular automotive parade from Sigra Stadium through Cantonment featuring retro classics and performance superbikes.", masterCatId: 350, price: 0, image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&h=600&fit=crop" },
    { title: "Monsoon Safe Driving & Free Vehicle Inspection Camp", slug: "monsoon-safe-driving-free-car-camp", description: "Complimentary 25-point brake, tyre tread, wiper, and electrical checkup camp for all Varanasi car owners.", masterCatId: 350, price: 0, image: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1200&h=600&fit=crop" }
  ];
  for (const ev of autoEvents) await seedEvent(7800, ev);

  // 3 Automotive Professionals
  const autoProfessionals = [
    { name: "Mohammad Irfan", slug: "mohammad-irfan-auto-mechanic", professionType: "Senior Automotive Diagnostic Mechanic", about: "15+ years experience in OBD computer diagnostics, automatic transmission overhauls, and German car troubleshooting.", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop", experienceYears: 15 },
    { name: "Rahul Vishwakarma", slug: "rahul-vishwakarma-ev-specialist", professionType: "Electric Vehicle (EV) Systems Specialist", about: "Certified high-voltage EV battery technician, BMS diagnostic expert, and electric 2-wheeler motor repair specialist.", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&h=400&fit=crop", experienceYears: 8 }
  ];
  for (const pr of autoProfessionals) await seedProfessional(7800, pr);

  // =========================================================================
  // 4. PROFESSIONAL & FINANCIAL SERVICES (Category 7838)
  // Has: financial services, professionals, products, courses, events (NO vehicles, NO property!)
  // =========================================================================
  console.log("-> Seeding [Professional & Financial Services] (7838)...");
  // 5 Financial Services
  const finServices = [
    { name: "MSME Business Loan & Project Finance Advisory", slug: "msme-business-loan-project-finance", description: "Comprehensive bank loan documentation, CMA report preparation, credit guarantee scheme (CGTMSE) facilitation, and term loan sanction.", price: 4999, image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&h=600&fit=crop" },
    { name: "Income Tax Return (ITR) & Annual GST Audit Filing", slug: "income-tax-itr-gst-audit-filing", description: "Error-free ITR preparation for individuals, proprietorships, and PVT LTD companies with maximised legal tax deductions.", price: 2499, image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&h=600&fit=crop" },
    { name: "Mutual Fund Portfolio Review & Wealth Management Advisory", slug: "mutual-fund-wealth-management-advisory", description: "Personalized asset allocation, SIP planning, tax-saving ELSS investments, and retirement wealth building.", price: 1499, image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=600&fit=crop" },
    { name: "Private Limited Company (Pvt Ltd) & LLP Incorporation Package", slug: "pvt-ltd-company-llp-incorporation-package", description: "Full ROC setup including MCA approval, Director DIN/DSC, MOA/AOA drafting, PAN/TAN, and bank account opening support.", price: 6999, image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=600&fit=crop" },
    { name: "Statutory Financial Audit & CA Balance Sheet Certification", slug: "statutory-financial-audit-ca-certification", description: "Independent balance sheet verification, tax audit under Section 44AB, net worth certificates, and tender compliance.", price: 8500, image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=600&fit=crop" }
  ];
  for (const s of finServices) await seedService(7838, s);

  // 4 Financial / Business Professionals
  const finProfessionals = [
    { name: "CA Rajiv Agrawal, FCA", slug: "ca-rajiv-agrawal-fca", professionType: "Senior Chartered Accountant & Tax Auditor", about: "17+ years experience in corporate statutory audit, direct tax litigation, MSME debt restructuring, and GST compliance in Varanasi.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", experienceYears: 17 },
    { name: "CS Meenakshi Sundaram", slug: "cs-meenakshi-sundaram", professionType: "Corporate Company Secretary & Compliance Advisor", about: "12+ years experience in ROC company incorporation, board meeting legalities, secretarial audit, and trademark filings.", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop", experienceYears: 12 },
    { name: "Adv. Harishankar Pandey", slug: "adv-harishankar-pandey", professionType: "High Court Commercial & Tax Advocate", about: "21+ years handling commercial contracts, income tax appellate tribunals (ITAT), civil property partition, and arbitration.", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop", experienceYears: 21 },
    { name: "Praveen K. Mishra, CFP", slug: "praveen-k-mishra-cfp", professionType: "Certified Financial Planner & Wealth Manager", about: "13+ years helping Varanasi families and business owners build wealth via disciplined mutual funds, equities, and estate planning.", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop", experienceYears: 13 }
  ];
  for (const pr of finProfessionals) await seedProfessional(7838, pr);

  // 3 Products (Accounting Software, DSC Tokens, POS Machines)
  const finProducts = [
    { name: "TallyPrime Silver Single User Perpetual Accounting License", slug: "tallyprime-silver-license", description: "Official GST-ready accounting, e-invoicing, e-way bill generation, and financial reporting software for small businesses.", price: 22500, image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=600&fit=crop" },
    { name: "Class 3 Digital Signature Certificate (DSC) USB Crypto Token", slug: "class-3-dsc-usb-token", description: "FIPS certified USB e-token loaded with Class 3 encryption certificate valid for 2 years for MCA, Income Tax, and e-Tendering.", price: 1499, image: "https://images.unsplash.com/photo-1563770660941-20978e870e26?w=600&h=600&fit=crop" },
    { name: "4G Smart Payment Soundbox & POS Billing Device", slug: "smart-pos-billing-soundbox-device", description: "Wireless touch POS billing terminal with instant voice confirmation in Hindi and English, QR code stand, and thermal printer.", price: 1999, image: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=600&h=600&fit=crop" }
  ];
  for (const pr of finProducts) await seedProduct(7838, pr);

  // 3 Financial Courses
  const finCourses = [
    { name: "Practical GST Return & Income Tax Filing Certification", slug: "practical-gst-itr-filing-course", code: "FIN-101", description: "Live portal training for GSTR-1, GSTR-3B, annual returns, TDS reconciliation, and ITR-1 to ITR-4 filings.", image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=500&fit=crop" },
    { name: "Stock Market Technical Analysis, Equity & Options Trading", slug: "stock-market-technical-analysis-trading", code: "FIN-201", description: "Master candlestick price action, moving averages, risk management, and options hedging strategies.", image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=500&fit=crop" },
    { name: "Financial Modeling, Corporate Valuation & TallyPrime Certification", slug: "financial-modeling-corporate-valuation", code: "FIN-301", description: "Excel DCF valuation models, financial ratio diagnostics, budget forecasts, and corporate balance sheet prep.", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=500&fit=crop" }
  ];
  for (const cr of finCourses) await seedCourse(7838, cr);

  // 3 Financial Events
  const finEvents = [
    { title: "Varanasi MSME Credit, Subsidy & Tax Conclave 2026", slug: "varanasi-msme-credit-tax-conclave", description: "Direct interaction with SIDBI, nationalized banks, and tax experts on government subsidies and low-interest business loans.", masterCatId: 350, price: 0, image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&h=600&fit=crop" },
    { title: "Purvanchal Wealth Creation & Stock Market Summit", slug: "purvanchal-wealth-creation-summit", description: "Interactive conference on mutual fund compounding, SIP wealth accumulation, and macroeconomic market outlook.", masterCatId: 350, price: 499, image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&h=600&fit=crop" },
    { title: "Startup & MSME Corporate Law Conclave", slug: "startup-msme-corporate-law-conclave", description: "Essential legal guidelines on investor term sheets, trademark protection, and labor law compliance for local entrepreneurs.", masterCatId: 350, price: 0, image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=1200&h=600&fit=crop" }
  ];
  for (const ev of finEvents) await seedEvent(7838, ev);

  // =========================================================================
  // 5. HEALTHCARE & MEDICAL (Category 7765)
  // Has: professionals, products, services, courses, events (NO vehicles, NO property!)
  // =========================================================================
  console.log("-> Seeding [Healthcare & Medical] (7765)...");
  // 4 Professionals
  const medProfessionals = [
    { name: "Dr. Shailendra K. Verma, MD", slug: "dr-shailendra-k-verma-cardiologist", professionType: "Senior Consultant Cardiologist", about: "18+ years experience in preventive cardiology, hypertension management, and non-invasive coronary diagnostics.", avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop", experienceYears: 18 },
    { name: "Dr. Vandana Tripathi, MS", slug: "dr-vandana-tripathi-gynecologist", professionType: "Consultant Gynecologist & Obstetrician", about: "14+ years experience in high-risk pregnancy care, laparoscopic gynecology, and women's health counseling.", avatar: "https://images.unsplash.com/photo-1594824813576-96eb11e2f750?w=400&h=400&fit=crop", experienceYears: 14 },
    { name: "Dr. Abhishek Jaiswal, MDS", slug: "dr-abhishek-jaiswal-implantologist", professionType: "Chief Dental Implantologist & Orthodontist", about: "11+ years offering painless root canal therapy, German dental implants, and invisible aligners in Varanasi.", avatar: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=400&fit=crop", experienceYears: 11 }
  ];
  for (const pr of medProfessionals) await seedProfessional(7765, pr);

  // 4 Products
  const medProducts = [
    { name: "Omron Digital Upper Arm Blood Pressure Monitor", slug: "omron-digital-bp-monitor", description: "Clinically validated oscillometric blood pressure monitor with Intellisense technology and irregular heartbeat detector.", price: 2150, image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&h=600&fit=crop" },
    { name: "Accu-Chek Active Blood Glucose Monitor with 50 Test Strips", slug: "accu-chek-active-glucometer-strips", description: "Accurate blood sugar monitoring in just 5 seconds with small blood sample volume and 500-test memory.", price: 1299, image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&h=600&fit=crop" },
    { name: "Foldable Lightweight Steel Patient Wheelchair", slug: "foldable-lightweight-steel-wheelchair", description: "Heavy-duty chrome plated steel wheelchair with padded armrests, swing-away footrests, and puncture-proof solid rubber tyres.", price: 5999, image: "https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&h=600&fit=crop" },
    { name: "Ayush Kwath Ayurvedic Immunity Booster Kadha Pack (500g)", slug: "ayush-kwath-immunity-booster-kadha", description: "Ministry of Ayush recommended herbal blend with Tulsi, Dalchini, Sunthi, and Krishna Marich for respiratory immunity.", price: 350, image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&h=600&fit=crop" }
  ];
  for (const pr of medProducts) await seedProduct(7765, pr);

  // 3 Services
  const medServices = [
    { name: "Comprehensive Full Body Health Checkup & Blood Screening", slug: "comprehensive-full-body-health-checkup", description: "Complete hemogram, lipid profile, liver function, kidney function, thyroid TSH, and HbA1c test with doctor consultation.", price: 1999, image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&h=600&fit=crop" },
    { name: "24x7 Home Patient Care & Nursing Attendant Service", slug: "home-patient-care-nursing-service", description: "Certified male/female nurse for post-surgery recovery, elderly care, IV drip administration, and vital monitoring.", price: 1200, image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=600&fit=crop" },
    { name: "Advanced Digital Dental Implant & Laser Teeth Whitening", slug: "digital-dental-implant-teeth-whitening", description: "Single-sitting titanium dental implant with natural zirconia crown and painless laser whitening treatment.", price: 4500, image: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&h=600&fit=crop" }
  ];
  for (const s of medServices) await seedService(7765, s);

  // 3 Courses
  const medCourses = [
    { name: "Emergency First Aid, CPR & Trauma Life Support Certification", slug: "emergency-first-aid-cpr-certification", code: "MED-101", description: "AHA-aligned cardiopulmonary resuscitation, automated defibrillator (AED) usage, and road trauma response training.", image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&h=500&fit=crop" },
    { name: "Hospital Nursing Care & Patient Assistance Skills Certificate", slug: "hospital-nursing-patient-care-certificate", code: "MED-201", description: "Bedside nursing techniques, catheterization, aseptic dressing, vital charts, and emergency protocol handling.", image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&h=500&fit=crop" },
    { name: "Clinical Medical Laboratory Technician & Phlebotomy Training", slug: "clinical-lab-technician-phlebotomy-course", code: "MED-301", description: "Painless blood draw techniques, automated hematology analyzers, biochemistry testing, and quality control.", image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&h=500&fit=crop" }
  ];
  for (const cr of medCourses) await seedCourse(7765, cr);

  // 3 Events
  const medEvents = [
    { title: "Free Super-Speciality Mega Health & Cardiac Checkup Camp", slug: "free-super-speciality-health-cardiac-camp", description: "Complimentary blood sugar, ECG, bone density scans, and consultation with visiting cardiologists and surgeons.", masterCatId: 350, price: 0, image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=600&fit=crop" },
    { title: "Kashi Diabetes & Hypertension Prevention Awareness Conclave", slug: "kashi-diabetes-hypertension-awareness-conclave", description: "Interactive talk on lifestyle modification, reverse diabetes strategies, and dietary guidelines for urban families.", masterCatId: 350, price: 0, image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=1200&h=600&fit=crop" },
    { title: "National Ayurvedic Medicine & Natural Wellness Summit", slug: "national-ayurvedic-medicine-wellness-summit", description: "Conference bringing together leading Ayurvedic vaidyas to discuss evidence-based herbal healing for chronic illness.", masterCatId: 350, price: 299, image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&h=600&fit=crop" }
  ];
  for (const ev of medEvents) await seedEvent(7765, ev);

  // =========================================================================
  // 6. EDUCATION & COACHING (Category 7816)
  // Has: courses, professionals, products, events (NO vehicles, NO property!)
  // =========================================================================
  console.log("-> Seeding [Education & Coaching] (7816)...");
  // 4 Courses
  const eduCourses = [
    { name: "IIT-JEE 1-Year Comprehensive Classroom Batch (Physics, Chem, Math)", slug: "iit-jee-classroom-batch-physics-chem-math", code: "EDU-JEE", description: "Rigorous daily lectures, DPP problem solving, weekly AIATS test series, and mentorship by top ex-IIT faculties.", image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=500&fit=crop" },
    { name: "NEET Medical Entrance 1-Year Target Mastery Batch", slug: "neet-medical-entrance-target-mastery", code: "EDU-NEET", description: "NCERT-intensive Biology line-by-line decoding, conceptual Chemistry, and high-scoring Physics numerical training.", image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=500&fit=crop" },
    { name: "UPSC Civil Services Examination (IAS/IPS) Complete GS Foundation", slug: "upsc-civil-services-ias-ips-foundation", code: "EDU-UPSC", description: "Comprehensive coverage of Prelims and Mains GS Papers I-IV, current affairs answer writing, and mock interviews.", image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&h=500&fit=crop" },
    { name: "Spoken English, Personality Development & Public Speaking", slug: "spoken-english-personality-public-speaking", code: "EDU-ENG", description: "Overcome hesitation, master business communication, professional email writing, and confident public stage speech.", image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=500&fit=crop" }
  ];
  for (const cr of eduCourses) await seedCourse(7816, cr);

  // 3 Professionals
  const eduProfessionals = [
    { name: "Prof. D. K. Tripathi", slug: "prof-dk-tripathi-physics", professionType: "Senior IIT-JEE Physics Faculty", about: "20+ years coaching thousands of successful engineers. Known for simplifying electrodynamics and mechanics concepts.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop", experienceYears: 20 },
    { name: "Dr. Ananya Mukherjee", slug: "dr-ananya-mukherjee-biology", professionType: "NEET Biology Master Faculty & Author", about: "13+ years teaching Zoology and Botany with 100% NCERT mastery; author of popular medical entrance prep guides.", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop", experienceYears: 13 },
    { name: "Sanjay Kumar Singh", slug: "sanjay-kumar-singh-polity", professionType: "UPSC Civil Services Indian Polity Expert", about: "15+ years training civil services aspirants in Constitution, Governance, and International Relations.", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop", experienceYears: 15 }
  ];
  for (const pr of eduProfessionals) await seedProfessional(7816, pr);

  // 3 Products
  const eduProducts = [
    { name: "NEET/IIT-JEE Ultimate Physics, Chemistry & Math Question Bank", slug: "neet-jee-ultimate-question-bank", description: "5,000+ chapterwise curated questions with detailed video solutions and 10 full syllabus mock tests.", price: 1999, image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&h=600&fit=crop" },
    { name: "Smart Digital Drawing & Online Tutoring Writing Tablet", slug: "smart-digital-writing-tablet", description: "Battery-free stylus with 8192 levels of pressure sensitivity compatible with Zoom, Google Meet, and MS Whiteboard.", price: 3499, image: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&h=600&fit=crop" }
  ];
  for (const pr of eduProducts) await seedProduct(7816, pr);

  // 3 Events
  const eduEvents = [
    { title: "Varanasi Career Guidance & University Admissions Fair 2026", slug: "varanasi-career-guidance-university-fair", description: "Meet representatives from top 40 Indian universities, engineering institutes, and medical colleges under one roof.", masterCatId: 350, price: 0, image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&h=600&fit=crop" },
    { title: "National Science & Mathematics Talent Olympiad", slug: "national-science-math-talent-olympiad", description: "Prestigious competition for students of classes 8-12 with cash scholarships worth ₹5 Lakhs for regional winners.", masterCatId: 350, price: 100, image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&h=600&fit=crop" },
    { title: "IIT-JEE & NEET Strategy Masterclass with Top Rankers", slug: "iit-jee-neet-strategy-masterclass", description: "Exclusive panel discussion on time management, exam temperament, and revision techniques with AIR top 100 achievers.", masterCatId: 350, price: 0, image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=600&fit=crop" }
  ];
  for (const ev of eduEvents) await seedEvent(7816, ev);

  // =========================================================================
  // 7. IT & DIGITAL AGENCIES (Category 7831)
  // Has: services, products, courses, professionals, events (NO vehicles, NO property!)
  // =========================================================================
  console.log("-> Seeding [IT & Digital Agencies] (7831)...");
  // 4 Services
  const itServices = [
    { name: "Custom Next.js & React Web Application Development", slug: "custom-nextjs-react-web-app-dev", description: "High-performance, SEO-optimized web application with modern responsive UI, cloud database, and payment gateway integration.", price: 24999, image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=600&fit=crop" },
    { name: "Local Business SEO & Google Maps Top Ranking Package", slug: "local-business-seo-google-maps-ranking", description: "Dominate Varanasi local searches with Google Business Profile optimization, local citations, and 5-star review acceleration.", price: 7999, image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=600&fit=crop" },
    { name: "E-Commerce Mobile App Development (iOS & Android)", slug: "ecommerce-mobile-app-dev-ios-android", description: "Native performance Flutter/React Native shopping application with push notifications, cart sync, and COD support.", price: 39999, image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=600&fit=crop" },
    { name: "Brand Identity, UI/UX Design System & Logo Package", slug: "brand-identity-uiux-design-system", description: "Complete brand aesthetic including modern vectorized logo, color palette, typography guidelines, and Figma component system.", price: 11999, image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&h=600&fit=crop" }
  ];
  for (const s of itServices) await seedService(7831, s);

  // 3 Products
  const itProducts = [
    { name: "OmniStore Retail Billing, Inventory & GST SaaS Software", slug: "omnistore-retail-billing-inventory-saas", description: "Cloud-based multi-terminal POS software with barcode scanning, automated purchase orders, and WhatsApp bills.", price: 8999, image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=600&fit=crop" },
    { name: "BioFinger Biometric Fingerprint & Face Attendance Machine", slug: "biofinger-biometric-attendance-machine", description: "Dual-camera AI facial recognition with RFID card and fingerprint reader, WiFi cloud sync, and mobile attendance app.", price: 4750, image: "https://images.unsplash.com/photo-1563770660941-20978e870e26?w=600&h=600&fit=crop" }
  ];
  for (const pr of itProducts) await seedProduct(7831, pr);

  // 3 Professionals
  const itProfessionals = [
    { name: "Vikramaditya Rao", slug: "vikramaditya-rao-fullstack-architect", professionType: "Principal Full-Stack Cloud Architect", about: "12+ years experience building scalable enterprise SaaS, serverless AWS architectures, and Next.js applications.", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop", experienceYears: 12 },
    { name: "Swati Sen", slug: "swati-sen-uiux-designer", professionType: "Senior Product UI/UX Designer & Researcher", about: "8+ years crafting user-friendly mobile and web interfaces with Figma, usability testing, and design systems.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop", experienceYears: 8 },
    { name: "Aditya Narayan", slug: "aditya-narayan-ai-engineer", professionType: "AI Solutions Engineer & Data Scientist", about: "7+ years implementing generative AI agents, LLM fine-tuning, and automated predictive analytics for businesses.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop", experienceYears: 7 }
  ];
  for (const pr of itProfessionals) await seedProfessional(7831, pr);

  // 3 Courses
  const itCourses = [
    { name: "Full-Stack Web Development Bootcamp (React, Next.js, Node.js)", slug: "fullstack-web-dev-bootcamp-nextjs", code: "IT-101", description: "Zero to hero full-stack engineering with real portfolio projects, Git workflows, and deployment on Vercel.", image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=500&fit=crop" },
    { name: "Practical AI & Machine Learning Engineering with Python", slug: "practical-ai-machine-learning-python", code: "IT-201", description: "Deep learning with PyTorch, computer vision, natural language processing, and deploying LLM applications.", image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=500&fit=crop" },
    { name: "Digital Marketing, SEO & Performance Advertising Masterclass", slug: "digital-marketing-seo-advertising", code: "IT-301", description: "Run high-ROI Meta & Google ads campaigns, master on-page SEO, and scale e-commerce conversions.", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop" }
  ];
  for (const cr of itCourses) await seedCourse(7831, cr);

  // 3 Events
  const itEvents = [
    { title: "Varanasi Tech Summit & AI Hackathon 2026", slug: "varanasi-tech-summit-ai-hackathon", description: "48-hour competitive coding hackathon solving regional urban challenges with AI, IoT, and cloud software.", masterCatId: 350, price: 0, image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&h=600&fit=crop" },
    { title: "Generative AI for Local Businesses & Retailers Workshop", slug: "generative-ai-for-local-businesses", description: "Learn how to use AI tools for automated social media marketing, customer support chatbots, and business inventory.", masterCatId: 350, price: 299, image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=600&fit=crop" },
    { title: "Purvanchal Startup Founders & Angel Pitch Night", slug: "purvanchal-startup-founders-pitch-night", description: "Pre-seed and seed stage tech startups pitch their innovations before angel investors and venture capitalists in Varanasi.", masterCatId: 350, price: 0, image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&h=600&fit=crop" }
  ];
  for (const ev of itEvents) await seedEvent(7831, ev);

  // =========================================================================
  // 8. FOOD, DINING & CAFES (Category 7782)
  // Has: products, services, professionals, events, courses (NO vehicles, NO property!)
  // =========================================================================
  console.log("-> Seeding [Food, Dining & Cafes] (7782)...");
  const foodProducts = [
    { name: "Authentic Kashi Lal Peda & Banarasi Mithai Royal Gift Box (1kg)", slug: "kashi-lal-peda-mithai-gift-box", description: "Handcrafted pure khoya Banarasi Lal Peda roasted over slow wooden fire with aromatic green cardamom.", price: 650, image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&h=600&fit=crop" },
    { name: "Single Origin Dark Roast Arabica Coffee Beans (500g)", slug: "single-origin-dark-roast-coffee-beans", description: "Artisan small-batch roasted Arabica coffee beans from Chikmagalur estates with rich chocolate and caramel notes.", price: 750, image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=600&fit=crop" },
    { name: "Artisanal Royal Chai Masala with Kashmiri Saffron (250g)", slug: "artisanal-royal-chai-masala-saffron", description: "Fragrant blend of hand-ground green cardamom, cloves, cinnamon, dried ginger, and royal saffron strands.", price: 425, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&h=600&fit=crop" }
  ];
  for (const pr of foodProducts) await seedProduct(7782, pr);

  const foodServices = [
    { name: "Luxury Destination Wedding & Sangeet Catering (Per Plate)", slug: "luxury-destination-wedding-catering", description: "Royal Awadhi and Banarasi pure vegetarian culinary spread with live counter stations and traditional brassware dining.", price: 1150, image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=600&fit=crop" },
    { name: "Corporate Live Buffet & Bento Box Delivery (Min 25 Pax)", slug: "corporate-live-buffet-bento-delivery", description: "Hygienic multi-cuisine hot buffet setup with chef service for corporate seminars and board meetings.", price: 450, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=600&fit=crop" }
  ];
  for (const s of foodServices) await seedService(7782, s);

  const foodProfessionals = [
    { name: "Chef Ranvijay Singh", slug: "chef-ranvijay-singh-executive-chef", professionType: "Executive Chef & Awadhi Culinary Specialist", about: "16+ years experience in royal Awadhi dum pukht, signature dum biryanis, and traditional Banarasi feast recipes.", avatar: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop", experienceYears: 16 },
    { name: "Chef Natasha Roy", slug: "chef-natasha-roy-pastry-chef", professionType: "Artisan Pastry Chef & Chocolatier", about: "Trained at Le Cordon Bleu with 9+ years experience in sourdough breads, French macarons, and customized wedding cakes.", avatar: "https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=400&h=400&fit=crop", experienceYears: 9 }
  ];
  for (const pr of foodProfessionals) await seedProfessional(7782, pr);

  const foodEvents = [
    { title: "Kashi Royal Street Food & Sweets Festival 2026", slug: "kashi-royal-street-food-festival", description: "Celebrating legendary street flavors from Tamatar Chaat and Malaiyo to Banarasi Paan and rabdi lassi.", masterCatId: 351, price: 0, image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=600&fit=crop" },
    { title: "Artisan Coffee Brewing & Barista Masterclass", slug: "artisan-coffee-brewing-barista-masterclass", description: "Hands-on workshop on V60 pour-over, Aeropress extraction, milk steaming, and latte art techniques.", masterCatId: 351, price: 499, image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1200&h=600&fit=crop" }
  ];
  for (const ev of foodEvents) await seedEvent(7782, ev);

  const foodCourses = [
    { name: "Professional Bakery, Pastry Arts & Cake Decorating Course", slug: "professional-bakery-pastry-arts-course", code: "CUL-101", description: "Master artisan breads, layered wedding cakes, chocolate ganache tempering, and patisserie setup.", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=500&fit=crop" },
    { name: "Authentic Indian & Continental Culinary Arts Certification", slug: "indian-continental-culinary-certification", code: "CUL-201", description: "Master classical gravies, tandoor marinades, continental pasta crafting, and kitchen hygiene.", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=500&fit=crop" }
  ];
  for (const cr of foodCourses) await seedCourse(7782, cr);

  // =========================================================================
  // 9. RETAIL & SHOPPING (Category 7791)
  // Has: products, services, professionals, events (NO vehicles, NO property!)
  // =========================================================================
  console.log("-> Seeding [Retail & Shopping] (7791)...");
  const retailProducts = [
    { name: "Pure Handloom Banarasi Katan Silk Wedding Saree with Zari", slug: "pure-handloom-banarasi-katan-silk-saree", description: "Authentic hand-woven bridal katan silk saree featuring intricate floral kadwa zari motifs and rich pallu.", price: 16500, image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&h=600&fit=crop" },
    { name: "Handcrafted Pure Brass Pooja Thali Set with Bell & Diya (12 inch)", slug: "pure-brass-pooja-thali-set", description: "Traditional heavy embossed brass prayer plate complete with incense burner, bell, kumkum cups, and carved diya.", price: 2750, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=600&fit=crop" },
    { name: "Traditional Banaras Hand-Carved Wooden Toy Set", slug: "traditional-banaras-wooden-toy-set", description: "Handmade non-toxic lacquered wooden toys crafted by master artisans of Kashi, safe and vibrant.", price: 850, image: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600&h=600&fit=crop" }
  ];
  for (const pr of retailProducts) await seedProduct(7791, pr);

  const retailServices = [
    { name: "Handloom Saree Zari Polishing, Roll Pressing & Dry Cleaning", slug: "saree-zari-polishing-roll-press", description: "Delicate steam roll pressing, gold and silver zari shine restoration, and chemical-free handloom cleaning.", price: 499, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=600&fit=crop" },
    { name: "Bridal Blouse Custom Stitching & Zardozi Hand Embroidery", slug: "bridal-blouse-custom-stitching-zardozi", description: "Made-to-measure designer bridal blouse with intricate hand-embroidered pearls, cutdana, and royal neck cuts.", price: 1499, image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&h=600&fit=crop" }
  ];
  for (const s of retailServices) await seedService(7791, s);

  const retailEvents = [
    { title: "Banaras Handloom Silk Heritage Exhibition & Sale", slug: "banaras-handloom-silk-heritage-expo", description: "Direct showcase from Varanasi master weavers with over 500 handloom sarees, dupattas, and brocades.", masterCatId: 351, price: 0, image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&h=600&fit=crop" },
    { title: "Grand Festive Handicrafts & Brass Artisans Mela", slug: "grand-festive-handicrafts-brass-mela", description: "Exhibition displaying hand-carved brass bells, copper idols, wooden toys, and stone inlay handicrafts.", masterCatId: 351, price: 0, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200&h=600&fit=crop" }
  ];
  for (const ev of retailEvents) await seedEvent(7791, ev);

  const retailProfessionals = [
    { name: "Manish Khemka", slug: "manish-khemka-textile-curator", professionType: "Master Handloom Textile Expert & Saree Curator", about: "22+ years working directly with Varanasi weavers to preserve authentic katan silk, brocade, and antique motifs.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", experienceYears: 22 },
    { name: "Ankita Banerji", slug: "ankita-banerji-fashion-stylist", professionType: "Traditional Bridal Fashion Stylist", about: "10+ years styling celebrity brides with heritage jewellery pairings and custom saree drapes.", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop", experienceYears: 10 }
  ];
  for (const pr of retailProfessionals) await seedProfessional(7791, pr);

  // =========================================================================
  // 10. FITNESS & SPORTS (Category 7808)
  // Has: products, services, professionals, courses, events (NO vehicles, NO property!)
  // =========================================================================
  console.log("-> Seeding [Fitness & Sports] (7808)...");
  const fitProducts = [
    { name: "Optimum Nutrition 100% Whey Gold Standard Protein (2kg / 5 lbs)", slug: "optimum-nutrition-whey-protein-2kg", description: "24g premium whey protein per serving with 5.5g naturally occurring BCAAs for lean muscle recovery.", price: 6499, image: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&h=600&fit=crop" },
    { name: "Hexagonal Heavy Rubber Coated Dumbbells Pair (15kg x 2)", slug: "hexagonal-rubber-dumbbells-15kg-pair", description: "Anti-roll hexagonal rubber coated weights with ergonomic knurled chrome steel handles.", price: 4200, image: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&h=600&fit=crop" },
    { name: "Pro Eco-Friendly Anti-Slip Dual Color Yoga Mat (8mm)", slug: "pro-antislip-yoga-mat-8mm", description: "TPE non-toxic high-density exercise mat with laser body alignment lines and carry strap.", price: 999, image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=600&fit=crop" }
  ];
  for (const pr of fitProducts) await seedProduct(7808, pr);

  const fitServices = [
    { name: "1-on-1 Personal Fitness Training Monthly Program", slug: "personal-fitness-training-monthly", description: "Dedicated certified trainer for muscle hypertrophy, body fat reduction, and weekly body composition analysis.", price: 4500, image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=600&fit=crop" },
    { name: "Clinical Sports Physiotherapy & Joint Rehabilitation Session", slug: "sports-physiotherapy-rehab-session", description: "Evidence-based manual joint mobilization, dry needling, and sports injury recovery therapy.", price: 1200, image: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=600&fit=crop" }
  ];
  for (const s of fitServices) await seedService(7808, s);

  const fitProfessionals = [
    { name: "Coach Vikram Pratap", slug: "coach-vikram-pratap-cscs", professionType: "Certified Strength & Conditioning Coach (CSCS)", about: "12+ years experience training competitive powerlifters, athletes, and transformation clients in Varanasi.", avatar: "https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=400&h=400&fit=crop", experienceYears: 12 },
    { name: "Yogacharya Devendra Shastri", slug: "yogacharya-devendra-shastri", professionType: "Classical Ashtanga Yoga Master", about: "18+ years teaching authentic Patanjali Ashtanga yoga, pranayama, and meditative mindfulness along Kashi ghats.", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop", experienceYears: 18 }
  ];
  for (const pr of fitProfessionals) await seedProfessional(7808, pr);

  const fitCourses = [
    { name: "Certified Personal Fitness Trainer (CPT) Diploma", slug: "certified-personal-trainer-cpt-diploma", code: "FIT-101", description: "Anatomy, biomechanics, exercise programming, nutrition basics, and gym client coaching credentials.", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=500&fit=crop" },
    { name: "200-Hour Ashtanga & Hatha Yoga Teacher Training Course (TTC)", slug: "200-hour-yoga-teacher-training-ttc", code: "FIT-201", description: "Yoga Alliance certified residential course covering asana alignment, philosophy, and teaching methodology.", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=500&fit=crop" }
  ];
  for (const cr of fitCourses) await seedCourse(7808, cr);

  const fitEvents = [
    { title: "Varanasi Ganga Ghat International Sunrise Yoga Mahotsav", slug: "varanasi-ganga-sunrise-yoga-mahotsav", description: "Mass sunrise yoga session at Assi Ghat celebrating health, wellness, and mental calm with 1000+ practitioners.", masterCatId: 354, price: 0, image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=600&fit=crop" },
    { title: "Purvanchal Open Powerlifting & Bodybuilding Championship", slug: "purvanchal-powerlifting-bodybuilding-championship", description: "Annual regional strength competition across squat, bench press, and deadlift categories at Sigra Stadium.", masterCatId: 354, price: 199, image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=600&fit=crop" }
  ];
  for (const ev of fitEvents) await seedEvent(7808, ev);

  // =========================================================================
  // 11. HOSPITALITY & EVENTS (Category 7845)
  // Has: events, services, professionals, courses (NO vehicles, NO property!)
  // =========================================================================
  console.log("-> Seeding [Hospitality & Events] (7845)...");
  const hospEvents = [
    { title: "Kashi Classical Music & Sitar Mahotsav at Ganga Ghat", slug: "kashi-classical-music-sitar-mahotsav", description: "Mesmerizing evening of classical ragas, sitar recitals, and tabla duets by acclaimed maestros under the stars at Assi Ghat.", masterCatId: 351, price: 0, image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&h=600&fit=crop" },
    { title: "Purvanchal Grand Destination Wedding Showcase 2026", slug: "purvanchal-grand-wedding-showcase-2026", description: "Luxury wedding planning exhibition featuring palace venues, floral designers, bridal couture, and royal catering.", masterCatId: 352, price: 0, image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&h=600&fit=crop" },
    { title: "Banaras Heritage Food & Cultural Carnival", slug: "banaras-heritage-food-cultural-carnival", description: "Three days of traditional folk music, boat races, puppet performances, and authentic Kashi culinary delicacies.", masterCatId: 351, price: 0, image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&h=600&fit=crop" }
  ];
  for (const ev of hospEvents) await seedEvent(7845, ev);

  const hospServices = [
    { name: "Royal Heritage Banquet Lawn Booking for Weddings & Receptions", slug: "royal-heritage-banquet-lawn-booking", description: "Sprawling 40,000 sq.ft lawn with central AC banquet hall, changing suites, and ample parking for up to 1,500 guests.", price: 75000, image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&h=600&fit=crop" },
    { name: "Live Concert Stage Setup, JBL Sound System & Truss Lighting", slug: "live-concert-stage-sound-lighting-setup", description: "Full production package including line array sound, moving head beam lights, LED video wall, and sound engineer.", price: 25000, image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=600&fit=crop" },
    { name: "Private Sunset Ganga River Cruise Charter for Celebrations", slug: "private-sunset-ganga-cruise-charter", description: "Double-decker luxury cruise boat with open top deck, live acoustic music, refreshments, and Ganga Aarti view.", price: 12500, image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=600&fit=crop" }
  ];
  for (const s of hospServices) await seedService(7845, s);

  const hospProfessionals = [
    { name: "Varun Mehrotra", slug: "varun-mehrotra-wedding-planner", professionType: "Luxury Wedding Director & Creative Event Producer", about: "14+ years producing grand royal destination weddings in Varanasi, Udaipur, and Jaipur.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", experienceYears: 14 },
    { name: "Deepali Kapoor", slug: "deepali-kapoor-floral-designer", professionType: "Celebrity Stage & Floral Designer", about: "10+ years creating breathtaking mandap florals, exotic imported carnations, and bespoke theme decors.", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop", experienceYears: 10 }
  ];
  for (const pr of hospProfessionals) await seedProfessional(7845, pr);

  const hospCourses = [
    { name: "Event Management & Luxury Wedding Planning Certification", slug: "event-management-luxury-wedding-planning", code: "HSP-101", description: "Vendor contracts, budget breakdown, stage decor blueprints, artist booking, and live event coordination.", image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=500&fit=crop" }
  ];
  for (const cr of hospCourses) await seedCourse(7845, cr);

  // =========================================================================
  // 12. HOME SERVICES & MAINTENANCE (Category 7852)
  // Has: services, products, professionals, courses, events (NO vehicles, NO property!)
  // =========================================================================
  console.log("-> Seeding [Home Services & Maintenance] (7852)...");
  const homeServices = [
    { name: "Split AC Deep Jet Servicing & Gas Leakage Repair", slug: "split-ac-deep-jet-servicing-repair", description: "High-pressure jet pump cleaning of indoor coil and outdoor unit, gas pressure check, and drainage sanitization.", price: 699, image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=600&fit=crop" },
    { name: "Complete 3 BHK Deep House Cleaning & Floor Buffing", slug: "complete-3bhk-deep-house-cleaning", description: "Machine scrub floor buffing, bathroom descaling, kitchen chimney degreasing, and balcony sanitization.", price: 2999, image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=600&fit=crop" },
    { name: "Rooftop Solar Panel Installation & Inverter Wiring Setup", slug: "rooftop-solar-panel-inverter-wiring", description: "Complete on-grid/hybrid rooftop solar plant mounting, bi-directional net meter wiring, and inverter commissioning.", price: 5500, image: "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=600&h=600&fit=crop" },
    { name: "Bathroom Pipe Leakage Detection & Hydrojet Plumbing", slug: "bathroom-leakage-detection-plumbing", description: "Ultrasound concealed pipe leak detection, fixture replacement, and high-pressure drain line unclogging.", price: 899, image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop" }
  ];
  for (const s of homeServices) await seedService(7852, s);

  const homeProducts = [
    { name: "Kent Grand Plus 9-Stage Domestic RO + UV Water Purifier", slug: "kent-grand-plus-ro-water-purifier", description: "Mineral ROTM technology with in-tank UV disinfection that retains essential natural minerals in drinking water.", price: 14500, image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop" },
    { name: "Havells 16A Smart WiFi Heavy Appliance Modular Switch", slug: "havells-16a-smart-wifi-modular-switch", description: "Voice and smartphone controlled smart switch for ACs and geysers with timer schedule and energy monitor.", price: 1150, image: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&h=600&fit=crop" }
  ];
  for (const pr of homeProducts) await seedProduct(7852, pr);

  const homeProfessionals = [
    { name: "Rameshwar Prasad", slug: "rameshwar-prasad-master-electrician", professionType: "Licensed Master Electrician & Solar Installer", about: "16+ years experience in 3-phase commercial wiring, solar inverter setups, and short circuit fault troubleshooting.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", experienceYears: 16 },
    { name: "Dharmendra Yadav", slug: "dharmendra-yadav-hvac-technician", professionType: "Certified HVAC AC & Heat Pump Technician", about: "11+ years troubleshooting Daikin, Voltas, and LG inverter air conditioning systems, PCB repairs, and gas charging.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop", experienceYears: 11 }
  ];
  for (const pr of homeProfessionals) await seedProfessional(7852, pr);

  const homeCourses = [
    { name: "HVAC Air Conditioning & Inverter Refrigeration Technician Course", slug: "hvac-ac-refrigeration-technician-course", code: "HME-101", description: "Hands-on PCB diagnosis, copper brazing, vacuumization, multi-split VRV systems, and fault finding.", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=500&fit=crop" },
    { name: "Domestic Electrical Wiring & Rooftop Solar Installation Training", slug: "domestic-electrical-wiring-solar-training", code: "HME-201", description: "MCB/DB board installation, earthing standards, net metering paperwork, and solar panel array setup.", image: "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800&h=500&fit=crop" }
  ];
  for (const cr of homeCourses) await seedCourse(7852, cr);

  const homeEvents = [
    { title: "Safe Home: Electrical Safety & Fire Prevention Camp", slug: "safe-home-electrical-safety-camp", description: "Free community inspection camp for household circuit overloads, earthing testing, and child-safe socket covers.", masterCatId: 350, price: 0, image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=600&fit=crop" },
    { title: "Solar Rooftop Energy & Net Metering Awareness Drive", slug: "solar-rooftop-energy-awareness-drive", description: "Guidance on PM Surya Ghar Muft Bijli Yojana, central subsidy calculations, and zero electricity bill transition.", masterCatId: 350, price: 0, image: "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=1200&h=600&fit=crop" }
  ];
  for (const ev of homeEvents) await seedEvent(7852, ev);

  console.log("\n All 12 categories seeded successfully with 3-5 items across all allowed verticals!");
  await pool.end();
}

main().catch(err => {
  console.error("Fatal error during seeding:", err);
  pool.end();
});
