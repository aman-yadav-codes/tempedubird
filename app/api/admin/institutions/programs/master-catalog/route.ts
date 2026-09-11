import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

const CURATED_PLATFORM_MASTER_COURSES = [
  // --- Medical & Engineering Competitive Exams ---
  {
    name: "NEET Intensive Classroom Program",
    code: "NEET-MED-01",
    category_name: "Medical Entrance (NEET / AIIMS)",
    program_type_name: "Academic & Competitive Program",
    duration_value: 24,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "board",
    description: "Complete 2-year classroom preparation for NEET-UG with daily practice tests, PCB foundation, and expert medical faculty mentorship.",
    subjects: ["Physics", "Chemistry", "Biology / Botany", "Zoology"],
  },
  {
    name: "JEE Advanced & Main Elite Batch",
    code: "JEE-ENG-01",
    category_name: "Engineering Entrance (JEE / State CET)",
    program_type_name: "Academic & Competitive Program",
    duration_value: 24,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "board",
    description: "Comprehensive coaching for JEE Main & Advanced focusing on concept clarity, speed techniques, PCM problem solving, and mock simulations.",
    subjects: ["Physics", "Chemistry", "Mathematics"],
  },

  // --- Bachelor of Science (B.Sc) Degrees ---
  {
    name: "B.Sc (Bachelor of Science) Computer Science",
    code: "DEG-BSC-CS",
    category_name: "Information Technology & Computer Science",
    program_type_name: "Degree Program",
    duration_value: 36,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Three-year undergraduate program covering programming in C++/Java/Python, Data Structures, Computer Networks, Operating Systems, and Web Technologies.",
    subjects: ["Programming in C & C++", "Data Structures & Algorithms", "Database Management Systems", "Computer Architecture", "Software Engineering", "Web Technologies"],
  },
  {
    name: "B.Sc (Bachelor of Science) Information Technology (IT)",
    code: "DEG-BSC-IT",
    category_name: "Information Technology & Computer Science",
    program_type_name: "Degree Program",
    duration_value: 36,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Industry-aligned IT degree focusing on network security, software engineering, mobile development, cloud computing, and database administration.",
    subjects: ["Information Security", "Java & Python Programming", "Database Systems", "Computer Networks", "Web Development", "Cloud Essentials"],
  },
  {
    name: "B.Sc (Bachelor of Science) Mathematics",
    code: "DEG-BSC-MATH",
    category_name: "Higher Education & Pure Sciences",
    program_type_name: "Degree Program",
    duration_value: 36,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "university",
    description: "Rigorous undergraduate program in pure and applied mathematics covering Calculus, Linear Algebra, Real Analysis, Differential Equations, and Statistics.",
    subjects: ["Calculus & Analysis", "Linear Algebra", "Differential Equations", "Probability & Statistics", "Abstract Algebra", "Numerical Methods"],
  },
  {
    name: "B.Sc (Bachelor of Science) Physics",
    code: "DEG-BSC-PHY",
    category_name: "Higher Education & Pure Sciences",
    program_type_name: "Degree Program",
    duration_value: 36,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "university",
    description: "Undergraduate degree in Physics focusing on Classical Mechanics, Quantum Mechanics, Electromagnetism, Thermodynamics, and Optics.",
    subjects: ["Classical Mechanics", "Electromagnetism", "Thermodynamics & Statistical Physics", "Quantum Mechanics", "Optics & Waves", "Electronics"],
  },
  {
    name: "B.Sc (Bachelor of Science) Chemistry",
    code: "DEG-BSC-CHEM",
    category_name: "Higher Education & Pure Sciences",
    program_type_name: "Degree Program",
    duration_value: 36,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "university",
    description: "Comprehensive study of Inorganic, Organic, Physical, and Analytical Chemistry along with intensive laboratory practical training.",
    subjects: ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Analytical Chemistry", "Biochemistry", "Industrial Chemistry"],
  },
  {
    name: "B.Sc (Bachelor of Science) Biotechnology",
    code: "DEG-BSC-BIO",
    category_name: "Life Sciences & Medical",
    program_type_name: "Degree Program",
    duration_value: 36,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "university",
    description: "Applied life sciences degree integrating Cellular Biology, Genetics, Microbiology, Immunology, Recombinant DNA Technology, and Bioinformatics.",
    subjects: ["Cell Biology & Genetics", "Microbiology", "Biochemistry", "Molecular Biology", "Immunology", "Bioinformatics & Recombinant DNA"],
  },
  {
    name: "B.Sc (Bachelor of Science) Nursing",
    code: "DEG-BSC-NURS",
    category_name: "Healthcare & Nursing",
    program_type_name: "Degree Program",
    duration_value: 48,
    duration_unit: "months",
    seats_available: 40,
    authority_type: "university",
    description: "4-year professional nursing degree focusing on patient care, clinical anatomy, pharmacology, community health, and hospital administration.",
    subjects: ["Anatomy & Physiology", "Nursing Foundations", "Microbiology", "Pharmacology & Pathology", "Medical-Surgical Nursing", "Community Health Nursing"],
  },
  {
    name: "B.Sc (Bachelor of Science) Agriculture",
    code: "DEG-BSC-AGRI",
    category_name: "Agricultural Sciences",
    program_type_name: "Degree Program",
    duration_value: 48,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Four-year comprehensive degree covering Agronomy, Soil Science, Plant Pathology, Entomology, Horticulture, and Agricultural Economics.",
    subjects: ["Agronomy & Crop Production", "Soil Science & Agricultural Chemistry", "Horticulture", "Plant Genetics & Breeding", "Agricultural Economics", "Plant Pathology"],
  },
  {
    name: "B.Sc (Bachelor of Science) Data Science & AI",
    code: "DEG-BSC-DS",
    category_name: "Information Technology & Computer Science",
    program_type_name: "Degree Program",
    duration_value: 36,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "university",
    description: "Cutting-edge degree program covering Statistics, Machine Learning, Deep Learning, Big Data Analytics, and Data Visualization.",
    subjects: ["Python for Data Science", "Applied Statistics & Probability", "Machine Learning Algorithms", "Data Visualization & BI", "Deep Learning & Neural Networks", "Big Data Analytics"],
  },

  // --- Bachelor of Commerce & Management ---
  {
    name: "B.Com (Bachelor of Commerce) General / Honours",
    code: "DEG-BCOM-01",
    category_name: "Commerce & Management",
    program_type_name: "Degree Program",
    duration_value: 36,
    duration_unit: "months",
    seats_available: 80,
    authority_type: "university",
    description: "Standard undergraduate commerce program covering Financial Accounting, Business Law, Economics, Corporate Tax, and Cost Accounting.",
    subjects: ["Financial Accounting", "Business Law", "Micro & Macro Economics", "Corporate Accounting", "Cost & Management Accounting", "Direct & Indirect Tax"],
  },
  {
    name: "BBA (Bachelor of Business Administration)",
    code: "DEG-BBA-01",
    category_name: "Commerce & Management",
    program_type_name: "Degree Program",
    duration_value: 36,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Undergraduate degree program building strong foundations in financial management, business analytics, marketing strategies, and organizational leadership.",
    subjects: ["Principles of Management", "Financial Accounting", "Marketing Management", "Business Law", "Organizational Behavior", "Human Resource Management"],
  },
  {
    name: "BCA (Bachelor of Computer Applications)",
    code: "DEG-BCA-01",
    category_name: "Information Technology & Computer Science",
    program_type_name: "Degree Program",
    duration_value: 36,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Industry-aligned undergraduate IT program emphasizing software engineering, full stack web development, data structures, and database systems.",
    subjects: ["C / C++ Programming", "Data Structures & Algorithms", "Database Management Systems", "Web Technologies", "Software Engineering", "Java Programming"],
  },

  // --- Bachelor of Arts (B.A) Degrees ---
  {
    name: "B.A (Bachelor of Arts) English Literature & Journalism",
    code: "DEG-BA-ENG",
    category_name: "Humanities & Social Sciences",
    program_type_name: "Degree Program",
    duration_value: 36,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Undergraduate degree exploring British, American, and World literature, creative writing, mass communication, and media ethics.",
    subjects: ["History of English Literature", "Poetry & Drama", "Literary Criticism", "Mass Media & Journalism", "Creative Writing & Editing", "Public Relations"],
  },
  {
    name: "B.A (Bachelor of Arts) History, Economics & Political Science (HEP)",
    code: "DEG-BA-HEP",
    category_name: "Humanities & Social Sciences",
    program_type_name: "Degree Program",
    duration_value: 36,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Classic liberal arts program providing comprehensive foundations for UPSC, law, civil services, and academic research.",
    subjects: ["Ancient & Modern Indian History", "Indian Polity & Constitution", "Micro & Macro Economics", "International Relations", "Public Administration", "Development Economics"],
  },

  // --- Engineering Degrees (B.Tech) ---
  {
    name: "B.Tech (Bachelor of Technology) Computer Science & Engineering (CSE)",
    code: "DEG-BTECH-CSE",
    category_name: "Engineering & Technology",
    program_type_name: "Degree Program",
    duration_value: 48,
    duration_unit: "months",
    seats_available: 120,
    authority_type: "university",
    description: "4-year premier engineering program in software design, algorithms, operating systems, compiler design, artificial intelligence, and cloud architectures.",
    subjects: ["Data Structures & Algorithms", "Operating Systems", "Computer Architecture", "Database Systems", "Compiler Design", "Computer Networks", "Artificial Intelligence"],
  },
  {
    name: "B.Tech (Bachelor of Technology) AI & Machine Learning (AI/ML)",
    code: "DEG-BTECH-AIML",
    category_name: "Engineering & Technology",
    program_type_name: "Degree Program",
    duration_value: 48,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Specialized undergraduate engineering degree focusing on Deep Learning, Natural Language Processing, Computer Vision, Robotics, and Autonomous Systems.",
    subjects: ["Python & Linear Algebra", "Machine Learning Foundations", "Deep Learning & NLP", "Computer Vision", "Reinforcement Learning", "AI Ethics & Deployment"],
  },
  {
    name: "B.Tech (Bachelor of Technology) Mechanical Engineering",
    code: "DEG-BTECH-MECH",
    category_name: "Engineering & Technology",
    program_type_name: "Degree Program",
    duration_value: 48,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Core engineering discipline covering Thermodynamics, Fluid Mechanics, CAD/CAM Manufacturing, Machine Design, and Robotics.",
    subjects: ["Thermodynamics", "Fluid Mechanics", "Strength of Materials", "Kinematics & Dynamics of Machines", "CAD / CAM & Manufacturing", "Heat Transfer"],
  },
  {
    name: "B.Tech (Bachelor of Technology) Civil Engineering",
    code: "DEG-BTECH-CIVIL",
    category_name: "Engineering & Technology",
    program_type_name: "Degree Program",
    duration_value: 48,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Foundational engineering program covering Structural Analysis, Geotechnical Engineering, Surveying, Transportation, and Construction Management.",
    subjects: ["Structural Analysis", "Geotechnical & Soil Mechanics", "Surveying & Geomatics", "Concrete Technology", "Transportation Engineering", "Hydraulics & Water Resources"],
  },
  {
    name: "B.Tech (Bachelor of Technology) Electronics & Communication (ECE)",
    code: "DEG-BTECH-ECE",
    category_name: "Engineering & Technology",
    program_type_name: "Degree Program",
    duration_value: 48,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Engineering program covering Analog & Digital Electronics, Signals & Systems, Microprocessors, VLSI Design, and Wireless Communications.",
    subjects: ["Analog & Digital Circuits", "Signals & Systems", "Microprocessors & Microcontrollers", "Digital Signal Processing", "VLSI Design", "Wireless & Optical Communications"],
  },

  // --- Postgraduate Degrees (M.Sc, MCA, MBA, M.Com) ---
  {
    name: "M.Sc (Master of Science) Computer Science",
    code: "DEG-MSC-CS",
    category_name: "Information Technology & Computer Science",
    program_type_name: "Degree Program",
    duration_value: 24,
    duration_unit: "months",
    seats_available: 40,
    authority_type: "university",
    description: "Advanced master's degree focusing on Distributed Systems, Advanced Algorithms, Machine Learning, Cryptography, and Cloud Computing.",
    subjects: ["Advanced Algorithms", "Distributed Systems", "Machine Learning", "Cryptography & Network Security", "Cloud Computing & DevOps", "Research Project & Dissertation"],
  },
  {
    name: "MCA (Master of Computer Applications)",
    code: "DEG-MCA-01",
    category_name: "Information Technology & Computer Science",
    program_type_name: "Degree Program",
    duration_value: 24,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Professional master's program covering Enterprise Application Development, Cloud Architecture, Full Stack Engineering, and Software Project Management.",
    subjects: ["Advanced Java & Spring Boot", "Enterprise Architecture", "Database Internals", "Cloud Native Computing", "Full Stack Development", "Major Industry Project"],
  },
  {
    name: "MBA (Master of Business Administration)",
    code: "DEG-MBA-01",
    category_name: "Commerce & Management",
    program_type_name: "Degree Program",
    duration_value: 24,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Postgraduate business degree offering dual specializations in Marketing, Finance, Human Resources, Business Analytics, and Operations.",
    subjects: ["Strategic Management", "Corporate Finance", "Marketing Strategy", "Organizational Behavior & HR", "Business Analytics & AI", "Supply Chain & Operations"],
  },
  {
    name: "M.Com (Master of Commerce)",
    code: "DEG-MCOM-01",
    category_name: "Commerce & Management",
    program_type_name: "Degree Program",
    duration_value: 24,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "university",
    description: "Postgraduate commerce degree focusing on Advanced Corporate Accounting, Financial Analysis, International Business, and Tax Planning.",
    subjects: ["Advanced Financial Accounting", "Corporate Financial Management", "International Business & Trade", "Advanced Tax Planning", "Research Methodology & Statistics"],
  },

  // --- School K-12 Foundation & Board Programs ---
  {
    name: "Class 6 Foundation (CBSE & State Board)",
    code: "SCH-06-FND",
    category_name: "Primary & Middle School (Class 6-8)",
    program_type_name: "Academic Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 40,
    authority_type: "board",
    description: "Middle school curriculum emphasizing logical thinking, foundational mathematics, introductory sciences, English language, and social studies.",
    subjects: ["Mathematics", "General Science", "English Grammar & Reader", "Social Science", "Hindi / Sanskrit"],
  },
  {
    name: "Class 7 Foundation (CBSE & State Board)",
    code: "SCH-07-FND",
    category_name: "Primary & Middle School (Class 6-8)",
    program_type_name: "Academic Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 40,
    authority_type: "board",
    description: "Middle school academic batch fostering conceptual curiosity in Physics, Chemistry, Biology, Algebraic Math, and World History.",
    subjects: ["Mathematics", "Science", "English", "Social Science", "Hindi"],
  },
  {
    name: "Class 8 Foundation & Olympiad Pre-Prep",
    code: "SCH-08-FND",
    category_name: "Primary & Middle School (Class 6-8)",
    program_type_name: "Academic Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 45,
    authority_type: "board",
    description: "Comprehensive Grade 8 program strengthening pre-foundation concepts for NTSE, Science & Math Olympiads, and High School transition.",
    subjects: ["Mathematics", "Science (PCB)", "English", "Social Science", "Mental Ability / Reasoning"],
  },
  {
    name: "Class 9 Foundation (CBSE & State Board)",
    code: "SCH-09-FND",
    category_name: "Secondary School (Class 9-10)",
    program_type_name: "Academic Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 45,
    authority_type: "board",
    description: "Holistic academic curriculum designed to strengthen foundational STEM concepts and prepare students for competitive Olympiads.",
    subjects: ["Mathematics", "Science (Physics, Chemistry, Biology)", "English", "Social Science (History, Civics, Geography)"],
  },
  {
    name: "Class 10 Board Accelerator & Pre-Foundation",
    code: "SCH-10-BRD",
    category_name: "Secondary School (Class 9-10)",
    program_type_name: "Academic Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "board",
    description: "Board exam excellence batch covering complete CBSE/State syllabus, previous years questions, sample papers, and regular assessments.",
    subjects: ["Mathematics (Standard / Basic)", "Science (Physics, Chemistry, Biology)", "Social Science", "English Language & Literature", "Hindi / Regional Language"],
  },
  {
    name: "Class 11 Science (PCM - Engineering Track)",
    code: "SCH-11-PCM",
    category_name: "Senior Secondary (Class 11-12)",
    program_type_name: "Academic Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "board",
    description: "Senior secondary science curriculum focusing on Physics, Chemistry, and Higher Mathematics along with Computer Science or Physical Education.",
    subjects: ["Physics", "Chemistry", "Mathematics", "English Core", "Computer Science / Physical Education"],
  },
  {
    name: "Class 11 Science (PCB - Medical Track)",
    code: "SCH-11-PCB",
    category_name: "Senior Secondary (Class 11-12)",
    program_type_name: "Academic Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "board",
    description: "Senior secondary science batch for medical aspirants covering Botany, Zoology, Human Physiology, Physical & Organic Chemistry, and Physics.",
    subjects: ["Physics", "Chemistry", "Biology (Botany & Zoology)", "English Core", "Physical Education / Psychology"],
  },
  {
    name: "Class 11 Commerce (Accountancy & Business)",
    code: "SCH-11-COMM",
    category_name: "Senior Secondary (Class 11-12)",
    program_type_name: "Academic Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "board",
    description: "Foundational senior secondary commerce program covering Financial Accounting, Business Studies, Microeconomics, and Applied Mathematics.",
    subjects: ["Accountancy", "Business Studies", "Economics", "English Core", "Applied Mathematics / Informatics Practices"],
  },
  {
    name: "Class 11 Humanities & Arts",
    code: "SCH-11-ARTS",
    category_name: "Senior Secondary (Class 11-12)",
    program_type_name: "Academic Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 45,
    authority_type: "board",
    description: "Senior secondary humanities stream exploring Indian & World History, Political Science, Geography, Sociology, and English Literature.",
    subjects: ["History", "Political Science", "Geography", "Sociology / Psychology", "English Core"],
  },
  {
    name: "Class 12 Science (PCM Board & Entrance Accelerator)",
    code: "SCH-12-PCM",
    category_name: "Senior Secondary (Class 11-12)",
    program_type_name: "Academic Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "board",
    description: "Intensive 12th board preparation with integrated JEE / State entrance guidance, practicals, and weekly board mock exams.",
    subjects: ["Physics (Theory & Practical)", "Chemistry (Organic, Inorganic, Physical)", "Mathematics (Calculus & Vectors)", "English Core", "Computer Science"],
  },
  {
    name: "Class 12 Science (PCB Board & NEET Accelerator)",
    code: "SCH-12-PCB",
    category_name: "Senior Secondary (Class 11-12)",
    program_type_name: "Academic Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "board",
    description: "12th board medical preparation with extensive NCERT coverage, diagrams, genetics, human reproduction, organic chemistry, and optics.",
    subjects: ["Physics", "Chemistry", "Biology (Genetics, Ecology, Physiology)", "English Core", "Physical Education"],
  },
  {
    name: "Class 12 Commerce (Board Mastery Batch)",
    code: "SCH-12-COMM",
    category_name: "Senior Secondary (Class 11-12)",
    program_type_name: "Academic Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "board",
    description: "Class 12 board coaching covering Partnership Accounting, Company Accounts, Macroeconomics, Indian Economic Development, and Business Management.",
    subjects: ["Accountancy (Partnership & Company)", "Business Studies (Principles & Finance)", "Economics (Macro & Indian Economy)", "English Core", "Applied Mathematics"],
  },

  // --- Diplomas & Computer Certifications ---
  {
    name: "ADCA (Advance Diploma in Computer Applications)",
    code: "DIP-ADCA",
    category_name: "Information Technology & Computer Science",
    program_type_name: "Diploma / Certificate Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 40,
    authority_type: "certification_provider",
    description: "Hands-on diploma program covering Office Automation, Database Management, Web Designing, Tally Prime accounting, and programming fundamentals.",
    subjects: ["Computer Fundamentals & OS", "MS Office & Advanced Excel", "Tally Prime ERP with GST", "HTML / CSS & Web Basics", "Database Management (RDBMS)"],
  },
  {
    name: "DCA (Diploma in Computer Applications)",
    code: "DIP-DCA",
    category_name: "Information Technology & Computer Science",
    program_type_name: "Diploma / Certificate Program",
    duration_value: 6,
    duration_unit: "months",
    seats_available: 40,
    authority_type: "certification_provider",
    description: "6-month fundamental computer applications diploma covering Windows OS, Word, Excel, PowerPoint, Internet concepts, and basic financial accounting.",
    subjects: ["Computer Fundamentals", "MS Word, Excel & PowerPoint", "Internet & Cyber Security Basics", "Tally Prime Basics"],
  },
  {
    name: "Full Stack Web Development (MERN / Next.js)",
    code: "TECH-FS-01",
    category_name: "Skill Development & Professional",
    program_type_name: "Course",
    duration_value: 6,
    duration_unit: "months",
    seats_available: 35,
    authority_type: "certification_provider",
    description: "Job-ready bootcamp covering modern web technologies: JavaScript, TypeScript, React, Next.js, Node.js, PostgreSQL, REST APIs, and project deployments.",
    subjects: ["Frontend Development (React / Tailwind)", "Backend & APIs (Node.js / Express)", "Databases (PostgreSQL / MongoDB)", "DevOps & Cloud Deployment"],
  },
  {
    name: "Python Programming & Machine Learning Bootcamp",
    code: "TECH-PY-01",
    category_name: "Skill Development & Professional",
    program_type_name: "Course",
    duration_value: 4,
    duration_unit: "months",
    seats_available: 35,
    authority_type: "certification_provider",
    description: "Complete Python track from core syntax, OOPs, NumPy, Pandas, Matplotlib, Scikit-Learn to building real-world predictive machine learning models.",
    subjects: ["Python Programming & OOPs", "Data Analysis with Pandas & NumPy", "Data Visualization", "Machine Learning with Scikit-Learn", "Model Deployment with FastAPI"],
  },
  {
    name: "Spoken English & Professional Communication",
    code: "SKILL-ENG-01",
    category_name: "Language & Soft Skills",
    program_type_name: "Course",
    duration_value: 3,
    duration_unit: "months",
    seats_available: 40,
    authority_type: "certification_provider",
    description: "Interactive language training focusing on fluent conversational English, vocabulary building, public speaking, and corporate interview skills.",
    subjects: ["Everyday Spoken English", "Grammar & Vocabulary", "Professional Presentation Skills", "Interview Preparation & GD"],
  },
  {
    name: "Digital Marketing & Growth Mastery",
    code: "SKILL-DM-01",
    category_name: "Skill Development & Professional",
    program_type_name: "Course",
    duration_value: 4,
    duration_unit: "months",
    seats_available: 35,
    authority_type: "certification_provider",
    description: "Practical digital marketing course covering Search Engine Optimization (SEO), Google Ads, Meta Ads, Content Marketing, and Analytics.",
    subjects: ["Search Engine Optimization (SEO)", "Social Media Marketing (SMM)", "Google Ads & PPC Campaigns", "Email & Content Marketing", "Google Analytics & Growth Strategy"],
  },

  // --- Government & Competitive Exams ---
  {
    name: "UPSC Civil Services Foundation Program (IAS/IPS)",
    code: "GOV-UPSC-01",
    category_name: "Government & Competitive Exams",
    program_type_name: "Academic & Competitive Program",
    duration_value: 18,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "board",
    description: "Integrated prelims-cum-mains foundation course covering Indian Polity, History, Geography, Economy, Current Affairs, and Answer Writing practice.",
    subjects: ["Indian Polity & Governance", "Indian & World History", "Geography & Environment", "Indian Economy", "General Science & Current Affairs", "CSAT (Aptitude & Reasoning)"],
  },
  {
    name: "Banking & SSC CGL Combined Mastery Batch",
    code: "GOV-BANK-SSC",
    category_name: "Government & Competitive Exams",
    program_type_name: "Academic & Competitive Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "board",
    description: "Comprehensive coaching for IBPS PO, SBI PO, RBI Assistant, SSC CGL, and CHSL covering Quantitative Aptitude, Reasoning, English, and Banking Awareness.",
    subjects: ["Quantitative Aptitude & Math", "Logical & Analytical Reasoning", "English Comprehension & Grammar", "General & Banking Awareness", "Computer Aptitude"],
  },
  {
    name: "CA Foundation & Intermediate (Chartered Accountancy)",
    code: "PROF-CA-01",
    category_name: "Commerce & Professional Exams",
    program_type_name: "Academic & Competitive Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "board",
    description: "Structured coaching for ICAI CA Foundation & Intermediate examinations with chapter-wise test series and case study discussions.",
    subjects: ["Principles & Practice of Accounting", "Business Laws & Business Correspondence", "Business Mathematics & Logical Reasoning", "Business Economics & Commercial Knowledge"],
  },
];

export async function GET(req: Request) {
  try {
    await getAuthenticatedUser(req);

    const url = new URL(req.url);
    const institutionId = url.searchParams.get("institutionId")
      ? Number(url.searchParams.get("institutionId"))
      : null;
    const search = url.searchParams.get("search")?.toLowerCase().trim() || "";

    // 1. Get existing programs of this institution so we can mark 'is_already_added'
    const existingTitlesSet = new Set<string>();
    if (institutionId) {
      try {
        const existingRes = await db.query<{ title: string }>(
          `SELECT LOWER(title) as title FROM institution_programs WHERE institution_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE`,
          [institutionId]
        );
        existingRes.rows.forEach((r) => {
          if (r.title) existingTitlesSet.add(r.title.trim().toLowerCase());
        });
      } catch (err) {
        console.warn("Could not query existing institution programs:", err);
      }
    }

    // 2. Fetch master courses from database (with fast fallback)
    let dbCourses: any[] = [];
    try {
      const dbMasterCoursesRes = await db.query(
        `
        SELECT
          mc.id,
          mc.name,
          mc.slug,
          mc.code,
          mc.category_id,
          c.name AS category_name,
          mc.authority_type,
          b.name AS board_name,
          mc.university_name,
          mc.duration_value,
          mc.duration_unit,
          mc.seats_available,
          mc.description,
          mc.thumbnail_url,
          mc.icon_url,
          COALESCE(
            (
              SELECT json_agg(json_build_object('id', s.id, 'name', s.name))
              FROM master_course_subjects mcs
              JOIN subjects s ON s.id = mcs.subject_id
              WHERE mcs.course_id = mc.id
            ),
            '[]'::json
          ) AS subjects
        FROM master_courses mc
        LEFT JOIN categories c ON c.id = mc.category_id
        LEFT JOIN boards b ON b.id = mc.board_id
        WHERE COALESCE(mc.is_deleted, FALSE) = FALSE AND COALESCE(mc.is_active, TRUE) = TRUE
        ORDER BY mc.name ASC
        `
      );

      dbCourses = dbMasterCoursesRes.rows.map((c) => {
        const titleLower = (c.name || "").toLowerCase().trim();
        const subjectNames = Array.isArray(c.subjects) ? c.subjects.map((s: any) => s.name) : [];
        return {
          id: `db-course-${c.id}`,
          db_id: c.id,
          title: c.name,
          slug: c.slug,
          code: c.code || `CRS-${c.id}`,
          category_name: c.category_name || "General Academic",
          program_type_name: c.authority_type === "university" ? "Degree Program" : c.authority_type === "certification_provider" ? "Certificate Course" : "Academic Program",
          duration_value: c.duration_value || 12,
          duration_unit: c.duration_unit || "months",
          duration_text: `${c.duration_value || 12} ${c.duration_unit || "months"}`,
          seats_available: c.seats_available || 60,
          authority_type: c.authority_type || "board",
          board_name: c.board_name,
          university_name: c.university_name,
          description: c.description || "",
          thumbnail_url: c.thumbnail_url || c.icon_url || null,
          subjects: subjectNames,
          is_already_added: existingTitlesSet.has(titleLower),
          source: "database",
        };
      });
    } catch (dbErr) {
      console.warn("Could not query master_courses table (using curated fallback):", dbErr);
    }

    // 3. Merge curated platform catalog templates (deduplicating by title)
    const allCourses = [...dbCourses];
    const seenTitles = new Set(dbCourses.map((c) => (c.title || "").toLowerCase().trim()));

    for (let i = 0; i < CURATED_PLATFORM_MASTER_COURSES.length; i++) {
      const curated = CURATED_PLATFORM_MASTER_COURSES[i];
      const curTitleLower = curated.name.toLowerCase().trim();
      if (!seenTitles.has(curTitleLower)) {
        seenTitles.add(curTitleLower);
        allCourses.push({
          id: `curated-${i + 1}`,
          db_id: null,
          title: curated.name,
          slug: curated.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          code: curated.code,
          category_name: curated.category_name,
          program_type_name: curated.program_type_name,
          duration_value: curated.duration_value,
          duration_unit: curated.duration_unit,
          duration_text: `${curated.duration_value} ${curated.duration_unit}`,
          seats_available: curated.seats_available,
          authority_type: curated.authority_type,
          board_name: null,
          university_name: null,
          description: curated.description,
          thumbnail_url: null,
          subjects: curated.subjects,
          is_already_added: existingTitlesSet.has(curTitleLower),
          source: "curated",
        });
      }
    }

    // 4. Filter by search query if present
    const filteredCourses = search
      ? allCourses.filter((c) => {
          const t = (c.title || "").toLowerCase();
          const code = (c.code || "").toLowerCase();
          const cat = (c.category_name || "").toLowerCase();
          const progType = (c.program_type_name || "").toLowerCase();
          const subs = Array.isArray(c.subjects) ? c.subjects.map((s: string) => String(s).toLowerCase()) : [];
          
          // Normalized matching: remove dots and extra spaces (e.g. "b.sc" matches "bsc")
          const cleanSearch = search.replace(/\./g, "").trim();
          const cleanTitle = t.replace(/\./g, "");
          const cleanCode = code.replace(/\./g, "");

          return (
            t.includes(search) ||
            cleanTitle.includes(cleanSearch) ||
            code.includes(search) ||
            cleanCode.includes(cleanSearch) ||
            cat.includes(search) ||
            progType.includes(search) ||
            subs.some((s) => s.includes(search) || s.replace(/\./g, "").includes(cleanSearch))
          );
        })
      : allCourses;

    return NextResponse.json(
      {
        data: filteredCourses,
        total: filteredCourses.length,
        available_count: filteredCourses.filter((c) => !c.is_already_added).length,
        added_count: filteredCourses.filter((c) => c.is_already_added).length,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to fetch master catalog" }, { status });
  }
}

