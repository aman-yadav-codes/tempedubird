// seed-dummy-data.mjs
// Run with: node scratch/seed-dummy-data.mjs

import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_6iPSkEgwoRF5@ep-lingering-frost-azkj6th8-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    // ─── 1. Get platform admin user id ───────────────────────────────────────
    const adminRes = await client.query(`
      SELECT u.id FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.code = 'platform_admin'
      ORDER BY u.id ASC LIMIT 1
    `);
    const adminId = adminRes.rows[0]?.id ?? 1;
    console.log("Using platform admin user id:", adminId);

    // ─── 2. Get first institution ────────────────────────────────────────────
    const instRes = await client.query(`
      SELECT id FROM institution_profiles WHERE COALESCE(is_deleted, FALSE) = FALSE AND is_active = TRUE ORDER BY id ASC LIMIT 1
    `);
    const instId = instRes.rows[0]?.id ?? null;
    console.log("Using institution id:", instId);

    // ─── 3. Seed Assignment Templates ───────────────────────────────────────
    console.log("\n--- Seeding Assignment Templates ---");
    const assignments = [
      {
        title: "Chapter 5: Laws of Motion – Practice Problems",
        description: "Complete all 20 problems from the textbook chapter on Newton's Laws of Motion. Show all work with diagrams where applicable.",
        subject: "Physics",
        max_marks: 50,
        due_days: 7,
      },
      {
        title: "Essay: Impact of the Industrial Revolution",
        description: "Write a 1000-word essay analyzing the social and economic impact of the Industrial Revolution in Europe. Use at least 3 historical references.",
        subject: "History",
        max_marks: 100,
        due_days: 14,
      },
    ];

    for (const a of assignments) {
      // Check if table exists and has expected columns
      const existing = await client.query(
        `SELECT id FROM assignment_templates WHERE title = $1 LIMIT 1`, [a.title]
      ).catch(() => ({ rows: [] }));
      if (existing.rows.length > 0) {
        console.log(`Assignment "${a.title}" already exists, skipping.`);
        continue;
      }

      const due = new Date();
      due.setDate(due.getDate() + a.due_days);

      await client.query(`
        INSERT INTO assignment_templates
          (title, description, subject_name, max_marks, due_date, is_active, created_by, source_institution_id, is_deleted, created_at, updated_at)
        VALUES
          ($1, $2, $3, $4, $5, TRUE, $6, $7, FALSE, NOW(), NOW())
      `, [a.title, a.description, a.subject, a.max_marks, due.toISOString(), adminId, instId]);
      console.log(`✓ Created assignment: "${a.title}"`);
    }

    // ─── 4. Seed Note Templates ──────────────────────────────────────────────
    console.log("\n--- Seeding Note Templates ---");
    const notes = [
      {
        title: "Cell Biology – Class Notes",
        description: "Comprehensive notes on cell structure, organelles, cell division (mitosis & meiosis), and membrane transport mechanisms.",
        subject: "Biology",
        content: "# Cell Biology\n\n## Cell Structure\n- Cell membrane: phospholipid bilayer\n- Nucleus: contains DNA\n- Mitochondria: powerhouse of the cell\n\n## Cell Division\n### Mitosis\n- Prophase, Metaphase, Anaphase, Telophase\n### Meiosis\n- Two divisions producing 4 haploid cells\n\n## Key Concepts\n- Osmosis and diffusion\n- Active vs passive transport",
      },
      {
        title: "Organic Chemistry: Functional Groups Reference Sheet",
        description: "Quick-reference notes on all major functional groups including alcohols, aldehydes, ketones, carboxylic acids, esters, and amines with their reactions.",
        subject: "Chemistry",
        content: "# Organic Chemistry Reference\n\n## Functional Groups\n| Group | Suffix | Example |\n|-------|--------|--------|\n| Alcohol | -ol | Ethanol |\n| Aldehyde | -al | Methanal |\n| Ketone | -one | Propanone |\n| Carboxylic Acid | -oic acid | Ethanoic acid |\n\n## Key Reactions\n- Esterification: Acid + Alcohol → Ester + Water\n- Oxidation of alcohols\n- Nucleophilic addition",
      },
    ];

    for (const n of notes) {
      const existing = await client.query(
        `SELECT id FROM note_templates WHERE title = $1 LIMIT 1`, [n.title]
      ).catch(() => ({ rows: [] }));
      if (existing.rows.length > 0) {
        console.log(`Note "${n.title}" already exists, skipping.`);
        continue;
      }

      await client.query(`
        INSERT INTO note_templates
          (title, description, subject_name, content, is_active, created_by, source_institution_id, is_deleted, created_at, updated_at)
        VALUES
          ($1, $2, $3, $4, TRUE, $5, $6, FALSE, NOW(), NOW())
      `, [n.title, n.description, n.subject, n.content, adminId, instId]);
      console.log(`✓ Created note: "${n.title}"`);
    }

    // ─── 5. Seed Practice Exam Templates ────────────────────────────────────
    console.log("\n--- Seeding Practice Exam Templates ---");
    const practiceExams = [
      {
        title: "Full Mock Test: Mathematics (JEE Pattern)",
        description: "Complete 3-hour mathematics mock test following JEE Main pattern. Covers Calculus, Algebra, Trigonometry, and Coordinate Geometry.",
        duration_minutes: 180,
        total_marks: 300,
        total_questions: 90,
        exam_mode: "online",
        subject: "Mathematics",
      },
      {
        title: "Science Quiz: Physics – Motion & Forces",
        description: "Quick 30-minute quiz covering kinematics, Newton's laws, friction, and circular motion. Ideal for Class 11 exam preparation.",
        duration_minutes: 30,
        total_marks: 50,
        total_questions: 25,
        exam_mode: "online",
        subject: "Physics",
      },
    ];

    for (const e of practiceExams) {
      const existing = await client.query(
        `SELECT id FROM practice_exam_templates WHERE title = $1 LIMIT 1`, [e.title]
      ).catch(() => ({ rows: [] }));
      if (existing.rows.length > 0) {
        console.log(`Practice exam "${e.title}" already exists, skipping.`);
        continue;
      }

      await client.query(`
        INSERT INTO practice_exam_templates
          (title, description, duration_minutes, total_marks, question_count, exam_mode, is_active, is_public,
           blocked_by_platform, is_government_exam, exam_kind, created_by, source_institution_id, is_deleted, created_at, updated_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, TRUE, TRUE, FALSE, FALSE, 'practice', $7, $8, FALSE, NOW(), NOW())
      `, [e.title, e.description, e.duration_minutes, e.total_marks, e.total_questions, e.exam_mode, adminId, instId]);
      console.log(`✓ Created practice exam: "${e.title}"`);
    }

    // ─── 6. Seed Government/Selection Exams ──────────────────────────────────
    console.log("\n--- Seeding Government/Selection Exams ---");
    const govExams = [
      {
        title: "JEE Main 2025 – Joint Entrance Examination",
        description: "National level engineering entrance examination conducted by NTA for admission to NITs, IIITs, and other centrally funded technical institutions.",
        conducting_body: "NTA – National Testing Agency",
        exam_category: "Engineering Entrance",
        apply_url: "https://jeemain.nta.nic.in",
        application_start_date: "2024-11-01",
        application_end_date: "2024-12-04",
        admit_card_date: "2025-01-06",
        exam_date: "2025-01-22",
        exam_time: "09:00:00",
        total_marks: 300,
        duration_minutes: 180,
        exam_mode: "CBT (Computer Based Test)",
        question_count: 90,
        eligibility_criteria: "12th pass with Physics, Chemistry & Mathematics. Min 75% marks (65% for SC/ST).",
        application_fee: "650",
        is_government_exam: true,
        is_active: true,
      },
      {
        title: "UPSC Civil Services Examination 2025",
        description: "Prestigious national-level examination for recruitment to Indian Administrative Service (IAS), Indian Foreign Service (IFS), and other Group A & B Central Services.",
        conducting_body: "UPSC – Union Public Service Commission",
        exam_category: "Civil Services",
        apply_url: "https://upsconline.nic.in",
        application_start_date: "2025-02-05",
        application_end_date: "2025-02-25",
        admit_card_date: "2025-05-10",
        exam_date: "2025-05-25",
        exam_time: "09:30:00",
        total_marks: 2025,
        duration_minutes: 120,
        exam_mode: "Offline (OMR Based)",
        question_count: 200,
        eligibility_criteria: "Graduate degree from any recognized university. Age: 21-32 years (relaxation for reserved categories).",
        application_fee: "100",
        is_government_exam: true,
        is_active: true,
      },
    ];

    for (const g of govExams) {
      const existing = await client.query(
        `SELECT id FROM practice_exam_templates WHERE title = $1 AND is_government_exam = TRUE LIMIT 1`, [g.title]
      ).catch(() => ({ rows: [] }));
      if (existing.rows.length > 0) {
        console.log(`Gov exam "${g.title}" already exists, skipping.`);
        continue;
      }

      await client.query(`
        INSERT INTO practice_exam_templates
          (title, description, conducting_body, exam_category, apply_url,
           application_start_date, application_end_date, admit_card_date,
           exam_date, exam_time, total_marks, duration_minutes, exam_mode,
           question_count, eligibility_criteria, application_fee,
           is_active, is_public, blocked_by_platform, is_government_exam,
           exam_kind, created_by, is_deleted, created_at, updated_at)
        VALUES
          ($1, $2, $3, $4, $5,
           $6, $7, $8,
           $9, $10, $11, $12, $13,
           $14, $15, $16,
           TRUE, TRUE, FALSE, TRUE,
           'exam', $17, FALSE, NOW(), NOW())
      `, [
        g.title, g.description, g.conducting_body, g.exam_category, g.apply_url,
        g.application_start_date, g.application_end_date, g.admit_card_date,
        g.exam_date, g.exam_time, g.total_marks, g.duration_minutes, g.exam_mode,
        g.question_count, g.eligibility_criteria, g.application_fee,
        adminId
      ]);
      console.log(`✓ Created government exam: "${g.title}"`);
    }

    console.log("\n✅ Seed complete!");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    if (err.detail) console.error("Detail:", err.detail);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
