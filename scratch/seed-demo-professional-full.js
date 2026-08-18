const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString && (connectionString.includes("localhost") || connectionString.includes("127.0.0.1")) ? false : { rejectUnauthorized: false },
});

let PRE_COMPUTED_HASH = null;

async function getHashedPassword() {
  if (!PRE_COMPUTED_HASH) {
    const salt = await bcrypt.genSalt(4);
    PRE_COMPUTED_HASH = await bcrypt.hash("DemoPass123", salt);
  }
  return PRE_COMPUTED_HASH;
}

async function main() {
  console.log("⚡ Starting Ultra-Fast Batched Seeding for Demo Professional...");
  const hashedPass = await getHashedPassword();

  // 1. Get or Create Demo Professional User
  const demoEmail = "demo.professional@edubird.com";
  const adminRes = await pool.query(
    `INSERT INTO users (full_name, email, password, phone, is_active, is_verified, is_profile_complete, created_at, updated_at)
     VALUES ('Demo Professional', $1, $2, '9876543212', TRUE, TRUE, TRUE, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW()
     RETURNING id`,
    [demoEmail, hashedPass]
  );
  const adminUserId = adminRes.rows[0].id;
  console.log(`👤 Admin Account ID: ${adminUserId} (${demoEmail})`);

  // Ensure role_id for roles
  const rolesRes = await pool.query(`SELECT id, code FROM roles`);
  const rolesMap = {};
  for (const r of rolesRes.rows) {
    rolesMap[r.code] = r.id;
  }

  for (const roleCode of ["institution_admin", "teacher", "driver", "student", "parent"]) {
    if (!rolesMap[roleCode]) {
      const inserted = await pool.query(
        `INSERT INTO roles (name, code, scope_code) VALUES ($1, $2, $3) RETURNING id`,
        [roleCode.replace("_", " ").toUpperCase(), roleCode, roleCode === "institution_admin" ? "institution" : "global"]
      );
      rolesMap[roleCode] = inserted.rows[0].id;
    }
  }

  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [adminUserId, rolesMap.institution_admin]);
  await pool.query(`INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [adminUserId]);

  const typeRes = await pool.query(`SELECT id FROM institution_types LIMIT 1`);
  const typeId = typeRes.rows[0]?.id || 1;

  const progTypeRes = await pool.query(`SELECT id FROM program_types LIMIT 1`);
  const progTypeId = progTypeRes.rows[0]?.id || 1;

  let catRes = await pool.query(`SELECT id FROM categories LIMIT 1`);
  let classCategoryId = catRes.rows[0]?.id || 1;

  const INSTITUTIONS = [
    {
      name: "Apex Institute of Engineering & Technology",
      slug: "apex-institute-engineering-technology-demo",
      email: "contact@apextech.edu",
      phone: "9876541001",
      studentCount: 40,
      about: "Leading engineering and technology institution focused on research, innovation, and industry placements.",
    },
    {
      name: "Pinnacle Global Academy of Science & Management",
      slug: "pinnacle-global-academy-management-demo",
      email: "info@pinnacleacademy.edu",
      phone: "9876541002",
      studentCount: 50,
      about: "Premier global academy providing undergraduate and postgraduate programs in science, business, and AI.",
    },
  ];

  const PROGRAM_TEMPLATES = [
    { title: "B.Tech Computer Science & AI", duration: 4, unit: "year", fee: 140000 },
    { title: "B.Tech Electronics & Communication", duration: 4, unit: "year", fee: 125000 },
    { title: "B.Tech Data Science & Analytics", duration: 4, unit: "year", fee: 135000 },
    { title: "B.Tech Mechanical & Robotics Engineering", duration: 4, unit: "year", fee: 120000 },
    { title: "M.Tech Software Engineering", duration: 2, unit: "year", fee: 95000 },
    { title: "MBA Business Analytics & Finance", duration: 2, unit: "year", fee: 160000 },
    { title: "BCA Computer Applications & Cloud", duration: 3, unit: "year", fee: 75000 },
    { title: "MCA Advanced Computing", duration: 2, unit: "year", fee: 85000 },
    { title: "B.Sc Physics & Astronomy", duration: 3, unit: "year", fee: 55000 },
    { title: "B.Sc Biotechnology & Genetics", duration: 3, unit: "year", fee: 65000 },
    { title: "B.Com Honors in International Accounting", duration: 3, unit: "year", fee: 60000 },
    { title: "Executive Diploma in AI & Cyber Security", duration: 1, unit: "year", fee: 50000 },
  ];

  for (let instIdx = 0; instIdx < INSTITUTIONS.length; instIdx++) {
    const instConfig = INSTITUTIONS[instIdx];
    console.log(`\n🏫 Seeding Institution ${instIdx + 1}: ${instConfig.name}...`);

    let instRes = await pool.query(
      `INSERT INTO institution_profiles (name, slug, institution_type_id, email, phone, about, is_active, created_by, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $7, NOW(), NOW())
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
       RETURNING id`,
      [instConfig.name, instConfig.slug, typeId, instConfig.email, instConfig.phone, instConfig.about, adminUserId]
    );
    const instId = instRes.rows[0].id;

    await pool.query(
      `INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, TRUE, NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [adminUserId, instId, rolesMap.institution_admin]
    );

    let ayRes = await pool.query(
      `INSERT INTO academic_years (institution_id, name, start_date, end_date, is_active, created_at, updated_at)
       VALUES ($1, '2025-2026 Academic Session', '2025-04-01', '2026-03-31', TRUE, NOW(), NOW())
       ON CONFLICT DO NOTHING RETURNING id`,
      [instId]
    );
    let ayId = ayRes.rows[0]?.id;
    if (!ayId) {
      const existingAy = await pool.query(`SELECT id FROM academic_years WHERE institution_id = $1 LIMIT 1`, [instId]);
      ayId = existingAy.rows[0].id;
    }

    await pool.query(`UPDATE institution_profiles SET default_academic_year_id = $1 WHERE id = $2`, [ayId, instId]);

    // Programs
    const programIds = [];
    for (let p = 0; p < 12; p++) {
      const tmpl = PROGRAM_TEMPLATES[p];
      const progSlug = `${tmpl.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-inst${instId}-${p + 1}`;

      const existingProg = await pool.query(
        `SELECT id FROM institution_programs WHERE institution_id = $1 AND title = $2 LIMIT 1`,
        [instId, tmpl.title]
      );

      let progId;
      if (existingProg.rows.length > 0) {
        progId = existingProg.rows[0].id;
      } else {
        const progRes = await pool.query(
          `INSERT INTO institution_programs (
            institution_id, program_type_id, slug, title, about, duration_value, duration_unit,
            fee_amount, fee_unit, admission_fee, teaching_method, seats_available, is_active, is_deleted, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 2500, 'On Campus', 60, TRUE, FALSE, NOW(), NOW())
          RETURNING id`,
          [instId, progTypeId, progSlug, tmpl.title, `Comprehensive ${tmpl.title} degree course.`, tmpl.duration, tmpl.unit, tmpl.fee, tmpl.unit === "year" ? "year" : "semester"]
        );
        progId = progRes.rows[0].id;
      }
      programIds.push(progId);
    }
    console.log(`   ✓ 12 Programs created.`);

    // Teachers (10)
    for (let t = 0; t < 10; t++) {
      const tEmail = `teacher_${instId}_${t + 1}_demo@edubird.com`;
      const tPhone = `9811${instId.toString().padStart(2, '0')}${t.toString().padStart(3, '0')}`;
      const tName = `Prof. ${["Ramesh", "Sunita", "Amit", "Priya", "Vikas", "Kavita", "Rajesh", "Ananya", "Deepak", "Pooja"][t]} Teacher ${t + 1}`;

      const tRes = await pool.query(
        `INSERT INTO users (full_name, email, password, phone, is_active, is_verified, is_profile_complete, created_at, updated_at)
         VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET updated_at = NOW() RETURNING id`,
        [tName, tEmail, hashedPass, tPhone]
      );
      const tUserId = tRes.rows[0].id;

      await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [tUserId, rolesMap.teacher]);
      await pool.query(`INSERT INTO user_profiles (user_id, under_institution_id, is_teacher) VALUES ($1, $2, TRUE) ON CONFLICT DO NOTHING`, [tUserId, instId]);
      await pool.query(`INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active) VALUES ($1, $2, $3, TRUE) ON CONFLICT DO NOTHING`, [tUserId, instId, rolesMap.teacher]);
    }
    console.log(`   ✓ 10 Teachers created.`);

    // Drivers (2)
    for (let d = 0; d < 2; d++) {
      const dEmail = `driver_${instId}_${d + 1}_demo@edubird.com`;
      const dPhone = `9812${instId.toString().padStart(2, '0')}${d.toString().padStart(3, '0')}`;
      const dName = `Driver ${["Gopal", "Mahesh"][d]} Driver ${d + 1}`;

      const dRes = await pool.query(
        `INSERT INTO users (full_name, email, password, phone, is_active, is_verified, is_profile_complete, created_at, updated_at)
         VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET updated_at = NOW() RETURNING id`,
        [dName, dEmail, hashedPass, dPhone]
      );
      const dUserId = dRes.rows[0].id;

      await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [dUserId, rolesMap.driver]);
      await pool.query(`INSERT INTO user_profiles (user_id, under_institution_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [dUserId, instId]);
      await pool.query(`INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active) VALUES ($1, $2, $3, TRUE) ON CONFLICT DO NOTHING`, [dUserId, instId, rolesMap.driver]);
    }
    console.log(`   ✓ 2 Drivers created.`);

    // Students & Parents (40 in inst 1, 50 in inst 2)
    const targetStudentCount = instConfig.studentCount;
    for (let s = 1; s <= targetStudentCount; s++) {
      try {
        const sEmail = `student_inst${instId}_${s}_demo@edubird.com`;
        const sPhone = `9813${instId.toString().padStart(2, '0')}${s.toString().padStart(3, '0')}`;
        const sName = `Learner ${["Aarav", "Vivaan", "Aditya", "Rohan", "Ishaan", "Riya", "Ananya", "Diya", "Meera", "Kavya"][s % 10]} ${["Sharma", "Verma", "Patel", "Singh", "Gupta", "Joshi", "Kumar", "Nair", "Reddy", "Chawla"][s % 10]} ${s}`;

        const sRes = await pool.query(
          `INSERT INTO users (full_name, email, password, phone, is_active, is_verified, is_profile_complete, created_at, updated_at)
           VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE, NOW(), NOW())
           ON CONFLICT (email) DO UPDATE SET updated_at = NOW() RETURNING id`,
          [sName, sEmail, hashedPass, sPhone]
        );
        const sUserId = sRes.rows[0].id;

        await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [sUserId, rolesMap.student]);
        await pool.query(`INSERT INTO user_profiles (user_id, under_institution_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [sUserId, instId]);
        await pool.query(`INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active) VALUES ($1, $2, $3, TRUE) ON CONFLICT DO NOTHING`, [sUserId, instId, rolesMap.student]);

        let spRes = await pool.query(`SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1`, [sUserId]);
        let spId;
        if (spRes.rows.length === 0) {
          const createdSp = await pool.query(
            `INSERT INTO student_profiles (user_id, admission_number) VALUES ($1, $2) RETURNING id`,
            [sUserId, `ADM-${instId}-${1000 + s}`]
          );
          spId = createdSp.rows[0].id;
        } else {
          spId = spRes.rows[0].id;
        }

        const pEmail = `parent_inst${instId}_${s}_demo@edubird.com`;
        const pPhone = `9814${instId.toString().padStart(2, '0')}${s.toString().padStart(3, '0')}`;
        const pName = `Guardian of ${sName}`;

        const pRes = await pool.query(
          `INSERT INTO users (full_name, email, password, phone, is_active, is_verified, is_profile_complete, created_at, updated_at)
           VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE, NOW(), NOW())
           ON CONFLICT (email) DO UPDATE SET updated_at = NOW() RETURNING id`,
          [pName, pEmail, hashedPass, pPhone]
        );
        const pUserId = pRes.rows[0].id;

        await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [pUserId, rolesMap.parent]);
        await pool.query(`INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active) VALUES ($1, $2, $3, TRUE) ON CONFLICT DO NOTHING`, [pUserId, instId, rolesMap.parent]);
        await pool.query(`INSERT INTO student_guardians (student_id, guardian_user_id, relationship, is_primary) VALUES ($1, $2, 'Parent / Guardian', TRUE) ON CONFLICT DO NOTHING`, [spId, pUserId]);

        const prog1 = programIds[(s * 2) % programIds.length];
        const prog2 = programIds[(s * 2 + 1) % programIds.length];

        for (const pid of [prog1, prog2]) {
          await pool.query(
            `INSERT INTO student_enrollments (student_id, institution_id, program_id, academic_year_id, class_category_id, roll_number, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'active') ON CONFLICT DO NOTHING`,
            [spId, instId, pid, ayId, classCategoryId, `ROLL-${spId}-${pid}`]
          );
        }
      } catch (stErr) {
        console.error(`Error seeding student ${s} in inst ${instId}:`, stErr.message);
      }
    }
    console.log(`   ✓ ${targetStudentCount} Students and Guardians created.`);

    // Finance Income & Expenses for 2024, 2025, 2026
    let incCatRes = await pool.query(
      `SELECT id FROM finance_income_categories WHERE scope_type = 'institution' AND institution_id = $1 LIMIT 1`,
      [instId]
    );
    let incCatId;
    if (incCatRes.rows.length === 0) {
      const createdInc = await pool.query(
        `INSERT INTO finance_income_categories (scope_type, institution_id, name, is_active, created_by)
         VALUES ('institution', $1, 'Tuition & Admission Fees', TRUE, $2) RETURNING id`,
        [instId, adminUserId]
      );
      incCatId = createdInc.rows[0].id;
    } else {
      incCatId = incCatRes.rows[0].id;
    }

    let expCatRes = await pool.query(
      `SELECT id FROM finance_expense_categories WHERE scope_type = 'institution' AND institution_id = $1 LIMIT 1`,
      [instId]
    );
    let expCatId;
    if (expCatRes.rows.length === 0) {
      const createdExp = await pool.query(
        `INSERT INTO finance_expense_categories (scope_type, institution_id, name, is_active, created_by)
         VALUES ('institution', $1, 'Campus Infrastructure & Salaries', TRUE, $2) RETURNING id`,
        [instId, adminUserId]
      );
      expCatId = createdExp.rows[0].id;
    } else {
      expCatId = expCatRes.rows[0].id;
    }

    for (const yr of [2024, 2025, 2026]) {
      for (let q = 1; q <= 4; q++) {
        const month = (q * 3).toString().padStart(2, '0');
        await pool.query(
          `INSERT INTO finance_income_entries (
            scope_type, institution_id, category_id, payment_method, paid_to, paid_to_label, amount, income_date, description, created_by, created_at
          ) VALUES ('institution', $1, $2, 'net_banking', 'Treasury', 'Fee Deposit', $3, $4, $5, $6, NOW())`,
          [instId, incCatId, 1250000 + q * 150000 + (yr - 2024) * 200000, `${yr}-${month}-15`, `Quarter ${q} Fee ${yr}`, adminUserId]
        );

        await pool.query(
          `INSERT INTO finance_expense_entries (
            scope_type, institution_id, category_id, payment_method, payment_status, paid_by, paid_by_label, amount, expense_date, description, created_by, created_at
          ) VALUES ('institution', $1, $2, 'net_banking', 'paid', 'Finance Dept', 'Operational Expense', $3, $4, $5, $6, NOW())`,
          [instId, expCatId, 650000 + q * 80000 + (yr - 2024) * 100000, `${yr}-${month}-28`, `Quarter ${q} Expense ${yr}`, adminUserId]
        );
      }
    }
    console.log(`   ✓ 3-Year Income & Expense records created (2024, 2025, 2026).`);

    // Placements (2024, 2025, 2026)
    const PLACEMENT_STATS = [
      { year: 2024, total: 120, placed: 106, avg: 850000, high: 2800000, low: 450000, pct: 88.3 },
      { year: 2025, total: 140, placed: 129, avg: 980000, high: 3400000, low: 520000, pct: 92.1 },
      { year: 2026, total: 160, placed: 152, avg: 1120000, high: 4200000, low: 600000, pct: 95.0 },
    ];
    for (const pStat of PLACEMENT_STATS) {
      await pool.query(
        `INSERT INTO institution_placements (
          institution_id, year, total_students, placed_students, placement_percentage, average_package, highest_package, lowest_package, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) ON CONFLICT DO NOTHING`,
        [instId, pStat.year, pStat.total, pStat.placed, pStat.pct, pStat.avg, pStat.high, pStat.low, adminUserId]
      );
    }
    console.log(`   ✓ 3-Year Placement records created.`);

    // Facilities
    const FACILITIES = [
      { title: "Central Digital Library & Research Center", type: 1, desc: "24/7 digital library with over 50,000 journals, e-books, and quiet study pods." },
      { title: "High-Performance AI & Supercomputing Lab", type: 2, desc: "Equipped with NVIDIA RTX GPUs, high-speed fiber optics, and dedicated AI research servers." },
      { title: "On-Campus Executive Hostels", type: 3, desc: "Air-conditioned single and twin sharing rooms with 24/7 security, high-speed Wi-Fi, and mess." },
      { title: "Multi-Sport Complex & Gymnasium", type: 4, desc: "Olympic-sized swimming pool, indoor badminton courts, football ground, and modern gym." },
      { title: "Smart Hybrid Classrooms & Auditorium", type: 5, desc: "Interactive smart touch boards, lecture recording cameras, and 500-seater acoustics auditorium." },
      { title: "Hygienic Multi-Cuisine Cafeteria", type: 6, desc: "Nutritious organic meals, coffee bar, and spacious outdoor seating area." },
      { title: "Fleet Transportation System", type: 7, desc: "AC GPS-tracked buses covering major city routes for students and staff safety." },
    ];
    for (let f = 0; f < FACILITIES.length; f++) {
      const fac = FACILITIES[f];
      await pool.query(
        `INSERT INTO institution_facilities (
          institution_id, facility_type_id, title, description, display_order, is_active, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, TRUE, $6, NOW(), NOW()) ON CONFLICT DO NOTHING`,
        [instId, fac.type, fac.title, fac.desc, f + 1, adminUserId]
      );
    }
    console.log(`   ✓ 7 Campus Facilities created.`);

    // Cutoffs (2024, 2025, 2026)
    for (let pIdx = 0; pIdx < Math.min(6, programIds.length); pIdx++) {
      const progId = programIds[pIdx];
      const examName = pIdx % 2 === 0 ? "JEE Main Cutoff Rank" : "State Entrance Merit Percentile";
      const aiResponse = [
        { year: 2024, general_cutoff: 88.5, obc_cutoff: 81.2, sc_st_cutoff: 72.0, closing_rank: 14500 },
        { year: 2025, general_cutoff: 91.2, obc_cutoff: 84.5, sc_st_cutoff: 75.8, closing_rank: 12200 },
        { year: 2026, general_cutoff: 93.8, obc_cutoff: 87.1, sc_st_cutoff: 78.4, closing_rank: 9800 },
      ];
      await pool.query(
        `INSERT INTO institution_cutoffs (
          institution_id, program_id, exam_name, years_to_generate, ai_response, is_active, is_deleted, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, 3, $4::jsonb, TRUE, FALSE, $5, NOW(), NOW())`,
        [instId, progId, examName, JSON.stringify(aiResponse), adminUserId]
      );
    }
    console.log(`   ✓ 3-Year Cut-Off records created.`);

    // Scholarships (2024, 2025, 2026)
    const SCHOLARSHIPS = [
      {
        title: "Merit Academic Excellence Scholarship (2024-2026)",
        ai_response: {
          title: "Merit Academic Excellence Scholarship",
          overview: "Offered to top 5% scorers in entrance examinations with up to 100% tuition fee waiver.",
          years_covered: [2024, 2025, 2026],
          eligibility: ["Score > 90% in qualifying board / JEE exam"],
          scholarship_amount: ["100% Tuition Fee Waiver for Rank 1-10"],
          financial_assistance: "Includes free textbook allowance and research grant of ₹25,000 per year."
        }
      },
      {
        title: "Women in STEM & Future Leaders Grant (2024-2026)",
        ai_response: {
          title: "Women in STEM & Future Leaders Grant",
          overview: "Empowering female candidates in AI, Engineering, and Technology degree programs.",
          years_covered: [2024, 2025, 2026],
          eligibility: ["Female applicants enrolled in B.Tech / M.Tech"],
          scholarship_amount: ["₹40,000 Annual Stipend"],
          financial_assistance: "Direct benefit transfer into student bank account."
        }
      },
      {
        title: "Need-Based Financial Aid & Sports Champion Scheme (2024-2026)",
        ai_response: {
          title: "Need-Based Financial Aid & Sports Champion Scheme",
          overview: "Financial assistance for meritorious students from EWS section and sports players.",
          years_covered: [2024, 2025, 2026],
          eligibility: ["EWS certificate holders or State/National level sports medalists"],
          scholarship_amount: ["Up to 75% fee concession"],
          financial_assistance: "Covers tuition fees, sports equipment kit, and campus mess fee waiver."
        }
      }
    ];

    for (const sch of SCHOLARSHIPS) {
      await pool.query(
        `INSERT INTO institution_scholarships (
          institution_id, ai_response, is_ai_generated, is_active, is_deleted, created_by, created_at, updated_at
        ) VALUES ($1, $2::jsonb, TRUE, TRUE, FALSE, $3, NOW(), NOW())`,
        [instId, JSON.stringify(sch.ai_response), adminUserId]
      );
    }
    console.log(`   ✓ 3-Year Scholarship records created.`);
  }

  console.log(`\n🎉 COMPLETED! All institutions, staff, students, programs, finances, placements, facilities, cutoffs & scholarships created!`);
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Seeding Error:", err);
  process.exit(1);
});
