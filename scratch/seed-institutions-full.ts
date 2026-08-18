import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { hashPassword } from "../lib/auth/hash";

async function main() {
  console.log("🚀 Starting comprehensive demo data seed...");

  const { db } = await import("../lib/db/db");

  const defaultPassword = await hashPassword("EduBird@123456");

  // 1. Ensure basic roles exist in `roles` table
  const rolesMap: Record<string, number> = {};
  const rolesRes = await db.query<{ id: number; code: string }>(`SELECT id, code FROM roles`);
  for (const r of rolesRes.rows) {
    rolesMap[r.code] = r.id;
  }

  // Fallback role creation if any role is missing
  for (const roleCode of ["platform_admin", "institution_admin", "teacher", "student", "parent"]) {
    if (!rolesMap[roleCode]) {
      const res = await db.query<{ id: number }>(
        `INSERT INTO roles (name, code) VALUES ($1, $2) RETURNING id`,
        [roleCode.replace("_", " ").toUpperCase(), roleCode]
      );
      rolesMap[roleCode] = res.rows[0].id;
    }
  }

  // 2. Fetch or create Institute Admin Users
  let adminUsers = await db.query<{ id: number; full_name: string; email: string }>(`
    SELECT DISTINCT u.id, u.full_name, u.email
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.is_active = TRUE
      AND COALESCE(u.is_deleted, FALSE) = FALSE
      AND (r.code IN ('institution_admin', 'platform_admin', 'university_owner', 'college_owner', 'school_owner') OR u.email ILIKE '%admin%')
  `);

  if (adminUsers.rows.length === 0) {
    const newAdmin = await db.query<{ id: number; full_name: string; email: string }>(`
      INSERT INTO users (full_name, email, password, is_active, is_verified)
      VALUES ('Main Institute Admin', 'admin@edubird.com', $1, TRUE, TRUE)
      RETURNING id, full_name, email
    `, [defaultPassword]);
    await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
      newAdmin.rows[0].id,
      rolesMap.institution_admin,
    ]);
    adminUsers = newAdmin;
  }

  console.log(`Found ${adminUsers.rows.length} Institute Admin profile(s).`);

  // 3. Ensure Institution Types exist
  const getOrInsertType = async (name: string, slug: string) => {
    const existing = await db.query<{ id: number }>(
      `SELECT id FROM institution_types WHERE slug = $1 OR LOWER(name) = LOWER($2) LIMIT 1`,
      [slug, name]
    );
    if (existing.rows[0]?.id) return existing.rows[0].id;

    const inserted = await db.query<{ id: number }>(
      `INSERT INTO institution_types (name, slug, is_active) VALUES ($1, $2, TRUE) RETURNING id`,
      [name, slug]
    );
    return inserted.rows[0].id;
  };

  const universityTypeId = await getOrInsertType("University", "university");
  const collegeTypeId = await getOrInsertType("College", "college");
  const schoolTypeId = await getOrInsertType("School", "school");
  const coachingTypeId = await getOrInsertType("Coaching Center", "coaching");

  // Ensure Program Types exist
  const getOrInsertProgramType = async (name: string, slug: string) => {
    const existing = await db.query<{ id: number }>(
      `SELECT id FROM program_types WHERE slug = $1 OR LOWER(name) = LOWER($2) LIMIT 1`,
      [slug, name]
    );
    if (existing.rows[0]?.id) return existing.rows[0].id;

    const inserted = await db.query<{ id: number }>(
      `INSERT INTO program_types (name, slug, is_active) VALUES ($1, $2, TRUE) RETURNING id`,
      [name, slug]
    );
    return inserted.rows[0].id;
  };

  const defaultProgramTypeId = await getOrInsertProgramType("Degree / Certificate Program", "degree-certificate");

  // Ensure Category exists
  const getOrInsertCategory = async (name: string, slug: string) => {
    const existing = await db.query<{ id: number }>(
      `SELECT id FROM categories WHERE slug = $1 OR LOWER(name) = LOWER($2) LIMIT 1`,
      [slug, name]
    );
    if (existing.rows[0]?.id) return existing.rows[0].id;

    const inserted = await db.query<{ id: number }>(
      `INSERT INTO categories (name, slug, is_active) VALUES ($1, $2, TRUE) RETURNING id`,
      [name, slug]
    );
    return inserted.rows[0].id;
  };

  const defaultCategoryId = await getOrInsertCategory("General Academic Batch", "general-academic-batch");

  // Ensure Section exists
  const getOrInsertSection = async (name: string, slug: string) => {
    const existing = await db.query<{ id: number }>(
      `SELECT id FROM sections WHERE slug = $1 OR LOWER(name) = LOWER($2) LIMIT 1`,
      [slug, name]
    );
    if (existing.rows[0]?.id) return existing.rows[0].id;

    const inserted = await db.query<{ id: number }>(
      `INSERT INTO sections (name, slug, is_active) VALUES ($1, $2, TRUE) RETURNING id`,
      [name, slug]
    );
    return inserted.rows[0].id;
  };

  const defaultSectionId = await getOrInsertSection("Section A", "section-a");

  // 4. Ensure Academic Session Template & Years
  await db.query(`
    CREATE TABLE IF NOT EXISTS academic_session_templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `).catch(() => undefined);

  let sessionTemplateRes = await db.query<{ id: number }>(`
    SELECT id FROM academic_session_templates WHERE name = '2025-2026' LIMIT 1
  `);
  let templateId = sessionTemplateRes.rows[0]?.id;

  if (!templateId) {
    const tRes = await db.query<{ id: number }>(`
      INSERT INTO academic_session_templates (name, start_date, end_date, is_active)
      VALUES ('2025-2026', '2025-04-01', '2026-03-31', TRUE)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    templateId = tRes.rows[0].id;
  }

  // Process institutions creation for each admin user
  for (const adminUser of adminUsers.rows) {
    console.log(`\n🏢 Seeding institutions for Admin: ${adminUser.full_name} (${adminUser.email})`);

    // A. Create University
    const univRes = await db.query<{ id: number }>(`
      INSERT INTO institution_profiles (name, slug, institution_type_id, email, phone, about, is_active, created_by, updated_by)
      VALUES (
        'EduBird Central Apex University',
        'edubird-central-university-' || substring(md5(random()::text) from 1 for 6),
        $1, 'contact@edubirduniversity.edu.in',
        '+91 98765 00001',
        'Premier central university offering multi-disciplinary higher education and research programs.',
        TRUE, $2, $2
      )
      RETURNING id
    `, [universityTypeId, adminUser.id]);
    const universityId = univRes.rows[0].id;

    // B. Create 2 Colleges under University
    const col1Res = await db.query<{ id: number }>(`
      INSERT INTO institution_profiles (name, slug, institution_type_id, parent_university_id, email, phone, about, is_active, created_by, updated_by)
      VALUES (
        'EduBird Engineering & Technology College',
        'edubird-engineering-college-' || substring(md5(random()::text) from 1 for 6),
        $1, $2, 'info@edubirdtech.edu.in', '+91 98765 00002',
        'Affiliated engineering college specializing in Computer Science, AI, and Robotics.',
        TRUE, $3, $3
      )
      RETURNING id
    `, [collegeTypeId, universityId, adminUser.id]);
    const college1Id = col1Res.rows[0].id;

    const col2Res = await db.query<{ id: number }>(`
      INSERT INTO institution_profiles (name, slug, institution_type_id, parent_university_id, email, phone, about, is_active, created_by, updated_by)
      VALUES (
        'EduBird School of Business & Management',
        'edubird-business-school-' || substring(md5(random()::text) from 1 for 6),
        $1, $2, 'admissions@edubirdmgmt.edu.in', '+91 98765 00003',
        'Premier management institution offering MBA, BBA, and Financial Analytics.',
        TRUE, $3, $3
      )
      RETURNING id
    `, [collegeTypeId, universityId, adminUser.id]);
    const college2Id = col2Res.rows[0].id;

    // C. Create 1 School
    const schoolRes = await db.query<{ id: number }>(`
      INSERT INTO institution_profiles (name, slug, institution_type_id, email, phone, about, is_active, created_by, updated_by)
      VALUES (
        'EduBird International Higher Secondary School',
        'edubird-international-school-' || substring(md5(random()::text) from 1 for 6),
        $1, 'principal@edubirdschool.edu.in', '+91 98765 00004',
        'K-12 CBSE school empowering students with holistic academic and extracurricular excellence.',
        TRUE, $2, $2
      )
      RETURNING id
    `, [schoolTypeId, adminUser.id]);
    const schoolId = schoolRes.rows[0].id;

    // D. Create 1 Coaching Center
    const coachingRes = await db.query<{ id: number }>(`
      INSERT INTO institution_profiles (name, slug, institution_type_id, email, phone, about, is_active, created_by, updated_by)
      VALUES (
        'EduBird Premier Entrance Coaching Institute',
        'edubird-premier-coaching-' || substring(md5(random()::text) from 1 for 6),
        $1, 'help@edubirdcoaching.com', '+91 98765 00005',
        'Top ranker coaching academy for IIT-JEE, NEET, CUET, and Foundation Olympiads.',
        TRUE, $2, $2
      )
      RETURNING id
    `, [coachingTypeId, adminUser.id]);
    const coachingId = coachingRes.rows[0].id;

    const targetInstitutions = [
      { id: schoolId, name: "School", type: "school" },
      { id: college1Id, name: "College 1 (Engineering)", type: "college" },
      { id: college2Id, name: "College 2 (Management)", type: "college" },
      { id: coachingId, name: "Coaching Center", type: "coaching" },
    ];

    // Link admin user to all institutions
    for (const inst of targetInstitutions) {
      await db.query(`
        INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active)
        VALUES ($1, $2, $3, TRUE)
        ON CONFLICT DO NOTHING
      `, [adminUser.id, inst.id, rolesMap.institution_admin]);
    }

    // 4. Populate each institution with Courses, Teachers, Students, Parents & 2-Month Attendance
    for (const inst of targetInstitutions) {
      console.log(`   └─ Populating ${inst.name} (ID: ${inst.id})...`);

      // A. Academic Year
      const ayRes = await db.query<{ id: number }>(`
        INSERT INTO academic_years (institution_id, session_template_id, name, start_date, end_date, is_active, created_by)
        VALUES ($1, $2, '2025-2026', '2025-04-01', '2026-03-31', TRUE, $3)
        ON CONFLICT (institution_id, session_template_id) WHERE session_template_id IS NOT NULL
        DO UPDATE SET is_active = TRUE
        RETURNING id
      `, [inst.id, templateId, adminUser.id]);
      const academicYearId = ayRes.rows[0].id;

      // Update institution default academic year
      await db.query(`
        UPDATE institution_profiles SET default_academic_year_id = $1 WHERE id = $2
      `, [academicYearId, inst.id]);

      // B. Create 15 Courses/Programs
      const courseTitlesMap: Record<string, string[]> = {
        school: [
          "Class 6th CBSE General", "Class 7th CBSE General", "Class 8th CBSE Science & Math",
          "Class 9th High School", "Class 10th CBSE Board Prep", "Class 11th Physics & Math",
          "Class 11th Chemistry & Biology", "Class 11th Commerce & Economics", "Class 12th Physics & Math",
          "Class 12th Board Special", "CBSE Computer Science C++", "Foundation English Literature",
          "Secondary Social Sciences", "Physical Education & Health", "Art & Environmental Studies",
        ],
        college: inst.name.includes("Engineering")
          ? [
              "B.Tech Computer Science Engineering", "B.Tech Artificial Intelligence & ML",
              "B.Tech Information Technology", "B.Tech Mechanical Engineering", "B.Tech Civil Engineering",
              "B.Tech Electrical & Electronics", "M.Tech Data Science & Analytics", "M.Tech Software Systems",
              "B.Sc Computer Science Honours", "B.Sc Electronics & Communication", "Diploma Computer Engineering",
              "Diploma Mechanical Design", "Ph.D Computer Science Research", "Cloud Computing Certification",
              "Cybersecurity & Networks Diploma",
            ]
          : [
              "Master of Business Administration (MBA)", "Bachelor of Business Administration (BBA)",
              "B.Com Honours Accounting & Finance", "MBA Financial Analytics", "MBA Marketing & Digital Growth",
              "MBA Human Resource Management", "BBA International Business", "M.Com Banking & Insurance",
              "Post Graduate Diploma in Finance", "Executive MBA Program", "Business Analytics & BI Program",
              "Supply Chain Management Certification", "Entrepreneurship & Startup Incubation",
              "Hospitality & Event Management BBA", "Corporate Strategy & Leadership Certificate",
            ],
        coaching: [
          "IIT-JEE Mains 1-Year Classroom Program", "IIT-JEE Advanced Rankers Batch", "NEET UG Medical Booster Program",
          "CUET General Test & Domain Prep", "Class 10th Board + Foundation Olympiad", "Class 9th Early Starter Foundation",
          "Crash Course JEE Main 2026", "Crash Course NEET Medical 2026", "GATE CS & IT Target Batch",
          "NDA Entrance Preparation Program", "KVPY & NTSE Scholars Program", "Physics Special Numerical Masterclass",
          "Organic Chemistry Reaction Mastery", "Calculus & Trigonometry Target Batch", "Biology Diagrammatic Recall Batch",
        ],
      };

      const programTitles = courseTitlesMap[inst.type] || courseTitlesMap.school;
      const programIds: number[] = [];

      for (const title of programTitles) {
        const pSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Math.random().toString(36).substring(2, 8);
        const progRes = await db.query<{ id: number }>(`
          INSERT INTO institution_programs (institution_id, program_type_id, slug, title, about, duration_value, duration_unit, is_active, created_by)
          VALUES ($1, $2, $3, $4, $5, 1, 'year', TRUE, $6)
          RETURNING id
        `, [inst.id, defaultProgramTypeId, pSlug, title, `Comprehensive curriculum for ${title}`, adminUser.id]);
        
        const progId = progRes.rows[0].id;
        programIds.push(progId);

        await db.query(`
          INSERT INTO program_sections (program_id, section_id)
          VALUES ($1, $2) ON CONFLICT DO NOTHING
        `, [progId, defaultSectionId]);
      }

      // C. Create 15 Teachers
      const teacherIds: number[] = [];
      for (let i = 1; i <= 15; i++) {
        const email = `teacher_${inst.id}_${i}_${Date.now()}@edubird.com`;
        const name = `Prof. Faculty ${inst.id}-${i}`;
        const uRes = await db.query<{ id: number }>(`
          INSERT INTO users (full_name, email, password, is_active, is_verified)
          VALUES ($1, $2, $3, TRUE, TRUE)
          RETURNING id
        `, [name, email, defaultPassword]);
        const teacherUserId = uRes.rows[0].id;

        await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
          teacherUserId,
          rolesMap.teacher,
        ]);

        await db.query(`
          INSERT INTO user_profiles (user_id, under_institution_id, is_teacher)
          VALUES ($1, $2, TRUE)
          ON CONFLICT DO NOTHING
        `, [teacherUserId, inst.id]);

        await db.query(`
          INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active)
          VALUES ($1, $2, $3, TRUE)
          ON CONFLICT DO NOTHING
        `, [teacherUserId, inst.id, rolesMap.teacher]);

        teacherIds.push(teacherUserId);
      }

      // D. Create 15 Students (Each with 1 Parent & enrolled in 2 Courses)
      const studentProfileIds: { studentProfileId: number; userId: number }[] = [];

      for (let i = 1; i <= 15; i++) {
        const studentEmail = `student_${inst.id}_${i}_${Date.now()}@edubird.com`;
        const studentName = `Learner Student ${inst.id}-${i}`;
        const stRes = await db.query<{ id: number }>(`
          INSERT INTO users (full_name, email, password, is_active, is_verified)
          VALUES ($1, $2, $3, TRUE, TRUE)
          RETURNING id
        `, [studentName, studentEmail, defaultPassword]);
        const studentUserId = stRes.rows[0].id;

        await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
          studentUserId,
          rolesMap.student,
        ]);

        await db.query(`
          INSERT INTO user_profiles (user_id, under_institution_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [studentUserId, inst.id]);

        const spRes = await db.query<{ id: number }>(`
          INSERT INTO student_profiles (user_id, admission_number)
          VALUES ($1, 'ADM-' || $2 || '-' || $3)
          RETURNING id
        `, [studentUserId, inst.id, 1000 + i]);
        const studentProfileId = spRes.rows[0].id;

        await db.query(`
          INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active)
          VALUES ($1, $2, $3, TRUE)
          ON CONFLICT DO NOTHING
        `, [studentUserId, inst.id, rolesMap.student]);

        // Create 1 Parent / Guardian for this student
        const parentEmail = `parent_st_${studentProfileId}_${Date.now()}@edubird.com`;
        const parentName = `Guardian of ${studentName}`;
        const pRes = await db.query<{ id: number }>(`
          INSERT INTO users (full_name, email, password, is_active, is_verified)
          VALUES ($1, $2, $3, TRUE, TRUE)
          RETURNING id
        `, [parentName, parentEmail, defaultPassword]);
        const parentUserId = pRes.rows[0].id;

        await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
          parentUserId,
          rolesMap.parent,
        ]);

        await db.query(`
          INSERT INTO student_guardians (student_id, guardian_user_id, relationship, is_primary, occupation)
          VALUES ($1, $2, 'Father / Guardian', TRUE, 'Business Professional')
          ON CONFLICT DO NOTHING
        `, [studentProfileId, parentUserId]);

        // Enroll Student in 2 Courses / Programs
        const prog1 = programIds[(i * 2) % programIds.length];
        const prog2 = programIds[(i * 2 + 1) % programIds.length];

        for (const pid of [prog1, prog2]) {
          const rollNo = `ROLL-${studentProfileId}-${pid}`;
          await db.query(`
            INSERT INTO student_enrollments (student_id, institution_id, program_id, section_id, academic_year_id, class_category_id, roll_number, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
            ON CONFLICT DO NOTHING
          `, [studentProfileId, inst.id, pid, defaultSectionId, academicYearId, defaultCategoryId, rollNo]);
        }

        studentProfileIds.push({ studentProfileId, userId: studentUserId });
      }

      // E. Mark Attendance for Last 2 Months (60 days) with ~90% Present
      console.log(`      └─ Generating 2-month attendance records (90% PRESENT)...`);

      const now = new Date();
      const attendanceDates: string[] = [];

      for (let d = 60; d >= 1; d--) {
        const pastDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
        // Exclude Sundays (day === 0)
        if (pastDate.getDay() !== 0) {
          const dateStr = pastDate.toISOString().split("T")[0];
          attendanceDates.push(dateStr);
        }
      }

      // Generate attendance for the first 3 main programs of this institution
      const targetProgramsForAttendance = programIds.slice(0, 3);

      for (const progId of targetProgramsForAttendance) {
        for (const dateStr of attendanceDates) {
          // Create attendance session
          const sessRes = await db.query<{ id: number }>(`
            INSERT INTO attendance_sessions (institution_id, academic_year_id, program_id, section_id, attendance_date, attendance_mode, marked_by)
            VALUES ($1, $2, $3, $4, $5, 'FULL_DAY', $6)
            ON CONFLICT DO NOTHING
            RETURNING id
          `, [inst.id, academicYearId, progId, defaultSectionId, dateStr, teacherIds[0]]);

          let sessionId = sessRes.rows[0]?.id;
          if (!sessionId) {
            const exSess = await db.query<{ id: number }>(`
              SELECT id FROM attendance_sessions
              WHERE institution_id = $1 AND academic_year_id = $2 AND program_id = $3 AND section_id = $4 AND attendance_date = $5
              LIMIT 1
            `, [inst.id, academicYearId, progId, defaultSectionId, dateStr]);
            sessionId = exSess.rows[0]?.id;
          }

          if (!sessionId) continue;

          // Fetch enrolled students for this program
          const enrolled = await db.query<{ student_id: number }>(`
            SELECT DISTINCT student_id FROM student_enrollments
            WHERE institution_id = $1 AND program_id = $2 AND status = 'active'
          `, [inst.id, progId]);

          for (const s of enrolled.rows) {
            // 90% PRESENT, 10% ABSENT
            const isPresent = Math.random() < 0.9;
            const status = isPresent ? "PRESENT" : "ABSENT";

            await db.query(`
              INSERT INTO student_attendance (attendance_session_id, student_id, status)
              VALUES ($1, $2, $3)
              ON CONFLICT DO NOTHING
            `, [sessionId, s.student_id, status]);
          }
        }
      }
    }
  }

  console.log("\n✅ Comprehensive demo data seeding finished successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed script failed:", err);
  process.exit(1);
});
