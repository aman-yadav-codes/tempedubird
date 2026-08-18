import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const { db } = await import("../lib/db/db");

  console.log("🚀 Starting seeding 5-7 Exams, Practice Tests, Notes, Library & Hostels per Institution...");

  // 1. Fetch all active institutions
  const instRes = await db.query<{ id: number; name: string }>(`
    SELECT id, name FROM institution_profiles WHERE is_active = TRUE ORDER BY id ASC
  `);

  const institutions = instRes.rows;
  console.log(`Found ${institutions.length} active institution(s).`);

  if (institutions.length === 0) {
    console.log("⚠️ No active institutions found. Please run seed-institutions-full.ts first.");
    process.exit(0);
  }

  // 2. Fetch default admin user
  const adminRes = await db.query<{ id: number }>(`
    SELECT id FROM users WHERE is_active = TRUE ORDER BY id ASC LIMIT 1
  `);
  const adminUserId = adminRes.rows[0]?.id || 1;

  // 3. Ensure academic year
  const ayRes = await db.query<{ id: number }>(`
    SELECT id FROM academic_years LIMIT 1
  `);
  const academicYearId = ayRes.rows[0]?.id || null;

  // 4. Ensure notes, practice_exams tables schema exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      institution_id INT NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      subject_id INT NULL,
      syllabus_id INT NULL,
      program_id INT NULL,
      section_id INT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      is_public BOOLEAN DEFAULT TRUE,
      marketplace_requested BOOLEAN DEFAULT FALSE,
      marketplace_approved BOOLEAN DEFAULT FALSE,
      created_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS note_items (
      id SERIAL PRIMARY KEY,
      note_id INT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      sort_order INT DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS practice_exam_templates (
      id SERIAL PRIMARY KEY,
      institution_id INT NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      exam_type VARCHAR(50) DEFAULT 'MOCK',
      exam_kind VARCHAR(50) DEFAULT 'practice',
      duration_minutes INT DEFAULT 60,
      total_marks INT DEFAULT 100,
      passing_marks INT DEFAULT 40,
      is_active BOOLEAN DEFAULT TRUE,
      is_public BOOLEAN DEFAULT TRUE,
      created_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS practice_exams (
      id SERIAL PRIMARY KEY,
      institution_id INT NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      template_id INT NULL,
      academic_year_id INT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      exam_type VARCHAR(50) DEFAULT 'MOCK',
      exam_kind VARCHAR(50) DEFAULT 'practice',
      duration_minutes INT DEFAULT 60,
      total_marks INT DEFAULT 100,
      passing_marks INT DEFAULT 40,
      is_active BOOLEAN DEFAULT TRUE,
      is_public BOOLEAN DEFAULT TRUE,
      created_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    ALTER TABLE practice_exams ADD COLUMN IF NOT EXISTS exam_type VARCHAR(50) DEFAULT 'MOCK';
    ALTER TABLE practice_exams ADD COLUMN IF NOT EXISTS exam_kind VARCHAR(50) DEFAULT 'practice';
    ALTER TABLE practice_exams ADD COLUMN IF NOT EXISTS title VARCHAR(255);
    ALTER TABLE practice_exams ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE practice_exams ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 60;
    ALTER TABLE practice_exams ADD COLUMN IF NOT EXISTS total_marks INT DEFAULT 100;
    ALTER TABLE practice_exams ADD COLUMN IF NOT EXISTS passing_marks INT DEFAULT 40;
    ALTER TABLE practice_exams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    ALTER TABLE practice_exams ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

    CREATE TABLE IF NOT EXISTS public_hostels (
      id SERIAL PRIMARY KEY,
      institution_id INT NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) DEFAULT 'Boys & Girls',
      location VARCHAR(255) NOT NULL,
      monthly_rent VARCHAR(100) NOT NULL,
      rating NUMERIC(3,1) DEFAULT 4.5,
      reviews_count INT DEFAULT 45,
      facilities TEXT[],
      image VARCHAR(500),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public_library_books (
      id SERIAL PRIMARY KEY,
      institution_id INT NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      isbn VARCHAR(100),
      copies_available INT DEFAULT 15,
      digital_pdf_url VARCHAR(500),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  const examTitles = [
    "Final Semester Examination 2026",
    "Mid-Term Academic Assessment Test",
    "National Entrance Scholarship Exam",
    "Annual Competitive Physics & Math Olympiad",
    "Pre-Board Comprehensive Model Exam",
    "Quarterly Subject Proficiency Test",
    "State Level Technical Talent Examination",
  ];

  const practiceTitles = [
    "IIT-JEE Advanced Full Length Mock Test #1",
    "NEET UG Biology & Chemistry Speed Quiz",
    "CUET Domain Specific Practice Paper 2026",
    "Quantitative Aptitude & Reasoning Mock Test",
    "Computer Science Data Structures Speed Run",
    "General Knowledge & Current Affairs Quiz",
    "English Language Proficiency Practice Set",
  ];

  const notesTitles = [
    "Complete Physics Mechanics & Thermodynamics Handcrafted Notes",
    "Organic Chemistry Reactions & Mechanism Quick Revision Sheet",
    "Higher Mathematics Calculus & Vectors Formula Book",
    "Data Structures & Algorithms Python Implementation Guide",
    "Financial Accounting & Corporate Governance Summary PDF",
    "Human Anatomy & Physiology High-Yield Diagrammatic Notes",
    "Microeconomics & Macroeconomics Key Concepts Cheatsheet",
  ];

  const hostelNames = [
    "Green Valley Student Residency & Hostel",
    "Royal International Boys Hostel",
    "Silver Oak Girls Executive Residency",
    "Metro Scholar PG & Student Living",
    "Apex Campus Heights Luxury Hostel",
    "Serene Palms Scholar Living Space",
  ];

  const libraryTitles = [
    { title: "Introduction to Algorithms (4th Edition)", author: "Cormen, Leiserson, Rivest", cat: "Computer Science" },
    { title: "University Physics with Modern Physics", author: "Young and Freedman", cat: "Physics" },
    { title: "Principles of Neural Science & Biology", author: "Kandel, Schwartz", cat: "Medical Sciences" },
    { title: "Organic Chemistry Master Reference", author: "Clayden, Greeves, Warren", cat: "Chemistry" },
    { title: "Corporate Finance & Market Strategy", author: "Brealey, Myers, Allen", cat: "Management" },
    { title: "Advanced Engineering Mathematics", author: "Erwin Kreyszig", cat: "Mathematics" },
  ];

  for (const inst of institutions) {
    console.log(`\n🏫 Seeding for Institution: ${inst.name} (ID: ${inst.id})`);

    // A. Seed 7 Real Exams
    for (let i = 0; i < examTitles.length; i++) {
      const title = `${examTitles[i]} - ${inst.name}`;
      const desc = `Comprehensive examination conducted by ${inst.name} for academic evaluation.`;

      await db.query(`
        INSERT INTO practice_exams (institution_id, academic_year_id, title, description, exam_type, exam_kind, duration_minutes, total_marks, passing_marks, is_active, is_public, created_by)
        VALUES ($1, $2, $3, $4, 'SEMESTER', 'real', 180, 100, 40, TRUE, TRUE, $5)
      `, [inst.id, academicYearId, title, desc, adminUserId]);
    }
    console.log(`   ✓ Seeded ${examTitles.length} Real Exams.`);

    // B. Seed 7 Practice Tests / Mock Exams
    for (let i = 0; i < practiceTitles.length; i++) {
      const title = `${practiceTitles[i]} (${inst.name})`;
      const desc = `Interactive mock practice test prepared by faculty at ${inst.name}.`;

      await db.query(`
        INSERT INTO practice_exams (institution_id, academic_year_id, title, description, exam_type, exam_kind, duration_minutes, total_marks, passing_marks, is_active, is_public, created_by)
        VALUES ($1, $2, $3, $4, 'MOCK', 'practice', 60, 50, 20, TRUE, TRUE, $5)
      `, [inst.id, academicYearId, title, desc, adminUserId]);
    }
    console.log(`   ✓ Seeded ${practiceTitles.length} Practice Tests / Mocks.`);

    // C. Seed 7 Notes & Study Material
    for (let i = 0; i < notesTitles.length; i++) {
      const noteTitle = `${notesTitles[i]} - ${inst.name}`;
      const noteRes = await db.query<{ id: number }>(`
        INSERT INTO notes (institution_id, is_active, is_public, marketplace_requested, marketplace_approved, created_by)
        VALUES ($1, TRUE, TRUE, TRUE, TRUE, $2)
        RETURNING id
      `, [inst.id, adminUserId]);

      const noteId = noteRes.rows[0].id;

      await db.query(`
        INSERT INTO note_items (note_id, title, body, is_active, sort_order)
        VALUES ($1, $2, $3, TRUE, 1)
      `, [noteId, noteTitle, `Verified comprehensive study notes provided by faculty at ${inst.name}. Includes chapter summaries, solved examples, and key formulae.`]);
    }
    console.log(`   ✓ Seeded ${notesTitles.length} Study Notes.`);

    // D. Seed Hostels
    for (let i = 0; i < hostelNames.length; i++) {
      const hName = `${hostelNames[i]} - ${inst.name}`;
      await db.query(`
        INSERT INTO public_hostels (institution_id, name, type, location, monthly_rent, rating, reviews_count, facilities, image)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        inst.id,
        hName,
        i % 2 === 0 ? "Boys & Girls" : "Girls Only",
        `Near ${inst.name} Campus Gate ${i + 1}`,
        `Rs. ${(6 + i * 2) * 1000} / month`,
        (4.4 + (i % 5) * 0.1).toFixed(1),
        40 + i * 15,
        ["High Speed Wi-Fi", "24/7 Power Backup", "Nutritious Mess Meals", "AC Rooms", "Security Guard & CCTV"],
        `https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80`,
      ]);
    }
    console.log(`   ✓ Seeded ${hostelNames.length} Hostel Listings.`);

    // E. Seed Library Books
    for (let i = 0; i < libraryTitles.length; i++) {
      const lib = libraryTitles[i];
      await db.query(`
        INSERT INTO public_library_books (institution_id, title, author, category, isbn, copies_available, digital_pdf_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        inst.id,
        `${lib.title} (${inst.name} Library Edition)`,
        lib.author,
        lib.cat,
        `ISBN-978-${10000 + inst.id * 10 + i}`,
        10 + i * 5,
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      ]);
    }
    console.log(`   ✓ Seeded ${libraryTitles.length} Library Books.`);
  }

  console.log("\n🎉 ALL EXAMS, PRACTICE TESTS, NOTES, HOSTELS, AND LIBRARY BOOKS SEEDED SUCCESSFULLY!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
