require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

// 5 Stores for each of the 12 Main Business Categories in Varanasi
const STORES_DATA = [
  // ==========================================
  // 1. Healthcare & Medical (7765)
  // ==========================================
  {
    category_id: 7765,
    subcategory_id: 7767, // Hospitals
    name: "Kashi Medanta Super-Speciality Hospital",
    business_type: "Hospital",
    locality: "Sigra",
    address: "B-27/45, Vidyapeeth Road, Near Stadium, Sigra, Varanasi",
    postal_code: "221002",
    phone: "+91 98381 21001",
    email: "care@kashimedanta.com",
    established_year: 2014,
    tagline: "24x7 Advanced Emergency, Trauma & Multispeciality Care",
    about: "Kashi Medanta is a premier 150-bed multi-speciality tertiary healthcare facility in Sigra, providing cutting-edge cardiology, neurology, orthopedics, and 24x7 critical care in Varanasi."
  },
  {
    category_id: 7765,
    subcategory_id: 7766, // Clinics & Poly Clinics
    name: "Apex Polyclinic & Family Healthcare",
    business_type: "Clinic",
    locality: "Lanka",
    address: "Plot 12, Malviya Market, Opposite BHU Main Gate, Lanka, Varanasi",
    postal_code: "221005",
    phone: "+91 98382 31002",
    email: "info@apexpolyclinic.in",
    established_year: 2018,
    tagline: "Trusted Family Doctors & Diagnostic Consultations",
    about: "Apex Polyclinic offers daily OPD consultations by top general physicians, pediatricians, gynecologists, and digital diagnostics near BHU Lanka."
  },
  {
    category_id: 7765,
    subcategory_id: 7768, // Dental Clinics
    name: "Banaras Pearl Dental Care & Implant Center",
    business_type: "Dental Clinic",
    locality: "Bhelupur",
    address: "Shop 4, Vinayak Complex, Near Kamachha Crossing, Bhelupur, Varanasi",
    postal_code: "221010",
    phone: "+91 98383 41003",
    email: "smile@banaraspearldental.com",
    established_year: 2016,
    tagline: "Painless Laser Dentistry & Digital Smile Design",
    about: "Comprehensive dental clinic specializing in root canals, painless tooth extractions, zirconia crowns, braces, and dental implants in Bhelupur."
  },
  {
    category_id: 7765,
    subcategory_id: 7769, // Pharmacies & Medical Stores
    name: "Sanjivani 24x7 Chemist & Surgicals",
    business_type: "Pharmacy Store",
    locality: "Pandeypur",
    address: "18 Hukulganj Main Road, Near Police Chowki, Pandeypur, Varanasi",
    postal_code: "221002",
    phone: "+91 98384 51004",
    email: "sanjivani.pandeypur@gmail.com",
    established_year: 2012,
    tagline: "100% Genuine Medicines & Life-Saving Injections Round the Clock",
    about: "Licensed round-the-clock retail and wholesale pharmacy dispensing branded pharmaceuticals, cold-chain vaccines, surgical supplies, and patient mobility aids."
  },
  {
    category_id: 7765,
    subcategory_id: 7770, // Diagnostic Centers & Labs
    name: "Surya Digital Path Lab & Imaging Center",
    business_type: "Diagnostic Center",
    locality: "Durgakund",
    address: "Ground Floor, Tulsi Towers, Near Durgakund Temple, Varanasi",
    postal_code: "221005",
    phone: "+91 98385 61005",
    email: "reports@suryapathlabs.com",
    established_year: 2019,
    tagline: "NABL Accredited Diagnostics with Same-Day Online Reports",
    about: "Full-service diagnostic center offering digital X-ray, 4D ultrasound, automated blood pathology, hormone profiling, and home sample collection."
  },

  // ==========================================
  // 2. Salons & Personal Care (7774)
  // ==========================================
  {
    category_id: 7774,
    subcategory_id: 7775, // Hair & Beauty Salons
    name: "Enrich Unisex Salon & Bridal Studio",
    business_type: "Salon",
    locality: "Mahmoorganj",
    address: "1st Floor, City Center Mall, Mahmoorganj Road, Varanasi",
    postal_code: "221010",
    phone: "+91 98386 12001",
    email: "hello@enrichvaranasi.com",
    established_year: 2017,
    tagline: "High-Fashion Hair Makeovers & Luxury Bridal Dressing",
    about: "Award-winning hair styling and makeup studio with certified stylists offering keratin treatments, balayage, botanical facials, and HD bridal packages."
  },
  {
    category_id: 7774,
    subcategory_id: 7776, // Beauty Parlours
    name: "Roop Milan Herbal Beauty Lounge",
    business_type: "Beauty Parlour",
    locality: "Sigra",
    address: "Shop 12, Kuber Complex, Rathyatra-Sigra Road, Varanasi",
    postal_code: "221002",
    phone: "+91 98387 22002",
    email: "roopmilan.sigra@gmail.com",
    established_year: 2015,
    tagline: "Organic Skin Therapies & Traditional Ubtan Rituals",
    about: "Exclusive women's beauty parlour specializing in chemical-free Ayurvedic facials, threading, waxing, hair spa, and bridal skin rejuvenation."
  },
  {
    category_id: 7774,
    subcategory_id: 7777, // Spas & Massage Centers
    name: "Ananda Ayurvedic Spa & Wellness Retreat",
    business_type: "Spa",
    locality: "Ravindrapuri",
    address: "Lane 3, B-Block, Near Anand Park, Ravindrapuri, Varanasi",
    postal_code: "221005",
    phone: "+91 98388 32003",
    email: "anandaspavaranasi@gmail.com",
    established_year: 2020,
    tagline: "Holistic Panchakarma, Shirodhara & Deep Tissue Massage",
    about: "Tranquil wellness spa delivering authentic Kerala Ayurvedic massages, herbal steam detox, aromatherapy, and chronic stress relief therapy."
  },
  {
    category_id: 7774,
    subcategory_id: 7775, // Hair & Beauty Salons
    name: "Classic Cuts Men's Grooming Lounge",
    business_type: "Grooming Lounge",
    locality: "Lanka",
    address: "Opposite Sankat Mochan Road Crossing, Lanka, Varanasi",
    postal_code: "221005",
    phone: "+91 98389 42004",
    email: "classiccuts.bhu@gmail.com",
    established_year: 2019,
    tagline: "Precision Haircuts, Beard Sculpting & Men's Skin Detox",
    about: "Modern barbershop and grooming destination offering contemporary fades, hot towel shaves, charcoal beard spas, and scalp therapy."
  },
  {
    category_id: 7774,
    subcategory_id: 7776, // Beauty Parlours
    name: "Shahnaz Herbal Care & Makeover Studio",
    business_type: "Makeover Studio",
    locality: "Rathyatra",
    address: "Shop 5, Rathyatra Crossing, Opposite Petrol Pump, Varanasi",
    postal_code: "221010",
    phone: "+91 98390 52005",
    email: "shahnazcare.varanasi@gmail.com",
    established_year: 2013,
    tagline: "Celebrity Makeup Artists & Advanced Skin Rejuvenation",
    about: "Renowned beauty center specializing in pre-bridal glow rituals, party makeovers, gold facials, and anti-aging therapies."
  },

  // ==========================================
  // 3. Food, Dining & Cafes (7782)
  // ==========================================
  {
    category_id: 7782,
    subcategory_id: 7783, // Fine Dining Restaurants
    name: "The Royal Kashi Darbar & Family Restaurant",
    business_type: "Restaurant",
    locality: "Cantonment",
    address: "14 Mall Road, Near Hotel Taj Ganges, Cantonment, Varanasi",
    postal_code: "221002",
    phone: "+91 98381 13001",
    email: "dine@kashidarbar.com",
    established_year: 2011,
    tagline: "Authentic Awadhi Biryani, Mughlai Gravies & Tandoori Feasts",
    about: "Celebrated fine-dining establishment offering royal heritage ambiance, live classical music, and rich Awadhi and North Indian cuisine."
  },
  {
    category_id: 7782,
    subcategory_id: 7784, // Cafes & Coffee Shops
    name: "Assi Riverfront Cafe & Roastery",
    business_type: "Cafe",
    locality: "Assi Ghat",
    address: "Plot 2, Ghat Promenade, Near Subah-e-Banaras Stage, Assi Ghat, Varanasi",
    postal_code: "221005",
    phone: "+91 98382 23002",
    email: "hello@assiriverfrontcafe.com",
    established_year: 2018,
    tagline: "Artisan Pour-Over Coffees, Wood-Fired Pizza & Sunrise Ghat Views",
    about: "Scenic riverside cafe loved by travelers and locals for specialty single-origin coffees, fresh sourdough paninis, cold brews, and peaceful Ganges views."
  },
  {
    category_id: 7782,
    subcategory_id: 7785, // Bakeries & Cake Shops
    name: "Golden Crust European Bakery & Patisserie",
    business_type: "Bakery",
    locality: "Godowlia",
    address: "Shop 16, Girja Ghar Crossing, Godowlia, Varanasi",
    postal_code: "221001",
    phone: "+91 98383 33003",
    email: "orders@goldencrustvaranasi.com",
    established_year: 2016,
    tagline: "Fresh Artisan Breads, French Macarons & Customized Fondant Cakes",
    about: "Artisanal bakery crafting 100% pure vegetarian cakes, Belgian chocolate pastries, freshly baked croissants, and celebratory wedding tiers."
  },
  {
    category_id: 7782,
    subcategory_id: 7783, // Fine Dining Restaurants
    name: "Varanasi Rasoi Pure Vegetarian Thali",
    business_type: "Vegetarian Restaurant",
    locality: "Lanka",
    address: "BHU Main Road, Opposite Trauma Center, Lanka, Varanasi",
    postal_code: "221005",
    phone: "+91 98384 43004",
    email: "varanasirasoi@gmail.com",
    established_year: 2013,
    tagline: "Unlimited Royal Rajasthani & Banarasi Sattvic Thali",
    about: "Traditional pure vegetarian restaurant known for pure ghee preparation, authentic Baati Chokha, Malai Kofta, Kheer, and warm hospitality."
  },
  {
    category_id: 7782,
    subcategory_id: 7784, // Cafes & Coffee Shops
    name: "Chai Charcha & Street Bites",
    business_type: "Bistro Cafe",
    locality: "Bhelupur",
    address: "Shankuldhara Pokhra Road, Bhelupur, Varanasi",
    postal_code: "221010",
    phone: "+91 98385 53005",
    email: "chaicharcha.vns@gmail.com",
    established_year: 2021,
    tagline: "Kulhad Masala Tea, Banarasi Bun Makkhan & Quick Bites",
    about: "Vibrant youth hangout serving 15 varieties of fragrant kulhad teas, loaded fries, peri-peri burgers, and traditional Banarasi snacks."
  },

  // ==========================================
  // 4. Retail & Shopping (7791)
  // ==========================================
  {
    category_id: 7791,
    subcategory_id: 7793, // Clothing & Fashion Apparel
    name: "Kashi Zari & Silk Handloom Emporium",
    business_type: "Silk Saree Showroom",
    locality: "Chowk",
    address: "K-37/22, Thatheri Bazaar Road, Chowk, Varanasi",
    postal_code: "221001",
    phone: "+91 98386 14001",
    email: "sales@kashizarisilks.com",
    established_year: 1998,
    tagline: "Direct Weaver Bridal Banarasi Sarees, Lehengas & Brocades",
    about: "Historic handloom showroom with GI-certified pure Katan silk sarees, real gold and silver zari brocades, and designer bridal collections."
  },
  {
    category_id: 7791,
    subcategory_id: 7794, // Electronics & Mobile Stores
    name: "Apex Electronics & Smart Gadgets Megastore",
    business_type: "Electronics Store",
    locality: "Lahurabir",
    address: "Apex House, Opposite Arya Mahila College, Lahurabir, Varanasi",
    postal_code: "221001",
    phone: "+91 98387 24002",
    email: "support@apexelectronics.in",
    established_year: 2012,
    tagline: "Smart TVs, Inverters, Laptops & Mobile Phones with Best Price Guarantee",
    about: "Authorized multibrand electronics dealer carrying Sony, Samsung, LG, Apple, and Dell with genuine company warranty and zero-percent finance."
  },
  {
    category_id: 7791,
    subcategory_id: 7792, // Supermarkets & Groceries
    name: "Metro Daily Supermarket & Organic Hub",
    business_type: "Supermarket",
    locality: "Sigra",
    address: "Lower Ground, Sigra Central Plaza, Near Nagar Nigam, Varanasi",
    postal_code: "221002",
    phone: "+91 98388 34003",
    email: "care@metrodailyvns.com",
    established_year: 2017,
    tagline: "Complete FMCG, Fresh Farm Produce & Imported Groceries",
    about: "Modern air-conditioned supermarket stocking farm-fresh vegetables, organic staples, packaged gourmet food, household goods, and toiletries."
  },
  {
    category_id: 7791,
    subcategory_id: 7793, // Clothing & Fashion Apparel
    name: "Varanasi Trends Men's Ethnic & Suiting",
    business_type: "Men's Apparel Store",
    locality: "Orderly Bazaar",
    address: "Shop 18, Jail Road, Orderly Bazaar, Varanasi",
    postal_code: "221002",
    phone: "+91 98389 44004",
    email: "trends.orderly@gmail.com",
    established_year: 2019,
    tagline: "Royal Sherwanis, Kurta Pajama Sets & Custom Tailoring",
    about: "Premier menswear showroom offering Raymond fine suiting fabrics, designer wedding sherwanis, bandhgalas, and bespoke bespoke master tailoring."
  },
  {
    category_id: 7791,
    subcategory_id: 7794, // Electronics & Mobile Stores
    name: "Digital World Mobile & Laptop Care",
    business_type: "Mobile Store & Service",
    locality: "Godowlia",
    address: "Shop 7, Main Chowk-Godowlia Road, Near Dasaswamedh, Varanasi",
    postal_code: "221001",
    phone: "+91 98390 54005",
    email: "digitalworld.godowlia@gmail.com",
    established_year: 2015,
    tagline: "Latest 5G Smartphones, Macbooks & Instant Screen Replacement",
    about: "One-stop tech shop for top smartphone brands, premium mobile accessories, original screen replacements, and motherboard repair."
  },

  // ==========================================
  // 5. Automotive & Transport (7800)
  // ==========================================
  {
    category_id: 7800,
    subcategory_id: 7801, // Car Repair & Garages
    name: "Banaras Bosch Car Service & Multi-Brand Garage",
    business_type: "Car Garage & Service Center",
    locality: "Shivpur",
    address: "Plot 45, NH-31 Airport Bypass Road, Shivpur, Varanasi",
    postal_code: "221003",
    phone: "+91 98381 15001",
    email: "service@banarasbosch.com",
    established_year: 2015,
    tagline: "Computerized Scanning, Engine Overhaul & AC Service",
    about: "Advanced multi-brand automobile workshop equipped with computerized wheel alignment, automatic dent-paint booth, and genuine spares."
  },
  {
    category_id: 7800,
    subcategory_id: 7803, // Car Dealerships & Showrooms
    name: "Kashi Motors Certified Pre-Owned Cars",
    business_type: "Car Dealership",
    locality: "Cantonment",
    address: "NH-2 Bypass Road, Near Cantt Flyover, Cantonment, Varanasi",
    postal_code: "221002",
    phone: "+91 98382 25002",
    email: "sales@kashimotorscertified.com",
    established_year: 2017,
    tagline: "150-Point Quality Checked Used Cars with 1-Year Warranty",
    about: "Varanasi's trusted pre-owned automobile dealership offering verified non-accidental SUVs, sedans, and hatchbacks with instant RC transfer."
  },
  {
    category_id: 7800,
    subcategory_id: 7802, // Two-Wheeler Service Centers
    name: "SpeedZone Superbike & Two-Wheeler Clinic",
    business_type: "Two Wheeler Service",
    locality: "Pandeypur",
    address: "Plot 8, Azamgarh Road, Near Pandeypur Chauraha, Varanasi",
    postal_code: "221002",
    phone: "+91 98383 35003",
    email: "speedzonevns@gmail.com",
    established_year: 2019,
    tagline: "Expert Tuning, FI Diagnostics & Teflon Coating for Bikes",
    about: "Specialized service facility for sports motorcycles, Royal Enfield cruisers, and commuter scooters with foam washing and genuine engine oils."
  },
  {
    category_id: 7800,
    subcategory_id: 7801, // Car Repair & Garages
    name: "Varanasi Express Detailing & Ceramic Coatings",
    business_type: "Auto Detailing Studio",
    locality: "Lahartara",
    address: "Near Lahartara Baoli Crossing, Manduadih Road, Varanasi",
    postal_code: "221002",
    phone: "+91 98384 45004",
    email: "expressdetailingvns@gmail.com",
    established_year: 2020,
    tagline: "9H Nano Ceramic Coating, PPF & Premium Interior Dry-Cleaning",
    about: "Professional vehicle aesthetic center delivering paint protection film (PPF), graphene coatings, headlight restoration, and steam interior sanitization."
  },
  {
    category_id: 7800,
    subcategory_id: 7803, // Car Dealerships & Showrooms
    name: "EcoDrive Electric Vehicles & Battery Hub",
    business_type: "EV Showroom",
    locality: "Sarnath Road",
    address: "Near Sarnath Museum Crossing, Ashoka Road, Varanasi",
    postal_code: "221007",
    phone: "+91 98385 55005",
    email: "ecodrive.varanasi@gmail.com",
    established_year: 2021,
    tagline: "Certified Electric Scooters, E-Rickshaws & Lithium Batteries",
    about: "Eco-friendly mobility showroom displaying high-speed electric 2-wheelers, solar e-rickshaws, fast chargers, and battery replacement warranties."
  },

  // ==========================================
  // 6. Fitness & Sports (7808)
  // ==========================================
  {
    category_id: 7808,
    subcategory_id: 7809, // Gyms & Fitness Centers
    name: "IronCore Crossfit & High-Intensity Gym",
    business_type: "Gym",
    locality: "Sigra",
    address: "3rd Floor, Metro Plaza, Opposite Vidyapeeth, Sigra, Varanasi",
    postal_code: "221002",
    phone: "+91 98386 16001",
    email: "join@ironcorefitness.com",
    established_year: 2018,
    tagline: "Strength Training, Kettlebell Crossfit & Body Transformation",
    about: "State-of-the-art gym with imported biomechanical strength equipment, certified personal trainers, and steam room facilities in Sigra."
  },
  {
    category_id: 7808,
    subcategory_id: 7810, // Yoga & Pilates Studios
    name: "Kashi Yoga Ashram & Pranic Wellness Studio",
    business_type: "Yoga Studio",
    locality: "Assi Ghat",
    address: "Ganga View Terraces, Near Tulsi Ghat Steps, Assi, Varanasi",
    postal_code: "221005",
    phone: "+91 98387 26002",
    email: "om@kashiyogaashram.org",
    established_year: 2014,
    tagline: "Traditional Hatha, Ashtanga Yoga & Pranayama Meditation",
    about: "Authentic yoga school providing sunrise rooftop classes, therapeutic yoga for back pain, sound bath healing, and certified instructor courses."
  },
  {
    category_id: 7808,
    subcategory_id: 7809, // Gyms & Fitness Centers
    name: "Gold Standard Fitness & Zumba Club",
    business_type: "Fitness Club",
    locality: "Mahmoorganj",
    address: "Plot 19, Shivaji Nagar, Mahmoorganj, Varanasi",
    postal_code: "221010",
    phone: "+91 98388 36003",
    email: "goldstandardvns@gmail.com",
    established_year: 2017,
    tagline: "Cardio Kickboxing, Aerobics & Diet Nutrition Consultations",
    about: "Spacious community fitness club offering energetic Zumba sessions, cardio theatre, weight loss bootcamps, and certified sports nutritionists."
  },
  {
    category_id: 7808,
    subcategory_id: 7811, // Swimming Academies
    name: "AquaSplash Swimming Academy & Sports Club",
    business_type: "Swimming Academy",
    locality: "Lanka",
    address: "Near Hyderabad Gate, Sunderpur-Lanka Road, Varanasi",
    postal_code: "221005",
    phone: "+91 98389 46004",
    email: "aquasplash.vns@gmail.com",
    established_year: 2019,
    tagline: "Temperature-Controlled Indoor Pool & Competitive Coaching",
    about: "Modern aquatic academy offering all-weather indoor swimming, beginner coaching for kids and adults, and certified lifeguard supervision."
  },
  {
    category_id: 7808,
    subcategory_id: 7809, // Gyms & Fitness Centers
    name: "ProPulse MMA & Martial Arts Dojo",
    business_type: "Martial Arts Studio",
    locality: "Durgakund",
    address: "2nd Floor, Sai Complex, Kabir Nagar Road, Durgakund, Varanasi",
    postal_code: "221005",
    phone: "+91 98390 56005",
    email: "propulsemma@gmail.com",
    established_year: 2020,
    tagline: "Mixed Martial Arts, Boxing & Women's Self Defense",
    about: "Combat sports academy training youth in Brazilian Jiu-Jitsu, Muay Thai boxing, wrestling, functional agility, and practical self-defense."
  },

  // ==========================================
  // 7. Education & Coaching (7816)
  // ==========================================
  {
    category_id: 7816,
    subcategory_id: 7817, // Coaching & Tuition Institutes
    name: "Vidya Mandir IIT-JEE & NEET Academy",
    business_type: "Coaching Institute",
    locality: "Durgakund",
    address: "B-14/80, Main Durgakund Road, Near Sankat Mochan Crossing, Varanasi",
    postal_code: "221005",
    phone: "+91 98381 17001",
    email: "admissions@vidyamandirvns.com",
    established_year: 2010,
    tagline: "Premier Engineering & Medical Entrance Prep with Proven Top Ranks",
    about: "Renowned academic coaching institution with experienced ex-IITian faculty, comprehensive test series, library facilities, and doubt-clearing sessions."
  },
  {
    category_id: 7816,
    subcategory_id: 7817, // Coaching & Tuition Institutes
    name: "Achievers IAS & Civil Services Hub",
    business_type: "Civil Services Academy",
    locality: "Lanka",
    address: "3rd Floor, Shanti Complex, Ravindrapuri Extension, Lanka, Varanasi",
    postal_code: "221005",
    phone: "+91 98382 27002",
    email: "contact@achieversiasvns.com",
    established_year: 2015,
    tagline: "Comprehensive UPSC & UPPSC Mentorship by Retired Bureaucrats",
    about: "Top-tier civil services coaching academy offering regular mains answer writing workshops, current affairs analysis, and mock interview panels."
  },
  {
    category_id: 7816,
    subcategory_id: 7818, // Schools & Daycares
    name: "Ganga Valley International Pre-School & Daycare",
    business_type: "Play School",
    locality: "Sigra",
    address: "Plot 3, Nagar Nigam Colony, Behind IP Mall, Sigra, Varanasi",
    postal_code: "221002",
    phone: "+91 98383 37003",
    email: "admissions@gangavalleykids.com",
    established_year: 2018,
    tagline: "Montessori Activity-Based Learning in a Safe CCTV-Monitored Campus",
    about: "Child-centric preschool and kindergarten fostering early childhood development through sensory play, phonics, music, and after-school daycare."
  },
  {
    category_id: 7816,
    subcategory_id: 7817, // Coaching & Tuition Institutes
    name: "Commerce Point CA & CS Foundation Classes",
    business_type: "Commerce Coaching",
    locality: "Pandeypur",
    address: "2nd Floor, Central Plaza, Pandeypur Chauraha, Varanasi",
    postal_code: "221002",
    phone: "+91 98384 47004",
    email: "commercepointvns@gmail.com",
    established_year: 2016,
    tagline: "Class 11-12 Commerce, CA Foundation & CMA Prep",
    about: "Dedicated commerce coaching center providing conceptually rigorous training in accountancy, taxation, business law, and cost management."
  },
  {
    category_id: 7816,
    subcategory_id: 7817, // Coaching & Tuition Institutes
    name: "Oxford Institute of Spoken English & Foreign Languages",
    business_type: "Language Institute",
    locality: "Orderly Bazaar",
    address: "Shop 10, Civil Lines Commercial Center, Orderly Bazaar, Varanasi",
    postal_code: "221002",
    phone: "+91 98385 57005",
    email: "oxfordinstitutevns@gmail.com",
    established_year: 2014,
    tagline: "IELTS / TOEFL Prep, Corporate Communication & French Classes",
    about: "Language training center empowering students and professionals with accent neutralization, interview preparation, and foreign language fluency."
  },

  // ==========================================
  // 8. Real Estate & Construction (7824)
  // ==========================================
  {
    category_id: 7824,
    subcategory_id: 7825, // Real Estate Agencies
    name: "Kashi Prime Realty & Housing Consultants",
    business_type: "Real Estate Agency",
    locality: "Cantonment",
    address: "Suite 204, Kashi Trade Tower, Mint House Road, Cantonment, Varanasi",
    postal_code: "221002",
    phone: "+91 98386 18001",
    email: "properties@kashiprimerealty.com",
    established_year: 2015,
    tagline: "Verified Residential Plots, Luxury Apartments & Commercial Leases",
    about: "Leading real estate advisory facilitating seamless purchase, sale, and leasing of RERA-approved flats, townships, and commercial spaces in Varanasi."
  },
  {
    category_id: 7824,
    subcategory_id: 7826, // Builders & Developers
    name: "Purvanchal Dream Homes & Builders",
    business_type: "Builder & Developer",
    locality: "Shivpur",
    address: "Ground Floor, Shivpur Highway Commercial Hub, Varanasi",
    postal_code: "221003",
    phone: "+91 98387 28002",
    email: "info@purvanchaldreamhomes.com",
    established_year: 2012,
    tagline: "Gated Townships with 100% Legal Clearances and Modern Amenities",
    about: "Trusted construction firm building earthquake-resistant residential colonies, duplex villas, and premium gated apartments across Ring Road."
  },
  {
    category_id: 7824,
    subcategory_id: 7827, // Architecture & Interior Design Firms
    name: "Varanasi Vastu & Architectural Design Studio",
    business_type: "Architecture Firm",
    locality: "Mahmoorganj",
    address: "3rd Floor, Surya Landmark, Near Akashvani, Mahmoorganj, Varanasi",
    postal_code: "221010",
    phone: "+91 98388 38003",
    email: "studio@varanasivastu.com",
    established_year: 2018,
    tagline: "Vastu-Compliant 3D Building Plans & Turnkey Luxury Interiors",
    about: "Registered architectural consultancy delivering innovative residential floorplans, 3D elevation renderings, landscape architecture, and modular interiors."
  },
  {
    category_id: 7824,
    subcategory_id: 7825, // Real Estate Agencies
    name: "Ganga Green Land & Farmhouse Realtors",
    business_type: "Land Property Consultants",
    locality: "Sigra",
    address: "Shop 14, Commercial Complex, Vidyapeeth Road, Sigra, Varanasi",
    postal_code: "221002",
    phone: "+91 98389 48004",
    email: "gangagreenland@gmail.com",
    established_year: 2019,
    tagline: "Prime Agricultural Land, Ring Road Commercial Plots & Farmhouses",
    about: "Specialists in verified registry plots, highway roadside lands, and investment-grade farmhouses with clear title verification."
  },
  {
    category_id: 7824,
    subcategory_id: 7826, // Builders & Developers
    name: "Heritage Infra Projects & Civil Contractors",
    business_type: "Civil Contractor",
    locality: "Pandeypur",
    address: "Plot 22, Premchand Nagar Road, Pandeypur, Varanasi",
    postal_code: "221002",
    phone: "+91 98390 58005",
    email: "heritageinfra.vns@gmail.com",
    established_year: 2017,
    tagline: "Quality RCC Construction, Structural Renovation & Boundary Walls",
    about: "Turnkey building contractors handling residential house construction, commercial complexes, structural reinforcement, and waterproofing."
  },

  // ==========================================
  // 9. IT & Digital Agencies (7831)
  // ==========================================
  {
    category_id: 7831,
    subcategory_id: 7832, // Software Development Agencies
    name: "Kashi CloudSoft Technologies",
    business_type: "Software Company",
    locality: "Mahmoorganj",
    address: "Tower B, 4th Floor, IT Horizon Park, Mahmoorganj, Varanasi",
    postal_code: "221010",
    phone: "+91 98381 19001",
    email: "contact@kashicloudsoft.com",
    established_year: 2017,
    tagline: "Custom Web Applications, SaaS Platforms & Mobile Apps",
    about: "Full-cycle digital product engineering firm developing high-performance React/Node web platforms, iOS/Android apps, and ERP solutions."
  },
  {
    category_id: 7831,
    subcategory_id: 7834, // Digital Marketing & SEO
    name: "Digital Banaras Growth & SEO Agency",
    business_type: "Digital Marketing Agency",
    locality: "Sigra",
    address: "Suite 101, IP Mall Commercial Wing, Sigra, Varanasi",
    postal_code: "221002",
    phone: "+91 98382 29002",
    email: "grow@digitalbanaras.com",
    established_year: 2019,
    tagline: "Google Ads, Local Business SEO & High-ROI Social Media Marketing",
    about: "Results-driven performance marketing agency helping local stores, clinics, and brands dominate Google search and generate quality leads."
  },
  {
    category_id: 7831,
    subcategory_id: 7833, // Web Design & Development
    name: "WebCrafters Studio & E-Commerce Labs",
    business_type: "Web Design Studio",
    locality: "Lanka",
    address: "Plot 8, Saket Nagar, Near Naria Crossing, Lanka, Varanasi",
    postal_code: "221005",
    phone: "+91 98383 39003",
    email: "info@webcraftersvns.com",
    established_year: 2018,
    tagline: "Stunning Responsive Websites, Shopify Stores & UI/UX Design",
    about: "Creative digital agency specializing in conversion-focused Shopify storefronts, WordPress websites, and corporate digital branding."
  },
  {
    category_id: 7831,
    subcategory_id: 7832, // Software Development Agencies
    name: "Apex AI & Data Solutions",
    business_type: "AI & Data Solutions",
    locality: "Kutchery",
    address: "Opposite District Court Commercial Complex, Kutchery, Varanasi",
    postal_code: "221002",
    phone: "+91 98384 49004",
    email: "support@apexaidata.in",
    established_year: 2021,
    tagline: "Automation Workflows, CRM Integration & Intelligent Dashboards",
    about: "Enterprise technology company implementing custom CRM pipelines, WhatsApp automation bots, and data analytics dashboards for growing businesses."
  },
  {
    category_id: 7831,
    subcategory_id: 7833, // Web Design & Development
    name: "PixelWave Multimedia & Creative Hub",
    business_type: "Creative Agency",
    locality: "Maldahiya",
    address: "Shop 12, Commercial Market, Opposite Hotel Surya, Maldahiya, Varanasi",
    postal_code: "221002",
    phone: "+91 98385 59005",
    email: "hello@pixelwavemedia.com",
    established_year: 2016,
    tagline: "Corporate Video Ads, 3D Product Renders & Logo Design",
    about: "Full-service multimedia production studio crafting high-end commercial ad films, social media reels, graphic designs, and brand identities."
  },

  // ==========================================
  // 10. Professional & Financial Services (7838)
  // ==========================================
  {
    category_id: 7838,
    subcategory_id: 7839, // CA & Accounting Firms
    name: "Agrawal & Associates Chartered Accountants",
    business_type: "CA Firm",
    locality: "Kutchery",
    address: "Chamber 204, Legal & Corporate Tower, Kutchery, Varanasi",
    postal_code: "221002",
    phone: "+91 98386 10101",
    email: "tax@agrawalassociatesca.com",
    established_year: 2008,
    tagline: "Income Tax Audit, GST Filings, ROC Compliance & Company Incorporation",
    about: "Prominent chartered accountancy practice offering business taxation, internal audits, statutory balance sheet certifications, and financial due diligence."
  },
  {
    category_id: 7838,
    subcategory_id: 7840, // Law Firms & Legal Agencies
    name: "Varanasi Jurists Legal Advocates & Associates",
    business_type: "Law Firm",
    locality: "Rathyatra",
    address: "2nd Floor, Rathyatra Commercial Center, Mahmoorganj Road, Varanasi",
    postal_code: "221010",
    phone: "+91 98387 20102",
    email: "counsel@varanasijurists.com",
    established_year: 2012,
    tagline: "Civil Disputes, Property Title Verification & Corporate Contracts",
    about: "Senior legal team providing trusted courtroom representation, registry verification, commercial arbitration, and matrimonial counsel."
  },
  {
    category_id: 7838,
    subcategory_id: 7841, // Tax & Financial Consultancies
    name: "Kashi Wealth & Investment Advisory",
    business_type: "Financial Consultancy",
    locality: "Sigra",
    address: "Plot 15, Near Central Bank, Vidyapeeth Road, Sigra, Varanasi",
    postal_code: "221002",
    phone: "+91 98388 30103",
    email: "advisory@kashiwealth.com",
    established_year: 2017,
    tagline: "Mutual Funds, Portfolio Management, Retirement & Health Insurance",
    about: "AMFI-registered wealth management consultancy helping families and business owners build diversified portfolios with disciplined compounding."
  },
  {
    category_id: 7838,
    subcategory_id: 7841, // Tax & Financial Consultancies
    name: "Purvanchal Business Loans & MSME Funding Hub",
    business_type: "Loan Agency",
    locality: "Bhelupur",
    address: "Shop 9, Kamachha Crossing, Bhelupur, Varanasi",
    postal_code: "221010",
    phone: "+91 98389 40104",
    email: "loans@purvanchalmsme.com",
    established_year: 2019,
    tagline: "Quick Working Capital, Home Loans & Machinery Finance",
    about: "Direct selling agent partnering with 25+ top national banks and NBFCs for paperless mortgage loans, business credit lines, and government subsidies."
  },
  {
    category_id: 7838,
    subcategory_id: 7839, // CA & Accounting Firms
    name: "Prime Tax Consultants & GST Suvidha Kendra",
    business_type: "Tax Consultancy",
    locality: "Lahurabir",
    address: "Opposite Town Hall, Main Lahurabir Road, Varanasi",
    postal_code: "221001",
    phone: "+91 98390 50105",
    email: "primetaxvns@gmail.com",
    established_year: 2016,
    tagline: "Instant GST Registration, ITR e-Filing & MSME Udyam Certificates",
    about: "Authorized taxation helpdesk offering hassle-free bookkeeping, monthly return filings, trademark registrations, and digital signature tokens."
  },

  // ==========================================
  // 11. Hospitality & Events (7845)
  // ==========================================
  {
    category_id: 7845,
    subcategory_id: 7846, // Hotels & Resorts
    name: "The Royal Heritage Grand Hotel & Spa",
    business_type: "Hotel & Resort",
    locality: "Cantonment",
    address: "22 The Mall Road, Near Cantt Railway Station, Cantonment, Varanasi",
    postal_code: "221002",
    phone: "+91 98381 11201",
    email: "stay@royalheritagevns.com",
    established_year: 2013,
    tagline: "Luxury Suites, Fine Dining, Swimming Pool & 24hr Concierge",
    about: "5-star luxury heritage hotel set amidst lush green lawns, offering elegant royal suites, spa wellness, multicuisine dining, and airport pick-up."
  },
  {
    category_id: 7845,
    subcategory_id: 7847, // Banquet Halls & Party Lawns
    name: "Ganga Vatika Grand Banquet & Wedding Lawn",
    business_type: "Banquet Hall",
    locality: "Bada Lalpur",
    address: "Near Trade Facilitation Center, Bada Lalpur, Ring Road, Varanasi",
    postal_code: "221003",
    phone: "+91 98382 21202",
    email: "events@gangavatika.com",
    established_year: 2018,
    tagline: "Sprawling AC Banquets, Floral Mandap & 2000+ Guest Capacity",
    about: "Premier destination wedding venue featuring air-conditioned glass banquet halls, landscaped party lawns, luxury bridal suites, and ample valet parking."
  },
  {
    category_id: 7845,
    subcategory_id: 7848, // Event & Wedding Planners
    name: "Utsav Celebrations & Royal Wedding Planners",
    business_type: "Event Planner",
    locality: "Sigra",
    address: "Office 203, Rathyatra-Sigra Commercial Complex, Varanasi",
    postal_code: "221002",
    phone: "+91 98383 31203",
    email: "plan@utsavcelebrations.in",
    established_year: 2016,
    tagline: "Theme Decor, Royal Baraat, Destination Weddings & Celebrity Artists",
    about: "Full-service luxury event management company executing memorable royal weddings, corporate award summits, Haldi/Mehendi setups, and sound & light shows."
  },
  {
    category_id: 7845,
    subcategory_id: 7846, // Hotels & Resorts
    name: "Kashi Riverside Palace & Heritage Homestay",
    business_type: "Heritage Hotel",
    locality: "Assi Ghat",
    address: "B-2/18, Shivala Ghat Road, Near Assi Ghat, Varanasi",
    postal_code: "221005",
    phone: "+91 98384 41204",
    email: "booking@kashiriverside.com",
    established_year: 2017,
    tagline: "Breathtaking Ganga Sunrise Views, Rooftop Yoga & Authentic Banarasi Hospitality",
    about: "Charming boutique hotel located directly on the historical ghat steps with panoramic river balconies, antique brass decor, and traditional boat tours."
  },
  {
    category_id: 7845,
    subcategory_id: 7846, // Hotels & Resorts
    name: "Sarnath Serenity Buddhist Retreat & Resort",
    business_type: "Resort",
    locality: "Sarnath",
    address: "Dhamekh Stupa Road, Near Deer Park, Sarnath, Varanasi",
    postal_code: "221007",
    phone: "+91 98385 51205",
    email: "retreat@sarnathserenity.com",
    established_year: 2020,
    tagline: "Peaceful Meditation Cottages, Organic Dining & Stupa Walkways",
    about: "Serene resort destination nestled in peaceful spiritual surroundings, popular with international tourists, meditation pilgrims, and family retreats."
  },

  // ==========================================
  // 12. Home Services & Maintenance (7852)
  // ==========================================
  {
    category_id: 7852,
    subcategory_id: 7853, // AC Repair & Servicing
    name: "CoolCare Air Conditioning & Refrigeration Hub",
    business_type: "AC Service",
    locality: "Pandeypur",
    address: "Shop 11, Premchand Nagar Commercial Market, Pandeypur, Varanasi",
    postal_code: "221002",
    phone: "+91 98386 11301",
    email: "service@coolcarevns.com",
    established_year: 2015,
    tagline: "Split & Window AC Jet Cleaning, Gas Refilling & PCB Repair",
    about: "Prompt doorstep air conditioner repair and maintenance center serving all top brands (Voltas, Daikin, LG, Blue Star) with genuine spare parts warranty."
  },
  {
    category_id: 7852,
    subcategory_id: 7854, // Plumbing Services
    name: "QuickFix 24x7 Plumbers & Sanitation Experts",
    business_type: "Plumbing Service",
    locality: "Sigra",
    address: "Behind Nagar Nigam Office, Vidyapeeth Road, Sigra, Varanasi",
    postal_code: "221002",
    phone: "+91 98387 21302",
    email: "quickfixplumber@gmail.com",
    established_year: 2018,
    tagline: "Leakage Detection, Motor Installation, Water Tank Cleaning & Pipe Fitting",
    about: "Certified professional plumbing technicians providing 30-minute rapid response for pipeline blockages, bathroom sanitary fittings, and water pump repair."
  },
  {
    category_id: 7852,
    subcategory_id: 7855, // Electrical Maintenance
    name: "Varanasi PowerGrid Electricians & Inverter Solutions",
    business_type: "Electrical Services",
    locality: "Bhelupur",
    address: "Shop 6, Kamachha Main Road, Bhelupur, Varanasi",
    postal_code: "221010",
    phone: "+91 98388 31303",
    email: "powergridvns@gmail.com",
    established_year: 2016,
    tagline: "Complete House Concealed Wiring, Inverter Battery Setup & Short-Circuit Repair",
    about: "Licensed electricians offering safe residential and commercial electrical maintenance, MCB panel installation, surge protection, and solar inverters."
  },
  {
    category_id: 7852,
    subcategory_id: 7853, // AC Repair & Servicing
    name: "Shri Ganesh Home Appliance Care & RO Solutions",
    business_type: "Appliance Repair",
    locality: "Shivpur",
    address: "Near Shivpur Railway Crossing, Main Road, Varanasi",
    postal_code: "221003",
    phone: "+91 98389 41304",
    email: "shriganeshcare@gmail.com",
    established_year: 2019,
    tagline: "Washing Machine, Microwave, RO Water Purifier & Refrigerator Repair",
    about: "Trusted home appliance service center with factory-trained technicians repairing front-load washers, frost-free fridges, and domestic water purifiers."
  },
  {
    category_id: 7852,
    subcategory_id: 7855, // Electrical Maintenance
    name: "SmartShield Pest Control & Sanitization Hub",
    business_type: "Pest Control",
    locality: "Mahmoorganj",
    address: "Plot 30, Shivaji Nagar, Mahmoorganj, Varanasi",
    postal_code: "221010",
    phone: "+91 98390 51305",
    email: "contact@smartshieldpest.com",
    established_year: 2017,
    tagline: "Odorless Herbal Termite Treatment, Cockroach Gel & Bedbug Eradication",
    about: "Government-approved pest management service utilizing safe, eco-friendly odorless chemicals for residential apartments, restaurants, and warehouses."
  }
];

function generateSlug(name, locality) {
  const combined = `${name} ${locality} Varanasi`;
  return combined
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function run() {
  console.log(`Starting to seed 5 stores for each of the 12 business categories (Total ${STORES_DATA.length} stores)...`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const store of STORES_DATA) {
    const slug = generateSlug(store.name, store.locality);

    // Check if store with same name or slug already exists
    const existing = await pool.query(
      `SELECT id FROM business_profiles WHERE slug = $1 OR name = $2 LIMIT 1`,
      [slug, store.name]
    );

    if (existing.rows.length > 0) {
      const existingId = existing.rows[0].id;
      await pool.query(
        `UPDATE business_profiles
         SET category_id = $1,
             subcategory_id = $2,
             category_ids = $3,
             subcategory_ids = $4,
             business_type = $5,
             locality = $6,
             address = $7,
             postal_code = $8,
             phone = $9,
             whatsapp = $10,
             email = $11,
             tagline = $12,
             about = $13,
             established_year = $14,
             city = 'Varanasi',
             district = 'Varanasi',
             state = 'Uttar Pradesh',
             country_code = 'IN',
             is_verified = true,
             verification_status = 'verified',
             is_active = true,
             updated_at = NOW()
         WHERE id = $15`,
        [
          store.category_id,
          store.subcategory_id,
          [store.category_id],
          [store.subcategory_id],
          store.business_type,
          store.locality,
          store.address,
          store.postal_code,
          store.phone,
          store.phone, // whatsapp
          store.email,
          store.tagline,
          store.about,
          store.established_year,
          existingId
        ]
      );
      updatedCount++;
    } else {
      await pool.query(
        `INSERT INTO business_profiles (
           name,
           slug,
           category_id,
           subcategory_id,
           category_ids,
           subcategory_ids,
           business_type,
           country_code,
           state,
           district,
           city,
           locality,
           address,
           postal_code,
           phone,
           whatsapp,
           email,
           tagline,
           about,
           established_year,
           is_verified,
           verification_status,
           is_active,
           created_at,
           updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, 'IN', 'Uttar Pradesh', 'Varanasi', 'Varanasi', $8, $9, $10, $11, $12, $13, $14, $15, $16, true, 'verified', true, NOW(), NOW()
         )`,
        [
          store.name,
          slug,
          store.category_id,
          store.subcategory_id,
          [store.category_id],
          [store.subcategory_id],
          store.business_type,
          store.locality,
          store.address,
          store.postal_code,
          store.phone,
          store.phone,
          store.email,
          store.tagline,
          store.about,
          store.established_year
        ]
      );
      insertedCount++;
    }
  }

  console.log(`\n Seeding Complete!`);
  console.log(`- Inserted new stores: ${insertedCount}`);
  console.log(`- Updated existing stores: ${updatedCount}`);
  console.log(`- Total stores processed: ${STORES_DATA.length}`);

  // Verification report
  const summary = await pool.query(`
    SELECT c.name as category_name, COUNT(bp.id) as store_count
    FROM categories c
    JOIN business_profiles bp ON bp.category_id = c.id
    WHERE c.category_type = 'business' AND c.parent_id IS NULL AND bp.city ILIKE '%Varanasi%' AND COALESCE(bp.is_active, true) = true
    GROUP BY c.name, c.id
    ORDER BY c.id
  `);

  console.log("\n Stores per Business Category in Varanasi:");
  for (const row of summary.rows) {
    console.log(`   * ${row.category_name}: ${row.store_count} stores`);
  }
}

run().catch(console.error).finally(() => pool.end());
