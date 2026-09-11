// scripts/seed-dummy-content.js
// Seeds dummy Assignments, Study Notes, Practice Exams, and Government Exams
// Run: node scripts/seed-dummy-content.js

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    // ─── Get platform admin user id ───────────────────────────────────────────
    const adminRes = await client.query(`
      SELECT u.id, u.full_name FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.code = 'platform_admin'
      ORDER BY u.id ASC LIMIT 1
    `);
    const adminId = adminRes.rows[0]?.id;
    if (!adminId) { console.error('❌ No platform admin user found!'); return; }
    console.log(`✓ Platform admin: ${adminRes.rows[0].full_name} (id: ${adminId})`);

    // ─── Get first active institution ─────────────────────────────────────────
    const instRes = await client.query(`
      SELECT id, name FROM institution_profiles
      WHERE COALESCE(is_deleted, FALSE) = FALSE AND is_active = TRUE
      ORDER BY id ASC LIMIT 1
    `);
    const instId = instRes.rows[0]?.id ?? null;
    const instName = instRes.rows[0]?.name ?? 'none';
    console.log(`✓ Institution: ${instName} (id: ${instId})`);

    // ─── Get first program for study_notes ────────────────────────────────────
    let programId = null;
    if (instId) {
      const progRes = await client.query(
        `SELECT id FROM institution_programs WHERE institution_id = $1 AND COALESCE(is_deleted,false) = false ORDER BY id ASC LIMIT 1`,
        [instId]
      ).catch(() => ({ rows: [] }));
      programId = progRes.rows[0]?.id ?? null;
    }
    console.log(`✓ Program id: ${programId}`);

    // ─── Get academic year ────────────────────────────────────────────────────
    let academicYearId = null;
    if (instId) {
      const ayRes = await client.query(`
        SELECT id FROM academic_years WHERE institution_id = $1 ORDER BY id DESC LIMIT 1
      `, [instId]).catch(() => ({ rows: [] }));
      academicYearId = ayRes.rows[0]?.id ?? null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. SEED ASSIGNMENT TEMPLATES
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Seeding Assignment Templates ---');

    const assignments = [
      {
        title: 'Chapter 5: Laws of Motion – Practice Problems',
        description: 'Complete all 20 problems from the textbook chapter on Newton\'s Laws of Motion. Show all work with diagrams where applicable.',
        subject_name: 'Physics',
        total_marks: 50,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        title: 'Essay: Impact of the Industrial Revolution',
        description: 'Write a 1000-word essay analyzing the social and economic impact of the Industrial Revolution in Europe. Use at least 3 historical references.',
        subject_name: 'History',
        total_marks: 100,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const assignColsRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'assignment_templates' ORDER BY ordinal_position`
    );
    const assignCols = new Set(assignColsRes.rows.map(r => r.column_name));

    for (const a of assignments) {
      const existing = await client.query(
        `SELECT id FROM assignment_templates WHERE title = $1 LIMIT 1`, [a.title]
      ).catch(() => ({ rows: [] }));
      if (existing.rows.length > 0) {
        console.log(`  ⚠ Already exists: "${a.title.slice(0, 50)}" (id: ${existing.rows[0].id})`);
        continue;
      }

      const fieldSet = [];
      const valueSet = [];
      const params = [];
      let i = 1;

      const push = (col, val, isLiteral = false) => {
        if (!assignCols.has(col)) return;
        fieldSet.push(col);
        if (isLiteral) { valueSet.push(val); }
        else { valueSet.push(`$${i++}`); params.push(val); }
      };

      push('title', a.title);
      push('description', a.description);
      push('subject_name', a.subject_name);
      push('total_marks', a.total_marks);
      if (assignCols.has('source_institution_id') && instId) push('source_institution_id', instId);
      push('is_active', 'TRUE', true);
      push('blocked_by_platform', 'FALSE', true);
      push('is_deleted', 'FALSE', true);
      push('created_by', adminId);
      push('created_at', 'NOW()', true);
      push('updated_at', 'NOW()', true);

      await client.query(
        `INSERT INTO assignment_templates (${fieldSet.join(', ')}) VALUES (${valueSet.join(', ')})`,
        params
      );
      console.log(`  ✓ Created: "${a.title.slice(0, 60)}"`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. SEED STUDY NOTES
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Seeding Study Notes ---');

    if (!instId || !programId) {
      console.log('  ⚠ Skipping notes: need institution + program. instId=' + instId + ' programId=' + programId);
    } else {
      const notes = [
        {
          title: 'Cell Biology – Complete Class Notes',
          description: 'Comprehensive notes on cell structure, organelles, cell division (mitosis & meiosis), and membrane transport.',
          subject_name: 'Biology',
          body: '<h2>Cell Biology</h2><h3>Cell Structure</h3><ul><li>Cell membrane: phospholipid bilayer</li><li>Nucleus: contains DNA</li><li>Mitochondria: powerhouse of the cell</li></ul><h3>Cell Division</h3><h4>Mitosis</h4><p>Prophase → Metaphase → Anaphase → Telophase</p><h4>Meiosis</h4><p>Two divisions producing 4 haploid cells</p><h3>Key Concepts</h3><ul><li>Osmosis and diffusion</li><li>Active vs passive transport</li></ul>',
        },
        {
          title: 'Organic Chemistry: Functional Groups Reference Sheet',
          description: 'Quick-reference notes on all major functional groups including alcohols, aldehydes, ketones, carboxylic acids and their reactions.',
          subject_name: 'Chemistry',
          body: '<h2>Organic Chemistry Reference</h2><h3>Functional Groups</h3><table><tr><th>Group</th><th>Suffix</th><th>Example</th></tr><tr><td>Alcohol</td><td>-ol</td><td>Ethanol</td></tr><tr><td>Aldehyde</td><td>-al</td><td>Methanal</td></tr><tr><td>Ketone</td><td>-one</td><td>Propanone</td></tr><tr><td>Carboxylic Acid</td><td>-oic acid</td><td>Ethanoic acid</td></tr></table><h3>Key Reactions</h3><ul><li>Esterification: Acid + Alcohol → Ester + Water</li><li>Oxidation of alcohols</li><li>Nucleophilic addition</li></ul>',
        },
      ];

      const noteColsRes = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'study_notes' ORDER BY ordinal_position`
      );
      const noteCols = new Set(noteColsRes.rows.map(r => r.column_name));

      for (const n of notes) {
        const existing = await client.query(
          `SELECT id FROM study_notes WHERE title = $1 AND institution_id = $2 LIMIT 1`, [n.title, instId]
        ).catch(() => ({ rows: [] }));
        if (existing.rows.length > 0) {
          console.log(`  ⚠ Already exists: "${n.title.slice(0, 50)}" (id: ${existing.rows[0].id})`);
          continue;
        }

        const fieldSet = [];
        const valueSet = [];
        const params = [];
        let i = 1;

        const push = (col, val, isLiteral = false) => {
          if (!noteCols.has(col)) return;
          fieldSet.push(col);
          if (isLiteral) { valueSet.push(val); }
          else { valueSet.push(`$${i++}`); params.push(val); }
        };

        push('institution_id', instId);
        push('program_id', programId);
        push('title', n.title);
        push('description', n.description);
        push('body', n.body);
        push('subject_name', n.subject_name);
        push('source_institution_id', instId);
        push('target_type', 'INSTITUTION');
        push('is_active', 'TRUE', true);
        push('is_public', 'TRUE', true);
        push('is_deleted', 'FALSE', true);
        push('blocked_by_platform', 'FALSE', true);
        if (academicYearId) push('academic_year_id', academicYearId);
        push('created_by', adminId);
        push('updated_by', adminId);
        push('created_at', 'NOW()', true);
        push('updated_at', 'NOW()', true);

        await client.query(
          `INSERT INTO study_notes (${fieldSet.join(', ')}) VALUES (${valueSet.join(', ')})`,
          params
        );
        console.log(`  ✓ Created: "${n.title.slice(0, 60)}"`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. SEED PRACTICE EXAM TEMPLATES
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Seeding Practice Exam Templates ---');

    const examColsRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'practice_exam_templates' ORDER BY ordinal_position`
    );
    const examCols = new Set(examColsRes.rows.map(r => r.column_name));

    const practiceExams = [
      {
        title: 'Full Mock Test: Mathematics (JEE Pattern)',
        description: 'Complete 3-hour mathematics mock test following JEE Main pattern. Covers Calculus, Algebra, Trigonometry, and Coordinate Geometry.',
        duration_minutes: 180,
        total_marks: 300,
        exam_mode: 'online',
        exam_kind: 'practice',
        is_government_exam: false,
      },
      {
        title: 'Science Quiz: Physics – Motion & Forces',
        description: 'Quick 30-minute quiz covering kinematics, Newton\'s laws, friction, and circular motion. Ideal for Class 11 exam preparation.',
        duration_minutes: 30,
        total_marks: 50,
        exam_mode: 'online',
        exam_kind: 'practice',
        is_government_exam: false,
      },
    ];

    for (const e of practiceExams) {
      const existing = await client.query(
        `SELECT id FROM practice_exam_templates WHERE title = $1 AND exam_kind = 'practice' LIMIT 1`, [e.title]
      ).catch(() => ({ rows: [] }));
      if (existing.rows.length > 0) {
        console.log(`  ⚠ Already exists: "${e.title.slice(0, 50)}" (id: ${existing.rows[0].id})`);
        continue;
      }

      const fieldSet = [];
      const valueSet = [];
      const params = [];
      let i = 1;

      const push = (col, val, isLiteral = false) => {
        if (!examCols.has(col)) return;
        fieldSet.push(col);
        if (isLiteral) { valueSet.push(val); }
        else { valueSet.push(`$${i++}`); params.push(val); }
      };

      push('title', e.title);
      push('description', e.description);
      push('duration_minutes', e.duration_minutes);
      push('total_marks', e.total_marks);
      push('exam_mode', e.exam_mode);
      push('exam_kind', e.exam_kind);
      push('is_government_exam', 'FALSE', true);
      if (instId) push('source_institution_id', instId);
      push('is_active', 'TRUE', true);
      push('is_public', 'TRUE', true);
      push('blocked_by_platform', 'FALSE', true);
      push('is_deleted', 'FALSE', true);
      push('created_by', adminId);
      push('created_at', 'NOW()', true);
      push('updated_at', 'NOW()', true);

      await client.query(
        `INSERT INTO practice_exam_templates (${fieldSet.join(', ')}) VALUES (${valueSet.join(', ')})`,
        params
      );
      console.log(`  ✓ Created: "${e.title.slice(0, 60)}"`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. SEED GOVERNMENT / SELECTION EXAMS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Seeding Government & Selection Exams ---');

    const govExams = [
      {
        title: 'JEE Main 2025 – Joint Entrance Examination (Session 1)',
        description: 'National level engineering entrance exam by NTA for admission to NITs, IIITs, and other centrally funded technical institutions across India.',
        conducting_body: 'NTA – National Testing Agency',
        exam_category: 'Engineering Entrance',
        apply_url: 'https://jeemain.nta.nic.in',
        application_start_date: '2024-11-01',
        application_end_date: '2024-12-04',
        admit_card_date: '2025-01-06',
        exam_date: '2025-01-22',
        exam_time: '09:00:00',
        total_marks: 300,
        duration_minutes: 180,
        exam_mode: 'CBT (Computer Based Test)',
        eligibility_criteria: '12th pass with PCM. Min 75% marks (65% for SC/ST). No age limit.',
        application_fee: '650',
      },
      {
        title: 'UPSC Civil Services Examination (CSE) 2025',
        description: 'Prestigious national exam for IAS, IFS, IPS and other Group A & B Central Services. Conducted in three stages: Prelims, Mains, and Personality Test.',
        conducting_body: 'UPSC – Union Public Service Commission',
        exam_category: 'Civil Services',
        apply_url: 'https://upsconline.nic.in',
        application_start_date: '2025-02-05',
        application_end_date: '2025-02-25',
        admit_card_date: '2025-05-10',
        exam_date: '2025-05-25',
        exam_time: '09:30:00',
        total_marks: 2025,
        duration_minutes: 120,
        exam_mode: 'Offline (OMR Based)',
        eligibility_criteria: 'Graduate degree from any recognized university. Age: 21–32 years. Max 6 attempts (General).',
        application_fee: '100',
      },
    ];

    for (const g of govExams) {
      const existing = await client.query(
        `SELECT id FROM practice_exam_templates WHERE title = $1 LIMIT 1`, [g.title]
      ).catch(() => ({ rows: [] }));
      if (existing.rows.length > 0) {
        console.log(`  ⚠ Already exists: "${g.title.slice(0, 50)}" (id: ${existing.rows[0].id})`);
        continue;
      }

      const fieldSet = [];
      const valueSet = [];
      const params = [];
      let i = 1;

      const push = (col, val, isLiteral = false) => {
        if (!examCols.has(col)) return;
        fieldSet.push(col);
        if (isLiteral) { valueSet.push(val); }
        else { valueSet.push(`$${i++}`); params.push(val); }
      };

      push('title', g.title);
      push('description', g.description);
      push('conducting_body', g.conducting_body);
      push('exam_category', g.exam_category);
      push('apply_url', g.apply_url);
      push('application_start_date', g.application_start_date);
      push('application_end_date', g.application_end_date);
      push('admit_card_date', g.admit_card_date);
      push('exam_date', g.exam_date);
      push('exam_time', g.exam_time);
      push('total_marks', g.total_marks);
      push('duration_minutes', g.duration_minutes);
      push('exam_mode', g.exam_mode);
      push('eligibility_criteria', g.eligibility_criteria);
      push('application_fee', g.application_fee);
      push('exam_kind', 'exam');
      push('is_government_exam', 'TRUE', true);
      push('is_active', 'TRUE', true);
      push('is_public', 'TRUE', true);
      push('blocked_by_platform', 'FALSE', true);
      push('is_deleted', 'FALSE', true);
      push('created_by', adminId);
      push('created_at', 'NOW()', true);
      push('updated_at', 'NOW()', true);

      await client.query(
        `INSERT INTO practice_exam_templates (${fieldSet.join(', ')}) VALUES (${valueSet.join(', ')})`,
        params
      );
      console.log(`  ✓ Created: "${g.title.slice(0, 60)}"`);
    }

    // ─── Summary ──────────────────────────────────────────────────────────────
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM assignment_templates WHERE COALESCE(is_deleted,false)=false) AS assignments,
        (SELECT COUNT(*) FROM study_notes WHERE COALESCE(is_deleted,false)=false) AS notes,
        (SELECT COUNT(*) FROM practice_exam_templates WHERE COALESCE(is_deleted,false)=false AND exam_kind='practice') AS practice_exams,
        (SELECT COUNT(*) FROM practice_exam_templates WHERE COALESCE(is_deleted,false)=false AND is_government_exam=true) AS gov_exams
    `);
    const s = counts.rows[0];
    console.log('\n✅ Seed complete! Current DB counts:');
    console.table([{
      'Assignments': s.assignments,
      'Study Notes': s.notes,
      'Practice Exams': s.practice_exams,
      'Gov/Sel Exams': s.gov_exams,
    }]);

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    if (err.hint)   console.error('   Hint:', err.hint);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
