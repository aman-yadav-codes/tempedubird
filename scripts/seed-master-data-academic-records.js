const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seedMasterDataRecords() {
  const client = await pool.connect();
  try {
    console.log("Starting seeding of 4-5 dummy records for Assignments, Practice Exams, Exams, and Notes...");

    // 1. Get an active admin user id and active institution id
    const userRes = await client.query(`SELECT id FROM users WHERE is_active = TRUE ORDER BY id ASC LIMIT 1`);
    const userId = userRes.rows[0]?.id || 1;

    const instRes = await client.query(`SELECT id, name FROM institution_profiles WHERE is_active = TRUE ORDER BY id ASC LIMIT 3`);
    const institutions = instRes.rows;
    if (institutions.length === 0) {
      throw new Error("No active institutions found in database");
    }
    const defaultInstId = institutions[0].id;
    const secondInstId = institutions[1]?.id || defaultInstId;

    // Get some programs and subjects
    const progRes = await client.query(`SELECT id FROM institution_programs WHERE is_active = TRUE ORDER BY id ASC LIMIT 5`);
    const programs = progRes.rows;
    const defaultProgramId = programs[0]?.id || null;

    // Get some syllabus nodes
    const nodeRes = await client.query(`SELECT id, title, syllabus_id FROM syllabus_nodes ORDER BY id ASC LIMIT 10`);
    const syllabusNodes = nodeRes.rows;
    const defaultNodeId = syllabusNodes[0]?.id || null;
    const defaultSyllabusId = syllabusNodes[0]?.syllabus_id || null;

    const subjRes = await client.query(`SELECT id, name FROM subjects ORDER BY id ASC LIMIT 10`);
    const subjects = subjRes.rows;
    const defaultSubjId = subjects[0]?.id || null;

    // -------------------------------------------------------------
    // 1. ASSIGNMENTS (5 Records)
    // -------------------------------------------------------------
    console.log("Seeding Assignment Templates & Assignments...");
    const assignmentsData = [
      {
        title: "Class 10 Science: Periodic Table & Chemical Reactions",
        description: "Comprehensive problem set on balancing redox equations, modern periodic trends, and valence theories.",
        total_marks: 50,
        is_public: true,
        marketplace_approved: true,
        source_institution_id: defaultInstId,
        questions: [
          {
            text: "Which of the following elements has the highest electronegativity across the 2nd period?",
            type: "mcq_single",
            marks: 5,
            options: [{ text: "Fluorine", is_correct: true }, { text: "Oxygen", is_correct: false }, { text: "Nitrogen", is_correct: false }, { text: "Carbon", is_correct: false }],
          },
          {
            text: "Explain the difference between displacement and double displacement reactions with balanced chemical equations.",
            type: "subjective",
            marks: 10,
            options: [],
          },
          {
            text: "State Modern Periodic Law and explain why noble gases are placed in group 18.",
            type: "subjective",
            marks: 15,
            options: [],
          },
          {
            text: "True or False: Metallic character increases from left to right across a period in the periodic table.",
            type: "true_false",
            marks: 5,
            options: [{ text: "True", is_correct: false }, { text: "False", is_correct: true }],
          },
          {
            text: "Write the chemical formula and IUPAC names of quicklime, slaked lime, and limestone.",
            type: "subjective",
            marks: 15,
            options: [],
          },
        ],
      },
      {
        title: "Class 12 Physics: Electromagnetism & Magnetic Flux Problem Set",
        description: "Numerical problems and theoretical derivations covering Biot-Savart Law, Ampere's Circuital Law, and Faraday's Laws.",
        total_marks: 40,
        is_public: true,
        marketplace_approved: true,
        source_institution_id: defaultInstId,
        questions: [
          {
            text: "State and derive Biot-Savart Law for the magnetic field produced by a circular current-carrying loop.",
            type: "subjective",
            marks: 15,
            options: [],
          },
          {
            text: "The SI unit of magnetic flux is Weber (Wb).",
            type: "true_false",
            marks: 5,
            options: [{ text: "True", is_correct: true }, { text: "False", is_correct: false }],
          },
          {
            text: "A straight wire of length 2m carries a current of 5A in a uniform magnetic field of 0.2T perpendicular to it. Calculate the magnetic force.",
            type: "subjective",
            marks: 10,
            options: [],
          },
          {
            text: "Lenz's law is a consequence of which conservation law?",
            type: "mcq_single",
            marks: 10,
            options: [{ text: "Conservation of Energy", is_correct: true }, { text: "Conservation of Charge", is_correct: false }, { text: "Conservation of Momentum", is_correct: false }, { text: "Conservation of Mass", is_correct: false }],
          },
        ],
      },
      {
        title: "JEE Advanced Mathematics: Integral Calculus & Area Under Curves",
        description: "Rigorous high-difficulty calculus assignment covering definite integrals, Leibnitz rule, and differential equations.",
        total_marks: 60,
        is_public: true,
        marketplace_approved: true,
        source_institution_id: secondInstId,
        questions: [
          {
            text: "Evaluate the integral: ∫ [0 to π/2] (sin^3 x) / (sin^3 x + cos^3 x) dx.",
            type: "mcq_single",
            marks: 10,
            options: [{ text: "π/4", is_correct: true }, { text: "π/2", is_correct: false }, { text: "π", is_correct: false }, { text: "0", is_correct: false }],
          },
          {
            text: "Find the area enclosed between the parabolas y^2 = 4ax and x^2 = 4ay.",
            type: "subjective",
            marks: 20,
            options: [],
          },
          {
            text: "Solve the linear differential equation: dy/dx + y*cot(x) = 2*cos(x).",
            type: "subjective",
            marks: 15,
            options: [],
          },
          {
            text: "State the conditions under which Rolle's Theorem is applicable for a real-valued function.",
            type: "subjective",
            marks: 15,
            options: [],
          },
        ],
      },
      {
        title: "B.Tech Computer Science: Data Structures & Algorithms Lab Assignment",
        description: "Implementation of balanced binary search trees (AVL, Red-Black), Graph traversals (Dijkstra, BFS/DFS), and dynamic programming.",
        total_marks: 50,
        is_public: false,
        marketplace_approved: false,
        source_institution_id: defaultInstId,
        questions: [
          {
            text: "What is the worst-case time complexity of searching an element in an AVL tree containing n nodes?",
            type: "mcq_single",
            marks: 10,
            options: [{ text: "O(log n)", is_correct: true }, { text: "O(n)", is_correct: false }, { text: "O(n log n)", is_correct: false }, { text: "O(1)", is_correct: false }],
          },
          {
            text: "Explain Dijkstra's shortest path algorithm with pseudocode and calculate its time complexity when implemented using a min-heap.",
            type: "subjective",
            marks: 20,
            options: [],
          },
          {
            text: "Compare recursive and iterative implementations of dynamic programming using the 0/1 Knapsack problem.",
            type: "subjective",
            marks: 20,
            options: [],
          },
        ],
      },
      {
        title: "UPSC Civil Services: Indian Constitution & Governance Essay Assignment",
        description: "Analytical essay on federalism, separation of powers, and the impact of 73rd & 74th constitutional amendments.",
        total_marks: 50,
        is_public: true,
        marketplace_approved: true,
        source_institution_id: secondInstId,
        questions: [
          {
            text: "Which article of the Indian Constitution empowers the Supreme Court to issue writs for the enforcement of Fundamental Rights?",
            type: "mcq_single",
            marks: 10,
            options: [{ text: "Article 32", is_correct: true }, { text: "Article 226", is_correct: false }, { text: "Article 14", is_correct: false }, { text: "Article 19", is_correct: false }],
          },
          {
            text: "Critically examine the role of the Finance Commission in strengthening cooperative federalism in India.",
            type: "subjective",
            marks: 20,
            options: [],
          },
          {
            text: "Discuss the key features of the Basic Structure Doctrine established in the Kesavananda Bharati case.",
            type: "subjective",
            marks: 20,
            options: [],
          },
        ],
      },
    ];

    for (const a of assignmentsData) {
      const tplRes = await client.query(
        `
          INSERT INTO assignment_templates (
            title, description, total_marks, ai_question_format, is_public,
            marketplace_requested, marketplace_requested_at, marketplace_requested_by,
            marketplace_approved, marketplace_approved_at, marketplace_approved_by,
            is_active, version, source_institution_id, created_by, updated_by
          )
          VALUES ($1, $2, $3, $4::jsonb, $5, $6, CURRENT_TIMESTAMP, $7, $8, CURRENT_TIMESTAMP, $7, TRUE, 1, $9, $7, $7)
          RETURNING id
        `,
        [
          a.title,
          a.description,
          a.total_marks,
          JSON.stringify({ enabled: true, true_false: 1, objective: 2, subjective: 2 }),
          a.is_public,
          a.marketplace_approved,
          userId,
          a.marketplace_approved,
          a.source_institution_id,
        ]
      );
      const tplId = tplRes.rows[0].id;

      // Add questions
      let qOrder = 1;
      for (const q of a.questions) {
        const qRes = await client.query(
          `
            INSERT INTO assignment_template_questions (
              template_id, question_text, question_type, marks, display_order
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `,
          [tplId, q.text, q.type, q.marks, qOrder]
        );
        const qId = qRes.rows[0].id;

        let optOrder = 1;
        for (const opt of q.options) {
          await client.query(
            `
              INSERT INTO assignment_template_question_options (
                question_id, option_text, is_correct, display_order
              )
              VALUES ($1, $2, $3, $4)
            `,
            [qId, opt.text, opt.is_correct, optOrder]
          );
          optOrder++;
        }
        qOrder++;
      }

      // Link to assignment instance
      const asgnRes = await client.query(
        `
          INSERT INTO assignments (
            institution_id, academic_year_id, template_id, title, description, issue_date,
            submission_date, total_marks, status, created_by, updated_by
          )
          VALUES ($1, (SELECT default_academic_year_id FROM institution_profiles WHERE id = $1), $2, $3, $4, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', $5, 'active', $6, $6)
          RETURNING id
        `,
        [a.source_institution_id, tplId, a.title, a.description, a.total_marks, userId]
      );
      await client.query(
        `
          INSERT INTO assignment_targets (assignment_id, target_type, target_id, program_id)
          VALUES ($1, 'INSTITUTION', $2, $3)
        `,
        [asgnRes.rows[0].id, a.source_institution_id, defaultProgramId]
      );
    }
    console.log("✓ Successfully seeded 5 Assignment Templates & Assignments.");

    // -------------------------------------------------------------
    // 2. PRACTICE EXAMS (5 Records)
    // -------------------------------------------------------------
    console.log("Seeding Practice Exam Templates & Tests...");
    const practiceExamsData = [
      {
        title: "JEE Main All-India Mock Test 1: Full Physics & Chemistry",
        description: "National standard computer-based mock exam replicating the NTA JEE Main pattern with negative marking.",
        total_marks: 100,
        duration_minutes: 90,
        is_public: true,
        marketplace_approved: true,
        source_institution_id: defaultInstId,
        questions: [
          {
            text: "In a Young's double slit experiment, if the distance between the slits is halved and distance between screen and slits is doubled, fringe width will be:",
            type: "mcq_single",
            marks: 4,
            options: [{ text: "4 times", is_correct: true }, { text: "2 times", is_correct: false }, { text: "Halved", is_correct: false }, { text: "Unchanged", is_correct: false }],
          },
          {
            text: "What is the hybridization and geometry of SF6 molecule?",
            type: "mcq_single",
            marks: 4,
            options: [{ text: "sp3d2, Octahedral", is_correct: true }, { text: "sp3d, Trigonal Bipyramidal", is_correct: false }, { text: "sp3, Tetrahedral", is_correct: false }, { text: "dsp2, Square Planar", is_correct: false }],
          },
          {
            text: "A body of mass 5kg moving with velocity 10 m/s collides elastically with a stationary body of mass 5kg. What is the velocity of the second body after collision?",
            type: "mcq_single",
            marks: 4,
            options: [{ text: "10 m/s", is_correct: true }, { text: "5 m/s", is_correct: false }, { text: "0 m/s", is_correct: false }, { text: "20 m/s", is_correct: false }],
          },
        ],
      },
      {
        title: "NEET UG Biology Super Practice: Genetics, Evolution & Ecology",
        description: "High-yield NCERT line-by-line MCQ practice test designed for rapid revision and self-assessment.",
        total_marks: 80,
        duration_minutes: 60,
        is_public: true,
        marketplace_approved: true,
        source_institution_id: secondInstId,
        questions: [
          {
            text: "Which Mendelian law is based on the fact that alleles do not show any blending and both characters are recovered as such in F2 generation?",
            type: "mcq_single",
            marks: 4,
            options: [{ text: "Law of Segregation", is_correct: true }, { text: "Law of Dominance", is_correct: false }, { text: "Law of Independent Assortment", is_correct: false }, { text: "Incomplete Dominance", is_correct: false }],
          },
          {
            text: "The classic experiment of Hershey and Chase proved that DNA is the genetic material using which isotope?",
            type: "mcq_single",
            marks: 4,
            options: [{ text: "32P and 35S", is_correct: true }, { text: "14N and 15N", is_correct: false }, { text: "12C and 14C", is_correct: false }, { text: "3H and 14C", is_correct: false }],
          },
        ],
      },
      {
        title: "CBSE Class 10 Board Mathematics Diagnostic Test",
        description: "Standard practice question paper featuring section A (MCQ), section B (Short Answer), and Case Studies.",
        total_marks: 80,
        duration_minutes: 120,
        is_public: true,
        marketplace_approved: true,
        source_institution_id: defaultInstId,
        questions: [
          {
            text: "If the HCF of 65 and 117 is expressible in the form 65m - 117, then the value of m is:",
            type: "mcq_single",
            marks: 2,
            options: [{ text: "2", is_correct: true }, { text: "1", is_correct: false }, { text: "3", is_correct: false }, { text: "4", is_correct: false }],
          },
          {
            text: "Find the roots of the quadratic equation: 2x^2 - 5x + 3 = 0.",
            type: "subjective",
            marks: 5,
            options: [],
          },
        ],
      },
      {
        title: "SSC CGL Tier-1 Quantitative & Reasoning Mock Examination",
        description: "Speed test covering arithmetic aptitude, number series, syllogisms, geometry, and data interpretation.",
        total_marks: 100,
        duration_minutes: 60,
        is_public: false,
        marketplace_approved: false,
        source_institution_id: secondInstId,
        questions: [
          {
            text: "If 15 men can complete a work in 12 days, in how many days can 18 men complete the same work?",
            type: "mcq_single",
            marks: 2,
            options: [{ text: "10 days", is_correct: true }, { text: "8 days", is_correct: false }, { text: "12 days", is_correct: false }, { text: "14 days", is_correct: false }],
          },
        ],
      },
      {
        title: "CAT Quantitative Aptitude: Arithmetic & Algebra Sectional Test",
        description: "IIM CAT entrance level practice exam focusing on speed, accuracy, shortcuts, and analytical problem solving.",
        total_marks: 60,
        duration_minutes: 40,
        is_public: true,
        marketplace_approved: true,
        source_institution_id: defaultInstId,
        questions: [
          {
            text: "In what ratio must a merchant mix two varieties of tea costing Rs. 60/kg and Rs. 65/kg so that by selling the mixture at Rs. 68.20/kg he may gain 10%?",
            type: "mcq_single",
            marks: 3,
            options: [{ text: "3 : 2", is_correct: true }, { text: "3 : 4", is_correct: false }, { text: "2 : 3", is_correct: false }, { text: "4 : 5", is_correct: false }],
          },
        ],
      },
    ];

    for (const pe of practiceExamsData) {
      const tplRes = await client.query(
        `
          INSERT INTO practice_exam_templates (
            title, description, total_marks, ai_question_format, duration_minutes, exam_kind, is_public,
            marketplace_requested, marketplace_requested_at, marketplace_requested_by,
            marketplace_approved, marketplace_approved_at, marketplace_approved_by,
            is_active, version, source_institution_id, created_by, updated_by
          )
          VALUES ($1, $2, $3, $4::jsonb, $5, 'practice', $6, $7, CURRENT_TIMESTAMP, $8, $9, CURRENT_TIMESTAMP, $8, TRUE, 1, $10, $8, $8)
          RETURNING id
        `,
        [
          pe.title,
          pe.description,
          pe.total_marks,
          JSON.stringify({ enabled: true }),
          pe.duration_minutes,
          pe.is_public,
          pe.marketplace_approved,
          userId,
          pe.marketplace_approved,
          pe.source_institution_id,
        ]
      );
      const tplId = tplRes.rows[0].id;

      // Add questions
      let qOrder = 1;
      for (const q of pe.questions) {
        const qRes = await client.query(
          `
            INSERT INTO practice_exam_template_questions (
              template_id, question_text, question_type, marks, explanation, display_order
            )
            VALUES ($1, $2, $3, $4, '', $5)
            RETURNING id
          `,
          [tplId, q.text, q.type, q.marks, qOrder]
        );
        const qId = qRes.rows[0].id;

        let optOrder = 1;
        for (const opt of q.options) {
          await client.query(
            `
              INSERT INTO practice_exam_template_question_options (
                question_id, option_text, is_correct, display_order
              )
              VALUES ($1, $2, $3, $4)
            `,
            [qId, opt.text, opt.is_correct, optOrder]
          );
          optOrder++;
        }
        qOrder++;
      }

      // Link to practice exam instance
      const peRes = await client.query(
        `
          INSERT INTO practice_exams (
            institution_id, academic_year_id, template_id, title, description, duration_minutes,
            total_marks, status, version, created_by, updated_by
          )
          VALUES ($1, (SELECT default_academic_year_id FROM institution_profiles WHERE id = $1), $2, $3, $4, $5, $6, 'active', 1, $7, $7)
          RETURNING id
        `,
        [pe.source_institution_id, tplId, pe.title, pe.description, pe.duration_minutes, pe.total_marks, userId]
      );
      await client.query(
        `
          INSERT INTO practice_exam_targets (practice_exam_id, target_type, target_id, program_id)
          VALUES ($1, 'INSTITUTION', $2, $3)
        `,
        [peRes.rows[0].id, pe.source_institution_id, defaultProgramId]
      );
    }
    console.log("✓ Successfully seeded 5 Practice Exam Templates & Tests.");

    // -------------------------------------------------------------
    // 3. FORMAL EXAMS & SERIES (5 Records)
    // -------------------------------------------------------------
    console.log("Seeding Formal Exam Series & Exam Papers...");
    const examSeriesData = [
      {
        title: "Mid-Term Semester Examination 2026-27",
        description: "Official institutional mid-term evaluation series across major academic streams.",
        from_date: "2026-09-15",
        to_date: "2026-09-28",
        result_date: "2026-10-10",
        is_public: true,
        source_institution_id: defaultInstId,
      },
      {
        title: "CBSE Class 12 Pre-Board Grand Assessment 2026-27",
        description: "Standardized simulated board examination covering all subjects for Senior Secondary students.",
        from_date: "2026-11-01",
        to_date: "2026-11-18",
        result_date: "2026-11-30",
        is_public: true,
        source_institution_id: defaultInstId,
      },
      {
        title: "Annual Final Degree Examination (Autumn Session)",
        description: "Comprehensive end-term university examinations with theoretical and practical schedules.",
        from_date: "2026-12-05",
        to_date: "2026-12-22",
        result_date: "2027-01-15",
        is_public: false,
        source_institution_id: secondInstId,
      },
      {
        title: "All-India Engineering Scholarship Entrance Assessment",
        description: "National qualifying examination series for merit scholarships and sponsored admissions.",
        from_date: "2026-10-05",
        to_date: "2026-10-08",
        result_date: "2026-10-20",
        is_public: true,
        source_institution_id: secondInstId,
      },
      {
        title: "Periodic Assessment Term 1 Examinations",
        description: "Continuous and comprehensive evaluation test series for middle and secondary school standards.",
        from_date: "2026-09-01",
        to_date: "2026-09-10",
        result_date: "2026-09-20",
        is_public: true,
        source_institution_id: defaultInstId,
      },
    ];

    for (const es of examSeriesData) {
      const slug = es.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
      const seriesRes = await client.query(
        `
          INSERT INTO exam_series (
            source_institution_id, title, slug, description, from_date, to_date,
            target_type, target_id, target_program_id, result_date, instant_result,
            is_active, created_by, updated_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'INSTITUTION', $1, $7, $8, TRUE, TRUE, $9, $9)
          RETURNING id
        `,
        [es.source_institution_id, es.title, slug, es.description, es.from_date, es.to_date, defaultProgramId, es.result_date, userId]
      );
      const seriesId = seriesRes.rows[0].id;

      // Create an exam paper under this series
      const tplRes = await client.query(
        `
          INSERT INTO practice_exam_templates (
            title, description, total_marks, ai_question_format, duration_minutes, exam_kind, exam_series_id,
            exam_date, exam_time, exam_place, exam_mode, result_date, instant_result, is_public,
            marketplace_requested, marketplace_approved, is_active, version, source_institution_id, created_by, updated_by
          )
          VALUES (
            $1, $2, 100, '{"enabled":true}'::jsonb, 180, 'exam', $3,
            $4, '10:00:00', 'Main Examination Hall', 'offline', $5, TRUE, $6,
            $6, $6, TRUE, 1, $7, $8, $8
          )
          RETURNING id
        `,
        [
          `${es.title} - Main Paper`,
          `Standard institutional exam paper for ${es.title}`,
          seriesId,
          es.from_date,
          es.result_date,
          es.is_public,
          es.source_institution_id,
          userId,
        ]
      );
      const tplId = tplRes.rows[0].id;

      const examRes = await client.query(
        `
          INSERT INTO practice_exams (
            institution_id, academic_year_id, template_id, title, description, duration_minutes, exam_kind,
            exam_date, exam_time, exam_place, exam_mode, result_date, instant_result,
            total_marks, status, version, created_by, updated_by
          )
          VALUES ($1, (SELECT default_academic_year_id FROM institution_profiles WHERE id = $1), $2, $3, $4, 180, 'exam', $5, '10:00:00', 'Main Examination Hall', 'offline', $6, TRUE, 100, 'active', 1, $7, $7)
          RETURNING id
        `,
        [es.source_institution_id, tplId, `${es.title} - Main Paper`, es.description, es.from_date, es.result_date, userId]
      );
      await client.query(
        `
          INSERT INTO practice_exam_targets (practice_exam_id, target_type, target_id, program_id)
          VALUES ($1, 'INSTITUTION', $2, $3)
        `,
        [examRes.rows[0].id, es.source_institution_id, defaultProgramId]
      );
    }
    console.log("✓ Successfully seeded 5 Formal Exam Series & Papers.");

    // -------------------------------------------------------------
    // 4. NOTES & STUDY MATERIALS (5 Records)
    // -------------------------------------------------------------
    console.log("Seeding Notes & Rich Text Lecture Items...");
    const notesData = [
      {
        institution_id: defaultInstId,
        subject_id: defaultSubjId,
        syllabus_id: defaultSyllabusId,
        program_id: defaultProgramId,
        is_active: true,
        marketplace_requested: true,
        marketplace_approved: true,
        is_public: true,
        items: [
          {
            title: "Unit 1: Quantum Physics & Wave-Particle Duality Core Notes",
            body: JSON.stringify({
              root: {
                children: [
                  { children: [{ text: "Quantum Physics & Photoelectric Effect", format: 1 }], type: "heading", tag: "h2" },
                  { children: [{ text: "Key theoretical principles established by Max Planck and Albert Einstein governing wave-particle duality, de Broglie wavelength, and matter waves." }], type: "paragraph" },
                  { children: [{ text: "Key Equation: E = hν = hc/λ, and kinetic energy of emitted photoelectrons: K_max = hν - Φ_0." }], type: "paragraph" },
                  { children: [{ text: "Heisenberg's Uncertainty Principle states that it is fundamentally impossible to determine simultaneously both the exact position and exact momentum of a microscopic particle: Δx · Δp ≥ h / (4π)." }], type: "paragraph" },
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "root",
                version: 1,
              },
            }),
          },
          {
            title: "Unit 2: Atomic Structure & Bohr's Postulates Summary",
            body: JSON.stringify({
              root: {
                children: [
                  { children: [{ text: "Bohr's Postulates for Hydrogen Atom", format: 1 }], type: "heading", tag: "h3" },
                  { children: [{ text: "1. Electrons revolve around the nucleus only in certain non-radiating stable orbits called stationary orbits." }], type: "paragraph" },
                  { children: [{ text: "2. The angular momentum of revolving electron is an integral multiple of h/2π: L = mvr = nh/2π." }], type: "paragraph" },
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "root",
                version: 1,
              },
            }),
          },
        ],
      },
      {
        institution_id: defaultInstId,
        subject_id: defaultSubjId,
        syllabus_id: defaultSyllabusId,
        program_id: defaultProgramId,
        is_active: true,
        marketplace_requested: true,
        marketplace_approved: true,
        is_public: true,
        items: [
          {
            title: "Complete Calculus Quick Reference & Formula Handbook",
            body: JSON.stringify({
              root: {
                children: [
                  { children: [{ text: "Differential & Integral Calculus Quick Handbook", format: 1 }], type: "heading", tag: "h2" },
                  { children: [{ text: "Standard derivatives: d/dx(sin x) = cos x, d/dx(e^x) = e^x, d/dx(ln x) = 1/x." }], type: "paragraph" },
                  { children: [{ text: "Integration by Parts Formula: ∫ u dv = uv - ∫ v du." }], type: "paragraph" },
                  { children: [{ text: "Fundamental Theorem of Calculus: If F(x) is an antiderivative of f(x), then ∫ [a to b] f(x) dx = F(b) - F(a)." }], type: "paragraph" },
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "root",
                version: 1,
              },
            }),
          },
        ],
      },
      {
        institution_id: secondInstId,
        subject_id: defaultSubjId,
        syllabus_id: defaultSyllabusId,
        program_id: defaultProgramId,
        is_active: true,
        marketplace_requested: true,
        marketplace_approved: true,
        is_public: true,
        items: [
          {
            title: "Database Management Systems (DBMS) Architecture & SQL Normalization",
            body: JSON.stringify({
              root: {
                children: [
                  { children: [{ text: "Relational DBMS & Normal Forms Guide", format: 1 }], type: "heading", tag: "h2" },
                  { children: [{ text: "First Normal Form (1NF): Each column contains only atomic (indivisible) values and no repeating groups." }], type: "paragraph" },
                  { children: [{ text: "Second Normal Form (2NF): In 1NF and every non-prime attribute is fully functionally dependent on the primary key (no partial dependency)." }], type: "paragraph" },
                  { children: [{ text: "Third Normal Form (3NF): In 2NF and there is no transitive dependency of non-prime attributes on primary key." }], type: "paragraph" },
                  { children: [{ text: "ACID Properties: Atomicity, Consistency, Isolation, and Durability guarantee reliable database transactions." }], type: "paragraph" },
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "root",
                version: 1,
              },
            }),
          },
        ],
      },
      {
        institution_id: defaultInstId,
        subject_id: defaultSubjId,
        syllabus_id: defaultSyllabusId,
        program_id: defaultProgramId,
        is_active: true,
        marketplace_requested: false,
        marketplace_approved: false,
        is_public: false,
        items: [
          {
            title: "Organic Chemistry Reaction Mechanisms & Name Reactions Notes",
            body: JSON.stringify({
              root: {
                children: [
                  { children: [{ text: "Key Name Reactions for JEE & CBSE Board", format: 1 }], type: "heading", tag: "h2" },
                  { children: [{ text: "1. Aldol Condensation: Aldehydes or ketones containing α-hydrogen in presence of dilute alkali form β-hydroxy aldehydes." }], type: "paragraph" },
                  { children: [{ text: "2. Cannizzaro Reaction: Aldehydes with no α-hydrogen undergo self oxidation-reduction in presence of concentrated alkali." }], type: "paragraph" },
                  { children: [{ text: "3. Reimer-Tiemann Reaction: Phenol reacts with chloroform in presence of aqueous NaOH to give salicylaldehyde." }], type: "paragraph" },
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "root",
                version: 1,
              },
            }),
          },
        ],
      },
      {
        institution_id: secondInstId,
        subject_id: defaultSubjId,
        syllabus_id: defaultSyllabusId,
        program_id: defaultProgramId,
        is_active: true,
        marketplace_requested: true,
        marketplace_approved: true,
        is_public: true,
        items: [
          {
            title: "Indian Polity & Governance: Fundamental Rights & DPSP Master Notes",
            body: JSON.stringify({
              root: {
                children: [
                  { children: [{ text: "Part III: Fundamental Rights (Articles 12 to 35)", format: 1 }], type: "heading", tag: "h2" },
                  { children: [{ text: "Right to Equality (Articles 14-18), Right to Freedom (Articles 19-22), Right against Exploitation (Articles 23-24), Right to Freedom of Religion (Articles 25-28), Cultural and Educational Rights (Articles 29-30), Right to Constitutional Remedies (Article 32)." }], type: "paragraph" },
                  { children: [{ text: "Part IV: Directive Principles of State Policy (Articles 36 to 51) are non-justiciable guidelines aimed at establishing a welfare state." }], type: "paragraph" },
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "root",
                version: 1,
              },
            }),
          },
        ],
      },
    ];

    for (const n of notesData) {
      const noteRes = await client.query(
        `
          INSERT INTO study_notes (
            institution_id, academic_year_id, subject_id, syllabus_id, program_id,
            is_active, is_public, marketplace_requested, marketplace_approved,
            marketplace_requested_at, marketplace_requested_by,
            marketplace_approved_at, marketplace_approved_by,
            created_by, updated_by
          )
          VALUES ($1, (SELECT default_academic_year_id FROM institution_profiles WHERE id = $1), $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, CURRENT_TIMESTAMP, $9, $9, $9)
          RETURNING id
        `,
        [
          n.institution_id,
          n.subject_id,
          n.syllabus_id,
          n.program_id,
          n.is_active,
          n.is_public,
          n.marketplace_requested,
          n.marketplace_approved,
          userId,
        ]
      );
      const noteId = noteRes.rows[0].id;

      let itemOrder = 1;
      for (const item of n.items) {
        await client.query(
          `
            INSERT INTO study_note_items (
              note_id, syllabus_node_id, title, body, is_active, sort_order, created_by, updated_by
            )
            VALUES ($1, $2, $3, $4, TRUE, $5, $6, $6)
          `,
          [noteId, defaultNodeId, item.title, item.body, itemOrder, userId]
        );
        itemOrder++;
      }
    }
    console.log("✓ Successfully seeded 5 Master Study Notes & Rich Lecture Items.");

    console.log("All Master Data Records successfully created!");
  } catch (err) {
    console.error("Error seeding master data records:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedMasterDataRecords();
