// scripts/seed-india-courses-programs.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

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
  console.error("ERROR: DATABASE_URL is not set");
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

async function seedCourses() {
  console.log("================================================================================");
  console.log("🚀 STARTING COMPREHENSIVE ALL-INDIA COURSES & PROGRAMS SEEDING");
  console.log("================================================================================");

  const client = await pool.connect();
  try {
    // 1. Fetch available Boards, Universities, Certification Providers, Categories, and Subjects
    console.log("\n🔍 1. Loading lookup reference tables from database...");
    const [boardsRes, univsRes, certsRes, catsRes, subjsRes] = await Promise.all([
      client.query(`SELECT id, name, slug FROM boards WHERE is_deleted = FALSE`),
      client.query(`SELECT id, name, slug, code FROM universities WHERE is_deleted = FALSE`),
      client.query(`SELECT id, name, slug, code FROM certification_providers WHERE is_deleted = FALSE`),
      client.query(`SELECT id, name, slug, depth, parent_id FROM categories WHERE is_deleted = FALSE`),
      client.query(`SELECT id, name, slug, code FROM subjects WHERE is_deleted = FALSE`),
    ]);

    const boards = boardsRes.rows;
    const universities = univsRes.rows;
    const certProviders = certsRes.rows;
    const categories = catsRes.rows;
    const subjects = subjsRes.rows;

    console.log(`   Found ${boards.length} Boards, ${universities.length} Universities, ${certProviders.length} Cert Providers, ${categories.length} Categories, ${subjects.length} Subjects.`);

    // Helper functions to find IDs
    function findBoard(query) {
      const q = query.toLowerCase();
      return boards.find((b) => b.slug.includes(q) || b.name.toLowerCase().includes(q)) || boards[0];
    }

    function findUniversity(query) {
      const q = query.toLowerCase();
      return universities.find((u) => u.slug.includes(q) || u.name.toLowerCase().includes(q) || (u.code && u.code.toLowerCase() === q));
    }

    function findCertProvider(query) {
      const q = query.toLowerCase();
      return certProviders.find((c) => c.slug.includes(q) || c.name.toLowerCase().includes(q) || (c.code && c.code.toLowerCase().includes(q)));
    }

    function findCategory(query, parentId = null) {
      const q = query.toLowerCase();
      let match = categories.find((c) => (c.name.toLowerCase() === q || c.slug === q) && (parentId === null || c.parent_id === parentId));
      if (!match) {
        match = categories.find((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q));
      }
      return match ? match.id : (categories.find((c) => c.depth === 1)?.id || categories[0].id);
    }

    function findSubjectIds(subjectNames) {
      const ids = [];
      for (const name of subjectNames) {
        const q = name.toLowerCase();
        const found = subjects.find((s) => s.name.toLowerCase() === q || s.slug === q || s.name.toLowerCase().includes(q));
        if (found && !ids.includes(found.id)) {
          ids.push(found.id);
        }
      }
      return ids;
    }

    // Common Board References
    const cbse = findBoard("cbse");
    const icse = findBoard("cisce") || findBoard("icse");
    const nios = findBoard("nios");
    const upBoard = findBoard("upmsp") || findBoard("up board");
    const maharashtraBoard = findBoard("msbshse") || findBoard("maharashtra");
    const karnatakaBoard = findBoard("kseeb") || findBoard("karnataka");
    const tamilNaduBoard = findBoard("tndge") || findBoard("tamil nadu");
    const biharBoard = findBoard("bseb") || findBoard("bihar");
    const westBengalBoard = findBoard("wbbse") || findBoard("west bengal");
    const rajasthanBoard = findBoard("rbse") || findBoard("rajasthan");
    const gujaratBoard = findBoard("gseb") || findBoard("gujarat");
    const keralaBoard = findBoard("kbpe") || findBoard("kerala");
    const cambridge = findBoard("cambridge") || findBoard("cie");
    const ib = findBoard("international-baccalaureate") || findBoard("ib");

    // Common University References
    const du = findUniversity("delhi") || universities[0];
    const jnu = findUniversity("jawaharlal") || universities[0];
    const bhu = findUniversity("banaras") || universities[0];
    const amu = findUniversity("aligarh") || universities[0];
    const jmi = findUniversity("jamia") || universities[0];
    const iitBombay = findUniversity("iit-bombay") || universities[0];
    const iitDelhi = findUniversity("iit-delhi") || universities[0];
    const iitMadras = findUniversity("iit-madras") || universities[0];
    const iitKanpur = findUniversity("iit-kanpur") || universities[0];
    const iitKgp = findUniversity("iit-kharagpur") || universities[0];
    const iitRoorkee = findUniversity("iit-roorkee") || universities[0];
    const iimAhmedabad = findUniversity("iim-ahmedabad") || universities[0];
    const iimBangalore = findUniversity("iim-bangalore") || universities[0];
    const iimCalcutta = findUniversity("iim-calcutta") || universities[0];
    const aiimsDelhi = findUniversity("aiims-new-delhi") || universities[0];
    const iisc = findUniversity("iisc") || universities[0];
    const nlsiu = findUniversity("nlsiu") || universities[0];
    const bitsPilani = findUniversity("bits-pilani") || universities[0];
    const manipal = findUniversity("manipal") || universities[0];
    const vit = findUniversity("vit") || universities[0];
    const amity = findUniversity("amity") || universities[0];
    const ignou = findUniversity("ignou") || universities[0];
    const mumbaiUniv = findUniversity("mumbai") || universities[0];
    const puneUniv = findUniversity("pune") || universities[0];
    const annaUniv = findUniversity("anna") || universities[0];
    const aktu = findUniversity("aktu") || universities[0];
    const vtu = findUniversity("vtu") || universities[0];

    // Common Certification References
    const ugc = findCertProvider("ugc") || certProviders[0];
    const aicte = findCertProvider("aicte") || certProviders[0];
    const nta = findCertProvider("nta") || certProviders[0];
    const nsdc = findCertProvider("nsdc") || certProviders[0];
    const icai = findCertProvider("icai") || certProviders[0];
    const icsi = findCertProvider("icsi") || certProviders[0];
    const icmai = findCertProvider("icmai") || certProviders[0];
    const google = findCertProvider("google") || certProviders[0];
    const microsoft = findCertProvider("microsoft") || certProviders[0];
    const aws = findCertProvider("aws") || certProviders[0];
    const cisco = findCertProvider("cisco") || certProviders[0];

    // Comprehensive Course Definitions
    const MASTER_COURSES_LIST = [
      // 1. K-12 School Courses (CBSE, ICSE, UP Board, State Boards, Cambridge, IB)
      // Pre-school & Primary
      {
        name: "Playgroup & Nursery Early Learning Program",
        slug: "playgroup-nursery-early-learning",
        code: "PRE-NURSERY",
        category_name: "Pre School",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "Foundational early childhood education fostering cognitive development, social interaction, sensory motor skills, and creative play.",
        subject_names: ["English Language & Communication", "Hindi Core", "General Knowledge & Current Affairs (School)", "Fine Arts & Painting"],
      },
      {
        name: "Kindergarten (LKG & UKG) Foundation Program",
        slug: "kindergarten-lkg-ukg-foundation",
        code: "PRE-KG",
        category_name: "Pre School",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "Kindergarten preparatory curriculum building literacy, numerical reasoning, phonics, and holistic development.",
        subject_names: ["Mathematics", "English Language & Communication", "Hindi Core", "Environmental Studies (EVS)", "Fine Arts & Painting"],
      },
      {
        name: "Class 1 (CBSE)",
        slug: "class-1-cbse",
        code: "CBSE-CL01",
        category_name: "Class 1",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 1 comprehensive curriculum establishing foundational literacy, numeracy, and environmental awareness.",
        subject_names: ["Mathematics", "English Core", "Hindi Core", "Environmental Studies (EVS)", "General Knowledge & Current Affairs (School)"],
      },
      {
        name: "Class 2 (CBSE)",
        slug: "class-2-cbse",
        code: "CBSE-CL02",
        category_name: "Class 2",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 2 program emphasizing language fluency, mathematical calculations, and creative thinking.",
        subject_names: ["Mathematics", "English Core", "Hindi Core", "Environmental Studies (EVS)", "General Knowledge & Current Affairs (School)"],
      },
      {
        name: "Class 3 (CBSE)",
        slug: "class-3-cbse",
        code: "CBSE-CL03",
        category_name: "Class 3",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 3 academic syllabus introducing structured science concepts, social environment, and problem solving.",
        subject_names: ["Mathematics", "English Core", "Hindi Core", "Environmental Studies (EVS)", "General Knowledge & Current Affairs (School)"],
      },
      {
        name: "Class 4 (CBSE)",
        slug: "class-4-cbse",
        code: "CBSE-CL04",
        category_name: "Class 4",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 4 comprehensive curriculum with intermediate mathematical concepts, environmental inquiry, and coding basics.",
        subject_names: ["Mathematics", "English Core", "Hindi Core", "Environmental Studies (EVS)", "Coding & Computational Thinking", "General Knowledge & Current Affairs (School)"],
      },
      {
        name: "Class 5 (CBSE)",
        slug: "class-5-cbse",
        code: "CBSE-CL05",
        category_name: "Class 5",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 5 primary completion syllabus preparing students for middle school academic rigor.",
        subject_names: ["Mathematics", "English Core", "Hindi Core", "Environmental Studies (EVS)", "Coding & Computational Thinking", "General Knowledge & Current Affairs (School)"],
      },
      {
        name: "Class 6 (CBSE)",
        slug: "class-6-cbse",
        code: "CBSE-CL06",
        category_name: "Class 6",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 6 middle school curriculum introducing distinct science branches, ancient history, geography, and Sanskrit.",
        subject_names: ["Mathematics", "General Science", "Social Science", "English Core", "Hindi Core", "Sanskrit Core", "Coding & Computational Thinking"],
      },
      {
        name: "Class 7 (CBSE)",
        slug: "class-7-cbse",
        code: "CBSE-CL07",
        category_name: "Class 7",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 7 middle school academic program covering algebraic fundamentals, physical science, and medieval history.",
        subject_names: ["Mathematics", "General Science", "Social Science", "English Core", "Hindi Core", "Sanskrit Core", "Coding & Computational Thinking"],
      },
      {
        name: "Class 8 (CBSE)",
        slug: "class-8-cbse",
        code: "CBSE-CL08",
        category_name: "Class 8",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 8 syllabus bridging middle school concepts to secondary education with laboratory practical foundations.",
        subject_names: ["Mathematics", "General Science", "Social Science", "English Core", "Hindi Core", "Sanskrit Core", "Artificial Intelligence (School Level)"],
      },
      {
        name: "Class 9 (CBSE)",
        slug: "class-9-cbse",
        code: "CBSE-CL09",
        category_name: "Class 9",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 9 secondary foundation syllabus covering algebra, coordinate geometry, physics, chemistry, biology, and contemporary world history.",
        subject_names: ["Mathematics", "Physics", "Chemistry", "Biology", "Social Science", "English Core", "Hindi Core", "Information Technology (Vocational)", "Artificial Intelligence (School Level)"],
      },
      {
        name: "Class 10 (CBSE - Board Examination)",
        slug: "class-10-cbse-board",
        code: "CBSE-CL10",
        category_name: "Class 10",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 10 Board Examination curriculum preparing students for AISSE national examinations with thorough conceptual and problem-solving mastery.",
        subject_names: ["Mathematics", "Physics", "Chemistry", "Biology", "Social Science", "English Core", "Hindi Core", "Information Technology (Vocational)", "Artificial Intelligence (School Level)"],
      },
      {
        name: "Class 11 Science (CBSE - PCM / PCB)",
        slug: "class-11-science-cbse",
        code: "CBSE-11-SCI",
        category_name: "Class 11",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 11 Senior Secondary Science stream program covering advanced physics, chemistry, mathematics, biology, and computer science.",
        subject_names: ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science (Python & C++)", "English Core", "Physical Education"],
      },
      {
        name: "Class 11 Commerce (CBSE)",
        slug: "class-11-commerce-cbse",
        code: "CBSE-11-COM",
        category_name: "Class 11",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 11 Senior Secondary Commerce curriculum covering financial accounting, business studies, microeconomics, and applied math.",
        subject_names: ["Accountancy", "Business Studies", "Economics", "Applied Mathematics", "Entrepreneurship", "English Core", "Physical Education"],
      },
      {
        name: "Class 11 Humanities & Arts (CBSE)",
        slug: "class-11-humanities-cbse",
        code: "CBSE-11-HUM",
        category_name: "Class 11",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 11 Humanities curriculum covering world history, political theory, psychology, sociology, and legal studies.",
        subject_names: ["History", "Political Science", "Geography", "Psychology", "Sociology", "Legal Studies", "English Core"],
      },
      {
        name: "Class 12 Science (CBSE - Board Examination)",
        slug: "class-12-science-cbse-board",
        code: "CBSE-12-SCI",
        category_name: "Class 12",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 12 Board Examination Science curriculum preparing students for AISSCE national board exams as well as engineering and medical entrance tests.",
        subject_names: ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science (Python & C++)", "English Core", "Physical Education"],
      },
      {
        name: "Class 12 Commerce (CBSE - Board Examination)",
        slug: "class-12-commerce-cbse-board",
        code: "CBSE-12-COM",
        category_name: "Class 12",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 12 Board Examination Commerce curriculum covering corporate accounting, business management, macroeconomics, and Indian economic development.",
        subject_names: ["Accountancy", "Business Studies", "Economics", "Applied Mathematics", "Entrepreneurship", "English Core"],
      },
      {
        name: "Class 12 Humanities (CBSE - Board Examination)",
        slug: "class-12-humanities-cbse-board",
        code: "CBSE-12-HUM",
        category_name: "Class 12",
        authority_type: "board",
        board_id: cbse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CBSE Class 12 Board Examination Humanities curriculum covering contemporary world politics, themes in Indian history, social change, and psychology.",
        subject_names: ["History", "Political Science", "Geography", "Psychology", "Sociology", "Legal Studies", "English Core"],
      },

      // ICSE & State Boards
      {
        name: "ICSE Class 10 (CISCE Board)",
        slug: "icse-class-10-cisce",
        code: "ICSE-CL10",
        category_name: "Class 10",
        authority_type: "board",
        board_id: icse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CISCE Indian Certificate of Secondary Education (ICSE) Class 10 comprehensive curriculum with intensive English, sciences, and mathematics.",
        subject_names: ["Mathematics", "Physics", "Chemistry", "Biology", "History", "Geography", "English Core", "Computer Science (Python & C++)"],
      },
      {
        name: "ISC Class 12 Science (CISCE Board)",
        slug: "isc-class-12-science-cisce",
        code: "ISC-12-SCI",
        category_name: "Class 12",
        authority_type: "board",
        board_id: icse?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "CISCE Indian School Certificate (ISC) Class 12 Science curriculum offering deep academic specialization in STEM subjects.",
        subject_names: ["Physics", "Chemistry", "Mathematics", "Biology", "English Core", "Computer Science (Python & C++)"],
      },
      {
        name: "Class 10 High School (UP Board - UPMSP)",
        slug: "class-10-high-school-up-board",
        code: "UPMSP-CL10",
        category_name: "Class 10",
        authority_type: "board",
        board_id: upBoard?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "UPMSP High School Class 10 curriculum in Hindi and English medium, aligned with state and national academic standards.",
        subject_names: ["Mathematics", "General Science", "Social Science", "Hindi Core", "English Core", "Sanskrit Core"],
      },
      {
        name: "Class 12 Intermediate (UP Board - UPMSP)",
        slug: "class-12-intermediate-up-board",
        code: "UPMSP-CL12",
        category_name: "Class 12",
        authority_type: "board",
        board_id: upBoard?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "UPMSP Intermediate Class 12 curriculum covering Science, Commerce, and Arts streams.",
        subject_names: ["Physics", "Chemistry", "Mathematics", "Biology", "Accountancy", "Business Studies", "Hindi Core", "English Core"],
      },
      {
        name: "Class 10 Secondary (Maharashtra State Board - MSBSHSE)",
        slug: "class-10-ssc-maharashtra-board",
        code: "MSBSHSE-SSC",
        category_name: "Class 10",
        authority_type: "board",
        board_id: maharashtraBoard?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "Maharashtra State Board SSC Class 10 curriculum with state and central syllabus integration.",
        subject_names: ["Mathematics", "General Science", "Social Science", "Marathi", "English Core", "Hindi Core"],
      },
      {
        name: "Class 12 HSC (Maharashtra State Board - MSBSHSE)",
        slug: "class-12-hsc-maharashtra-board",
        code: "MSBSHSE-HSC",
        category_name: "Class 12",
        authority_type: "board",
        board_id: maharashtraBoard?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "Maharashtra State Board HSC Class 12 curriculum spanning Science, Commerce, and Arts.",
        subject_names: ["Physics", "Chemistry", "Mathematics", "Biology", "Accountancy", "Economics", "English Core"],
      },
      {
        name: "Class 10 Secondary (Bihar Board - BSEB)",
        slug: "class-10-matric-bseb-bihar",
        code: "BSEB-MATRIC",
        category_name: "Class 10",
        authority_type: "board",
        board_id: biharBoard?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "Bihar School Examination Board Matric Class 10 academic curriculum.",
        subject_names: ["Mathematics", "General Science", "Social Science", "Hindi Core", "Sanskrit Core", "English Core"],
      },
      {
        name: "Class 12 Intermediate (Bihar Board - BSEB)",
        slug: "class-12-inter-bseb-bihar",
        code: "BSEB-INTER",
        category_name: "Class 12",
        authority_type: "board",
        board_id: biharBoard?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "BSEB Intermediate Class 12 Science, Commerce, and Arts syllabus.",
        subject_names: ["Physics", "Chemistry", "Mathematics", "Biology", "Accountancy", "Economics", "Hindi Core", "English Core"],
      },
      {
        name: "Secondary & Senior Secondary Open Schooling (NIOS)",
        slug: "nios-secondary-senior-secondary",
        code: "NIOS-10-12",
        category_name: "Class 12",
        authority_type: "board",
        board_id: nios?.id,
        duration_value: 1,
        duration_unit: "years",
        description: "National Institute of Open Schooling flexible curriculum designed for self-paced and vocational learners.",
        subject_names: ["Mathematics", "Physics", "Chemistry", "Biology", "Accountancy", "Business Studies", "Economics", "English Core"],
      },
      {
        name: "Cambridge IGCSE & International A-Levels",
        slug: "cambridge-igcse-a-levels",
        code: "CIE-IGCSE",
        category_name: "Class 12",
        authority_type: "board",
        board_id: cambridge?.id,
        duration_value: 2,
        duration_unit: "years",
        description: "International qualification curriculum recognized by top global universities.",
        subject_names: ["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Business Studies", "Computer Science (Python & C++)", "English Core"],
      },
      {
        name: "IB Diploma Programme (IBDP)",
        slug: "ib-diploma-programme-ibdp",
        code: "IBDP-11-12",
        category_name: "Class 12",
        authority_type: "board",
        board_id: ib?.id,
        duration_value: 2,
        duration_unit: "years",
        description: "International Baccalaureate 2-year pre-university educational program known for rigorous inquiry, Theory of Knowledge, and global perspective.",
        subject_names: ["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Psychology", "English Core"],
      },

      // 2. Undergraduate / Bachelor's Degrees (University & College)
      {
        name: "B.Tech in Computer Science and Engineering (CSE)",
        slug: "btech-computer-science-and-engineering",
        code: "BTECH-CSE",
        category_name: "B.Tech",
        authority_type: "university",
        university_id: iitBombay?.id,
        university_name: iitBombay?.name,
        duration_value: 4,
        duration_unit: "years",
        description: "4-Year Bachelor of Technology in Computer Science & Engineering covering algorithms, systems, AI, databases, and full stack development.",
        subject_names: [
          "Data Structures and Algorithms (DSA)",
          "Operating Systems",
          "Database Management Systems (DBMS)",
          "Computer Networks",
          "Artificial Intelligence & Expert Systems",
          "Machine Learning & Pattern Recognition",
          "Software Engineering",
          "Web Technologies & Full Stack Development",
          "Cyber Security and Cryptography",
        ],
      },
      {
        name: "B.Tech in Artificial Intelligence & Data Science",
        slug: "btech-artificial-intelligence-data-science",
        code: "BTECH-AIDS",
        category_name: "B.Tech",
        authority_type: "university",
        university_id: iitDelhi?.id,
        university_name: iitDelhi?.name,
        duration_value: 4,
        duration_unit: "years",
        description: "Specialized engineering program in Machine Learning, Deep Learning, Big Data Analytics, Neural Networks, and NLP.",
        subject_names: [
          "Artificial Intelligence & Expert Systems",
          "Machine Learning & Pattern Recognition",
          "Deep Learning & Neural Networks",
          "Natural Language Processing (NLP)",
          "Big Data Analytics & Data Science",
          "Data Structures and Algorithms (DSA)",
          "Python Programming & Applications",
        ],
      },
      {
        name: "B.Tech in Electronics and Communication Engineering (ECE)",
        slug: "btech-electronics-communication-engineering",
        code: "BTECH-ECE",
        category_name: "B.Tech",
        authority_type: "university",
        university_id: iitMadras?.id,
        university_name: iitMadras?.name,
        duration_value: 4,
        duration_unit: "years",
        description: "4-Year undergraduate program in VLSI design, digital signal processing, embedded systems, microprocessors, and wireless communications.",
        subject_names: [
          "Analog and Digital Electronics",
          "Signals and Systems",
          "Digital Signal Processing (DSP)",
          "Microprocessors & Microcontrollers (8086/ARM)",
          "VLSI Design & Embedded Systems",
          "Electromagnetic Field Theory & Antennas",
        ],
      },
      {
        name: "B.Tech in Mechanical Engineering",
        slug: "btech-mechanical-engineering",
        code: "BTECH-MECH",
        category_name: "B.Tech",
        authority_type: "university",
        university_id: iitKanpur?.id,
        university_name: iitKanpur?.name,
        duration_value: 4,
        duration_unit: "years",
        description: "Comprehensive 4-year degree in thermodynamics, fluid mechanics, CAD/CAM, robotics, dynamics of machines, and manufacturing.",
        subject_names: [
          "Engineering Mechanics",
          "Strength of Materials (Solid Mechanics)",
          "Thermodynamics",
          "Fluid Mechanics and Hydraulic Machines",
          "Heat and Mass Transfer",
          "Design of Machine Elements",
          "CAD/CAM & Robotics",
        ],
      },
      {
        name: "B.Tech in Civil Engineering",
        slug: "btech-civil-engineering",
        code: "BTECH-CIVIL",
        category_name: "B.Tech",
        authority_type: "university",
        university_id: iitRoorkee?.id,
        university_name: iitRoorkee?.name,
        duration_value: 4,
        duration_unit: "years",
        description: "4-Year civil engineering degree in structural analysis, RCC design, geotechnical mechanics, highway engineering, and construction management.",
        subject_names: [
          "Engineering Surveying",
          "Structural Analysis",
          "Design of Reinforced Concrete Structures (RCC)",
          "Design of Steel Structures",
          "Geotechnical Engineering & Soil Mechanics",
          "Transportation & Highway Engineering",
          "Environmental Engineering & Water Resources",
        ],
      },
      {
        name: "BBA (Bachelor of Business Administration)",
        slug: "bba-bachelor-of-business-administration",
        code: "BBA-GEN",
        category_name: "BBA",
        authority_type: "university",
        university_id: du?.id,
        university_name: du?.name,
        duration_value: 3,
        duration_unit: "years",
        description: "3-Year undergraduate program in managerial principles, marketing, financial accounting, human resources, and business analytics.",
        subject_names: [
          "Principles and Practices of Management",
          "Marketing Management",
          "Financial Management & Corporate Finance",
          "Human Resource Management (HRM)",
          "Organizational Behaviour",
          "Business Law & Commercial Jurisprudence",
          "Digital Marketing & E-Commerce",
        ],
      },
      {
        name: "B.Com (Bachelor of Commerce - Honours)",
        slug: "bcom-honours-commerce",
        code: "BCOM-HONS",
        category_name: "BCom",
        authority_type: "university",
        university_id: du?.id,
        university_name: du?.name,
        duration_value: 3,
        duration_unit: "years",
        description: "Top-tier commerce degree in corporate accounting, income tax laws, GST, auditing, financial markets, and management accounting.",
        subject_names: [
          "Financial Accounting & Reporting",
          "Corporate Accounting",
          "Management Accounting & Decision Making",
          "Income Tax Law and Practice",
          "Goods and Services Tax (GST) & Customs",
          "Auditing and Corporate Governance",
          "Company Law",
        ],
      },
      {
        name: "BCA (Bachelor of Computer Applications)",
        slug: "bca-bachelor-of-computer-applications",
        code: "BCA-IT",
        category_name: "BCA",
        authority_type: "university",
        university_id: puneUniv?.id,
        university_name: puneUniv?.name,
        duration_value: 3,
        duration_unit: "years",
        description: "3-Year applied computing degree in programming (Java, Python, C++), web development, cloud computing, DBMS, and software design.",
        subject_names: [
          "Programming in C and C++",
          "Object Oriented Programming in Java",
          "Python Programming & Applications",
          "Database Management Systems (DBMS)",
          "Data Structures and Algorithms (DSA)",
          "Web Technologies & Full Stack Development",
          "Operating Systems",
        ],
      },
      {
        name: "B.Sc in Computer Science & Data Analytics",
        slug: "bsc-computer-science-data-analytics",
        code: "BSC-CSDA",
        category_name: "B.Sc",
        authority_type: "university",
        university_id: du?.id,
        university_name: du?.name,
        duration_value: 3,
        duration_unit: "years",
        description: "Scientific computing curriculum with data science, discrete mathematics, statistical modeling, and machine learning.",
        subject_names: [
          "Data Structures and Algorithms (DSA)",
          "Big Data Analytics & Data Science",
          "Machine Learning & Pattern Recognition",
          "Discrete Mathematics for Computing",
          "Database Management Systems (DBMS)",
        ],
      },
      {
        name: "MBBS (Bachelor of Medicine and Bachelor of Surgery)",
        slug: "mbbs-medicine-surgery",
        code: "MBBS-MED",
        category_name: "MBBS",
        authority_type: "university",
        university_id: aiimsDelhi?.id,
        university_name: aiimsDelhi?.name,
        duration_value: 5,
        duration_unit: "years",
        description: "5.5-Year premier clinical medical degree (including 1-year compulsory rotating internship) recognized by National Medical Commission (NMC).",
        subject_names: [
          "Human Anatomy",
          "Human Physiology",
          "Medical Biochemistry",
          "Pharmacology & Therapeutics",
          "Pathology",
          "Medical Microbiology",
          "Forensic Medicine & Toxicology (FMT)",
          "Community Medicine & Public Health (PSM)",
          "General Medicine",
          "General Surgery",
          "Pediatrics",
          "Obstetrics and Gynecology (OBG)",
          "Ophthalmology",
          "Otorhinolaryngology (ENT)",
        ],
      },
      {
        name: "BDS (Bachelor of Dental Surgery)",
        slug: "bds-bachelor-of-dental-surgery-prog",
        code: "BDS-DENT",
        category_name: "BDS",
        authority_type: "university",
        university_id: manipal?.id,
        university_name: manipal?.name,
        duration_value: 5,
        duration_unit: "years",
        description: "5-Year professional dental surgery and oral healthcare degree approved by Dental Council of India (DCI).",
        subject_names: [
          "Dental Anatomy, Embryology & Oral Histology",
          "Oral Pathology & Oral Microbiology",
          "Conservative Dentistry & Endodontics",
          "Orthodontics & Dentofacial Orthopedics",
          "Oral & Maxillofacial Surgery",
          "Human Anatomy",
          "Human Physiology",
        ],
      },
      {
        name: "B.Pharm (Bachelor of Pharmacy)",
        slug: "bpharm-bachelor-of-pharmacy-prog",
        code: "BPHARM",
        category_name: "B.Pharm",
        authority_type: "university",
        university_id: bitsPilani?.id,
        university_name: bitsPilani?.name,
        duration_value: 4,
        duration_unit: "years",
        description: "4-Year degree in pharmaceutical chemistry, pharmaceutics, pharmacognosy, clinical pharmacy, and drug discovery approved by PCI.",
        subject_names: [
          "Pharmaceutics",
          "Pharmaceutical Chemistry & Medicinal Chemistry",
          "Pharmacognosy & Phytochemistry",
          "Pharmacology & Therapeutics",
          "Pharmaceutical Analysis",
        ],
      },
      {
        name: "B.Sc in Nursing",
        slug: "bsc-nursing-degree",
        code: "BSC-NURSE",
        category_name: "B.Sc",
        authority_type: "university",
        university_id: aiimsDelhi?.id,
        university_name: aiimsDelhi?.name,
        duration_value: 4,
        duration_unit: "years",
        description: "4-Year undergraduate professional nursing degree approved by Indian Nursing Council (INC).",
        subject_names: [
          "Nursing Foundations & Clinical Practice",
          "Medical-Surgical Nursing",
          "Community Health Nursing",
          "Midwifery & Obstetrical Nursing",
          "Human Anatomy",
          "Human Physiology",
        ],
      },
      {
        name: "BA LLB (Integrated 5-Year Honours Law Program)",
        slug: "ba-llb-integrated-honours",
        code: "BALLB-5YR",
        category_name: "BA LLB",
        authority_type: "university",
        university_id: nlsiu?.id,
        university_name: nlsiu?.name,
        duration_value: 5,
        duration_unit: "years",
        description: "5-Year integrated law degree approved by Bar Council of India (BCI) providing comprehensive legal, judicial, and corporate advocacy training.",
        subject_names: [
          "Constitutional Law of India",
          "Jurisprudence & Legal Theory",
          "Law of Contracts and Specific Relief",
          "Law of Torts and Consumer Protection",
          "Criminal Law (Indian Penal Code / BNS)",
          "Criminal Procedure Code (CrPC / BNSS)",
          "Law of Evidence (IEA / BSA)",
          "Code of Civil Procedure & Limitation (CPC)",
          "Company Law",
          "Intellectual Property Rights (IPR)",
          "Public International Law & Human Rights",
        ],
      },
      {
        name: "BA in Economics (Honours)",
        slug: "ba-economics-honours",
        code: "BA-ECO-HONS",
        category_name: "BA",
        authority_type: "university",
        university_id: du?.id,
        university_name: du?.name,
        duration_value: 3,
        duration_unit: "years",
        description: "3-Year prestigious economics degree covering microeconomics, macroeconomics, econometrics, developmental economics, and public finance.",
        subject_names: ["Economics", "Applied Mathematics", "Business Mathematics & Statistics", "Political Science"],
      },
      {
        name: "BA in Journalism & Mass Communication (BJMC)",
        slug: "ba-journalism-mass-communication-bjmc",
        code: "BJMC-MEDIA",
        category_name: "BA",
        authority_type: "university",
        university_id: jmi?.id,
        university_name: jmi?.name,
        duration_value: 3,
        duration_unit: "years",
        description: "3-Year professional media program in print, broadcast journalism, digital media, PR, advertising, and filmmaking.",
        subject_names: ["English Language & Communication", "Political Science", "Sociology", "Graphic Design & Commercial Art"],
      },

      // 3. Postgraduate / Master's Programs
      {
        name: "MBA (Master of Business Administration)",
        slug: "mba-master-of-business-administration",
        code: "MBA-EXEC",
        category_name: "MBA",
        authority_type: "university",
        university_id: iimAhmedabad?.id,
        university_name: iimAhmedabad?.name,
        duration_value: 2,
        duration_unit: "years",
        description: "Flagship 2-year postgraduate program in executive business management, strategic leadership, quantitative finance, and international business.",
        subject_names: [
          "Strategic Management & Business Policy",
          "Marketing Management",
          "Financial Management & Corporate Finance",
          "Human Resource Management (HRM)",
          "Operations & Supply Chain Management",
          "Business Analytics & Predictive Modeling",
          "Managerial Economics",
        ],
      },
      {
        name: "M.Tech in Computer Science & Engineering",
        slug: "mtech-computer-science-engineering",
        code: "MTECH-CSE",
        category_name: "M.Tech",
        authority_type: "university",
        university_id: iisc?.id,
        university_name: iisc?.name,
        duration_value: 2,
        duration_unit: "years",
        description: "2-Year advanced research and engineering masters covering distributed computing, advanced algorithms, deep learning, and cloud architectures.",
        subject_names: [
          "Design and Analysis of Algorithms (DAA)",
          "Deep Learning & Neural Networks",
          "Natural Language Processing (NLP)",
          "Cloud Computing & Distributed Systems",
          "Cyber Security and Cryptography",
          "Blockchain Technology",
        ],
      },
      {
        name: "MCA (Master of Computer Applications)",
        slug: "mca-master-of-computer-applications",
        code: "MCA-DEGREE",
        category_name: "MCA",
        authority_type: "university",
        university_id: jnu?.id,
        university_name: jnu?.name,
        duration_value: 2,
        duration_unit: "years",
        description: "2-Year postgraduate software engineering and enterprise computing degree.",
        subject_names: [
          "Data Structures and Algorithms (DSA)",
          "Database Management Systems (DBMS)",
          "Operating Systems",
          "Web Technologies & Full Stack Development",
          "Cloud Computing & Distributed Systems",
          "Python Programming & Applications",
        ],
      },
      {
        name: "LLM (Master of Laws - Corporate & Commercial Law)",
        slug: "llm-master-of-laws-corporate",
        code: "LLM-CORP",
        category_name: "LLM",
        authority_type: "university",
        university_id: nlsiu?.id,
        university_name: nlsiu?.name,
        duration_value: 1,
        duration_unit: "years",
        description: "1-Year postgraduate specialization in corporate governance, international arbitration, securities regulations, and intellectual property law.",
        subject_names: [
          "Company Law",
          "Intellectual Property Rights (IPR)",
          "Alternative Dispute Resolution (ADR)",
          "Cyber Law & Information Technology Law",
          "Jurisprudence & Legal Theory",
        ],
      },
      {
        name: "M.Com (Master of Commerce)",
        slug: "mcom-master-of-commerce",
        code: "MCOM-FIN",
        category_name: "M.Com",
        authority_type: "university",
        university_id: du?.id,
        university_name: du?.name,
        duration_value: 2,
        duration_unit: "years",
        description: "2-Year master degree in advanced accounting theory, financial derivatives, taxation laws, and international finance.",
        subject_names: [
          "Corporate Accounting",
          "Management Accounting & Decision Making",
          "Income Tax Law and Practice",
          "Goods and Services Tax (GST) & Customs",
          "Financial Management & Corporate Finance",
        ],
      },

      // 4. Diplomas & Polytechnic Programs
      {
        name: "Polytechnic Diploma in Computer Engineering",
        slug: "polytechnic-diploma-computer-engineering",
        code: "DIP-CS",
        category_name: "DIPLOMA",
        authority_type: "board",
        board_id: findBoard("bteup")?.id || findBoard("msbte")?.id || cbse?.id,
        duration_value: 3,
        duration_unit: "years",
        description: "3-Year technical state diploma in programming, computer hardware, computer networks, and database administration.",
        subject_names: [
          "Programming in C and C++",
          "Data Structures and Algorithms (DSA)",
          "Computer Networks",
          "Operating Systems",
          "Database Management Systems (DBMS)",
          "Web Technologies & Full Stack Development",
        ],
      },
      {
        name: "Polytechnic Diploma in Mechanical Engineering",
        slug: "polytechnic-diploma-mechanical-engineering",
        code: "DIP-MECH",
        category_name: "DIPLOMA",
        authority_type: "board",
        board_id: findBoard("bteup")?.id || findBoard("msbte")?.id || cbse?.id,
        duration_value: 3,
        duration_unit: "years",
        description: "3-Year technical diploma covering workshop practice, thermal engineering, manufacturing technology, and CAD drafting.",
        subject_names: [
          "Engineering Mechanics",
          "Thermodynamics",
          "Manufacturing Technology & Machining",
          "Fluid Mechanics and Hydraulic Machines",
          "CAD/CAM & Robotics",
        ],
      },
      {
        name: "D.Pharm (Diploma in Pharmacy)",
        slug: "dpharm-diploma-in-pharmacy",
        code: "DPHARM",
        category_name: "DIPLOMA",
        authority_type: "certification",
        certification_provider_id: findCertProvider("pci")?.id || ugc?.id,
        duration_value: 2,
        duration_unit: "years",
        description: "2-Year PCI-approved diploma for practicing community and hospital pharmacists.",
        subject_names: [
          "Pharmaceutics",
          "Pharmaceutical Chemistry & Medicinal Chemistry",
          "Pharmacognosy & Phytochemistry",
          "Pharmacology & Therapeutics",
        ],
      },
      {
        name: "D.El.Ed (Diploma in Elementary Education)",
        slug: "deled-diploma-elementary-education",
        code: "DELED-TEACH",
        category_name: "DIPLOMA",
        authority_type: "certification",
        certification_provider_id: findCertProvider("ncte")?.id || ugc?.id,
        duration_value: 2,
        duration_unit: "years",
        description: "2-Year NCTE-recognized teacher training diploma qualifying for primary and upper primary school teaching.",
        subject_names: [
          "Child Development and Pedagogy (CTET / State TET)",
          "Teaching Methodology & Educational Psychology",
          "English Language & Communication",
          "Mathematics",
          "General Science",
        ],
      },

      // 5. Coaching & Competitive Exam Programs
      {
        name: "JEE Main & Advanced 2-Year Target Course",
        slug: "jee-main-advanced-2-year-target",
        code: "COACH-JEE-2Y",
        category_name: "COMPETITIVE EXAM",
        authority_type: "institute",
        duration_value: 2,
        duration_unit: "years",
        description: "Comprehensive 2-year classroom and online program covering complete Class 11 & 12 physics, chemistry, and mathematics with rigorous mock testing for IIT-JEE.",
        subject_names: [
          "Physics for JEE (Main & Advanced)",
          "Physical Chemistry for JEE",
          "Inorganic Chemistry for JEE",
          "Organic Chemistry for JEE",
          "Mathematics for JEE (Main & Advanced)",
        ],
      },
      {
        name: "NEET-UG Medical 2-Year Target Course",
        slug: "neet-ug-medical-2-year-target",
        code: "COACH-NEET-2Y",
        category_name: "COMPETITIVE EXAM",
        authority_type: "institute",
        duration_value: 2,
        duration_unit: "years",
        description: "Comprehensive 2-year medical entrance preparation covering NCERT-focused Physics, Chemistry, Botany, and Zoology for NEET-UG and AIIMS admissions.",
        subject_names: [
          "Physics for NEET-UG",
          "Chemistry for NEET-UG",
          "Botany for NEET-UG",
          "Zoology for NEET-UG",
        ],
      },
      {
        name: "UPSC Civil Services (IAS / IPS / IFS) Complete Foundation Course",
        slug: "upsc-civil-services-ias-complete-foundation",
        code: "COACH-UPSC-IAS",
        category_name: "GOVERNMENT EXAM",
        authority_type: "institute",
        duration_value: 1,
        duration_unit: "years",
        description: "Integrated Prelims, Mains, and Interview preparation covering GS Papers 1 to 4, CSAT, Essay writing, and Daily Current Affairs Analysis.",
        subject_names: [
          "UPSC General Studies Paper 1 (History, Art & Culture, Geography, Society)",
          "UPSC General Studies Paper 2 (Polity, Governance, Constitution, IR)",
          "UPSC General Studies Paper 3 (Economy, Agriculture, Science & Tech, Environment, Security)",
          "UPSC General Studies Paper 4 (Ethics, Integrity and Aptitude)",
          "UPSC CSAT (Civil Services Aptitude Test)",
          "UPSC Essay Paper",
          "Current Affairs & National/International Issues",
        ],
      },
      {
        name: "Banking & Financial Services Exam Master Program (IBPS / SBI PO & Clerk)",
        slug: "banking-exam-master-ibps-sbi-po-clerk",
        code: "COACH-BANK-PO",
        category_name: "GOVERNMENT EXAM",
        authority_type: "institute",
        duration_value: 6,
        duration_unit: "months",
        description: "Targeted banking examination preparation with quantitative aptitude, logical reasoning, verbal ability, and financial awareness for SBI, IBPS, and RBI exams.",
        subject_names: [
          "Quantitative Aptitude for Competitive Exams",
          "Reasoning Ability & Logical Reasoning",
          "Verbal Ability & English Language for Competitive Exams",
          "Banking & Financial Awareness",
          "General Awareness & Static GK",
          "Computer Knowledge & Aptitude (Bank/SSC/RRB)",
        ],
      },
      {
        name: "SSC CGL & CHSL Combined Graduate / Higher Secondary Program",
        slug: "ssc-cgl-chsl-combined-program",
        code: "COACH-SSC-CGL",
        category_name: "GOVERNMENT EXAM",
        authority_type: "institute",
        duration_value: 6,
        duration_unit: "months",
        description: "Comprehensive Staff Selection Commission exam preparation covering Tier-1 and Tier-2 math, reasoning, English, and static GK.",
        subject_names: [
          "Quantitative Aptitude for Competitive Exams",
          "Reasoning Ability & Logical Reasoning",
          "Verbal Ability & English Language for Competitive Exams",
          "General Awareness & Static GK",
          "Current Affairs & National/International Issues",
          "Computer Knowledge & Aptitude (Bank/SSC/RRB)",
        ],
      },
      {
        name: "GATE Computer Science Engineering Master Preparation",
        slug: "gate-computer-science-engineering-prep",
        code: "COACH-GATE-CS",
        category_name: "COMPETITIVE EXAM",
        authority_type: "institute",
        duration_value: 1,
        duration_unit: "years",
        description: "Graduate Aptitude Test in Engineering preparation for M.Tech admissions in IITs/IISc and top PSU recruitment.",
        subject_names: [
          "GATE Engineering Mathematics",
          "GATE General Aptitude",
          "Data Structures and Algorithms (DSA)",
          "Operating Systems",
          "Database Management Systems (DBMS)",
          "Computer Networks",
          "Theory of Computation & Automata (TOC)",
          "Compiler Design",
          "Computer Organization and Architecture (COA)",
        ],
      },
      {
        name: "CAT & MBA Entrance Comprehensive Program",
        slug: "cat-mba-entrance-comprehensive-program",
        code: "COACH-CAT-MBA",
        category_name: "COMPETITIVE EXAM",
        authority_type: "institute",
        duration_value: 1,
        duration_unit: "years",
        description: "Intensive training for Common Admission Test (CAT), XAT, SNAP, and NMAT covering QA, DILR, and VARC with GD-PI preparation.",
        subject_names: [
          "CAT Quantitative Aptitude (QA)",
          "CAT Data Interpretation & Logical Reasoning (DILR)",
          "CAT Verbal Ability & Reading Comprehension (VARC)",
        ],
      },
      {
        name: "UGC NET Paper 1 & Paper 2 Comprehensive Program",
        slug: "ugc-net-comprehensive-program",
        code: "COACH-UGC-NET",
        category_name: "COMPETITIVE EXAM",
        authority_type: "institute",
        duration_value: 6,
        duration_unit: "months",
        description: "National Eligibility Test coaching for Assistant Professor eligibility and Junior Research Fellowship (JRF).",
        subject_names: [
          "UGC NET Paper 1 (Teaching & Research Aptitude)",
          "Teaching Methodology & Educational Psychology",
          "Higher Education System & Governance",
        ],
      },
      {
        name: "NDA & CDS Defence Entrance Master Program",
        slug: "nda-cds-defence-entrance-program",
        code: "COACH-NDA-CDS",
        category_name: "GOVERNMENT EXAM",
        authority_type: "institute",
        duration_value: 6,
        duration_unit: "months",
        description: "Specialized training for National Defence Academy and Combined Defence Services exams with SSB interview preparation.",
        subject_names: [
          "NDA Mathematics",
          "NDA General Ability Test (GAT)",
          "Verbal Ability & English Language for Competitive Exams",
          "General Awareness & Static GK",
        ],
      },
      {
        name: "CTET & State TET Teacher Eligibility Master Course",
        slug: "ctet-state-tet-teacher-eligibility-course",
        code: "COACH-TET-CTET",
        category_name: "GOVERNMENT EXAM",
        authority_type: "institute",
        duration_value: 6,
        duration_unit: "months",
        description: "Comprehensive qualification program for CTET Paper 1 & Paper 2 for PRT, TGT, and PGT school teacher recruitment.",
        subject_names: [
          "Child Development and Pedagogy (CTET / State TET)",
          "Teaching Methodology & Educational Psychology",
          "Mathematics",
          "Environmental Studies (EVS)",
          "General Science",
          "Social Science",
          "English Core",
          "Hindi Core",
        ],
      },

      // 6. Professional & Global Industry Certifications
      {
        name: "Chartered Accountancy (CA Foundation to Final)",
        slug: "chartered-accountancy-ca-icai",
        code: "CERT-CA-ICAI",
        category_name: "PROFESSIONAL COURSE",
        authority_type: "certification",
        certification_provider_id: icai?.id,
        duration_value: 3,
        duration_unit: "years",
        description: "Premier statutory accounting and auditing professional qualification administered by Institute of Chartered Accountants of India (ICAI).",
        subject_names: [
          "Financial Accounting & Reporting",
          "Corporate Accounting",
          "Cost Accounting",
          "Auditing and Corporate Governance",
          "Income Tax Law and Practice",
          "Goods and Services Tax (GST) & Customs",
          "Company Law",
        ],
      },
      {
        name: "Company Secretary (CS Foundation, Executive, Professional)",
        slug: "company-secretary-cs-icsi",
        code: "CERT-CS-ICSI",
        category_name: "PROFESSIONAL COURSE",
        authority_type: "certification",
        certification_provider_id: icsi?.id,
        duration_value: 3,
        duration_unit: "years",
        description: "Statutory corporate governance, compliance, and secretarial practice credential from ICSI.",
        subject_names: [
          "Company Law",
          "Business Law & Commercial Jurisprudence",
          "Auditing and Corporate Governance",
          "Intellectual Property Rights (IPR)",
          "Constitutional Law of India",
        ],
      },
      {
        name: "Cost and Management Accountant (CMA India)",
        slug: "cost-management-accountant-cma-icmai",
        code: "CERT-CMA-ICMAI",
        category_name: "PROFESSIONAL COURSE",
        authority_type: "certification",
        certification_provider_id: icmai?.id,
        duration_value: 3,
        duration_unit: "years",
        description: "Professional cost accounting, financial management, and corporate strategy qualification by ICMAI.",
        subject_names: [
          "Cost Accounting",
          "Management Accounting & Decision Making",
          "Financial Management & Corporate Finance",
          "Income Tax Law and Practice",
          "Company Law",
        ],
      },
      {
        name: "Full Stack Web & Software Development Bootcamp",
        slug: "full-stack-web-software-development-bootcamp",
        code: "CERT-FSWD",
        category_name: "PROFESSIONAL COURSE",
        authority_type: "certification",
        certification_provider_id: nsdc?.id || google?.id,
        duration_value: 6,
        duration_unit: "months",
        description: "Hands-on project-driven bootcamp in React, Next.js, Node.js, TypeScript, PostgreSQL, REST/GraphQL APIs, and cloud deployment.",
        subject_names: [
          "Web Technologies & Full Stack Development",
          "Data Structures and Algorithms (DSA)",
          "Database Management Systems (DBMS)",
          "DevOps & CI/CD Pipelines",
          "Cloud Computing & Distributed Systems",
        ],
      },
      {
        name: "AWS Certified Solutions Architect & Cloud Practitioner",
        slug: "aws-certified-solutions-architect-cloud",
        code: "CERT-AWS-SAA",
        category_name: "PROFESSIONAL COURSE",
        authority_type: "certification",
        certification_provider_id: aws?.id,
        duration_value: 3,
        duration_unit: "months",
        description: "Industry-standard certification program validating cloud architecture, serverless microservices, security, and scalable infrastructure on Amazon Web Services.",
        subject_names: [
          "Cloud Computing & Distributed Systems",
          "DevOps & CI/CD Pipelines",
          "Cyber Security and Cryptography",
          "Computer Networks",
        ],
      },
      {
        name: "Google Data Analytics & Python for AI Professional Certificate",
        slug: "google-data-analytics-python-ai-cert",
        code: "CERT-GOOG-DA",
        category_name: "PROFESSIONAL COURSE",
        authority_type: "certification",
        certification_provider_id: google?.id,
        duration_value: 4,
        duration_unit: "months",
        description: "Career-oriented data analytics program covering SQL, spreadsheets, Tableau visualization, Python data cleaning, and statistical analysis.",
        subject_names: [
          "Big Data Analytics & Data Science",
          "Python Programming & Applications",
          "Machine Learning & Pattern Recognition",
          "Database Management Systems (DBMS)",
        ],
      },
      {
        name: "Cisco Certified Network Associate (CCNA & Security)",
        slug: "cisco-ccna-networking-security-cert",
        code: "CERT-CISCO-CCNA",
        category_name: "PROFESSIONAL COURSE",
        authority_type: "certification",
        certification_provider_id: cisco?.id,
        duration_value: 3,
        duration_unit: "months",
        description: "Global standard enterprise networking program in IP routing, switching, subnetting, firewall configurations, and network automation.",
        subject_names: [
          "Computer Networks",
          "Cyber Security and Cryptography",
          "Operating Systems",
        ],
      },
      {
        name: "Microsoft Certified Azure Fundamentals & AI Engineer",
        slug: "microsoft-certified-azure-ai-engineer",
        code: "CERT-MSFT-AZURE",
        category_name: "PROFESSIONAL COURSE",
        authority_type: "certification",
        certification_provider_id: microsoft?.id,
        duration_value: 3,
        duration_unit: "months",
        description: "Official credential in Microsoft Azure Cloud Infrastructure, Azure OpenAI services, Cognitive Services, and Cognitive Search.",
        subject_names: [
          "Cloud Computing & Distributed Systems",
          "Artificial Intelligence & Expert Systems",
          "Machine Learning & Pattern Recognition",
          "Cyber Security and Cryptography",
        ],
      },
    ];

    console.log(`\n📦 2. Inserting & Linking ${MASTER_COURSES_LIST.length} Courses and Programs...`);
    let coursesInserted = 0;
    let subjectMappingsCount = 0;

    for (const c of MASTER_COURSES_LIST) {
      const categoryId = findCategory(c.category_name);

      const courseRes = await client.query(
        `
        INSERT INTO master_courses (
          name, slug, code, category_id, authority_type,
          board_id, university_id, university_name, certification_provider_id,
          duration_value, duration_unit, seats_available, description,
          is_active, is_deleted, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, FALSE, NOW())
        ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            code = EXCLUDED.code,
            category_id = EXCLUDED.category_id,
            authority_type = EXCLUDED.authority_type,
            board_id = EXCLUDED.board_id,
            university_id = EXCLUDED.university_id,
            university_name = EXCLUDED.university_name,
            certification_provider_id = EXCLUDED.certification_provider_id,
            duration_value = EXCLUDED.duration_value,
            duration_unit = EXCLUDED.duration_unit,
            description = EXCLUDED.description,
            is_active = TRUE,
            is_deleted = FALSE,
            updated_at = NOW()
        RETURNING id
        `,
        [
          c.name,
          c.slug,
          c.code,
          categoryId,
          c.authority_type,
          c.board_id || null,
          c.university_id || null,
          c.university_name || null,
          c.certification_provider_id || null,
          c.duration_value || 1,
          c.duration_unit || "years",
          c.seats_available || 60,
          c.description || null,
        ]
      );

      const courseId = courseRes.rows[0]?.id;
      coursesInserted++;

      // Map subjects to this course in junction table master_course_subjects
      if (courseId && c.subject_names && c.subject_names.length > 0) {
        const subjectIds = findSubjectIds(c.subject_names);
        for (const subId of subjectIds) {
          await client.query(
            `
            INSERT INTO master_course_subjects (course_id, subject_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            `,
            [courseId, subId]
          );
          subjectMappingsCount++;
        }
      }
    }

    console.log(`   ✅ Processed ${coursesInserted} Courses & Programs.`);
    console.log(`   ✅ Linked ${subjectMappingsCount} Course-Subject Mappings in master_course_subjects.`);

    const totalCourses = await client.query(`SELECT COUNT(*)::int AS count FROM master_courses WHERE is_deleted = FALSE`);

    console.log("\n================================================================================");
    console.log("🎉 ALL-INDIA COURSES & PROGRAMS SEEDING COMPLETE!");
    console.log("================================================================================");
    console.log(`📊 Current Active Master Courses in Database: ${totalCourses.rows[0].count}`);
    console.log("================================================================================\n");

  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedCourses();
