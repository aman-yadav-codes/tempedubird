// scripts/seed-india-master-data.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Read DATABASE_URL from .env if available
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[match[1].trim()] = val;
      }
    }
  }
}

loadEnv();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: DATABASE_URL is not set in environment or .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

function toSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// 1. ALL EDUCATIONAL BOARDS IN INDIA (National, All 28 States + UTs, Technical, Madrasa, Sanskrit)
const ALL_BOARDS = [
  // National & Central Boards
  { name: "Central Board of Secondary Education (CBSE)", slug: "cbse" },
  { name: "Council for the Indian School Certificate Examinations (CISCE / ICSE / ISC)", slug: "cisce-icse" },
  { name: "National Institute of Open Schooling (NIOS)", slug: "nios" },
  { name: "Cambridge Assessment International Education (CIE / IGCSE)", slug: "cambridge-cie-igcse" },
  { name: "International Baccalaureate (IB)", slug: "international-baccalaureate-ib" },

  // State Boards - North India
  { name: "Uttar Pradesh Madhyamik Shiksha Parishad (UPMSP / UP Board)", slug: "up-board-upmsp" },
  { name: "Board of School Education Haryana (BSEH / HBSE)", slug: "haryana-hbse" },
  { name: "Punjab School Education Board (PSEB)", slug: "punjab-pseb" },
  { name: "Himachal Pradesh Board of School Education (HPBOSE)", slug: "hpbose" },
  { name: "Uttarakhand Board of School Education (UBSE)", slug: "ubse-uttarakhand" },
  { name: "Jammu and Kashmir State Board of School Education (JKBOSE)", slug: "jkbose" },
  { name: "Delhi Board of School Education (DBSE)", slug: "delhi-dbse" },

  // State Boards - Central & Western India
  { name: "Madhya Pradesh Board of Secondary Education (MPBSE)", slug: "mpbse" },
  { name: "Chhattisgarh Board of Secondary Education (CGBSE)", slug: "cgbse" },
  { name: "Rajasthan Board of Secondary Education (RBSE / BSER)", slug: "rbse-rajasthan" },
  { name: "Gujarat Secondary and Higher Secondary Education Board (GSEB)", slug: "gseb-gujarat" },
  { name: "Maharashtra State Board of Secondary and Higher Secondary Education (MSBSHSE)", slug: "msbshse-maharashtra" },
  { name: "Goa Board of Secondary and Higher Secondary Education (GBSHSE)", slug: "goa-gbshse" },

  // State Boards - Eastern & North-Eastern India
  { name: "Bihar School Examination Board (BSEB)", slug: "bseb-bihar" },
  { name: "Jharkhand Academic Council (JAC)", slug: "jac-jharkhand" },
  { name: "West Bengal Board of Secondary Education (WBBSE - Madhyamik)", slug: "wbbse-west-bengal" },
  { name: "West Bengal Council of Higher Secondary Education (WBCHSE - HS)", slug: "wbchse-west-bengal" },
  { name: "Board of Secondary Education Odisha (BSE Odisha)", slug: "bse-odisha" },
  { name: "Council of Higher Secondary Education Odisha (CHSE Odisha)", slug: "chse-odisha" },
  { name: "Board of Secondary Education Assam (SEBA)", slug: "seba-assam" },
  { name: "Assam Higher Secondary Education Council (AHSEC)", slug: "ahsec-assam" },
  { name: "Meghalaya Board of School Education (MBOSE)", slug: "mbose-meghalaya" },
  { name: "Mizoram Board of School Education (MBSE)", slug: "mbse-mizoram" },
  { name: "Nagaland Board of School Education (NBSE)", slug: "nbse-nagaland" },
  { name: "Tripura Board of Secondary Education (TBSE)", slug: "tbse-tripura" },
  { name: "Board of Secondary Education Manipur (BSEM)", slug: "bsem-manipur" },
  { name: "Council of Higher Secondary Education Manipur (COHSEM)", slug: "cohsem-manipur" },

  // State Boards - Southern India
  { name: "Karnataka School Examination and Assessment Board (KSEAB / KSEEB)", slug: "kseeb-karnataka" },
  { name: "Department of Pre-University Education Karnataka (PUE Karnataka)", slug: "pue-karnataka" },
  { name: "Tamil Nadu Directorate of Government Examinations (TNDGE / State Board)", slug: "tndge-tamil-nadu" },
  { name: "Kerala Board of Public Examinations (KBPE / SSLC)", slug: "kbpe-kerala" },
  { name: "Directorate of Higher Secondary Education Kerala (DHSE Kerala)", slug: "dhse-kerala" },
  { name: "Board of Secondary Education Andhra Pradesh (BSEAP / SSC)", slug: "bseap-andhra-pradesh" },
  { name: "Board of Intermediate Education Andhra Pradesh (BIEAP)", slug: "bieap-andhra-pradesh" },
  { name: "Telangana Board of Secondary Education (BSE Telangana / SSC)", slug: "bse-telangana" },
  { name: "Telangana State Board of Intermediate Education (TSBIE)", slug: "tsbie-telangana" },

  // Technical & Vocational Education Boards
  { name: "Board of Technical Education Uttar Pradesh (BTEUP)", slug: "bteup-uttar-pradesh" },
  { name: "Maharashtra State Board of Technical Education (MSBTE)", slug: "msbte-maharashtra" },
  { name: "Department of Technical Education Karnataka (DTE Karnataka)", slug: "dte-karnataka" },
  { name: "Directorate of Technical Education Tamil Nadu (DOTE)", slug: "dote-tamil-nadu" },
  { name: "West Bengal State Council of Technical & Vocational Education (WBSCTVESD)", slug: "wbscte-west-bengal" },
  { name: "State Board of Technical Education and Training Andhra Pradesh (SBTET AP)", slug: "sbtet-andhra-pradesh" },
  { name: "State Board of Technical Education and Training Telangana (SBTET TS)", slug: "sbtet-telangana" },
  { name: "National Council for Vocational Training (NCVT / DGT India)", slug: "ncvt-dgt-india" },

  // Open & Traditional / Sanskrit & Madrasa Boards
  { name: "Bihar Board of Open Schooling and Examination (BBOSE)", slug: "bbose-bihar" },
  { name: "Rajasthan State Open School (RSOS)", slug: "rsos-rajasthan" },
  { name: "Madhya Pradesh State Open School (MPSOS)", slug: "mpsos-madhya-pradesh" },
  { name: "Maharshi Sandipani Rashtriya Veda Vidya Pratishthan (MSRVVP)", slug: "msrvvp-vedic-board" },
  { name: "Bihar State Madrasa Education Board (BSMEB)", slug: "bsmeb-madrasa-bihar" },
  { name: "Uttar Pradesh Board of Madrasa Education", slug: "up-board-madrasa-education" },
  { name: "West Bengal Board of Madrasah Education (WBBME)", slug: "wbbme-madrasah-wb" },
];

// 2. UNIVERSITIES & PREMIER INSTITUTES (Central, INI, State, Deemed, Private, Open)
const ALL_UNIVERSITIES = [
  // Central Universities
  {
    name: "University of Delhi (DU)",
    slug: "university-of-delhi",
    code: "DU",
    university_type: "central",
    state: "Delhi",
    city: "New Delhi",
    website_url: "http://www.du.ac.in",
    established_year: 1922,
    accreditation: "NAAC A++ | UGC Approved | NIRF Top 15",
    description: "Premier collegiate research university located in New Delhi, known for its distinguished academic departments, faculties, and affiliated colleges.",
  },
  {
    name: "Jawaharlal Nehru University (JNU)",
    slug: "jawaharlal-nehru-university",
    code: "JNU",
    university_type: "central",
    state: "Delhi",
    city: "New Delhi",
    website_url: "https://www.jnu.ac.in",
    established_year: 1969,
    accreditation: "NAAC A++ | UGC Approved | NIRF Rank 2",
    description: "Leading public central research university renowned for exceptional social sciences, international relations, languages, and scientific research.",
  },
  {
    name: "Banaras Hindu University (BHU)",
    slug: "banaras-hindu-university",
    code: "BHU",
    university_type: "central",
    state: "Uttar Pradesh",
    city: "Varanasi",
    website_url: "https://www.bhu.ac.in",
    established_year: 1916,
    accreditation: "NAAC A++ | UGC Approved | NIRF Top 10",
    description: "Centenary collegiate central university founded by Pandit Madan Mohan Malaviya, housing over 140 teaching departments across humanities, science, technology, medicine, and arts.",
  },
  {
    name: "Aligarh Muslim University (AMU)",
    slug: "aligarh-muslim-university",
    code: "AMU",
    university_type: "central",
    state: "Uttar Pradesh",
    city: "Aligarh",
    website_url: "https://www.amu.ac.in",
    established_year: 1875,
    accreditation: "NAAC A+ | UGC Approved | NIRF Top 10",
    description: "Historic premier residential central university with over 300 degree programs spanning medicine, law, management, science, and humanities.",
  },
  {
    name: "Jamia Millia Islamia (JMI)",
    slug: "jamia-millia-islamia",
    code: "JMI",
    university_type: "central",
    state: "Delhi",
    city: "New Delhi",
    website_url: "https://www.jmi.ac.in",
    established_year: 1920,
    accreditation: "NAAC A++ | UGC Approved | NIRF Rank 3",
    description: "Renowned central university offering multidisciplinary education with recognized leadership in engineering, architecture, law, and mass media.",
  },
  {
    name: "University of Hyderabad (UoH / HCU)",
    slug: "university-of-hyderabad",
    code: "UOH",
    university_type: "central",
    state: "Telangana",
    city: "Hyderabad",
    website_url: "https://uohyd.ac.in",
    established_year: 1974,
    accreditation: "Institution of Eminence | NAAC A++ | NIRF Rank 10",
    description: "Top-ranked premier research university offering postgraduate and doctoral programs in science, technology, and social sciences.",
  },
  {
    name: "Pondicherry University",
    slug: "pondicherry-university",
    code: "PU",
    university_type: "central",
    state: "Puducherry",
    city: "Puducherry",
    website_url: "https://www.pondiuni.edu.in",
    established_year: 1985,
    accreditation: "NAAC A+ | UGC Approved",
    description: "Leading collegiate central university catering to higher education and research in southern and eastern India.",
  },
  {
    name: "Visva-Bharati University",
    slug: "visva-bharati-university",
    code: "VBU",
    university_type: "central",
    state: "West Bengal",
    city: "Santiniketan",
    website_url: "http://www.visvabharati.ac.in",
    established_year: 1921,
    accreditation: "UNESCO World Heritage | Central University",
    description: "Historic central university founded by Nobel Laureate Rabindranath Tagore, fostering fine arts, culture, literature, and global humanist education.",
  },
  {
    name: "University of Allahabad",
    slug: "university-of-allahabad",
    code: "UoA",
    university_type: "central",
    state: "Uttar Pradesh",
    city: "Prayagraj",
    website_url: "https://www.allduniv.ac.in",
    established_year: 1887,
    accreditation: "Oxford of the East | Central University",
    description: "One of the oldest modern universities in the Indian subcontinent, producing prominent national scholars, civil servants, and leaders.",
  },
  {
    name: "Tezpur University",
    slug: "tezpur-university",
    code: "TU-ASM",
    university_type: "central",
    state: "Assam",
    city: "Tezpur",
    website_url: "http://www.tezu.ernet.in",
    established_year: 1994,
    accreditation: "NAAC A+ | UGC Approved | NIRF Top 50",
    description: "Distinguished central university offering science, technology, management, and humanities in North-East India.",
  },
  {
    name: "Central University of Punjab (CUPB)",
    slug: "central-university-of-punjab",
    code: "CUPB",
    university_type: "central",
    state: "Punjab",
    city: "Bathinda",
    website_url: "https://cup.edu.in",
    established_year: 2009,
    accreditation: "NAAC A+ | NIRF Top 100",
    description: "Research-driven central university emphasizing postgraduate education in life sciences, computational sciences, and social studies.",
  },
  {
    name: "Central University of Rajasthan (CURAJ)",
    slug: "central-university-of-rajasthan",
    code: "CURAJ",
    university_type: "central",
    state: "Rajasthan",
    city: "Ajmer",
    website_url: "https://www.curaj.ac.in",
    established_year: 2009,
    accreditation: "NAAC A++ | UGC Approved",
    description: "Premier central university known for integrated programs in sciences, architecture, and management.",
  },
  {
    name: "Central University of South Bihar (CUSB)",
    slug: "central-university-of-south-bihar",
    code: "CUSB",
    university_type: "central",
    state: "Bihar",
    city: "Gaya",
    website_url: "https://www.cusb.ac.in",
    established_year: 2009,
    accreditation: "NAAC A++ | UGC Approved",
    description: "Fast-growing premier central university with modern research infrastructure across STEM and humanities.",
  },

  // Institutes of National Importance (IITs, IIMs, AIIMS, NITs, IIITs, IISc, IISERs, NLUs)
  {
    name: "Indian Institute of Science Bangalore (IISc Bangalore)",
    slug: "iisc-bangalore",
    code: "IISC",
    university_type: "institute_of_national_importance",
    state: "Karnataka",
    city: "Bengaluru",
    website_url: "https://iisc.ac.in",
    established_year: 1909,
    accreditation: "Institution of Eminence | NIRF Rank 1 University",
    description: "India's highest-ranked institution for advanced scientific and technological research and higher education.",
  },
  {
    name: "Indian Institute of Technology Bombay (IIT Bombay)",
    slug: "iit-bombay",
    code: "IITB",
    university_type: "institute_of_national_importance",
    state: "Maharashtra",
    city: "Mumbai",
    website_url: "https://www.iitb.ac.in",
    established_year: 1958,
    accreditation: "Institute of National Importance | NIRF Top 3",
    description: "Globally recognized institute for engineering education and research, pioneering cutting-edge science and technology innovation.",
  },
  {
    name: "Indian Institute of Technology Delhi (IIT Delhi)",
    slug: "iit-delhi",
    code: "IITD",
    university_type: "institute_of_national_importance",
    state: "Delhi",
    city: "New Delhi",
    website_url: "https://home.iitd.ac.in",
    established_year: 1961,
    accreditation: "Institute of National Importance | NIRF Rank 2 (Engineering)",
    description: "Top-tier institution renowned for world-class engineering, design, management, and technological incubation.",
  },
  {
    name: "Indian Institute of Technology Madras (IIT Madras)",
    slug: "iit-madras",
    code: "IITM",
    university_type: "institute_of_national_importance",
    state: "Tamil Nadu",
    city: "Chennai",
    website_url: "https://www.iitm.ac.in",
    established_year: 1959,
    accreditation: "NIRF Rank 1 Overall for Consecutive Years | INI",
    description: "Ranked as India's No. 1 overall educational institution, fostering deep tech research, patent development, and innovation.",
  },
  {
    name: "Indian Institute of Technology Kanpur (IIT Kanpur)",
    slug: "iit-kanpur",
    code: "IITK",
    university_type: "institute_of_national_importance",
    state: "Uttar Pradesh",
    city: "Kanpur",
    website_url: "https://www.iitk.ac.in",
    established_year: 1959,
    accreditation: "Institute of National Importance | NIRF Top 5",
    description: "Renowned globally for aerospace, computer science, materials science, and pioneering research.",
  },
  {
    name: "Indian Institute of Technology Kharagpur (IIT Kharagpur)",
    slug: "iit-kharagpur",
    code: "IITKGP",
    university_type: "institute_of_national_importance",
    state: "West Bengal",
    city: "Kharagpur",
    website_url: "http://www.iitkgp.ac.in",
    established_year: 1951,
    accreditation: "First IIT of India | Institute of National Importance",
    description: "The first and largest IIT campus, offering unmatched multidisciplinary engineering, law, and medical technology education.",
  },
  {
    name: "Indian Institute of Technology Roorkee (IIT Roorkee)",
    slug: "iit-roorkee",
    code: "IITR",
    university_type: "institute_of_national_importance",
    state: "Uttarakhand",
    city: "Roorkee",
    website_url: "https://www.iitr.ac.in",
    established_year: 1847,
    accreditation: "Oldest Technical Institution in Asia | INI",
    description: "Asia's oldest technical institution with historic legacy in civil, water resources, and core engineering disciplines.",
  },
  {
    name: "Indian Institute of Technology Guwahati (IIT Guwahati)",
    slug: "iit-guwahati",
    code: "IITG",
    university_type: "institute_of_national_importance",
    state: "Assam",
    city: "Guwahati",
    website_url: "https://www.iitg.ac.in",
    established_year: 1994,
    accreditation: "Institute of National Importance | NIRF Top 7",
    description: "Sixth IIT established on the banks of Brahmaputra with outstanding research in design, data science, and biotechnology.",
  },
  {
    name: "Indian Institute of Technology Hyderabad (IIT Hyderabad)",
    slug: "iit-hyderabad",
    code: "IITH",
    university_type: "institute_of_national_importance",
    state: "Telangana",
    city: "Sangareddy",
    website_url: "https://www.iith.ac.in",
    established_year: 2008,
    accreditation: "Institute of National Importance | NIRF Top 8",
    description: "Fastest rising second-generation IIT leading India's AI, 5G/6G, semiconductor, and electric mobility research.",
  },
  {
    name: "Indian Institute of Technology (BHU) Varanasi",
    slug: "iit-bhu-varanasi",
    code: "IIT-BHU",
    university_type: "institute_of_national_importance",
    state: "Uttar Pradesh",
    city: "Varanasi",
    website_url: "https://www.iitbhu.ac.in",
    established_year: 1919,
    accreditation: "Institute of National Importance",
    description: "Centenary engineering college integrated within BHU campus with landmark contributions to mining, metallurgy, and electronics.",
  },
  {
    name: "Indian Institute of Technology (ISM) Dhanbad",
    slug: "iit-ism-dhanbad",
    code: "IIT-ISM",
    university_type: "institute_of_national_importance",
    state: "Jharkhand",
    city: "Dhanbad",
    website_url: "https://www.iitism.ac.in",
    established_year: 1926,
    accreditation: "Institute of National Importance",
    description: "Premier institute specializing in earth sciences, mining, petroleum, and modern computer engineering.",
  },

  // Premier IIMs
  {
    name: "Indian Institute of Management Ahmedabad (IIM Ahmedabad)",
    slug: "iim-ahmedabad",
    code: "IIMA",
    university_type: "institute_of_national_importance",
    state: "Gujarat",
    city: "Ahmedabad",
    website_url: "https://www.iima.ac.in",
    established_year: 1961,
    accreditation: "EQUIS Accredited | NIRF Rank 1 (Management)",
    description: "India's premier business school and global benchmark in executive and management education.",
  },
  {
    name: "Indian Institute of Management Bangalore (IIM Bangalore)",
    slug: "iim-bangalore",
    code: "IIMB",
    university_type: "institute_of_national_importance",
    state: "Karnataka",
    city: "Bengaluru",
    website_url: "https://www.iimb.ac.in",
    established_year: 1973,
    accreditation: "EQUIS Accredited | NIRF Rank 2 (Management)",
    description: "Top-tier Asian business school renowned for public policy, digital innovation, and corporate leadership.",
  },
  {
    name: "Indian Institute of Management Calcutta (IIM Calcutta)",
    slug: "iim-calcutta",
    code: "IIMC",
    university_type: "institute_of_national_importance",
    state: "West Bengal",
    city: "Kolkata",
    website_url: "https://www.iimcal.ac.in",
    established_year: 1961,
    accreditation: "Triple Crown Accredited (AACSB, AMBA, EQUIS)",
    description: "India's first IIM, renowned globally for quantitative finance, economics, and business analytics.",
  },
  {
    name: "Indian Institute of Management Lucknow (IIM Lucknow)",
    slug: "iim-lucknow",
    code: "IIML",
    university_type: "institute_of_national_importance",
    state: "Uttar Pradesh",
    city: "Lucknow",
    website_url: "https://www.iiml.ac.in",
    established_year: 1984,
    accreditation: "AACSB, AMBA Accredited | NIRF Top 5",
    description: "Premier management institute nurturing agile leaders and entrepreneurs.",
  },
  {
    name: "Indian Institute of Management Kozhikode (IIM Kozhikode)",
    slug: "iim-kozhikode",
    code: "IIMK",
    university_type: "institute_of_national_importance",
    state: "Kerala",
    city: "Kozhikode",
    website_url: "https://www.iimk.ac.in",
    established_year: 1996,
    accreditation: "EQUIS, AMBA Accredited | NIRF Rank 3",
    description: "Pioneering green-campus business school recognized for gender diversity and visionary management training.",
  },
  {
    name: "Indian Institute of Management Indore (IIM Indore)",
    slug: "iim-indore",
    code: "IIMI",
    university_type: "institute_of_national_importance",
    state: "Madhya Pradesh",
    city: "Indore",
    website_url: "https://www.iimidr.ac.in",
    established_year: 1996,
    accreditation: "Triple Crown Accredited (AACSB, AMBA, EQUIS)",
    description: "Renowned for IPM (Integrated Programme in Management) and cutting-edge business incubation.",
  },

  // Premier AIIMS & Medical INIs
  {
    name: "All India Institute of Medical Sciences New Delhi (AIIMS New Delhi)",
    slug: "aiims-new-delhi",
    code: "AIIMS-DEL",
    university_type: "institute_of_national_importance",
    state: "Delhi",
    city: "New Delhi",
    website_url: "https://www.aiims.edu",
    established_year: 1956,
    accreditation: "NIRF Rank 1 Medical Institute in India | INI",
    description: "Apex medical education and tertiary healthcare institute of India, setting global standards in healthcare and clinical research.",
  },
  {
    name: "Post Graduate Institute of Medical Education and Research (PGIMER Chandigarh)",
    slug: "pgimer-chandigarh",
    code: "PGIMER",
    university_type: "institute_of_national_importance",
    state: "Chandigarh",
    city: "Chandigarh",
    website_url: "https://pgimer.edu.in",
    established_year: 1962,
    accreditation: "NIRF Rank 2 Medical | INI",
    description: "Leading medical training and referral center offering world-class super-specialty medical training.",
  },
  {
    name: "Jawaharlal Institute of Postgraduate Medical Education and Research (JIPMER)",
    slug: "jipmer-puducherry",
    code: "JIPMER",
    university_type: "institute_of_national_importance",
    state: "Puducherry",
    city: "Puducherry",
    website_url: "https://www.jipmer.edu.in",
    established_year: 1823,
    accreditation: "Institute of National Importance | NIRF Top 5",
    description: "Autonomous central medical institute renowned for undergraduate, postgraduate, and super-specialty medical programs.",
  },
  {
    name: "National Institute of Mental Health and Neurosciences (NIMHANS)",
    slug: "nimhans-bangalore",
    code: "NIMHANS",
    university_type: "institute_of_national_importance",
    state: "Karnataka",
    city: "Bengaluru",
    website_url: "https://nimhans.ac.in",
    established_year: 1925,
    accreditation: "Institute of National Importance | Apex Neurosciences Institute",
    description: "India's apex center for mental health, neurosciences, behavioral sciences, and clinical research.",
  },

  // National Law Universities & Design
  {
    name: "National Law School of India University (NLSIU Bengaluru)",
    slug: "nlsiu-bengaluru",
    code: "NLSIU",
    university_type: "institute_of_national_importance",
    state: "Karnataka",
    city: "Bengaluru",
    website_url: "https://www.nls.ac.in",
    established_year: 1986,
    accreditation: "NIRF Rank 1 Law School in India",
    description: "Premier law university of India, pioneering 5-year integrated BA LLB legal education.",
  },
  {
    name: "National Institute of Design (NID Ahmedabad)",
    slug: "nid-ahmedabad",
    code: "NID",
    university_type: "institute_of_national_importance",
    state: "Gujarat",
    city: "Ahmedabad",
    website_url: "https://www.nid.edu",
    established_year: 1961,
    accreditation: "Institute of National Importance in Design",
    description: "India's premier design institute for industrial design, communication design, and textile design.",
  },
  {
    name: "National Institute of Fashion Technology (NIFT New Delhi)",
    slug: "nift-new-delhi",
    code: "NIFT",
    university_type: "institute_of_national_importance",
    state: "Delhi",
    city: "New Delhi",
    website_url: "https://nift.ac.in",
    established_year: 1986,
    accreditation: "Statutory Institute under Ministry of Textiles",
    description: "Leader in fashion education, technology, and management in South Asia.",
  },

  // Top NITs & IIITs
  {
    name: "National Institute of Technology Tiruchirappalli (NIT Trichy)",
    slug: "nit-trichy",
    code: "NITT",
    university_type: "institute_of_national_importance",
    state: "Tamil Nadu",
    city: "Tiruchirappalli",
    website_url: "https://www.nitt.edu",
    established_year: 1964,
    accreditation: "NIRF Rank 1 among all NITs | INI",
    description: "Top-ranked National Institute of Technology renowned for core engineering, computer applications, and management.",
  },
  {
    name: "National Institute of Technology Karnataka (NIT Surathkal)",
    slug: "nit-surathkal",
    code: "NITK",
    university_type: "institute_of_national_importance",
    state: "Karnataka",
    city: "Mangaluru",
    website_url: "https://www.nitk.ac.in",
    established_year: 1960,
    accreditation: "Institute of National Importance | NIRF Top 15",
    description: "Leading coastal engineering institute with premier campus placement, innovation, and technical excellence.",
  },
  {
    name: "National Institute of Technology Warangal (NIT Warangal)",
    slug: "nit-warangal",
    code: "NITW",
    university_type: "institute_of_national_importance",
    state: "Telangana",
    city: "Warangal",
    website_url: "https://www.nitw.ac.in",
    established_year: 1959,
    accreditation: "Institute of National Importance",
    description: "First established Regional Engineering College, pioneer in engineering, metallurgy, and computing.",
  },
  {
    name: "International Institute of Information Technology Hyderabad (IIIT Hyderabad)",
    slug: "iiit-hyderabad",
    code: "IIITH",
    university_type: "private",
    state: "Telangana",
    city: "Hyderabad",
    website_url: "https://www.iiit.ac.in",
    established_year: 1998,
    accreditation: "NAAC A++ | Top CS Research Center",
    description: "Autonomous research university celebrated internationally for world-class computer science, NLP, and AI research.",
  },

  // Major State Universities
  {
    name: "University of Mumbai",
    slug: "university-of-mumbai",
    code: "MU",
    university_type: "state",
    state: "Maharashtra",
    city: "Mumbai",
    website_url: "https://mu.ac.in",
    established_year: 1857,
    accreditation: "NAAC A++ | One of India's Oldest Universities",
    description: "Historic collegiate university with over 700 affiliated colleges across Maharashtra.",
  },
  {
    name: "Savitribai Phule Pune University (SPPU)",
    slug: "savitribai-phule-pune-university",
    code: "SPPU",
    university_type: "state",
    state: "Maharashtra",
    city: "Pune",
    website_url: "http://www.unipune.ac.in",
    established_year: 1949,
    accreditation: "NAAC A+ | Oxford of the East",
    description: "Premier state university housing leading scientific research institutions, faculties, and hundreds of colleges.",
  },
  {
    name: "Anna University Chennai",
    slug: "anna-university-chennai",
    code: "AU-CHE",
    university_type: "state",
    state: "Tamil Nadu",
    city: "Chennai",
    website_url: "https://www.annauniv.edu",
    established_year: 1978,
    accreditation: "NAAC A++ | NIRF Top 15 (Engineering)",
    description: "Apex technical university of Tamil Nadu, affiliating over 500 engineering and technological colleges.",
  },
  {
    name: "University of Madras",
    slug: "university-of-madras",
    code: "UNOM",
    university_type: "state",
    state: "Tamil Nadu",
    city: "Chennai",
    website_url: "https://www.unom.ac.in",
    established_year: 1857,
    accreditation: "NAAC A++ | Historic Triad University",
    description: "Historic university established in 1857 with distinguished alumni including Nobel laureates and national leaders.",
  },
  {
    name: "University of Calcutta",
    slug: "university-of-calcutta",
    code: "CU-KOL",
    university_type: "state",
    state: "West Bengal",
    city: "Kolkata",
    website_url: "https://www.caluniv.ac.in",
    established_year: 1857,
    accreditation: "NAAC A | First Western-style University in Asia",
    description: "Prestigious multidisciplinary university with rich historical legacy in sciences, literature, and social reform.",
  },
  {
    name: "Jadavpur University",
    slug: "jadavpur-university",
    code: "JU-KOL",
    university_type: "state",
    state: "West Bengal",
    city: "Kolkata",
    website_url: "http://www.jaduniv.edu.in",
    established_year: 1955,
    accreditation: "NAAC A | NIRF Rank 4 University",
    description: "Top-ranked state university renowned for world-class engineering, arts, and science research.",
  },
  {
    name: "Dr. A.P.J. Abdul Kalam Technical University (AKTU Lucknow)",
    slug: "aktu-lucknow",
    code: "AKTU",
    university_type: "state",
    state: "Uttar Pradesh",
    city: "Lucknow",
    website_url: "https://aktu.ac.in",
    established_year: 2000,
    accreditation: "State Technical University | Affiliates 750+ Colleges",
    description: "Largest technical university in Uttar Pradesh, orchestrating B.Tech, MBA, MCA, and B.Pharm programs.",
  },
  {
    name: "Visvesvaraya Technological University (VTU Belagavi)",
    slug: "vtu-belagavi",
    code: "VTU",
    university_type: "state",
    state: "Karnataka",
    city: "Belagavi",
    website_url: "https://vtu.ac.in",
    established_year: 1998,
    accreditation: "NAAC A | Apex Technical University of Karnataka",
    description: "One of India's largest technical universities, affiliating over 200 premier engineering institutions in Karnataka.",
  },
  {
    name: "Osmania University Hyderabad",
    slug: "osmania-university",
    code: "OU-HYD",
    university_type: "state",
    state: "Telangana",
    city: "Hyderabad",
    website_url: "https://www.osmania.ac.in",
    established_year: 1918,
    accreditation: "NAAC A+ | Historic Centenary University",
    description: "Centenary university of Hyderabad with major contributions to arts, commerce, engineering, and technology.",
  },
  {
    name: "Andhra University Visakhapatnam",
    slug: "andhra-university",
    code: "AU-VIZ",
    university_type: "state",
    state: "Andhra Pradesh",
    city: "Visakhapatnam",
    website_url: "https://www.andhrauniversity.edu.in",
    established_year: 1926,
    accreditation: "NAAC A++ | ISO 9001:2015",
    description: "Oldest university in Andhra Pradesh with comprehensive faculties in pharmacy, marine engineering, and sciences.",
  },
  {
    name: "University of Kerala",
    slug: "university-of-kerala",
    code: "KU-KER",
    university_type: "state",
    state: "Kerala",
    city: "Thiruvananthapuram",
    website_url: "https://www.keralauniversity.ac.in",
    established_year: 1937,
    accreditation: "NAAC A++ | First in Kerala",
    description: "Premier university of Kerala leading humanities, scientific research, and coastal ocean studies.",
  },
  {
    name: "Panjab University Chandigarh",
    slug: "panjab-university",
    code: "PU-CHD",
    university_type: "state",
    state: "Chandigarh",
    city: "Chandigarh",
    website_url: "https://puchd.ac.in",
    established_year: 1882,
    accreditation: "NAAC A++ | Inter-State Body Corporate",
    description: "Premier historic university of north India with exceptional reputation in law, sciences, and humanities.",
  },
  {
    name: "Gujarat University Ahmedabad",
    slug: "gujarat-university",
    code: "GU-AHM",
    university_type: "state",
    state: "Gujarat",
    city: "Ahmedabad",
    website_url: "https://www.gujaratuniversity.ac.in",
    established_year: 1949,
    accreditation: "NAAC A+ | GSIRF 5-Star",
    description: "Largest university in Gujarat catering to hundreds of thousands of students across western India.",
  },
  {
    name: "University of Rajasthan Jaipur",
    slug: "university-of-rajasthan",
    code: "UNIRAJ",
    university_type: "state",
    state: "Rajasthan",
    city: "Jaipur",
    website_url: "https://www.uniraj.ac.in",
    established_year: 1947,
    accreditation: "NAAC A | Oldest in Rajasthan",
    description: "Oldest institution of higher learning in Rajasthan offering comprehensive collegiate and postgraduate education.",
  },

  // Prominent Deemed & Private Universities
  {
    name: "Birla Institute of Technology and Science (BITS Pilani)",
    slug: "bits-pilani",
    code: "BITS",
    university_type: "deemed",
    state: "Rajasthan",
    city: "Pilani",
    website_url: "https://www.bits-pilani.ac.in",
    established_year: 1964,
    accreditation: "Institution of Eminence | NAAC A | Top Private Tech University",
    description: "India's highest ranked private technology and science deemed university, famous for merit-based admissions and global alumni network.",
  },
  {
    name: "Manipal Academy of Higher Education (MAHE Manipal)",
    slug: "mahe-manipal",
    code: "MAHE",
    university_type: "deemed",
    state: "Karnataka",
    city: "Manipal",
    website_url: "https://manipal.edu",
    established_year: 1953,
    accreditation: "Institution of Eminence | NAAC A++ | NIRF Top 10 University",
    description: "Internationally renowned university offering excellence in medicine, engineering, dentistry, pharmacy, and media.",
  },
  {
    name: "Vellore Institute of Technology (VIT Vellore)",
    slug: "vit-vellore",
    code: "VIT",
    university_type: "deemed",
    state: "Tamil Nadu",
    city: "Vellore",
    website_url: "https://vit.ac.in",
    established_year: 1984,
    accreditation: "Institution of Eminence | NAAC A++ | ABET USA Accredited",
    description: "Leading institution in engineering and technology with international curriculum and top corporate placements.",
  },
  {
    name: "Amity University Noida",
    slug: "amity-university-noida",
    code: "AMITY",
    university_type: "private",
    state: "Uttar Pradesh",
    city: "Noida",
    website_url: "https://www.amity.edu",
    established_year: 2005,
    accreditation: "NAAC A+ | WASC USA & QAA UK Accredited",
    description: "Leading private university network with global campuses and comprehensive multi-disciplinary academic programs.",
  },
  {
    name: "SRM Institute of Science and Technology (SRM IST)",
    slug: "srm-institute-of-science-and-technology",
    code: "SRM",
    university_type: "deemed",
    state: "Tamil Nadu",
    city: "Chennai",
    website_url: "https://www.srmist.edu.in",
    established_year: 1985,
    accreditation: "NAAC A++ | IET & ABET Accredited",
    description: "Top-tier multidisciplinary deemed university offering engineering, medicine, management, and law.",
  },
  {
    name: "Thapar Institute of Engineering and Technology (TIET Patiala)",
    slug: "thapar-institute-of-engineering-and-technology",
    code: "TIET",
    university_type: "deemed",
    state: "Punjab",
    city: "Patiala",
    website_url: "https://www.thapar.edu",
    established_year: 1956,
    accreditation: "NAAC A+ | Partnership with Trinity College Dublin",
    description: "Renowned deemed university pioneering engineering education, computer science research, and innovation in North India.",
  },
  {
    name: "Ashoka University Sonepat",
    slug: "ashoka-university",
    code: "ASHOKA",
    university_type: "private",
    state: "Haryana",
    city: "Sonepat",
    website_url: "https://www.ashoka.edu.in",
    established_year: 2014,
    accreditation: "Premier Liberal Arts and Sciences University",
    description: "India's leading liberal arts and interdisciplinary research university.",
  },
  {
    name: "Symbiosis International University Pune",
    slug: "symbiosis-international-university",
    code: "SIU-PUNE",
    university_type: "deemed",
    state: "Maharashtra",
    city: "Pune",
    website_url: "https://siu.edu.in",
    established_year: 1971,
    accreditation: "NAAC A++ | UGC Approved",
    description: "Premier deemed university famous for SIBM (Management), SLS (Law), and SIMC (Media & Communication).",
  },
  {
    name: "Kalinga Institute of Industrial Technology (KIIT Bhubaneswar)",
    slug: "kiit-bhubaneswar",
    code: "KIIT",
    university_type: "deemed",
    state: "Odisha",
    city: "Bhubaneswar",
    website_url: "https://kiit.ac.in",
    established_year: 1992,
    accreditation: "Institution of Eminence | NAAC A++",
    description: "World-class deemed university providing integrated technical, medical, and professional education.",
  },
  {
    name: "Lovely Professional University (LPU Punjab)",
    slug: "lovely-professional-university",
    code: "LPU",
    university_type: "private",
    state: "Punjab",
    city: "Phagwara",
    website_url: "https://www.lpu.in",
    established_year: 2005,
    accreditation: "NAAC A++ | ACBSP USA Accredited",
    description: "One of India's largest single-campus private universities hosting students from across all states and over 50 countries.",
  },
  {
    name: "Chandigarh University (CU Mohali)",
    slug: "chandigarh-university",
    code: "CU-MOHALI",
    university_type: "private",
    state: "Punjab",
    city: "Mohali",
    website_url: "https://www.cuchd.in",
    established_year: 2012,
    accreditation: "NAAC A+ | ABET USA Accredited",
    description: "Fast-growing multidisciplinary private university known for patent generation and corporate industry tie-ups.",
  },
  {
    name: "Christ University Bengaluru",
    slug: "christ-university-bengaluru",
    code: "CHRIST",
    university_type: "deemed",
    state: "Karnataka",
    city: "Bengaluru",
    website_url: "https://christuniversity.in",
    established_year: 1969,
    accreditation: "NAAC A+ | Deemed University",
    description: "Renowned institution delivering premier education in commerce, business administration, humanities, law, and science.",
  },
  {
    name: "NMIMS Deemed-to-be-University Mumbai (SVKM's NMIMS)",
    slug: "nmims-mumbai",
    code: "NMIMS",
    university_type: "deemed",
    state: "Maharashtra",
    city: "Mumbai",
    website_url: "https://www.nmims.edu",
    established_year: 1981,
    accreditation: "AACSB Accredited | NAAC A+",
    description: "Leading private deemed university renowned for management (SBM), commerce (ASMSOC), engineering, and law.",
  },

  // Open & Distance Learning Universities
  {
    name: "Indira Gandhi National Open University (IGNOU)",
    slug: "ignou-india",
    code: "IGNOU",
    university_type: "central",
    state: "Delhi",
    city: "New Delhi",
    website_url: "http://www.ignou.ac.in",
    established_year: 1985,
    accreditation: "NAAC A++ | World's Largest University by Enrollment",
    description: "National central open university catering to over 3 million students worldwide through flexible distance and online learning.",
  },
  {
    name: "Yashwantrao Chavan Maharashtra Open University (YCMOU)",
    slug: "ycmou-nashik",
    code: "YCMOU",
    university_type: "state",
    state: "Maharashtra",
    city: "Nashik",
    website_url: "https://www.ycmou.ac.in",
    established_year: 1989,
    accreditation: "UGC Approved Open University",
    description: "Leading state open university in western India offering mass higher education, technical, and agricultural courses.",
  },
  {
    name: "Netaji Subhas Open University (NSOU Kolkata)",
    slug: "nsou-kolkata",
    code: "NSOU",
    university_type: "state",
    state: "West Bengal",
    city: "Kolkata",
    website_url: "http://www.wbnsou.ac.in",
    established_year: 1997,
    accreditation: "NAAC A | Premier State Open University",
    description: "Premier distance education university serving West Bengal with diverse undergraduate and postgraduate programs.",
  },
  {
    name: "UP Rajarshi Tandon Open University (UPRTOU Prayagraj)",
    slug: "uprtou-prayagraj",
    code: "UPRTOU",
    university_type: "state",
    state: "Uttar Pradesh",
    city: "Prayagraj",
    website_url: "http://www.uprtou.ac.in",
    established_year: 1999,
    accreditation: "UGC-DEB Recognized",
    description: "Apex state open university of Uttar Pradesh providing accessible education through statewide study centers.",
  },
  {
    name: "Dr. B.R. Ambedkar Open University (BRAOU Hyderabad)",
    slug: "braou-hyderabad",
    code: "BRAOU",
    university_type: "state",
    state: "Telangana",
    city: "Hyderabad",
    website_url: "https://www.braou.ac.in",
    established_year: 1982,
    accreditation: "India's First Open University",
    description: "India's first open university, pioneering open higher education for Telugu-speaking states and beyond.",
  },
];

// 3. AFFILIATION / ACCREDITATION / CERTIFICATION PROVIDERS IN INDIA
const ALL_CERT_PROVIDERS = [
  // National Regulatory Councils & Accreditation Bodies
  {
    name: "University Grants Commission (UGC)",
    slug: "ugc-india",
    code: "UGC-RECOG",
    provider_type: "affiliation",
    website_url: "https://www.ugc.ac.in",
    description: "Apex statutory body responsible for coordination, determination, and maintenance of higher education standards in India.",
  },
  {
    name: "All India Council for Technical Education (AICTE)",
    slug: "aicte-india",
    code: "AICTE-APPR",
    provider_type: "affiliation",
    website_url: "https://www.aicte-india.org",
    description: "National-level statutory council for technical, engineering, management, and vocational education in India.",
  },
  {
    name: "National Assessment and Accreditation Council (NAAC)",
    slug: "naac-india",
    code: "NAAC-ACCR",
    provider_type: "accreditation",
    website_url: "http://www.naac.gov.in",
    description: "Autonomous accreditation authority of UGC grading higher educational institutions (A++, A+, A, B) across India.",
  },
  {
    name: "National Board of Accreditation (NBA)",
    slug: "nba-india",
    code: "NBA-TIER-1",
    provider_type: "accreditation",
    website_url: "https://www.nbaind.org",
    description: "Autonomous accreditation authority for technical programs under the Washington Accord international framework.",
  },
  {
    name: "National Medical Commission (NMC / erstwhile MCI)",
    slug: "nmc-india",
    code: "NMC-APPR",
    provider_type: "affiliation",
    website_url: "https://www.nmc.org.in",
    description: "Statutory regulatory authority for medical education, doctors, and medical institutions across India.",
  },
  {
    name: "Dental Council of India (DCI)",
    slug: "dci-india",
    code: "DCI-RECOG",
    provider_type: "affiliation",
    website_url: "http://www.dciindia.gov.in",
    description: "Apex regulatory body for dental education and dental profession in India.",
  },
  {
    name: "Pharmacy Council of India (PCI)",
    slug: "pci-india",
    code: "PCI-APPR",
    provider_type: "affiliation",
    website_url: "https://www.pci.nic.in",
    description: "Statutory body governing the regulation and accreditation of pharmacy education and profession.",
  },
  {
    name: "Bar Council of India (BCI)",
    slug: "bci-india",
    code: "BCI-APPR",
    provider_type: "affiliation",
    website_url: "http://www.barcouncilofindia.org",
    description: "Statutory body establishing legal education standards and granting recognition to universities whose degree in law serves as qualification for enrollment as an advocate.",
  },
  {
    name: "Council of Architecture (COA)",
    slug: "coa-india",
    code: "COA-RECOG",
    provider_type: "affiliation",
    website_url: "https://www.coa.gov.in",
    description: "Statutory body constituted by Government of India under the Architects Act for regulating architectural education and practice.",
  },
  {
    name: "National Council for Teacher Education (NCTE)",
    slug: "ncte-india",
    code: "NCTE-APPR",
    provider_type: "affiliation",
    website_url: "https://ncte.gov.in",
    description: "Statutory council overseeing teacher education standards (B.Ed, D.El.Ed, M.Ed) in India.",
  },
  {
    name: "Indian Nursing Council (INC)",
    slug: "inc-india",
    code: "INC-RECOG",
    provider_type: "affiliation",
    website_url: "http://www.indiannursingcouncil.org",
    description: "National regulatory body for nursing education and nursing professionals.",
  },
  {
    name: "Rehabilitation Council of India (RCI)",
    slug: "rci-india",
    code: "RCI-APPR",
    provider_type: "affiliation",
    website_url: "http://www.rehabcouncil.nic.in",
    description: "Statutory body regulating training policies and programs in the field of rehabilitation of persons with disabilities.",
  },
  {
    name: "National Commission for Indian System of Medicine (NCISM)",
    slug: "ncism-india",
    code: "NCISM-AYUSH",
    provider_type: "affiliation",
    website_url: "https://ncismindia.org",
    description: "Statutory commission governing education in Ayurveda, Unani, Siddha, and Sowa-Rigpa systems of medicine.",
  },
  {
    name: "National Commission for Homoeopathy (NCH)",
    slug: "nch-india",
    code: "NCH-HOMOEOPATHY",
    provider_type: "affiliation",
    website_url: "https://nch.org.in",
    description: "Statutory commission governing standards for homoeopathy medical education in India.",
  },

  // Professional Chartered & Secretarial Institutes
  {
    name: "Institute of Chartered Accountants of India (ICAI)",
    slug: "icai-india",
    code: "ICAI-CA",
    provider_type: "certification",
    website_url: "https://www.icai.org",
    description: "Statutory premier accounting body in India establishing accounting standards and certifying Chartered Accountants (CA).",
  },
  {
    name: "Institute of Company Secretaries of India (ICSI)",
    slug: "icsi-india",
    code: "ICSI-CS",
    provider_type: "certification",
    website_url: "https://www.icsi.edu",
    description: "Premier statutory professional body regulating the profession of Company Secretaries (CS) in India.",
  },
  {
    name: "Institute of Cost Accountants of India (ICMAI / CMA)",
    slug: "icmai-india",
    code: "ICMAI-CMA",
    provider_type: "certification",
    website_url: "https://icmai.in",
    description: "Statutory body regulating and certifying Cost and Management Accountants (CMA) in India.",
  },

  // Skilling, Testing & Vocational Bodies
  {
    name: "National Testing Agency (NTA)",
    slug: "nta-india",
    code: "NTA-EXAM",
    provider_type: "certification",
    website_url: "https://nta.ac.in",
    description: "Premier testing agency conducting national entrance exams including JEE Main, NEET-UG, CUET, UGC-NET, and CMAT.",
  },
  {
    name: "National Skill Development Corporation (NSDC)",
    slug: "nsdc-india",
    code: "NSDC-PMKVY",
    provider_type: "certification",
    website_url: "https://nsdcindia.org",
    description: "Public-private partnership promoting skill development and administering PMKVY national skill certifications.",
  },
  {
    name: "National Council for Vocational Education and Training (NCVET)",
    slug: "ncvet-india",
    code: "NCVET-SKILL",
    provider_type: "accreditation",
    website_url: "https://ncvet.gov.in",
    description: "Apex regulatory body for vocational education and training in India.",
  },
  {
    name: "IT-ITeS Sector Skills Council NASSCOM",
    slug: "nasscom-ssc",
    code: "NASSCOM-SSC",
    provider_type: "certification",
    website_url: "https://www.sscnasscom.com",
    description: "National standards organization certifying IT and tech professionals through FutureSkills Prime.",
  },
  {
    name: "BFSI Sector Skill Council of India",
    slug: "bfsi-ssc-india",
    code: "BFSI-SSC",
    provider_type: "certification",
    website_url: "https://bfsissc.com",
    description: "Sector Skill Council for Banking, Financial Services, and Insurance industry certifications.",
  },
  {
    name: "Healthcare Sector Skill Council (HSSC)",
    slug: "healthcare-ssc-india",
    code: "HSSC-INDIA",
    provider_type: "certification",
    website_url: "https://healthcare-ssc.in",
    description: "National body certifying allied health professionals, paramedics, and healthcare workers.",
  },

  // Global & Tech Certification Providers
  {
    name: "Google Career Certificates & Cloud Certification",
    slug: "google-career-certificates",
    code: "GOOG-CERT",
    provider_type: "certification",
    website_url: "https://grow.google/certificates",
    description: "Industry-standard job-ready credentials in Data Analytics, IT Support, Project Management, UX Design, and Cloud Architecture.",
  },
  {
    name: "Microsoft Certified Professional (MCP / Azure / M365)",
    slug: "microsoft-certified",
    code: "MSFT-CERT",
    provider_type: "certification",
    website_url: "https://learn.microsoft.com/certifications",
    description: "Global technical certifications spanning Azure Cloud, AI, Security, Power Platform, and Software Development.",
  },
  {
    name: "Amazon Web Services (AWS Certification)",
    slug: "aws-certification",
    code: "AWS-CERT",
    provider_type: "certification",
    website_url: "https://aws.amazon.com/certification",
    description: "Industry-leading credentials validating cloud expertise across Solutions Architecture, DevOps, Security, and Machine Learning.",
  },
  {
    name: "Cisco Systems (CCNA / CCNP / CCIE)",
    slug: "cisco-certified",
    code: "CISCO-CERT",
    provider_type: "certification",
    website_url: "https://www.cisco.com/c/en/us/training-events/career-certifications.html",
    description: "Benchmark networking and cyber security credentials validating routing, switching, data center, and enterprise infrastructure.",
  },
  {
    name: "Oracle Certified Professional (OCP / Java / Cloud)",
    slug: "oracle-certified",
    code: "ORCL-CERT",
    provider_type: "certification",
    website_url: "https://education.oracle.com",
    description: "Global standard certification for Java, Oracle Database, Cloud Infrastructure, and ERP systems.",
  },
  {
    name: "Red Hat Certified Engineer (RHCE / OpenShift)",
    slug: "red-hat-certified",
    code: "RHCE-CERT",
    provider_type: "certification",
    website_url: "https://www.redhat.com/en/services/certification",
    description: "Industry benchmark for Linux enterprise system administration, Kubernetes, Ansible, and OpenShift container technologies.",
  },
  {
    name: "Project Management Institute (PMI / PMP)",
    slug: "pmi-pmp",
    code: "PMI-PMP",
    provider_type: "certification",
    website_url: "https://www.pmi.org",
    description: "The gold standard in global project management certification (PMP, CAPM, PMI-ACP).",
  },
  {
    name: "Scrum Alliance (CSM / CSPO)",
    slug: "scrum-alliance",
    code: "SCRUM-CSM",
    provider_type: "certification",
    website_url: "https://www.scrumalliance.org",
    description: "Leading global organization certifying Certified ScrumMasters (CSM) and Agile Product Owners (CSPO).",
  },
  {
    name: "CompTIA (Security+ / Network+ / A+)",
    slug: "comptia-certifications",
    code: "COMPTIA",
    provider_type: "certification",
    website_url: "https://www.comptia.org",
    description: "Vendor-neutral credentials recognized worldwide in cybersecurity, infrastructure, cloud, and IT operations.",
  },
  {
    name: "Salesforce Trailhead Certified",
    slug: "salesforce-certified",
    code: "SFDC-CERT",
    provider_type: "certification",
    website_url: "https://trailhead.salesforce.com",
    description: "Official credentials certifying Salesforce Administrators, Developers, Architects, and Consultants.",
  },
  {
    name: "Adobe Certified Professional",
    slug: "adobe-certified",
    code: "ADOBE-CERT",
    provider_type: "certification",
    website_url: "https://www.adobe.com/education/certification.html",
    description: "Industry-recognized credential validating proficiency in Photoshop, Illustrator, Premiere Pro, and After Effects.",
  },
];

// 4. COMPREHENSIVE SUBJECTS LIST (School K-12, College/University STEM, Commerce, Arts, Medical, Law, Coaching)
const ALL_SUBJECTS = [
  // School K-12: Core Sciences & Mathematics
  { name: "Mathematics", slug: "mathematics", code: "MATH" },
  { name: "Applied Mathematics", slug: "applied-mathematics", code: "APP-MATH" },
  { name: "Physics", slug: "physics", code: "PHY" },
  { name: "Chemistry", slug: "chemistry", code: "CHEM" },
  { name: "Biology", slug: "biology", code: "BIO" },
  { name: "General Science", slug: "general-science", code: "GEN-SCI" },
  { name: "Environmental Studies (EVS)", slug: "environmental-studies", code: "EVS" },
  { name: "Computer Science (Python & C++)", slug: "computer-science-k12", code: "CS-083" },
  { name: "Informatics Practices (IP)", slug: "informatics-practices", code: "IP-065" },
  { name: "Biotechnology", slug: "biotechnology-k12", code: "BIOTECH" },
  { name: "Engineering Graphics", slug: "engineering-graphics", code: "EG-046" },
  { name: "Physical Education", slug: "physical-education", code: "PED-048" },
  { name: "Yoga and Wellness", slug: "yoga-and-wellness", code: "YOGA" },
  { name: "Artificial Intelligence (School Level)", slug: "artificial-intelligence-k12", code: "AI-417" },
  { name: "Information Technology (Vocational)", slug: "information-technology-k12", code: "IT-402" },
  { name: "Coding & Computational Thinking", slug: "coding-computational-thinking", code: "CODE-K12" },

  // School K-12: Commerce & Economics
  { name: "Accountancy", slug: "accountancy", code: "ACC-055" },
  { name: "Business Studies", slug: "business-studies", code: "BST-054" },
  { name: "Economics", slug: "economics", code: "ECO-030" },
  { name: "Financial Markets Management", slug: "financial-markets-management", code: "FMM-805" },
  { name: "Entrepreneurship", slug: "entrepreneurship", code: "ENT-066" },
  { name: "Banking and Insurance", slug: "banking-and-insurance", code: "BNK-811" },
  { name: "Business Mathematics & Statistics", slug: "business-mathematics-statistics", code: "BMS" },
  { name: "Cost Accounting", slug: "cost-accounting-k12", code: "COST-ACC" },
  { name: "Taxation", slug: "taxation-k12", code: "TAX-822" },

  // School K-12: Social Sciences & Humanities
  { name: "Social Science", slug: "social-science", code: "SST-087" },
  { name: "History", slug: "history", code: "HIST-027" },
  { name: "Geography", slug: "geography", code: "GEO-029" },
  { name: "Political Science", slug: "political-science", code: "POL-028" },
  { name: "Sociology", slug: "sociology", code: "SOC-039" },
  { name: "Psychology", slug: "psychology", code: "PSY-037" },
  { name: "Philosophy", slug: "philosophy", code: "PHIL-040" },
  { name: "Legal Studies", slug: "legal-studies", code: "LS-074" },
  { name: "Home Science", slug: "home-science", code: "HMS-064" },
  { name: "Fine Arts & Painting", slug: "fine-arts-painting", code: "FA-049" },
  { name: "Graphic Design & Commercial Art", slug: "graphic-design-k12", code: "GD-050" },
  { name: "Hindustani Music (Vocal / Instrumental)", slug: "hindustani-music", code: "HMUS-034" },
  { name: "Carnatic Music", slug: "carnatic-music", code: "CMUS-031" },
  { name: "General Knowledge & Current Affairs (School)", slug: "general-knowledge-school", code: "GK-SCH" },

  // Languages & Literature (School & Higher Ed)
  { name: "English Core", slug: "english-core", code: "ENG-301" },
  { name: "English Elective", slug: "english-elective", code: "ENG-001" },
  { name: "English Language & Communication", slug: "english-communication", code: "ENG-COMM" },
  { name: "Hindi Core", slug: "hindi-core", code: "HIN-302" },
  { name: "Hindi Elective", slug: "hindi-elective", code: "HIN-002" },
  { name: "Sanskrit Core", slug: "sanskrit-core", code: "SAN-322" },
  { name: "Urdu", slug: "urdu", code: "URDU-303" },
  { name: "Bengali", slug: "bengali", code: "BEN-105" },
  { name: "Marathi", slug: "marathi", code: "MAR-109" },
  { name: "Tamil", slug: "tamil", code: "TAM-106" },
  { name: "Telugu", slug: "telugu", code: "TEL-107" },
  { name: "Kannada", slug: "kannada", code: "KAN-115" },
  { name: "Malayalam", slug: "malayalam", code: "MAL-112" },
  { name: "Gujarati", slug: "gujarati", code: "GUJ-110" },
  { name: "Punjabi", slug: "punjabi", code: "PUN-104" },
  { name: "Odia", slug: "odia", code: "ODI-113" },
  { name: "Assamese", slug: "assamese", code: "ASM-114" },
  { name: "French", slug: "french", code: "FRN-018" },
  { name: "German", slug: "german", code: "GER-020" },
  { name: "Spanish", slug: "spanish", code: "SPN-096" },
  { name: "Arabic", slug: "arabic", code: "ARB-016" },

  // Higher Education: Computer Science & Information Technology (B.Tech / BCA / MCA / M.Tech)
  { name: "Data Structures and Algorithms (DSA)", slug: "data-structures-algorithms", code: "CS-DSA" },
  { name: "Design and Analysis of Algorithms (DAA)", slug: "design-analysis-algorithms", code: "CS-DAA" },
  { name: "Database Management Systems (DBMS)", slug: "database-management-systems", code: "CS-DBMS" },
  { name: "Operating Systems", slug: "operating-systems", code: "CS-OS" },
  { name: "Computer Networks", slug: "computer-networks", code: "CS-CN" },
  { name: "Theory of Computation & Automata (TOC)", slug: "theory-of-computation", code: "CS-TOC" },
  { name: "Compiler Design", slug: "compiler-design", code: "CS-CD" },
  { name: "Computer Organization and Architecture (COA)", slug: "computer-organization-architecture", code: "CS-COA" },
  { name: "Software Engineering", slug: "software-engineering", code: "CS-SE" },
  { name: "Object Oriented Programming in Java", slug: "oop-java", code: "CS-JAVA" },
  { name: "Programming in C and C++", slug: "programming-c-cpp", code: "CS-CPP" },
  { name: "Python Programming & Applications", slug: "python-programming", code: "CS-PY" },
  { name: "Web Technologies & Full Stack Development", slug: "web-technologies-full-stack", code: "CS-WEB" },
  { name: "Artificial Intelligence & Expert Systems", slug: "artificial-intelligence-college", code: "CS-AI" },
  { name: "Machine Learning & Pattern Recognition", slug: "machine-learning", code: "CS-ML" },
  { name: "Deep Learning & Neural Networks", slug: "deep-learning", code: "CS-DL" },
  { name: "Natural Language Processing (NLP)", slug: "natural-language-processing", code: "CS-NLP" },
  { name: "Cloud Computing & Distributed Systems", slug: "cloud-computing", code: "CS-CLOUD" },
  { name: "Cyber Security and Cryptography", slug: "cyber-security-cryptography", code: "CS-SEC" },
  { name: "Big Data Analytics & Data Science", slug: "big-data-analytics", code: "CS-DATA" },
  { name: "Internet of Things (IoT)", slug: "internet-of-things", code: "CS-IOT" },
  { name: "DevOps & CI/CD Pipelines", slug: "devops-cicd", code: "CS-DEVOPS" },
  { name: "Blockchain Technology", slug: "blockchain-technology", code: "CS-BLOCKCHAIN" },
  { name: "Discrete Mathematics for Computing", slug: "discrete-mathematics", code: "MATH-DISC" },

  // Higher Education: Core Engineering (Mechanical, Civil, Electrical, Electronics)
  { name: "Engineering Mechanics", slug: "engineering-mechanics", code: "ENG-MECH" },
  { name: "Strength of Materials (Solid Mechanics)", slug: "strength-of-materials", code: "MECH-SOM" },
  { name: "Thermodynamics", slug: "thermodynamics", code: "MECH-THERMO" },
  { name: "Fluid Mechanics and Hydraulic Machines", slug: "fluid-mechanics", code: "MECH-FM" },
  { name: "Heat and Mass Transfer", slug: "heat-mass-transfer", code: "MECH-HMT" },
  { name: "Kinematics and Dynamics of Machinery", slug: "kinematics-dynamics-machinery", code: "MECH-DOM" },
  { name: "Manufacturing Technology & Machining", slug: "manufacturing-technology", code: "MECH-MFG" },
  { name: "Design of Machine Elements", slug: "design-machine-elements", code: "MECH-DME" },
  { name: "Automobile Engineering", slug: "automobile-engineering", code: "MECH-AUTO" },
  { name: "CAD/CAM & Robotics", slug: "cad-cam-robotics", code: "MECH-ROBOTICS" },
  { name: "Basic Electrical Engineering", slug: "basic-electrical-engineering", code: "EE-BEE" },
  { name: "Analog and Digital Electronics", slug: "analog-digital-electronics", code: "ECE-ADE" },
  { name: "Electrical Machines (AC/DC)", slug: "electrical-machines", code: "EE-EM" },
  { name: "Power Systems (Transmission & Distribution)", slug: "power-systems", code: "EE-PS" },
  { name: "Power Electronics & Drives", slug: "power-electronics", code: "EE-PE" },
  { name: "Control Systems", slug: "control-systems", code: "EE-CS" },
  { name: "Signals and Systems", slug: "signals-and-systems", code: "ECE-SS" },
  { name: "Digital Signal Processing (DSP)", slug: "digital-signal-processing", code: "ECE-DSP" },
  { name: "Microprocessors & Microcontrollers (8086/ARM)", slug: "microprocessors-microcontrollers", code: "ECE-MPMC" },
  { name: "VLSI Design & Embedded Systems", slug: "vlsi-embedded-systems", code: "ECE-VLSI" },
  { name: "Electromagnetic Field Theory & Antennas", slug: "electromagnetic-theory", code: "ECE-EMFT" },
  { name: "Engineering Surveying", slug: "engineering-surveying", code: "CIVIL-SURVEY" },
  { name: "Structural Analysis", slug: "structural-analysis", code: "CIVIL-SA" },
  { name: "Design of Reinforced Concrete Structures (RCC)", slug: "design-rcc-structures", code: "CIVIL-RCC" },
  { name: "Design of Steel Structures", slug: "design-steel-structures", code: "CIVIL-STEEL" },
  { name: "Geotechnical Engineering & Soil Mechanics", slug: "geotechnical-engineering", code: "CIVIL-GEOTECH" },
  { name: "Transportation & Highway Engineering", slug: "transportation-engineering", code: "CIVIL-TRANS" },
  { name: "Environmental Engineering & Water Resources", slug: "environmental-engineering-college", code: "CIVIL-ENV" },
  { name: "Building Materials & Construction Management", slug: "construction-management", code: "CIVIL-CONST" },

  // Higher Education: Management, Business & Commerce (BBA / MBA / B.Com / M.Com)
  { name: "Principles and Practices of Management", slug: "principles-of-management", code: "MGT-PPM" },
  { name: "Marketing Management", slug: "marketing-management", code: "MGT-MKT" },
  { name: "Financial Management & Corporate Finance", slug: "financial-management", code: "MGT-FIN" },
  { name: "Human Resource Management (HRM)", slug: "human-resource-management", code: "MGT-HRM" },
  { name: "Organizational Behaviour", slug: "organizational-behaviour", code: "MGT-OB" },
  { name: "Operations & Supply Chain Management", slug: "operations-supply-chain-management", code: "MGT-OSCM" },
  { name: "Strategic Management & Business Policy", slug: "strategic-management", code: "MGT-STRAT" },
  { name: "Managerial Economics", slug: "managerial-economics", code: "MGT-ECO" },
  { name: "Financial Accounting & Reporting", slug: "financial-accounting-college", code: "COM-FA" },
  { name: "Corporate Accounting", slug: "corporate-accounting", code: "COM-CA" },
  { name: "Management Accounting & Decision Making", slug: "management-accounting", code: "COM-MA" },
  { name: "Auditing and Corporate Governance", slug: "auditing-corporate-governance", code: "COM-AUDIT" },
  { name: "Income Tax Law and Practice", slug: "income-tax-law", code: "COM-ITAX" },
  { name: "Goods and Services Tax (GST) & Customs", slug: "gst-indirect-taxes", code: "COM-GST" },
  { name: "Business Law & Commercial Jurisprudence", slug: "business-law", code: "COM-BLAW" },
  { name: "Company Law", slug: "company-law", code: "COM-CLAW" },
  { name: "Digital Marketing & E-Commerce", slug: "digital-marketing-ecommerce", code: "MGT-DIGITAL" },
  { name: "Business Analytics & Predictive Modeling", slug: "business-analytics", code: "MGT-BA" },
  { name: "International Business & Global Trade", slug: "international-business", code: "MGT-IB" },
  { name: "Consumer Behaviour & Market Research", slug: "consumer-behaviour", code: "MGT-CB" },

  // Higher Education: Medical, Dental, Pharmacy & Nursing (MBBS / BDS / B.Pharm / B.Sc Nursing)
  { name: "Human Anatomy", slug: "human-anatomy", code: "MED-ANAT" },
  { name: "Human Physiology", slug: "human-physiology", code: "MED-PHYS" },
  { name: "Medical Biochemistry", slug: "medical-biochemistry", code: "MED-BIOCHEM" },
  { name: "Pharmacology & Therapeutics", slug: "pharmacology-therapeutics", code: "MED-PHARM" },
  { name: "Pathology", slug: "pathology", code: "MED-PATH" },
  { name: "Medical Microbiology", slug: "medical-microbiology", code: "MED-MICRO" },
  { name: "Forensic Medicine & Toxicology (FMT)", slug: "forensic-medicine-toxicology", code: "MED-FMT" },
  { name: "Community Medicine & Public Health (PSM)", slug: "community-medicine-psm", code: "MED-PSM" },
  { name: "Otorhinolaryngology (ENT)", slug: "otorhinolaryngology-ent", code: "MED-ENT" },
  { name: "Ophthalmology", slug: "ophthalmology", code: "MED-OPHTH" },
  { name: "General Medicine", slug: "general-medicine", code: "MED-MEDICINE" },
  { name: "General Surgery", slug: "general-surgery", code: "MED-SURGERY" },
  { name: "Pediatrics", slug: "pediatrics", code: "MED-PED" },
  { name: "Obstetrics and Gynecology (OBG)", slug: "obstetrics-gynecology", code: "MED-OBG" },
  { name: "Orthopedics & Traumatology", slug: "orthopedics", code: "MED-ORTHO" },
  { name: "Dermatology, Venereology & Leprosy", slug: "dermatology", code: "MED-DERMA" },
  { name: "Psychiatry", slug: "psychiatry", code: "MED-PSYCH" },
  { name: "Dental Anatomy, Embryology & Oral Histology", slug: "dental-anatomy", code: "DENT-ANAT" },
  { name: "Oral Pathology & Oral Microbiology", slug: "oral-pathology", code: "DENT-PATH" },
  { name: "Conservative Dentistry & Endodontics", slug: "conservative-dentistry-endodontics", code: "DENT-ENDO" },
  { name: "Orthodontics & Dentofacial Orthopedics", slug: "orthodontics", code: "DENT-ORTHO" },
  { name: "Oral & Maxillofacial Surgery", slug: "oral-maxillofacial-surgery", code: "DENT-SURG" },
  { name: "Pharmaceutics", slug: "pharmaceutics", code: "PHARM-CEUTICS" },
  { name: "Pharmaceutical Chemistry & Medicinal Chemistry", slug: "medicinal-chemistry", code: "PHARM-MEDCHEM" },
  { name: "Pharmacognosy & Phytochemistry", slug: "pharmacognosy", code: "PHARM-COG" },
  { name: "Pharmaceutical Analysis", slug: "pharmaceutical-analysis", code: "PHARM-ANALYSIS" },
  { name: "Nursing Foundations & Clinical Practice", slug: "nursing-foundations", code: "NURSE-FND" },
  { name: "Medical-Surgical Nursing", slug: "medical-surgical-nursing", code: "NURSE-MSN" },
  { name: "Community Health Nursing", slug: "community-health-nursing", code: "NURSE-CHN" },
  { name: "Midwifery & Obstetrical Nursing", slug: "midwifery-nursing", code: "NURSE-MID" },

  // Higher Education: Law & Jurisprudence (LLB / BA LLB / LLM)
  { name: "Constitutional Law of India", slug: "constitutional-law-india", code: "LAW-CONST" },
  { name: "Jurisprudence & Legal Theory", slug: "jurisprudence-legal-theory", code: "LAW-JURIS" },
  { name: "Law of Contracts and Specific Relief", slug: "law-of-contracts", code: "LAW-CONTRACT" },
  { name: "Law of Torts and Consumer Protection", slug: "law-of-torts", code: "LAW-TORT" },
  { name: "Criminal Law (Indian Penal Code / BNS)", slug: "criminal-law-ipc-bns", code: "LAW-CRIM" },
  { name: "Criminal Procedure Code (CrPC / BNSS)", slug: "criminal-procedure-crpc", code: "LAW-CRPC" },
  { name: "Law of Evidence (IEA / BSA)", slug: "law-of-evidence", code: "LAW-EVID" },
  { name: "Code of Civil Procedure & Limitation (CPC)", slug: "civil-procedure-code", code: "LAW-CPC" },
  { name: "Family Law (Hindu Law and Muslim Law)", slug: "family-law", code: "LAW-FAMILY" },
  { name: "Property Law and Transfer of Property Act", slug: "property-law", code: "LAW-PROP" },
  { name: "Administrative Law", slug: "administrative-law", code: "LAW-ADMIN" },
  { name: "Public International Law & Human Rights", slug: "public-international-law", code: "LAW-PIL" },
  { name: "Labour and Industrial Laws", slug: "labour-industrial-laws", code: "LAW-LABOUR" },
  { name: "Environmental Law", slug: "environmental-law", code: "LAW-ENV" },
  { name: "Intellectual Property Rights (IPR)", slug: "intellectual-property-rights", code: "LAW-IPR" },
  { name: "Alternative Dispute Resolution (ADR)", slug: "alternative-dispute-resolution", code: "LAW-ADR" },
  { name: "Cyber Law & Information Technology Law", slug: "cyber-law-it-act", code: "LAW-CYBER" },
  { name: "Professional Ethics & Bar-Bench Relations", slug: "professional-legal-ethics", code: "LAW-ETHICS" },

  // Coaching & Competitive Examinations (JEE, NEET, UPSC, SSC, Banking, GATE, CAT, Defence, Teaching)
  { name: "Physics for JEE (Main & Advanced)", slug: "physics-jee", code: "JEE-PHY" },
  { name: "Physical Chemistry for JEE", slug: "physical-chemistry-jee", code: "JEE-PCHEM" },
  { name: "Inorganic Chemistry for JEE", slug: "inorganic-chemistry-jee", code: "JEE-ICHEM" },
  { name: "Organic Chemistry for JEE", slug: "organic-chemistry-jee", code: "JEE-OCHEM" },
  { name: "Mathematics for JEE (Main & Advanced)", slug: "mathematics-jee", code: "JEE-MATH" },
  { name: "Physics for NEET-UG", slug: "physics-neet", code: "NEET-PHY" },
  { name: "Chemistry for NEET-UG", slug: "chemistry-neet", code: "NEET-CHEM" },
  { name: "Botany for NEET-UG", slug: "botany-neet", code: "NEET-BOT" },
  { name: "Zoology for NEET-UG", slug: "zoology-neet", code: "NEET-ZOO" },
  { name: "UPSC General Studies Paper 1 (History, Art & Culture, Geography, Society)", slug: "upsc-gs-1", code: "UPSC-GS1" },
  { name: "UPSC General Studies Paper 2 (Polity, Governance, Constitution, IR)", slug: "upsc-gs-2", code: "UPSC-GS2" },
  { name: "UPSC General Studies Paper 3 (Economy, Agriculture, Science & Tech, Environment, Security)", slug: "upsc-gs-3", code: "UPSC-GS3" },
  { name: "UPSC General Studies Paper 4 (Ethics, Integrity and Aptitude)", slug: "upsc-gs-4", code: "UPSC-GS4" },
  { name: "UPSC CSAT (Civil Services Aptitude Test)", slug: "upsc-csat", code: "UPSC-CSAT" },
  { name: "UPSC Essay Paper", slug: "upsc-essay", code: "UPSC-ESSAY" },
  { name: "Current Affairs & National/International Issues", slug: "current-affairs-competitive", code: "COMP-CA" },
  { name: "Quantitative Aptitude for Competitive Exams", slug: "quantitative-aptitude", code: "COMP-QA" },
  { name: "Reasoning Ability & Logical Reasoning", slug: "reasoning-ability-logical", code: "COMP-REAS" },
  { name: "Verbal Ability & English Language for Competitive Exams", slug: "verbal-ability-english", code: "COMP-ENG" },
  { name: "General Awareness & Static GK", slug: "general-awareness-static-gk", code: "COMP-GA" },
  { name: "Banking & Financial Awareness", slug: "banking-financial-awareness", code: "COMP-BANK" },
  { name: "Computer Knowledge & Aptitude (Bank/SSC/RRB)", slug: "computer-aptitude-competitive", code: "COMP-COMP" },
  { name: "UGC NET Paper 1 (Teaching & Research Aptitude)", slug: "ugc-net-paper-1", code: "NET-P1" },
  { name: "GATE Engineering Mathematics", slug: "gate-engineering-mathematics", code: "GATE-MATH" },
  { name: "GATE General Aptitude", slug: "gate-general-aptitude", code: "GATE-GA" },
  { name: "CAT Quantitative Aptitude (QA)", slug: "cat-quantitative-aptitude", code: "CAT-QA" },
  { name: "CAT Data Interpretation & Logical Reasoning (DILR)", slug: "cat-dilr", code: "CAT-DILR" },
  { name: "CAT Verbal Ability & Reading Comprehension (VARC)", slug: "cat-varc", code: "CAT-VARC" },
  { name: "Legal Reasoning for CLAT", slug: "legal-reasoning-clat", code: "CLAT-LEGAL" },
  { name: "NDA Mathematics", slug: "nda-mathematics", code: "NDA-MATH" },
  { name: "NDA General Ability Test (GAT)", slug: "nda-gat", code: "NDA-GAT" },
  { name: "Child Development and Pedagogy (CTET / State TET)", slug: "child-development-pedagogy", code: "TET-CDP" },
  { name: "Teaching Methodology & Educational Psychology", slug: "teaching-methodology-pedagogy", code: "TEACH-PED" },
];

async function seedAll() {
  console.log("================================================================================");
  console.log("🚀 STARTING COMPREHENSIVE ALL-INDIA MASTER DATA SEEDING");
  console.log("================================================================================");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Ensure tables exist
    console.log("\n📦 1. Ensuring Database Tables & Columns...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS boards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        deleted_at TIMESTAMPTZ,
        deleted_by INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE boards ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE boards ADD COLUMN IF NOT EXISTS deleted_by INT;
      CREATE INDEX IF NOT EXISTS idx_boards_slug ON boards (slug);
      CREATE INDEX IF NOT EXISTS idx_boards_active ON boards (is_active, is_deleted);

      CREATE TABLE IF NOT EXISTS universities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(100),
        university_type VARCHAR(100) DEFAULT 'central',
        country VARCHAR(100) DEFAULT 'India',
        state VARCHAR(100),
        city VARCHAR(100),
        website_url VARCHAR(500),
        logo_url VARCHAR(500),
        established_year INT,
        accreditation VARCHAR(255),
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        deleted_at TIMESTAMPTZ,
        deleted_by INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS code VARCHAR(100);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS university_type VARCHAR(100) DEFAULT 'central';
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS state VARCHAR(100);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS established_year INT;
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS accreditation VARCHAR(255);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS deleted_by INT;
      CREATE INDEX IF NOT EXISTS idx_universities_slug ON universities (slug);
      CREATE INDEX IF NOT EXISTS idx_universities_active ON universities (is_active, is_deleted);

      CREATE TABLE IF NOT EXISTS certification_providers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        provider_type VARCHAR(100) NOT NULL DEFAULT 'certification',
        code VARCHAR(100),
        website_url VARCHAR(500),
        logo_url VARCHAR(500),
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        deleted_at TIMESTAMPTZ,
        deleted_by INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE certification_providers ADD COLUMN IF NOT EXISTS provider_type VARCHAR(100) DEFAULT 'certification';
      ALTER TABLE certification_providers ADD COLUMN IF NOT EXISTS code VARCHAR(100);
      ALTER TABLE certification_providers ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);
      ALTER TABLE certification_providers ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
      ALTER TABLE certification_providers ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE certification_providers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE certification_providers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE certification_providers ADD COLUMN IF NOT EXISTS deleted_by INT;
      CREATE INDEX IF NOT EXISTS idx_cert_providers_slug ON certification_providers (slug);
      CREATE INDEX IF NOT EXISTS idx_cert_providers_active ON certification_providers (is_active, is_deleted);

      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        category_id INT,
        board_id INT,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        code VARCHAR(100),
        icon_url VARCHAR(500),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        deleted_at TIMESTAMPTZ,
        deleted_by INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE subjects ALTER COLUMN category_id DROP NOT NULL;
      ALTER TABLE subjects ALTER COLUMN board_id DROP NOT NULL;
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS course_id INT;
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code VARCHAR(100);
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500);
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS deleted_by INT;
      CREATE INDEX IF NOT EXISTS idx_subjects_slug ON subjects (slug);
      CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects (is_active, is_deleted);
    `);

    // 2. SEED BOARDS
    console.log(`\n📚 2. Seeding ${ALL_BOARDS.length} Educational Boards...`);
    let boardsInserted = 0;
    for (const b of ALL_BOARDS) {
      const res = await client.query(
        `
        INSERT INTO boards (name, slug, is_active, is_deleted)
        VALUES ($1, $2, TRUE, FALSE)
        ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            is_active = TRUE,
            is_deleted = FALSE
        RETURNING id
        `,
        [b.name, b.slug]
      );
      if (res.rowCount > 0) boardsInserted++;
    }
    console.log(`   ✅ Processed ${boardsInserted} Boards successfully.`);

    // 3. SEED UNIVERSITIES
    console.log(`\n🏛️ 3. Seeding ${ALL_UNIVERSITIES.length} Universities & Premier Institutes...`);
    let universitiesInserted = 0;
    for (const u of ALL_UNIVERSITIES) {
      const res = await client.query(
        `
        INSERT INTO universities (
          name, slug, code, university_type, country, state, city,
          website_url, established_year, accreditation, description,
          is_active, is_deleted, updated_at
        )
        VALUES ($1, $2, $3, $4, 'India', $5, $6, $7, $8, $9, $10, TRUE, FALSE, NOW())
        ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            code = EXCLUDED.code,
            university_type = EXCLUDED.university_type,
            state = EXCLUDED.state,
            city = EXCLUDED.city,
            website_url = EXCLUDED.website_url,
            established_year = EXCLUDED.established_year,
            accreditation = EXCLUDED.accreditation,
            description = EXCLUDED.description,
            is_active = TRUE,
            is_deleted = FALSE,
            updated_at = NOW()
        RETURNING id
        `,
        [
          u.name,
          u.slug,
          u.code || null,
          u.university_type || 'central',
          u.state || null,
          u.city || null,
          u.website_url || null,
          u.established_year || null,
          u.accreditation || null,
          u.description || null,
        ]
      );
      if (res.rowCount > 0) universitiesInserted++;
    }
    console.log(`   ✅ Processed ${universitiesInserted} Universities & Premier Institutes successfully.`);

    // 4. SEED AFFILIATIONS & CERTIFICATIONS
    console.log(`\n📜 4. Seeding ${ALL_CERT_PROVIDERS.length} Affiliation & Certification Authorities...`);
    let certsInserted = 0;
    for (const c of ALL_CERT_PROVIDERS) {
      const res = await client.query(
        `
        INSERT INTO certification_providers (
          name, slug, code, provider_type, website_url, description,
          is_active, is_deleted, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE, NOW())
        ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            code = EXCLUDED.code,
            provider_type = EXCLUDED.provider_type,
            website_url = EXCLUDED.website_url,
            description = EXCLUDED.description,
            is_active = TRUE,
            is_deleted = FALSE,
            updated_at = NOW()
        RETURNING id
        `,
        [
          c.name,
          c.slug,
          c.code || null,
          c.provider_type || 'certification',
          c.website_url || null,
          c.description || null,
        ]
      );
      if (res.rowCount > 0) certsInserted++;
    }
    console.log(`   ✅ Processed ${certsInserted} Affiliation & Certification Authorities successfully.`);

    // 5. SEED SUBJECTS
    console.log(`\n📖 5. Seeding ${ALL_SUBJECTS.length} Subjects (School, Higher Ed, Competitive Exams)...`);
    let subjectsInserted = 0;
    for (const s of ALL_SUBJECTS) {
      // Check if subject already exists by name or slug
      const existing = await client.query(
        `SELECT id FROM subjects WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) OR slug = $2 LIMIT 1`,
        [s.name, s.slug]
      );

      if (existing.rows.length > 0) {
        await client.query(
          `
          UPDATE subjects
          SET name = $1,
              slug = $2,
              code = COALESCE($3, code),
              is_active = TRUE,
              is_deleted = FALSE,
              updated_at = NOW()
          WHERE id = $4
          `,
          [s.name, s.slug, s.code || null, existing.rows[0].id]
        );
      } else {
        await client.query(
          `
          INSERT INTO subjects (
            name, slug, code, is_active, is_deleted, created_at, updated_at
          )
          VALUES ($1, $2, $3, TRUE, FALSE, NOW(), NOW())
          `,
          [s.name, s.slug, s.code || null]
        );
      }
      subjectsInserted++;
    }
    console.log(`   ✅ Processed ${subjectsInserted} Subjects successfully.`);

    await client.query("COMMIT");

    // Print final database summary count
    const [bCount, uCount, cCount, sCount] = await Promise.all([
      client.query(`SELECT COUNT(*)::int AS count FROM boards WHERE is_deleted = FALSE`),
      client.query(`SELECT COUNT(*)::int AS count FROM universities WHERE is_deleted = FALSE`),
      client.query(`SELECT COUNT(*)::int AS count FROM certification_providers WHERE is_deleted = FALSE`),
      client.query(`SELECT COUNT(*)::int AS count FROM subjects WHERE is_deleted = FALSE`),
    ]);

    console.log("\n================================================================================");
    console.log("🎉 ALL-INDIA MASTER DATA SEEDING COMPLETE!");
    console.log("================================================================================");
    console.log(`📊 Current Active Totals in Database:`);
    console.log(`   🔹 Boards:                    ${bCount.rows[0].count}`);
    console.log(`   🔹 Universities & Institutes: ${uCount.rows[0].count}`);
    console.log(`   🔹 Affiliations / Certs:      ${cCount.rows[0].count}`);
    console.log(`   🔹 Academic Subjects:         ${sCount.rows[0].count}`);
    console.log("================================================================================\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAll();
