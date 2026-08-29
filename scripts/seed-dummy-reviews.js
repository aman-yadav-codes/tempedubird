const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Realistic Reviewer Profiles
const REVIEWERS = [
  { name: "Aarav Sharma", role: "Verified Student", verified: true },
  { name: "Priya Patel", role: "Alumni (Batch 2024)", verified: true },
  { name: "Rohan Verma", role: "Enrolled Learner", verified: true },
  { name: "Ananya Deshmukh", role: "Verified Student", verified: true },
  { name: "Vikramaditya Singh", role: "Class Representative", verified: true },
  { name: "Neha Gupta", role: "Competitive Aspirant", verified: true },
  { name: "Aditya Joshi", role: "Verified Student", verified: true },
  { name: "Kavita Nair", role: "Research Scholar", verified: true },
  { name: "Siddharth Rao", role: "Enrolled Student", verified: true },
  { name: "Pooja Malhotra", role: "Verified Alumni", verified: true },
  { name: "Amitabh Sen", role: "Parent Reviewer", verified: false },
  { name: "Sneha Roy", role: "Verified Student", verified: true },
  { name: "Rahul Banerjee", role: "Scholarship Recipient", verified: true },
  { name: "Ishita Agarwal", role: "Enrolled Student", verified: true },
  { name: "Harsh Vardhan", role: "Final Year Student", verified: true },
  { name: "Divya Krishnan", role: "Verified Learner", verified: true },
  { name: "Manish Kumar", role: "Alumni Mentor", verified: true },
  { name: "Tanvi Saxena", role: "Verified Student", verified: true },
  { name: "Gaurav Tiwari", role: "Community Member", verified: false },
  { name: "Shreya Mukherjee", role: "Gold Medalist Alumni", verified: true }
];

// Tailored Review Templates for Each Entity Category
const COURSE_REVIEWS = [
  {
    rating: 5,
    title: "Exceptional curriculum and faculty support",
    comment: "The curriculum is meticulously designed with real-world case studies and hands-on practical assignments. The mentors are always available to clear doubts, making the learning curve very smooth."
  },
  {
    rating: 5,
    title: "Game changer for my career path",
    comment: "Covered foundational to advanced industry-relevant concepts. The project-based approach gave me tremendous confidence during technical placement interviews."
  },
  {
    rating: 4,
    title: "Well structured syllabus and great lecture pacing",
    comment: "Comprehensive module structure with timely assessments. The supplementary resources and study guides provided alongside lectures were extremely helpful."
  },
  {
    rating: 5,
    title: "High quality content and practical worksheets",
    comment: "Every chapter includes in-depth explanations and regular checkpoint quizzes. Really appreciate the structured milestone-driven learning pedagogy."
  },
  {
    rating: 4,
    title: "Very comprehensive and beginner-friendly",
    comment: "Concepts are explained from absolute basics to advanced topics. The live doubt clearance sessions made complex formulas and concepts easy to grasp."
  },
  {
    rating: 5,
    title: "Best course in this domain with updated syllabus",
    comment: "Strictly aligns with the latest academic and industry standards. The practice question sets and peer discussions enhanced my overall subject mastery."
  }
];

const INSTITUTION_REVIEWS = [
  {
    rating: 5,
    title: "World-class campus infrastructure & academic culture",
    comment: "Modern smart classrooms, advanced laboratory equipment, and a well-stocked digital library. The campus provides a vibrant learning ecosystem and great placement opportunities."
  },
  {
    rating: 5,
    title: "Dedicated faculty and top-tier placement record",
    comment: "The professors bring immense academic and industry experience. Career counseling and corporate training cells actively assist every student in landing top tier internships."
  },
  {
    rating: 4,
    title: "Excellent balance of academics and extracurriculars",
    comment: "Great student clubs, technical hackathons, and sports facilities. Administrative processes are transparent and student-centric."
  },
  {
    rating: 5,
    title: "Highly reputed institution with supportive mentors",
    comment: "Focus on research, practical innovation, and conceptual depth. The peer group is competitive yet cooperative, fostering immense personal and professional growth."
  },
  {
    rating: 4,
    title: "Great learning atmosphere & serene campus environment",
    comment: "Safe, green, and high-tech campus with state-of-the-art computer labs and seminar halls. Highly recommended for ambitious students."
  }
];

const EXAM_REVIEWS = [
  {
    rating: 5,
    title: "Clear syllabus guidelines and accurate examination pattern",
    comment: "Official guidelines, marking schemes, and eligibility parameters are clearly outlined. The portal notifications and exam schedules are updated promptly."
  },
  {
    rating: 4,
    title: "Well-calibrated question standard and balanced sections",
    comment: "The examination paper tests conceptual clarity and time management effectively across all sections. Great benchmark for competitive admissions."
  },
  {
    rating: 5,
    title: "Smooth notification portal & comprehensive syllabus coverage",
    comment: "Very helpful for entrance aspirants. The eligibility details and application deadlines are clearly structured and easy to track."
  },
  {
    rating: 5,
    title: "Essential examination for prestigious admissions",
    comment: "Fair evaluation standards and well-balanced difficulty level. Preparing through previous year patterns gives a clear edge."
  }
];

const PRACTICE_REVIEWS = [
  {
    rating: 5,
    title: "Authentic exam simulation with in-depth solutions",
    comment: "The timer, section navigation, and question types perfectly mirror the actual exam interface. The detailed step-by-step solutions helped pinpoint my weak areas."
  },
  {
    rating: 5,
    title: "Great question bank across all difficulty levels",
    comment: "Includes moderate to challenging problem sets that test true analytical ability. Instant score analysis and percentile breakdown are fantastic."
  },
  {
    rating: 4,
    title: "Boosted my speed and accuracy significantly",
    comment: "Practicing regularly under timed test conditions improved my time management. Very useful for quick revision before the actual exam."
  },
  {
    rating: 5,
    title: "Must-have mock test series for top rankers",
    comment: "High quality questions without errors or ambiguous options. The answer keys and solution hints are crystal clear."
  }
];

const NOTES_REVIEWS = [
  {
    rating: 5,
    title: "Concise, formula-packed revision notes",
    comment: "Summarizes huge textbooks into neat, easy-to-read chapters with highlighted key points, formulas, and visual diagrams. Saved hours during revision week."
  },
  {
    rating: 5,
    title: "Crystal clear concepts and annotated diagrams",
    comment: "Handwritten formatting and structured bullet points make tough topics breeze to understand. Perfect for last-minute exam prep."
  },
  {
    rating: 4,
    title: "Extremely well organized chapter-wise handouts",
    comment: "Covers all key syllabus nodes with solved sample illustrations and derivation steps. Highly recommended study material."
  },
  {
    rating: 5,
    title: "High yield study material with exam-oriented points",
    comment: "Directly targets questions frequently asked in examinations. High clarity, well structured, and very helpful for scoring top grades."
  }
];

const TEACHER_REVIEWS = [
  {
    rating: 5,
    title: "Inspiring mentor with exceptional pedagogy",
    comment: "Breaks down complex theoretical topics into simple, intuitive concepts using real-life examples. Highly approachable and patient during doubt clearing sessions."
  },
  {
    rating: 5,
    title: "Master of the subject & incredible teacher",
    comment: "Their lectures are engaging, interactive, and full of problem-solving techniques. They genuinely care about every student's academic progress."
  },
  {
    rating: 5,
    title: "Best faculty member in this department",
    comment: "Their structured notes, tips for competitive exams, and rigorous mock problem sessions helped me achieve top percentile marks."
  },
  {
    rating: 4,
    title: "Very patient, knowledgeable and supportive",
    comment: "Encourages questions in class and provides personalized guidance on exam preparation and career opportunities."
  },
  {
    rating: 5,
    title: "Great mentor for research and entrance tests",
    comment: "Deep subject expertise combined with passion for teaching. Always inspires students to think critically and excel."
  }
];

function getRandomItems(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomReviewer(index) {
  return REVIEWERS[index % REVIEWERS.length];
}

async function ensureReviewsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS entity_reviews (
      id SERIAL PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INTEGER NOT NULL,
      institution_id INTEGER,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewer_name VARCHAR(255) NOT NULL,
      reviewer_role VARCHAR(100) DEFAULT 'Student',
      is_verified_user BOOLEAN DEFAULT TRUE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title VARCHAR(255),
      comment TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_entity_reviews_type_id ON entity_reviews(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_entity_reviews_institution ON entity_reviews(institution_id);
  `);
}

function insertReviewsForEntity(entityType, entityId, institutionId, reviewPool, count = 3, existingUsers = []) {
  const chosenReviews = getRandomItems(reviewPool, count);
  const rows = [];

  for (let i = 0; i < chosenReviews.length; i++) {
    const rev = chosenReviews[i];
    const userOffset = (entityId * 7 + i * 3) % (existingUsers.length || REVIEWERS.length);
    const assignedUser = existingUsers.length > 0 ? existingUsers[userOffset] : null;
    const reviewerObj = getRandomReviewer(entityId + i * 5);

    const reviewerName = assignedUser?.full_name || reviewerObj.name;
    const reviewerRole = reviewerObj.role;
    const isVerified = reviewerObj.verified;
    const userId = assignedUser?.id || null;

    // Jitter created_at timestamp between 2 and 90 days ago
    const daysAgo = (entityId % 60) + (i * 4) + 1;
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    rows.push({
      entity_type: entityType,
      entity_id: entityId,
      institution_id: institutionId || null,
      user_id: userId,
      reviewer_name: reviewerName,
      reviewer_role: reviewerRole,
      is_verified_user: isVerified,
      rating: rev.rating,
      title: rev.title,
      comment: rev.comment,
      created_at: createdAt
    });
  }

  return rows;
}

async function seedBatch(batch) {
  if (batch.length === 0) return;

  const valuePlaceholders = [];
  const queryParams = [];

  batch.forEach((row, idx) => {
    const base = idx * 11;
    valuePlaceholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11})`);
    queryParams.push(
      row.entity_type,
      row.entity_id,
      row.institution_id,
      row.user_id,
      row.reviewer_name,
      row.reviewer_role,
      row.is_verified_user,
      row.rating,
      row.title,
      row.comment,
      row.created_at
    );
  });

  const query = `
    INSERT INTO entity_reviews (
      entity_type,
      entity_id,
      institution_id,
      user_id,
      reviewer_name,
      reviewer_role,
      is_verified_user,
      rating,
      title,
      comment,
      created_at
    ) VALUES ${valuePlaceholders.join(', ')}
  `;

  await pool.query(query, queryParams);
}

async function main() {
  console.log("🚀 Starting insertion of dummy reviews and ratings for all categories...");
  const startTime = Date.now();

  try {
    await ensureReviewsTable();

    // 1. Fetch existing users to link as real reviewers where applicable
    const usersRes = await pool.query(`SELECT id, full_name, email FROM users WHERE is_active = TRUE LIMIT 300`);
    const users = usersRes.rows;

    // 2. Fetch existing reviewed entity counts to avoid excessive duplicates
    const existingReviewsRes = await pool.query(`
      SELECT entity_type, entity_id, COUNT(*) as cnt 
      FROM entity_reviews 
      GROUP BY entity_type, entity_id
    `);
    const existingMap = new Set();
    existingReviewsRes.rows.forEach(r => {
      existingMap.add(`${r.entity_type}_${r.entity_id}`);
    });

    let totalInserted = 0;
    const batchSize = 100;
    let currentBatch = [];

    const flushBatch = async () => {
      if (currentBatch.length > 0) {
        await seedBatch(currentBatch);
        totalInserted += currentBatch.length;
        currentBatch = [];
      }
    };

    // ==========================================
    // A. COURSES & PROGRAMS (institution_programs)
    // ==========================================
    console.log("📚 Processing Courses & Academic Programs...");
    const coursesRes = await pool.query(`
      SELECT id, title, institution_id 
      FROM institution_programs 
      WHERE COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY id ASC
    `);

    for (const course of coursesRes.rows) {
      // Seed for entity_type = 'course'
      if (!existingMap.has(`course_${course.id}`)) {
        const reviewsCourse = insertReviewsForEntity('course', course.id, course.institution_id, COURSE_REVIEWS, 3 + (course.id % 3), users);
        currentBatch.push(...reviewsCourse);
      }
      // Seed for entity_type = 'program'
      if (!existingMap.has(`program_${course.id}`)) {
        const reviewsProg = insertReviewsForEntity('program', course.id, course.institution_id, COURSE_REVIEWS, 3 + (course.id % 3), users);
        currentBatch.push(...reviewsProg);
      }

      if (currentBatch.length >= batchSize) {
        await flushBatch();
      }
    }
    await flushBatch();
    console.log(`✓ Courses processed. Total reviews so far: ${totalInserted}`);

    // ==========================================
    // B. INSTITUTIONS (institution_profiles)
    // ==========================================
    console.log("🏫 Processing Institutions...");
    const institutionsRes = await pool.query(`
      SELECT id, name 
      FROM institution_profiles 
      WHERE COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY id ASC
    `);

    for (const inst of institutionsRes.rows) {
      if (!existingMap.has(`institution_${inst.id}`)) {
        const reviewsInst = insertReviewsForEntity('institution', inst.id, inst.id, INSTITUTION_REVIEWS, 4 + (inst.id % 3), users);
        currentBatch.push(...reviewsInst);
      }

      if (currentBatch.length >= batchSize) {
        await flushBatch();
      }
    }
    await flushBatch();
    console.log(`✓ Institutions processed. Total reviews so far: ${totalInserted}`);

    // ==========================================
    // C. ENTRANCE & COMPETITIVE EXAMS (entrance_exams)
    // ==========================================
    console.log("📝 Processing Exams...");
    const examsRes = await pool.query(`
      SELECT id, exam_name, institution_id 
      FROM entrance_exams 
      ORDER BY id ASC
    `);

    for (const exam of examsRes.rows) {
      if (!existingMap.has(`exam_${exam.id}`)) {
        const revs = insertReviewsForEntity('exam', exam.id, exam.institution_id, EXAM_REVIEWS, 4, users);
        currentBatch.push(...revs);
      }
      if (!existingMap.has(`entrance_exam_${exam.id}`)) {
        const revs2 = insertReviewsForEntity('entrance_exam', exam.id, exam.institution_id, EXAM_REVIEWS, 4, users);
        currentBatch.push(...revs2);
      }

      if (currentBatch.length >= batchSize) {
        await flushBatch();
      }
    }
    await flushBatch();
    console.log(`✓ Exams processed. Total reviews so far: ${totalInserted}`);

    // ==========================================
    // D. PRACTICE TESTS & EXAMS (practice_tests & practice_exams)
    // ==========================================
    console.log("🎯 Processing Practice Tests & Exams...");
    const practiceTestsRes = await pool.query(`
      SELECT id, title, institution_id 
      FROM practice_tests 
      ORDER BY id ASC
    `);

    for (const pt of practiceTestsRes.rows) {
      if (!existingMap.has(`practice_${pt.id}`)) {
        const revs = insertReviewsForEntity('practice', pt.id, pt.institution_id, PRACTICE_REVIEWS, 4, users);
        currentBatch.push(...revs);
      }
      if (currentBatch.length >= batchSize) {
        await flushBatch();
      }
    }

    const practiceExamsRes = await pool.query(`
      SELECT id, title, institution_id 
      FROM practice_exams 
      WHERE COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY id ASC
    `);

    for (const pe of practiceExamsRes.rows) {
      if (!existingMap.has(`practice_${pe.id}`)) {
        const revs = insertReviewsForEntity('practice', pe.id, pe.institution_id, PRACTICE_REVIEWS, 3 + (pe.id % 3), users);
        currentBatch.push(...revs);
      }
      if (currentBatch.length >= batchSize) {
        await flushBatch();
      }
    }
    await flushBatch();
    console.log(`✓ Practice tests/exams processed. Total reviews so far: ${totalInserted}`);

    // ==========================================
    // E. STUDY NOTES (study_notes & notes)
    // ==========================================
    console.log("📖 Processing Study Notes...");
    const studyNotesRes = await pool.query(`
      SELECT id, title, institution_id 
      FROM study_notes 
      WHERE COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY id ASC
    `);

    for (const sn of studyNotesRes.rows) {
      if (!existingMap.has(`notes_${sn.id}`)) {
        const revs = insertReviewsForEntity('notes', sn.id, sn.institution_id, NOTES_REVIEWS, 4, users);
        currentBatch.push(...revs);
      }
      if (currentBatch.length >= batchSize) {
        await flushBatch();
      }
    }

    const notesRes = await pool.query(`
      SELECT id, institution_id 
      FROM notes 
      WHERE COALESCE(is_active, TRUE) = TRUE
      ORDER BY id ASC
    `);

    for (const n of notesRes.rows) {
      if (!existingMap.has(`notes_${n.id}`)) {
        const revs = insertReviewsForEntity('notes', n.id, n.institution_id, NOTES_REVIEWS, 3 + (n.id % 2), users);
        currentBatch.push(...revs);
      }
      if (currentBatch.length >= batchSize) {
        await flushBatch();
      }
    }
    await flushBatch();
    console.log(`✓ Notes processed. Total reviews so far: ${totalInserted}`);

    // ==========================================
    // F. TEACHERS & FACULTY (users with teacher/faculty roles + fallback IDs)
    // ==========================================
    console.log("👨‍🏫 Processing Teachers & Faculty Members...");
    const teachersRes = await pool.query(`
      SELECT DISTINCT ON (u.id)
        u.id,
        u.full_name,
        COALESCE(im.institution_id, up.under_institution_id) as institution_id
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r_ur ON r_ur.id = ur.role_id
      LEFT JOIN institution_memberships im ON im.user_id = u.id AND COALESCE(im.is_deleted, FALSE) = FALSE
      LEFT JOIN roles r_im ON r_im.id = im.role_id
      WHERE u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
        AND (r_im.code ILIKE '%teacher%' OR r_ur.code ILIKE '%teacher%' OR r_im.code ILIKE '%faculty%' OR r_ur.code ILIKE '%faculty%' OR COALESCE(up.is_teacher, FALSE) = TRUE OR u.email ILIKE '%teacher%' OR u.email ILIKE '%faculty%')
    `);

    const teachersMap = new Map();
    teachersRes.rows.forEach(t => {
      teachersMap.set(t.id, { id: t.id, inst_id: t.institution_id });
    });

    // Include fallback marketplace teachers (101 - 106)
    [101, 102, 103, 104, 105, 106].forEach(id => {
      if (!teachersMap.has(id)) {
        teachersMap.set(id, { id, inst_id: null });
      }
    });

    for (const teacher of teachersMap.values()) {
      if (!existingMap.has(`teacher_${teacher.id}`)) {
        const revsTeacher = insertReviewsForEntity('teacher', teacher.id, teacher.inst_id, TEACHER_REVIEWS, 3 + (teacher.id % 3), users);
        currentBatch.push(...revsTeacher);
      }
      if (!existingMap.has(`faculty_${teacher.id}`)) {
        const revsFaculty = insertReviewsForEntity('faculty', teacher.id, teacher.inst_id, TEACHER_REVIEWS, 3 + (teacher.id % 3), users);
        currentBatch.push(...revsFaculty);
      }

      if (currentBatch.length >= batchSize) {
        await flushBatch();
      }
    }
    await flushBatch();
    console.log(`✓ Teachers processed. Total reviews so far: ${totalInserted}`);

    // Summary of all reviews in DB
    const finalCounts = await pool.query(`
      SELECT entity_type, COUNT(*) as count, AVG(rating)::numeric(3,1) as avg_rating
      FROM entity_reviews
      GROUP BY entity_type
      ORDER BY count DESC
    `);
    console.log("\n=======================================================");
    console.log(`🎉 SUCCESS! Completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s.`);
    console.log(`Total new reviews inserted: ${totalInserted}`);
    console.log("Current entity_reviews breakdown in Database:");
    console.table(finalCounts.rows);
    console.log("=======================================================");

  } catch (err) {
    console.error("Error seeding dummy reviews:", err);
  } finally {
    await pool.end();
  }
}

main();
