import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

const TARGET_EMAILS = ["ra@gmail.com", "r@gmail.com"];

const PROGRAM_TEMPLATES = [
  { title: "IIT-JEE Super 30 Intensive Batch", duration: 2, unit: "year", fee: 125000 },
  { title: "NEET Medical Achievers Regular Course", duration: 2, unit: "year", fee: 110000 },
  { title: "Class 10th CBSE Board Comprehensive Program", duration: 1, unit: "year", fee: 45000 },
  { title: "Class 12th Senior Secondary Science Stream", duration: 1, unit: "year", fee: 55000 },
  { title: "Class 12th Commerce & Financial Studies", duration: 1, unit: "year", fee: 50000 },
  { title: "CUET University Entrance Foundation Course", duration: 6, unit: "month", fee: 35000 },
  { title: "NDA & Defence Services Entrance Academy", duration: 1, unit: "year", fee: 65000 },
  { title: "Class 9th Foundation Olympiad & NTSE", duration: 1, unit: "year", fee: 40000 },
  { title: "Class 11th Science & Engineering Track", duration: 1, unit: "year", fee: 52000 },
  { title: "Class 11th Commerce & Economics Track", duration: 1, unit: "year", fee: 48000 },
  { title: "K-12 Primary Holistic Education Program", duration: 1, unit: "year", fee: 38000 },
  { title: "Class 8th Middle School Academic Excellence", duration: 1, unit: "year", fee: 35000 },
  { title: "Class 7th STEM & Robotics Foundation", duration: 1, unit: "year", fee: 32000 },
  { title: "Class 6th General Academic Program", duration: 1, unit: "year", fee: 30000 },
  { title: "CA Foundation & Commerce Olympiad Batch", duration: 6, unit: "month", fee: 42000 },
  { title: "CLAT Law Entrance Preparation Masterclass", duration: 1, unit: "year", fee: 75000 },
  { title: "SAT International University Prep", duration: 6, unit: "month", fee: 85000 },
  { title: "Coding & AI Young Innovators Program", duration: 6, unit: "month", fee: 28000 },
  { title: "State Board Class 10th Toppers Special", duration: 1, unit: "year", fee: 38000 },
  { title: "State Board Class 12th Science Mastery", duration: 1, unit: "year", fee: 46000 },
];

async function getOrInsertInstitutionType(name: string, slug: string) {
  const existing = await pool.query<{ id: number }>(
    `SELECT id FROM institution_types WHERE slug = $1 OR LOWER(name) = LOWER($2) LIMIT 1`,
    [slug, name]
  );
  if (existing.rows[0]?.id) return existing.rows[0].id;

  const inserted = await pool.query<{ id: number }>(
    `INSERT INTO institution_types (name, slug, is_active) VALUES ($1, $2, TRUE) RETURNING id`,
    [name, slug]
  );
  return inserted.rows[0].id;
}

async function getOrInsertProgramType(name: string, slug: string) {
  const existing = await pool.query<{ id: number }>(
    `SELECT id FROM program_types WHERE slug = $1 OR LOWER(name) = LOWER($2) LIMIT 1`,
    [slug, name]
  );
  if (existing.rows[0]?.id) return existing.rows[0].id;

  const inserted = await pool.query<{ id: number }>(
    `INSERT INTO program_types (name, slug, is_active) VALUES ($1, $2, TRUE) RETURNING id`,
    [name, slug]
  );
  return inserted.rows[0].id;
}

async function getRolesMap() {
  const map: Record<string, number> = {};
  const res = await pool.query<{ id: number; code: string }>(`SELECT id, code FROM roles`);
  for (const r of res.rows) {
    map[r.code] = r.id;
  }
  for (const roleCode of ["platform_admin", "institution_admin", "teacher", "student", "parent", "driver"]) {
    if (!map[roleCode]) {
      const inserted = await pool.query<{ id: number }>(
        `INSERT INTO roles (name, code) VALUES ($1, $2) RETURNING id`,
        [roleCode.replace("_", " ").toUpperCase(), roleCode]
      );
      map[roleCode] = inserted.rows[0].id;
    }
  }
  return map;
}

async function seedForAdmin(adminUser: { id: number; email: string; full_name: string }, rolesMap: Record<string, number>) {
  console.log(`\n======================================================`);
  console.log(`🏢 Seeding profiles & listings for Admin: ${adminUser.full_name} (${adminUser.email})`);
  console.log(`======================================================`);

  // Ensure user has institution_admin role code
  if (rolesMap.institution_admin) {
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [adminUser.id, rolesMap.institution_admin]
    );
  }

  const schoolTypeId = await getOrInsertInstitutionType("School", "school");
  const coachingTypeId = await getOrInsertInstitutionType("Coaching Center", "coaching_center");
  const defaultProgramTypeId = await getOrInsertProgramType("Academic & Competitive Program", "academic-competitive-program");

  // 1. Create 3 Coaching Centers and 2 Schools under this Admin User if not created yet
  const newInstitutionsData = [
    { name: `Apex Target Entrance & Competitive Coaching Center`, typeId: coachingTypeId, type: "Coaching" },
    { name: `Pinnacle NEET & JEE Academic Coaching Institute`, typeId: coachingTypeId, type: "Coaching" },
    { name: `Vision Premier Scholars Coaching Academy`, typeId: coachingTypeId, type: "Coaching" },
    { name: `EduBird Horizon International Public School`, typeId: schoolTypeId, type: "School" },
    { name: `EduBird St. Xavier Higher Secondary Model School`, typeId: schoolTypeId, type: "School" },
  ];

  for (const instData of newInstitutionsData) {
    const slug = instData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + `-${adminUser.id}`;
    
    // Check if already created
    const existing = await pool.query<{ id: number }>(`SELECT id FROM institution_profiles WHERE slug = $1 LIMIT 1`, [slug]);
    let instId = existing.rows[0]?.id;

    if (!instId) {
      const res = await pool.query(
        `INSERT INTO institution_profiles (
          name, slug, institution_type_id, email, phone, about, is_active,
          created_by, updated_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'Premier educational institution providing high quality learning, competitive exam prep, and holistic development.',
          TRUE, $6, $6, NOW(), NOW()
        ) RETURNING id`,
        [instData.name, slug, instData.typeId, `contact@${slug.slice(0, 15)}.edu`, `98765${Math.floor(10005 + Math.random() * 89999)}`, adminUser.id]
      );
      instId = res.rows[0].id;
    }

    // Create institution_memberships link
    if (rolesMap.institution_admin) {
      await pool.query(
        `INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, TRUE, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [adminUser.id, instId, rolesMap.institution_admin]
      );
    }
  }

  // Get ALL institutions owned by or linked to this admin
  const allAdminInstsRes = await pool.query(
    `SELECT DISTINCT ip.id, ip.name 
     FROM institution_profiles ip
     LEFT JOIN institution_memberships im ON im.institution_id = ip.id AND im.user_id = $1
     WHERE (ip.created_by = $1 OR im.user_id = $1)
       AND COALESCE(ip.is_deleted, FALSE) = FALSE`,
    [adminUser.id]
  );
  const targetInstitutions = allAdminInstsRes.rows;

  console.log(`\n📋 Target Listings for Data Seeding: ${targetInstitutions.length} Institution(s)`);

  for (const inst of targetInstitutions) {
    const instId = inst.id;
    console.log(`\n⚙️ Seeding Listings for: ${inst.name} (ID: ${instId})...`);

    // Ensure columns exist on institution_programs
    await pool.query(`
      ALTER TABLE institution_programs ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(10,2) DEFAULT 25000.00;
      ALTER TABLE institution_programs ADD COLUMN IF NOT EXISTS fee_unit VARCHAR(50) DEFAULT 'year';
      ALTER TABLE institution_programs ADD COLUMN IF NOT EXISTS admission_fee NUMERIC(10,2) DEFAULT 2500.00;
    `);

    // A. Seed 20 Programs / Courses
    console.log(`   └─ Seeding 20 Programs / Courses...`);
    const programIds: number[] = [];

    for (let pIdx = 0; pIdx < 20; pIdx++) {
      const tmpl = PROGRAM_TEMPLATES[pIdx % PROGRAM_TEMPLATES.length];
      const progSlug = `${tmpl.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${instId}-${pIdx + 1}-${Date.now().toString().slice(-4)}`;
      
      const progRes = await pool.query<{ id: number }>(
        `INSERT INTO institution_programs (
          institution_id, program_type_id, slug, title, about, duration_value, duration_unit,
          fee_amount, fee_unit, admission_fee, teaching_method, seats_available,
          is_active, is_deleted, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, FALSE, NOW(), NOW()
        ) RETURNING id`,
        [
          instId,
          defaultProgramTypeId,
          progSlug,
          `${tmpl.title} (Batch ${pIdx + 1})`,
          `Comprehensive curriculum for ${tmpl.title} designed by senior faculty. Includes study notes, regular mock tests, and personalized mentoring.`,
          tmpl.duration,
          tmpl.unit,
          tmpl.fee,
          tmpl.unit === "year" ? "year" : "semester",
          2500,
          pIdx % 3 === 0 ? "Hybrid" : pIdx % 2 === 0 ? "Online" : "On Campus",
          40 + (pIdx % 5) * 10
        ]
      );
      programIds.push(progRes.rows[0].id);
    }
    console.log(`      ✓ 20 Programs seeded.`);

    // B. Seed 40 Teachers
    console.log(`   └─ Seeding 40 Teachers...`);
    const teacherUserIds: number[] = [];

    for (let tIdx = 1; tIdx <= 40; tIdx++) {
      const teacherName = `Prof. ${["Anand", "Suresh", "Meena", "Vikas", "Pooja", "Rajesh", "Kavita", "Deepak", "Sunita", "Amit"][tIdx % 10]} ${["Sharma", "Verma", "Gupta", "Singh", "Jha", "Mishra", "Kaur", "Yadav", "Patel", "Reddy"][tIdx % 10]} ${tIdx}`;
      const email = `teacher.${instId}.${tIdx}.${Date.now().toString().slice(-4)}@edubird.org`;

      const tUserRes = await pool.query(
        `INSERT INTO users (full_name, email, phone, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [teacherName, email, `9810${instId.toString().padStart(2, '0')}${tIdx.toString().padStart(4, '0')}`]
      );
      const teacherUserId = tUserRes.rows[0].id;
      teacherUserIds.push(teacherUserId);

      if (rolesMap.teacher) {
        await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
          teacherUserId, rolesMap.teacher
        ]);
        await pool.query(
          `INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, TRUE, NOW(), NOW()) ON CONFLICT DO NOTHING`,
          [teacherUserId, instId, rolesMap.teacher]
        );
      }
    }
    console.log(`      ✓ 40 Teachers seeded.`);

    // C. Seed 5 Drivers
    console.log(`   └─ Seeding 5 Drivers...`);
    for (let dIdx = 1; dIdx <= 5; dIdx++) {
      const driverName = `Driver ${["Ramesh", "Mahesh", "Sanjay", "Dinesh", "Gopal"][dIdx - 1]} Kumar`;
      const email = `driver.${instId}.${dIdx}.${Date.now().toString().slice(-4)}@edubird.org`;

      const dUserRes = await pool.query(
        `INSERT INTO users (full_name, email, phone, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [driverName, email, `9710${instId.toString().padStart(2, '0')}${dIdx.toString().padStart(4, '0')}`]
      );
      const driverUserId = dUserRes.rows[0].id;

      if (rolesMap.driver) {
        await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
          driverUserId, rolesMap.driver
        ]);
        await pool.query(
          `INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, TRUE, NOW(), NOW()) ON CONFLICT DO NOTHING`,
          [driverUserId, instId, rolesMap.driver]
        );
      }
    }
    console.log(`      ✓ 5 Drivers seeded.`);

    // D. Seed 55 Students + Parents + 2-Month Attendance Records
    console.log(`   └─ Seeding 55 Students & Parents...`);
    const studentProfileIds: number[] = [];

    for (let sIdx = 1; sIdx <= 55; sIdx++) {
      const studentName = `Student ${["Rohan", "Riya", "Aarav", "Ananya", "Vivaan", "Ishaan", "Diya", "Kabir", "Meera", "Aditya"][sIdx % 10]} ${["Sharma", "Verma", "Singh", "Patel", "Gupta", "Joshi", "Chawla", "Kumar", "Dutta", "Nair"][sIdx % 10]} ${sIdx}`;
      const email = `student.${instId}.${sIdx}.${Date.now().toString().slice(-4)}@edubird.org`;

      const sUserRes = await pool.query(
        `INSERT INTO users (full_name, email, phone, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [studentName, email, `9610${instId.toString().padStart(2, '0')}${sIdx.toString().padStart(4, '0')}`]
      );
      const studentUserId = sUserRes.rows[0].id;

      if (rolesMap.student) {
        await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
          studentUserId, rolesMap.student
        ]);
        await pool.query(
          `INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, TRUE, NOW(), NOW()) ON CONFLICT DO NOTHING`,
          [studentUserId, instId, rolesMap.student]
        );
      }

      // Create student_profiles record
      const spRes = await pool.query<{ id: number }>(
        `INSERT INTO student_profiles (user_id, admission_number)
         VALUES ($1, $2) RETURNING id`,
        [studentUserId, `ADM-${instId}-${1000 + sIdx}-${Date.now().toString().slice(-4)}`]
      );
      const studentProfileId = spRes.rows[0].id;
      studentProfileIds.push(studentProfileId);

      // Create Parent profile
      const parentName = `Parent of ${studentName}`;
      const pEmail = `parent.${instId}.${sIdx}.${Date.now().toString().slice(-4)}@edubird.org`;
      const pUserRes = await pool.query(
        `INSERT INTO users (full_name, email, phone, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [parentName, pEmail, `9510${instId.toString().padStart(2, '0')}${sIdx.toString().padStart(4, '0')}`]
      );
      const parentUserId = pUserRes.rows[0].id;

      if (rolesMap.parent) {
        await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
          parentUserId, rolesMap.parent
        ]);
        await pool.query(
          `INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, TRUE, NOW(), NOW()) ON CONFLICT DO NOTHING`,
          [parentUserId, instId, rolesMap.parent]
        );
      }

      // Link Parent & Student in student_guardians
      await pool.query(
        `INSERT INTO student_guardians (student_id, guardian_user_id, relationship, is_primary)
         VALUES ($1, $2, 'Father / Guardian', TRUE)
         ON CONFLICT DO NOTHING`,
        [studentProfileId, parentUserId]
      ).catch(() => undefined);

      // Enroll in 2 courses
      const p1 = programIds[(sIdx * 2) % programIds.length];
      const p2 = programIds[(sIdx * 2 + 1) % programIds.length];

      for (const pid of [p1, p2]) {
        await pool.query(
          `INSERT INTO student_enrollments (student_id, institution_id, program_id, roll_number, status)
           VALUES ($1, $2, $3, $4, 'active')
           ON CONFLICT DO NOTHING`,
          [studentProfileId, instId, pid, `ROLL-${studentProfileId}-${pid}`]
        ).catch(() => undefined);
      }
    }
    console.log(`      ✓ 55 Students & 55 Parents seeded.`);

    // Seed 2-Month Attendance Records (~90% PRESENT)
    console.log(`   └─ Marking 60 days of ~90% PRESENT attendance for 55 students...`);
    const now = new Date();

    for (let dayOffset = 60; dayOffset >= 0; dayOffset--) {
      const attDate = new Date(now);
      attDate.setDate(now.getDate() - dayOffset);
      if (attDate.getDay() === 0) continue; // skip Sundays

      const formattedDate = attDate.toISOString().split("T")[0];

      // Session for program
      for (const progId of programIds.slice(0, 3)) {
        const sessRes = await pool.query<{ id: number }>(
          `INSERT INTO attendance_sessions (institution_id, program_id, attendance_date, attendance_mode, marked_by)
           VALUES ($1, $2, $3, 'FULL_DAY', $4)
           RETURNING id`,
          [instId, progId, formattedDate, teacherUserIds[0]]
        ).catch(() => undefined);

        const sessionId = sessRes?.rows[0]?.id;
        if (!sessionId) continue;

        for (const stProfId of studentProfileIds) {
          const isPresent = Math.random() < 0.91; // ~90% Present rate
          const status = isPresent ? "PRESENT" : "ABSENT";

          await pool.query(
            `INSERT INTO student_attendance (attendance_session_id, student_id, status)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [sessionId, stProfId, status]
          ).catch(() => undefined);
        }
      }
    }
    console.log(`      ✓ Attendance records generated.`);

    // E. Seed 10 Real Exams
    console.log(`   └─ Seeding 10 Real Exams...`);
    const EXAM_TYPES = ["Mid-Term Exam", "Final Board Evaluation", "Unit Assessment Test", "Quarterly Exam", "Pre-Board Mock Exam"];

    for (let eIdx = 1; eIdx <= 10; eIdx++) {
      const examTitle = `Annual ${EXAM_TYPES[eIdx % EXAM_TYPES.length]} - Term ${eIdx}`;
      await pool.query(
        `INSERT INTO practice_exams (
          institution_id, title, description, exam_type, exam_kind, duration_minutes, total_marks, passing_marks, is_active, is_public, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'real_exam', 'standard', 180, 100, 40, TRUE, TRUE, $4, NOW(), NOW()
        )`,
        [instId, examTitle, `Comprehensive evaluations exam for term evaluation ${eIdx}. Covers complete syllabus with objective & subjective sections.`, adminUser.id]
      );
    }
    console.log(`      ✓ 10 Real Exams seeded.`);

    // F. Seed 4 Practice Exams / Mocks
    console.log(`   └─ Seeding 4 Practice Exams / Mock Tests...`);
    const MOCK_KINDS = ["IIT-JEE Mock Test", "NEET All India Speed Mock", "Board Pattern Practice Mock", "Aptitude & Logical Reasoning Mock"];

    for (let mIdx = 1; mIdx <= 4; mIdx++) {
      const mockTitle = `${MOCK_KINDS[mIdx - 1]} - Series #${mIdx}`;
      await pool.query(
        `INSERT INTO practice_exams (
          institution_id, title, description, exam_type, exam_kind, duration_minutes, total_marks, passing_marks, is_active, is_public, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'practice_mock', 'mock_test', 120, 300, 120, TRUE, TRUE, $4, NOW(), NOW()
        )`,
        [instId, mockTitle, `All-India level online practice mock test with real-time score analytics, timer countdown, and detailed solution keys.`, adminUser.id]
      );
    }
    console.log(`      ✓ 4 Practice Exams seeded.`);
  }

  console.log(`\n🎉 SEEDING COMPLETE FOR ADMIN: ${adminUser.full_name} (${adminUser.email})!`);
}

async function run() {
  const rolesMap = await getRolesMap();

  for (const email of TARGET_EMAILS) {
    const res = await pool.query(
      `SELECT id, email, full_name FROM users WHERE email ILIKE $1`,
      [email]
    );

    if (res.rows.length === 0) {
      const name = email.startsWith("ra") ? "Rahul Roy" : "Rakesh Yadav";
      const uRes = await pool.query(
        `INSERT INTO users (full_name, email, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id, email, full_name`,
        [name, email]
      );
      await seedForAdmin(uRes.rows[0], rolesMap);
    } else {
      await seedForAdmin(res.rows[0], rolesMap);
    }
  }

  await pool.end();
}

run().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
