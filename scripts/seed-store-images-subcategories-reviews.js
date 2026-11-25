require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

// Definition of 60 Stores with distinct pictures, 2-3 subcategories, and reviews
const STORES_ENHANCEMENT = [
  // ==========================================
  // 1. Healthcare & Medical (Category 7765)
  // ==========================================
  {
    name: "Kashi Medanta Super-Speciality Hospital",
    subcategories: [7767, 8722, 7766], // Hospitals, Multi-Speciality, Clinics
    logo: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Exceptional emergency care in Sigra", comment: "My father had a cardiac emergency and Kashi Medanta's emergency trauma team acted within minutes. World-class ICU and very supportive nursing staff." },
      { rating: 4.8, title: "Cleanest hospital in Varanasi", comment: "State-of-the-art diagnostic equipment and experienced doctors. The billing was completely transparent with TPA cashless insurance approval." },
      { rating: 4.5, title: "Highly skilled specialists", comment: "Consulted Dr. Verma for orthopedic knee replacement. Recovery was very quick and physiotherapy follow-ups were excellent." }
    ]
  },
  {
    name: "Apex Polyclinic & Family Healthcare",
    subcategories: [7766, 8738, 7770], // Clinics, Family Healthcare, Diagnostic
    logo: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Trusted family clinic near BHU", comment: "Very convenient for OPD consultations. Dr. Pandey gave thorough guidance for my child's viral fever without prescribing unnecessary medicines." },
      { rating: 4.7, title: "Quick digital pathology reports", comment: "Blood tests done in the morning and received verified WhatsApp reports by afternoon. Very hygienic clinic." }
    ]
  },
  {
    name: "Banaras Pearl Dental Care & Implant Center",
    subcategories: [7768, 8752, 8755], // Dental Clinics, Orthodontic, Dental Implant
    logo: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1629909615184-74f495363b67?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Painless root canal treatment", comment: "I was terrified of root canals but the laser procedure here at Bhelupur was completely painless. Modern German dental chair and very gentle dentists." },
      { rating: 4.8, title: "Great smile makeover", comment: "Got ceramic veneers and teeth whitening done before my brother's wedding. Really natural results!" }
    ]
  },
  {
    name: "Sanjivani 24x7 Chemist & Surgicals",
    subcategories: [7769, 8770, 8771], // Pharmacies, Medical Stores, Retail Pharmacies
    logo: "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.8, title: "Lifesaver at 2 AM", comment: "Needed critical nebulizer medicine and pediatric antibiotics past midnight in Pandeypur. They were open and had stock when no one else did." },
      { rating: 4.6, title: "Generous discounts on chronic medicines", comment: "Always gives 15% discount on regular monthly diabetes and BP medicines. Prompt home delivery as well." }
    ]
  },
  {
    name: "Surya Digital Path Lab & Imaging Center",
    subcategories: [7770, 8758, 8759], // Diagnostic, Labs, Pathology
    logo: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Accurate NABL accredited lab", comment: "Painless blood draw and verified thyroid profile reports. The phlebotomist who came for home collection in Durgakund was very courteous and punctual." },
      { rating: 4.7, title: "Advanced ultrasound imaging", comment: "Clear digital 4D sonography with detailed radiologist consultation. Best diagnostic lab near Durgakund." }
    ]
  },

  // ==========================================
  // 2. Salons & Personal Care (Category 7774)
  // ==========================================
  {
    name: "Enrich Unisex Salon & Bridal Studio",
    subcategories: [7775, 7776, 7777], // Salons, Parlours, Spas
    logo: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Best bridal makeup in Mahmoorganj", comment: "They did my wedding bridal makeup and hair styling. The HD look stayed flawless for over 12 hours. Everyone praised the natural glow!" },
      { rating: 4.8, title: "Great hair botox & balayage", comment: "Senior stylist Rohit completely revitalized my frizzy hair with professional botox treatment. Luxurious ambiance and premium L'Oreal products." }
    ]
  },
  {
    name: "Roop Milan Herbal Beauty Lounge",
    subcategories: [7776, 7775, 7777], // Parlours, Salons, Spas
    logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.7, title: "Pure herbal organic facials", comment: "Very gentle on sensitive skin. Their homemade saffron ubtan facial gave an instant natural glow without any chemicals." },
      { rating: 4.5, title: "Cozy women-only parlour in Sigra", comment: "Affordable waxing and threading packages. Clean towels, hygienic waxing strips, and pleasant staff." }
    ]
  },
  {
    name: "Ananda Ayurvedic Spa & Wellness Retreat",
    subcategories: [7777, 7775, 7776], // Spas, Salons, Parlours
    logo: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Authentic Kerala Shirodhara", comment: "The warm herbal oil stream on the forehead melted away weeks of work stress. Pure divine relaxation in Ravindrapuri." },
      { rating: 4.9, title: "Deep tissue massage for back relief", comment: "Trained therapists who understand pressure points. The herbal steam bath afterwards left me rejuvenated." }
    ]
  },
  {
    name: "Classic Cuts Men's Grooming Lounge",
    subcategories: [7775, 7776, 7777], // Salons, Parlours, Spas
    logo: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Sharpest fade haircut in Lanka", comment: "Barber gave me an exact modern taper fade. Hot towel eucalyptus beard spa was top tier!" },
      { rating: 4.8, title: "Great vibe for students & professionals", comment: "Clean tools with UV sanitizers between every customer. Fair pricing and friendly service." }
    ]
  },
  {
    name: "Shahnaz Herbal Care & Makeover Studio",
    subcategories: [7776, 7775, 7777], // Parlours, Salons, Spas
    logo: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1522337094346-831969a47cf6?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.8, title: "Trusted brand for skin treatment", comment: "Shahnaz 24K Gold Facial cleared my pigmentation before the festival season. Loved their expert consultation." },
      { rating: 4.6, title: "Excellent party makeup", comment: "Booked party makeup for 3 of us. Everyone was ready right on time and looked gorgeous." }
    ]
  },

  // ==========================================
  // 3. Food, Dining & Cafes (Category 7782)
  // ==========================================
  {
    name: "The Royal Kashi Darbar & Family Restaurant",
    subcategories: [7783, 7784, 7782], // Fine Dining, Cafes, Food
    logo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Authentic royal Awadhi flavors", comment: "The Galouti Kebabs and Dum Biryani here in Cantonment are legendary. Rich aromas, royal decor, and attentive table service." },
      { rating: 4.9, title: "Perfect place for family dinners", comment: "Spacious seating, live instrumental sitar music in the evening, and mouth-watering Shahi Tukda for dessert." }
    ]
  },
  {
    name: "Assi Riverfront Cafe & Roastery",
    subcategories: [7784, 7785, 7783], // Cafes, Bakeries, Fine Dining
    logo: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Unbeatable sunrise view with pour-over coffee", comment: "Sitting on the upper terrace watching the Ganga morning aarti while sipping a freshly roasted Ethiopian brew is peak Varanasi magic." },
      { rating: 4.8, title: "Wood-fired thin crust pizza", comment: "Authentic Italian crust with fresh basil and mozzarella. Great wifi and peaceful vibes for remote work." }
    ]
  },
  {
    name: "Golden Crust European Bakery & Patisserie",
    subcategories: [7785, 7784, 7783], // Bakeries, Cafes, Dining
    logo: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Best Belgian chocolate truffle cake", comment: "Ordered a 3-tier birthday cake in Godowlia. Moist, intensely chocolatey, and looked stunning. 100% eggless too!" },
      { rating: 4.7, title: "Flaky butter croissants", comment: "Crispy outer layers and warm buttery inside. Their almond croissants sell out by noon every single day." }
    ]
  },
  {
    name: "Varanasi Rasoi Pure Vegetarian Thali",
    subcategories: [7783, 7784, 7782], // Dining, Cafes, Food
    logo: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Pure desi ghee Baati Chokha", comment: "Cooked over cow dung cakes like authentic village style and soaked in aromatic desi ghee. Unbelievably delicious!" },
      { rating: 4.8, title: "Generous unlimited thali", comment: "Served hot with 4 sabzis, fresh rotis, dal tadka, gulab jamun, and spiced chaach. Best value for money near BHU Lanka." }
    ]
  },
  {
    name: "Chai Charcha & Street Bites",
    subcategories: [7784, 7785, 7782], // Cafes, Bakeries, Food
    logo: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.8, title: "Earthy kulhad adrak chai", comment: "Clay kulhad tea boiled with crushed ginger and cardamom. Coupled with their warm toasted bun makkhan, it's heaven." },
      { rating: 4.6, title: "Lively evening hangout", comment: "Great music, fast service, and crispy loaded cheese fries. Always buzzing with young crowds in Bhelupur." }
    ]
  },

  // ==========================================
  // 4. Retail & Shopping (Category 7791)
  // ==========================================
  {
    name: "Kashi Zari & Silk Handloom Emporium",
    subcategories: [7793, 7791, 7792], // Clothing, Retail, Groceries
    logo: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Pure Katan silk bridal saree", comment: "We bought my bridal red Banarasi saree directly from this Chowk emporium. Pure handwoven zari that passed the silk-mark burn test. Heritage craft at honest weaver prices." },
      { rating: 4.9, title: "Generations of trust", comment: "My grandmother bought her wedding saree here 40 years ago and we still return. Flawless brocades and warm hospitable owners." }
    ]
  },
  {
    name: "Apex Electronics & Smart Gadgets Megastore",
    subcategories: [7794, 7791, 7792], // Electronics, Retail, Supermarket
    logo: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1593344484962-796055d4a3a4?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Best electronics price in Lahurabir", comment: "Purchased a 55-inch LG OLED TV with 3-year warranty. Delivered and wall-mounted within 4 hours with no hidden fees." },
      { rating: 4.7, title: "Zero percent EMI options", comment: "Huge selection of laptops and smartphones with instant Bajaj Finserv approval on the spot." }
    ]
  },
  {
    name: "Metro Daily Supermarket & Organic Hub",
    subcategories: [7792, 7791, 7794], // Supermarkets, Retail, Electronics
    logo: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.8, title: "Complete grocery shopping under one roof", comment: "Air-conditioned aisles, clearly labeled prices, organic millets, and imported cheeses. Sigra needed a supermarket this good." },
      { rating: 4.7, title: "Fresh vegetables every morning", comment: "Direct farm sourced greens and exotic veggies like broccoli and zucchini that are always crisp and fresh." }
    ]
  },
  {
    name: "Varanasi Trends Men's Ethnic & Suiting",
    subcategories: [7793, 7791, 7792], // Clothing, Retail, Groceries
    logo: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Bespoke wedding sherwani fitting", comment: "Master tailor provided a flawless trial fitting on the first try. Hand embroidered zardozi collar that looked royally elegant." },
      { rating: 4.8, title: "Top-notch Raymond fabric range", comment: "Extensive catalogue of wool-rich suiting fabrics for corporate suits and festive Nehru jackets." }
    ]
  },
  {
    name: "Digital World Mobile & Laptop Care",
    subcategories: [7794, 7791, 7793], // Electronics, Retail, Clothing
    logo: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1588508065123-287b28e013da?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "iPhone display replaced in 30 minutes", comment: "Original OLED panel with TrueTone retained. Quick, professional, and gave a 6-month written warranty." },
      { rating: 4.6, title: "Best mobile accessories in Godowlia", comment: "Tempered glass applied with zero bubbles and a great selection of drop-tested armor cases." }
    ]
  },

  // ==========================================
  // 5. Automotive & Transport (Category 7800)
  // ==========================================
  {
    name: "Banaras Bosch Car Service & Multi-Brand Garage",
    subcategories: [7801, 7802, 7803], // Car Repair, Two Wheeler, Dealerships
    logo: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Honest multi-brand car servicing in Shivpur", comment: "Fixed a persistent suspension squeak and AC cooling issue in my Creta. Kept me updated via WhatsApp photos of worn parts." },
      { rating: 4.8, title: "Computerized wheel alignment & balancing", comment: "Laser accuracy calibration eliminated steering wobble at highway speeds. Highly recommended!" }
    ]
  },
  {
    name: "Kashi Motors Certified Pre-Owned Cars",
    subcategories: [7803, 7801, 7802], // Dealerships, Car Repair, Two Wheeler
    logo: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Got a verified 2021 Honda City", comment: "Non-accidental certified car with service history records and 1-year engine warranty. RC transfer was handled in 10 days." },
      { rating: 4.7, title: "Transparent evaluation & exchange", comment: "Gave me the best trade-in value for my old Swift. No hidden broker fees." }
    ]
  },
  {
    name: "SpeedZone Superbike & Two-Wheeler Clinic",
    subcategories: [7802, 7801, 7803], // Two Wheeler, Car Repair, Dealerships
    logo: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1558981420-87aa9dad1c89?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Royal Enfield thumper tuneup", comment: "Cleaned throttle body, replaced chain sprocket, and tuned tappets on my Classic 350. Rides butter-smooth now in Pandeypur." },
      { rating: 4.8, title: "High-pressure foam wash & ceramic coat", comment: "Bike looks showroom new with mirror reflection shine. Quick turn-around time." }
    ]
  },
  {
    name: "Varanasi Express Detailing & Ceramic Coatings",
    subcategories: [7801, 7803, 7802], // Car Repair, Dealerships, Two Wheeler
    logo: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "9H Graphene coating gave incredible hydrophobics", comment: "Mud and dust just slide right off with a splash of water. Paint swirl marks are 100% gone." },
      { rating: 4.9, title: "Deep leather interior sanitization", comment: "Steam cleaned every vent, roof liner, and leather seat. Removed old coffee stains and pet odors." }
    ]
  },
  {
    name: "EcoDrive Electric Vehicles & Battery Hub",
    subcategories: [7803, 7802, 7801], // Dealerships, Two Wheeler, Car Repair
    logo: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1571127236794-81c0bbfe1ce3?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1593941707874-ef25b8b4a92b?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.8, title: "Saved thousands on daily petrol bills", comment: "Bought an electric scooter for daily college commute to Sarnath. 110 km real range on a single charge and fast charging support." },
      { rating: 4.6, title: "Reliable lithium battery warranties", comment: "3-year unconditional replacement warranty on battery pack. Very knowledgeable sales team." }
    ]
  },

  // ==========================================
  // 6. Fitness & Sports (Category 7808)
  // ==========================================
  {
    name: "IronCore Crossfit & High-Intensity Gym",
    subcategories: [7809, 7810, 7811], // Gyms, Yoga, Swimming
    logo: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Best bodybuilding & crossfit gym in Sigra", comment: "Heavy bumper plates, Olympic barbells, kettlebells, and certified strength coaches. Lost 8 kgs in 3 months with their progressive overload training." },
      { rating: 4.9, title: "Motivating energetic community", comment: "Great music, AC ventilation, steam shower, and dedicated deadlift platforms. The atmosphere pushes you to train hard." }
    ]
  },
  {
    name: "Kashi Yoga Ashram & Pranic Wellness Studio",
    subcategories: [7810, 7809, 7811], // Yoga, Gyms, Swimming
    logo: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Serene sunrise yoga over the Ganga", comment: "Morning pranayama sessions on the rooftop overlooking Assi Ghat are spiritually rejuvenating. Relieved my chronic cervical spondylosis." },
      { rating: 4.8, title: "Authentic Patanjali Ashtanga teachings", comment: "Acharya Ji corrects each posture patiently with deep breath awareness. Life-changing yoga experience." }
    ]
  },
  {
    name: "Gold Standard Fitness & Zumba Club",
    subcategories: [7809, 7810, 7811], // Gyms, Yoga, Swimming
    logo: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1570829460005-c840387bb1ca?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Fun, calorie-burning Zumba classes", comment: "Instructor Neha brings insane energy to evening dance cardio sessions in Mahmoorganj. Burned 500 calories effortlessly every session." },
      { rating: 4.7, title: "Family-friendly environment", comment: "Separate timings for women, polite trainers, and customized weekly diet charts included with annual membership." }
    ]
  },
  {
    name: "AquaSplash Swimming Academy & Sports Club",
    subcategories: [7811, 7809, 7810], // Swimming, Gyms, Yoga
    logo: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Crystal clear water with strict hygiene", comment: "Advanced UV filtration system, constant temperature control, and attentive coaches who taught my 7-year-old freestyle in 3 weeks." },
      { rating: 4.8, title: "Great adult swimming batches", comment: "Early morning 6 AM slots for working professionals. Clean locker rooms and warm showers." }
    ]
  },
  {
    name: "ProPulse MMA & Martial Arts Dojo",
    subcategories: [7809, 7810, 7811], // Gyms, Yoga, Swimming
    logo: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1509563423944-654376b165dd?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1517438476312-10d79c077509?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Real kickboxing & Jiu Jitsu training", comment: "Coach is a national medalist. Teaches practical takedowns, submissions, and punching combinations on heavy bags." },
      { rating: 4.8, title: "Empowering self-defense for girls", comment: "Weekend special workshops in Durgakund gave my sister immense confidence and physical agility." }
    ]
  },

  // ==========================================
  // 7. Education & Coaching (Category 7816)
  // ==========================================
  {
    name: "Vidya Mandir IIT-JEE & NEET Academy",
    subcategories: [7817, 7818, 7819], // Coaching, Schools, Colleges
    logo: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Helped me secure AIR 412 in JEE Advanced", comment: "The physics and chemistry problem-solving modules are unmatched. Regular Sunday mock tests simulated real exam pressure." },
      { rating: 4.9, title: "Dedicated doubt-clearing sessions", comment: "Teachers stay after class until every student's doubts are resolved. Excellent library and study room in Durgakund." }
    ]
  },
  {
    name: "Achievers IAS & Civil Services Hub",
    subcategories: [7817, 7819, 7818], // Coaching, Colleges, Schools
    logo: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Best UPSC mentorship in Eastern UP", comment: "Retired bureaucrats take personalized mains answer writing sessions. Detailed feedback on GS papers and essay structuring." },
      { rating: 4.8, title: "Comprehensive current affairs analysis", comment: "Daily Hindu newspaper synthesis and monthly booklets make static and dynamic syllabus seamless." }
    ]
  },
  {
    name: "Ganga Valley International Pre-School & Daycare",
    subcategories: [7818, 7817, 7819], // Schools, Coaching, Colleges
    logo: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1587691592099-24045742c181?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Loving and secure environment for toddlers", comment: "My 3-year-old daughter loves going to school here in Sigra. Live CCTV mobile streaming gives total peace of mind to working parents." },
      { rating: 4.7, title: "Holistic Montessori activities", comment: "Focus on social manners, phonics, clay modeling, and motor coordination. Gentle teachers and very clean campus." }
    ]
  },
  {
    name: "Commerce Point CA & CS Foundation Classes",
    subcategories: [7817, 7819, 7818], // Coaching, Colleges, Schools
    logo: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Cleared CA Foundation on 1st attempt", comment: "Prof. Gupta explains debit/credit accounting mechanics with practical corporate examples. Great mock exams in Pandeypur." },
      { rating: 4.8, title: "Top-notch business law lectures", comment: "Simplified complex Companies Act provisions into easy-to-remember mnemonic charts. High score guarantee." }
    ]
  },
  {
    name: "Oxford Institute of Spoken English & Foreign Languages",
    subcategories: [7817, 7818, 7819], // Coaching, Schools, Colleges
    logo: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.8, title: "Scored 7.5 bands in IELTS Academic", comment: "Extensive daily speaking practice in small batches, grammar polishing, and essay correction. Overcame all hesitation in 2 months." },
      { rating: 4.7, title: "Excellent corporate communication workshops", comment: "Helped me crack my tech interview with fluent professional vocabulary and confident body language." }
    ]
  },

  // ==========================================
  // 8. Real Estate & Construction (Category 7824)
  // ==========================================
  {
    name: "Kashi Prime Realty & Housing Consultants",
    subcategories: [7825, 7826, 7827], // Agencies, Builders, Architects
    logo: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Smooth RERA flat registration in Cantonment", comment: "Helped us purchase a luxury 3BHK flat near Cantt. Handled title search, municipal clearances, and SBI home loan smoothly." },
      { rating: 4.8, title: "100% legal registry plots", comment: "Transparent deal with zero brokerage surprises. Complete demarcation and possession within 15 days." }
    ]
  },
  {
    name: "Purvanchal Dream Homes & Builders",
    subcategories: [7826, 7825, 7827], // Builders, Agencies, Architects
    logo: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Top construction quality in Shivpur", comment: "Built our duplex home on Ring Road. Grade 43 cement, Tata Tiscon TMT bars, and delivered right on schedule with zero cost overruns." },
      { rating: 4.7, title: "Modern gated colony with parks", comment: "Wide concrete roads, underground drainage, and continuous power backup. Best investment we made." }
    ]
  },
  {
    name: "Varanasi Vastu & Architectural Design Studio",
    subcategories: [7827, 7826, 7825], // Architects, Builders, Agencies
    logo: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Stunning 3D elevation & Vastu layout", comment: "Architect customized our floor plan to optimize natural light and proper Vastu directions. The 3D photorealistic walk-through was breathtaking." },
      { rating: 4.8, title: "Turnkey luxury interior execution", comment: "Custom Italian kitchen, fluted wall panels, and warm ambient lighting. Mahmoorganj's finest design studio." }
    ]
  },
  {
    name: "Ganga Green Land & Farmhouse Realtors",
    subcategories: [7825, 7826, 7827], // Agencies, Builders, Architects
    logo: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1500076656116-558758c991c1?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1470246973918-29a93221c455?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.8, title: "Verified agricultural land deal", comment: "Acquired a 1-acre river-touch farmhouse plot near Chunar-Varanasi border. Clear revenue papers and immediate registry." },
      { rating: 4.7, title: "High growth potential plots", comment: "Great foresight on upcoming national highway corridors. Excellent ROI over the last 3 years." }
    ]
  },
  {
    name: "Heritage Infra Projects & Civil Contractors",
    subcategories: [7826, 7827, 7825], // Builders, Architects, Agencies
    logo: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Commercial showroom construction", comment: "Completed our 3-story retail complex in Pandeypur. Solid foundation, strict safety standards, and reliable milestone billing." },
      { rating: 4.7, title: "Expert waterproofing & structural repair", comment: "Permanently fixed seepage on our old heritage building roof using polymer coating. Highly skilled masons." }
    ]
  },

  // ==========================================
  // 9. IT & Digital Agencies (Category 7831)
  // ==========================================
  {
    name: "Kashi CloudSoft Technologies",
    subcategories: [7832, 7833, 7834], // Software, Web Design, Marketing
    logo: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Built our enterprise SaaS billing platform", comment: "Team developed a full-stack Next.js and PostgreSQL web application with Stripe payment gateway. Clean code, automated tests, and great communication." },
      { rating: 4.9, title: "Modern mobile app for iOS & Android", comment: "Delivered a cross-platform Flutter app that handles 10,000 daily active users with zero lag. Varanasi's premier software company." }
    ]
  },
  {
    name: "Digital Banaras Growth & SEO Agency",
    subcategories: [7834, 7833, 7832], // Marketing, Web Design, Software
    logo: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Ranked our store #1 on Google Maps", comment: "Local SEO audit and Google My Business optimization tripled our incoming calls and store footfalls in Sigra. Phenomenal ROI." },
      { rating: 4.8, title: "High-conversion Meta & Google Ads", comment: "Reduced our customer acquisition cost by 45%. Monthly analytics reports were transparent and insightful." }
    ]
  },
  {
    name: "WebCrafters Studio & E-Commerce Labs",
    subcategories: [7833, 7832, 7834], // Web Design, Software, Marketing
    logo: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Stunning Shopify storefront for our silk brand", comment: "Loaded with fast checkout, currency switcher, and high-res zoomable product galleries. International sales jumped immediately." },
      { rating: 4.7, title: "Responsive & mobile-first UI design", comment: "Designed our corporate website with modern Figma mockups. 99+ score on Google PageSpeed Insights." }
    ]
  },
  {
    name: "Apex AI & Data Solutions",
    subcategories: [7832, 7834, 7833], // Software, Marketing, Web Design
    logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "WhatsApp automation bot saves 20 hours a week", comment: "Integrated automated order status, catalogue inquiries, and payment reminders via WhatsApp API. Zero manual errors." },
      { rating: 4.8, title: "Intelligent analytics dashboard", comment: "Connected our inventory, pos, and sales pipelines into one real-time dashboard. Invaluable business insights." }
    ]
  },
  {
    name: "PixelWave Multimedia & Creative Hub",
    subcategories: [7833, 7834, 7832], // Web Design, Marketing, Software
    logo: "https://images.unsplash.com/photo-1542744094-24638eff58bb?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Cinematic commercial promo shoot", comment: "Shot an ad film for our restaurant in Maldahiya. 4K camera work, drone sweeps of the Ganges, and top-tier color grading." },
      { rating: 4.8, title: "Iconic brand logo & packaging design", comment: "Delivered our complete brand guidelines, packaging stickers, and social media creative templates." }
    ]
  },

  // ==========================================
  // 10. Professional & Financial Services (Category 7838)
  // ==========================================
  {
    name: "Agrawal & Associates Chartered Accountants",
    subcategories: [7839, 7841, 7840], // CA, Tax, Law
    logo: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Saved us from complex income tax scrutiny", comment: "CA Agrawal handled our corporate assessment with thorough documentation and legal citations. Professional, honest, and prompt in Kutchery." },
      { rating: 4.9, title: "Seamless monthly GST returns & auditing", comment: "Zero penalty track record for 5 consecutive years. Our company's balance sheets are always audited accurately." }
    ]
  },
  {
    name: "Varanasi Jurists Legal Advocates & Associates",
    subcategories: [7840, 7839, 7841], // Law, CA, Tax
    logo: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1479142506502-19b3a3b7ff33?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1436450412740-6b988f486c6b?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Rigorous property title search report", comment: "Advocate Rajesh verified 30 years of revenue registry records and identified an encumbrance that saved us from a fraudulent land purchase." },
      { rating: 4.8, title: "Expert civil litigation counsel", comment: "Meticulous legal research and strong courtroom presence. Resolved our commercial partnership dispute amicably." }
    ]
  },
  {
    name: "Kashi Wealth & Investment Advisory",
    subcategories: [7841, 7839, 7840], // Tax, CA, Law
    logo: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Tailored portfolio for retirement planning", comment: "Helped me structure a disciplined mutual fund SIP allocation matching my risk appetite. 16% annualized returns over 4 years in Sigra." },
      { rating: 4.7, title: "Objective insurance advisory", comment: "No biased commission sales. Recommended pure term life and comprehensive super top-up health policies." }
    ]
  },
  {
    name: "Purvanchal Business Loans & MSME Funding Hub",
    subcategories: [7841, 7839, 7840], // Tax, CA, Law
    logo: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1554224154-22dec7ec8818?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Working capital loan disbursed in 5 days", comment: "Secured Rs 25 Lakhs collateral-free CGTMSE loan for our manufacturing unit with lowest interest rate from Bank of Baroda." },
      { rating: 4.7, title: "Zero paperwork hassle in Bhelupur", comment: "Their executive visited our shop, collected financial statements, and handled end-to-end processing." }
    ]
  },
  {
    name: "Prime Tax Consultants & GST Suvidha Kendra",
    subcategories: [7839, 7841, 7840], // CA, Tax, Law
    logo: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.8, title: "ITR refund credited within 2 weeks", comment: "Filed my salaried and freelance ITR-3 accurately with full 80C and home loan deductions in Lahurabir. Fast and reasonable charges." },
      { rating: 4.6, title: "Instant MSME Udyam registration", comment: "Got our MSME certificate and digital signature token within 24 hours." }
    ]
  },

  // ==========================================
  // 11. Hospitality & Events (Category 7845)
  // ==========================================
  {
    name: "The Royal Heritage Grand Hotel & Spa",
    subcategories: [7846, 7847, 7848], // Hotels, Banquets, Planners
    logo: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "5-star luxury stay in Cantonment", comment: "Majestic colonial heritage property with sprawling green gardens, sparkling pool, and lavish breakfast buffet. The staff went above and beyond for our anniversary." },
      { rating: 4.9, title: "Luxurious spa & peaceful oasis", comment: "A calm sanctuary away from city traffic. The royal suite had carved teak furniture and deep soaking tubs." }
    ]
  },
  {
    name: "Ganga Vatika Grand Banquet & Wedding Lawn",
    subcategories: [7847, 7848, 7846], // Banquets, Planners, Hotels
    logo: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Dream wedding venue at Bada Lalpur", comment: "Hosted my sister's wedding reception for 1500 guests. The grand glass banquet hall and illuminated open lawn looked straight out of a Bollywood set." },
      { rating: 4.8, title: "Abundant valet parking & great catering", comment: "Live chaat counters, hot jalebis, and multicuisine dinner. Valet parking handled 300+ cars effortlessly." }
    ]
  },
  {
    name: "Utsav Celebrations & Royal Wedding Planners",
    subcategories: [7848, 7847, 7846], // Planners, Banquets, Hotels
    logo: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Flawless destination wedding execution", comment: "From theme Haldi with marigold cascades to royal baraat with vintage cars in Sigra, they managed every detail without stress for the family." },
      { rating: 4.9, title: "Bespoke floral mandap design", comment: "Real tuberose and exotic orchids backdrop. Guests are still talking about the magical lighting setup." }
    ]
  },
  {
    name: "Kashi Riverside Palace & Heritage Homestay",
    subcategories: [7846, 7847, 7848], // Hotels, Banquets, Planners
    logo: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Woke up to sunrise over Shivala Ghat", comment: "Private river-facing balcony where you can hear temple bells and morning chants. Authentic Banarasi hospitality and fresh ginger tea." },
      { rating: 4.8, title: "Charming antique decor", comment: "Handcrafted wooden jharokhas, brass lanterns, and very warm host family. Perfect cultural stay near Assi Ghat." }
    ]
  },
  {
    name: "Sarnath Serenity Buddhist Retreat & Resort",
    subcategories: [7846, 7848, 7847], // Hotels, Planners, Banquets
    logo: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Peaceful oasis next to Dhamekh Stupa", comment: "Quiet cottages surrounded by flowering gardens and chanting birds. Great sattvic vegetarian dining and meditation lawns in Sarnath." },
      { rating: 4.7, title: "Clean, spacious and calming", comment: "Ideal for weekend retreats, family relaxation, and peaceful walking access to the historical deer park." }
    ]
  },

  // ==========================================
  // 12. Home Services & Maintenance (Category 7852)
  // ==========================================
  {
    name: "CoolCare Air Conditioning & Refrigeration Hub",
    subcategories: [7853, 7855, 7854], // AC, Electrical, Plumbing
    logo: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Saved us during 45°C peak summer in Pandeypur", comment: "AC stopped cooling on a Sunday afternoon. Technician arrived in 40 minutes, diagnosed a blown capacitor, and refilled R32 gas. Cooling like brand new." },
      { rating: 4.8, title: "Pressure jet foam service", comment: "Deep coil cleaning with foam gun without spilling a single drop of dirty water in the bedroom. Very professional and reasonable charges." }
    ]
  },
  {
    name: "QuickFix 24x7 Plumbers & Sanitation Experts",
    subcategories: [7854, 7853, 7855], // Plumbing, AC, Electrical
    logo: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Rapid 30-min response for pipeline leak", comment: "Main water supply pipe burst in our bathroom in Sigra. Plumber reached swiftly, replaced with CPVC fitting, and stopped water wastage immediately." },
      { rating: 4.7, title: "Underground water tank high-pressure wash", comment: "Cleaned our 2000L sump with UV antibacterial treatment. Zero foul smell and completely clean." }
    ]
  },
  {
    name: "Varanasi PowerGrid Electricians & Inverter Solutions",
    subcategories: [7855, 7853, 7854], // Electrical, AC, Plumbing
    logo: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1498084393753-b411b2d26b34?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "Complete house rewiring in Bhelupur", comment: "Replaced 25-year-old faulty wiring with Havells FRLS fireproof cables and modern Legrand modular switches. Certified safety inspection." },
      { rating: 4.8, title: "Solar hybrid inverter installation", comment: "Installed a 3KVA solar inverter with tubular batteries. Continuous power during local grid cuts with zero flickering." }
    ]
  },
  {
    name: "Shri Ganesh Home Appliance Care & RO Solutions",
    subcategories: [7853, 7855, 7854], // AC, Electrical, Plumbing
    logo: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 4.9, title: "Repaired Samsung front-load washing machine", comment: "Drum motor error fixed with genuine part replacement in Shivpur. Machine is whisper quiet again." },
      { rating: 4.7, title: "RO membrane replacement & TDS calibration", comment: "Tested water TDS before and after. Brought down from 850 to 85 sweet drinking water. Very affordable annual maintenance contract." }
    ]
  },
  {
    name: "SmartShield Pest Control & Sanitization Hub",
    subcategories: [7855, 7854, 7853], // Maintenance, Plumbing, AC
    logo: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=400&fit=crop",
    banner: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&h=450&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600&h=400&fit=crop"
    ],
    reviews: [
      { rating: 5, title: "100% odorless termite treatment in Mahmoorganj", comment: "Drilled small perimeter holes, injected chemical, and sealed cleanly without any smell or furniture damage. 5-year written warranty provided." },
      { rating: 4.8, title: "Cockroach gel eradicated kitchen pests", comment: "Gel applied inside cabinets with no need to empty kitchen utensils. Zero cockroaches seen in 6 months." }
    ]
  }
];

async function run() {
  console.log(`Starting to enhance all ${STORES_ENHANCEMENT.length} stores with pictures, 2-3 subcategories, and reviews...`);

  let updatedStores = 0;
  let totalReviewsInserted = 0;

  for (const store of STORES_ENHANCEMENT) {
    // 1. Find the store in business_profiles by name
    const res = await pool.query(
      `SELECT id, name, category_id FROM business_profiles WHERE name = $1 LIMIT 1`,
      [store.name]
    );

    if (res.rows.length === 0) {
      console.warn(`Store not found: "${store.name}"`);
      continue;
    }

    const bizId = res.rows[0].id;
    const primarySubcat = store.subcategories[0];
    const subcatArray = store.subcategories;

    // 2. Update business_profiles with pictures and multiple subcategories
    await pool.query(
      `UPDATE business_profiles
       SET logo_url = $1,
           banner_url = $2,
           gallery_images = $3,
           subcategory_id = $4,
           subcategory_ids = $5,
           updated_at = NOW()
       WHERE id = $6`,
      [
        store.logo,
        store.banner,
        store.gallery,
        primarySubcat,
        subcatArray,
        bizId
      ]
    );
    updatedStores++;

    // 3. Clear old reviews for this business to avoid duplication
    await pool.query(`DELETE FROM platform_reviews WHERE business_id = $1`, [bizId]);

    // 4. Insert authentic customer reviews
    for (const rev of store.reviews) {
      // Pick dates staggered between 10 and 120 days ago
      const daysAgo = Math.floor(Math.random() * 110) + 10;
      const reviewDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      await pool.query(
        `INSERT INTO platform_reviews (
           business_id,
           rating,
           title,
           comment,
           status,
           created_at,
           updated_at
         ) VALUES ($1, $2, $3, $4, 'approved', $5, $5)`,
        [
          bizId,
          rev.rating,
          rev.title,
          rev.comment,
          reviewDate
        ]
      );
      totalReviewsInserted++;
    }
  }

  console.log(`\n Enhanced ${updatedStores} stores successfully!`);
  console.log(` Inserted ${totalReviewsInserted} platform reviews!`);

  // Verification report
  const check = await pool.query(`
    SELECT
      bp.id,
      bp.name,
      bp.locality,
      bp.subcategory_id,
      bp.subcategory_ids,
      bp.logo_url IS NOT NULL as has_logo,
      bp.banner_url IS NOT NULL as has_banner,
      array_length(bp.gallery_images, 1) as gallery_count,
      COUNT(r.id) as review_count,
      ROUND(AVG(r.rating), 1) as avg_rating
    FROM business_profiles bp
    LEFT JOIN platform_reviews r ON r.business_id = bp.id
    WHERE bp.city ILIKE '%Varanasi%' AND bp.id IN (
      SELECT id FROM business_profiles WHERE name = ANY($1::text[])
    )
    GROUP BY bp.id, bp.name, bp.locality, bp.subcategory_id, bp.subcategory_ids, bp.logo_url, bp.banner_url, bp.gallery_images
    ORDER BY bp.id ASC
    LIMIT 10
  `, [STORES_ENHANCEMENT.map(s => s.name)]);

  console.log("\n Sample Verified Enhanced Stores in Varanasi:");
  for (const r of check.rows) {
    console.log(`   * #${r.id} "${r.name}" (${r.locality}):`);
    console.log(`     - Subcategories: [${r.subcategory_ids?.join(', ')}]`);
    console.log(`     - Logo: ${r.has_logo}, Banner: ${r.has_banner}, Gallery: ${r.gallery_count} photos`);
    console.log(`     - Reviews: ${r.review_count} reviews (Avg: ${r.avg_rating} ⭐)`);
  }
}

run().catch(console.error).finally(() => pool.end());
