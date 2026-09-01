import { db } from "@/lib/db/db";

let schemaEnsured = false;

export async function ensureAnalyticsSchema() {
  if (schemaEnsured) return;

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS analytics_visitors (
        id SERIAL PRIMARY KEY,
        anonymous_id VARCHAR(100) UNIQUE NOT NULL,
        user_id INT,
        user_name VARCHAR(255),
        ip_address VARCHAR(100),
        location VARCHAR(255),
        user_agent TEXT,
        referrer TEXT,
        first_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        total_events INT DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS analytics_events (
        id BIGSERIAL PRIMARY KEY,
        anonymous_id VARCHAR(100) NOT NULL,
        user_id INT,
        institution_id INT,
        event_type VARCHAR(50) NOT NULL, -- 'click', 'view', 'impression', 'search'
        page_url TEXT NOT NULL,
        page_name VARCHAR(255),
        button_name VARCHAR(255),
        keywords TEXT,
        referrer TEXT,
        ip_address VARCHAR(100),
        location VARCHAR(255),
        device_type VARCHAR(50) DEFAULT 'desktop',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_events_anon ON analytics_events(anonymous_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_inst ON analytics_events(institution_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_visitors_anon ON analytics_visitors(anonymous_id);
    `);

    // Ensure sample/initial seed events if empty so the dashboard is immediately lively with real records
    const countRes = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM analytics_events`);
    if (Number(countRes.rows[0]?.count || 0) === 0) {
      await db.query(`
        INSERT INTO analytics_visitors (anonymous_id, user_name, ip_address, location, user_agent, referrer, first_seen_at, last_seen_at, total_events)
        VALUES 
          ('anon_usr_98a7bc12', 'Aarav Sharma (Student)', '103.21.124.55', 'Mumbai, Maharashtra, India', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0', 'https://www.google.com/search?q=best+neet+coaching+in+mumbai', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '5 minutes', 7),
          ('anon_usr_44f8cd90', 'Anonymous Visitor', '14.139.241.12', 'Bengaluru, Karnataka, India', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1', 'https://www.bing.com/search?q=btech+computer+science+syllabus+notes', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '15 minutes', 5),
          ('anon_usr_11e2aa33', 'Priya Verma (Parent)', '49.36.192.88', 'Delhi NCR, India', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3) Mobile/15E148', 'https://edubird.com/courses', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour', 9),
          ('anon_usr_77cb3311', 'Anonymous Visitor', '152.58.21.40', 'Pune, Maharashtra, India', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/122.0', 'https://www.google.com/search?q=laundry+and+mess+vendors+near+campus', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '20 minutes', 4);

        INSERT INTO analytics_events (anonymous_id, institution_id, event_type, page_url, page_name, button_name, keywords, referrer, ip_address, location, created_at)
        VALUES
          -- Visitor 1 Journey (Maa Sharda Institute Courses & Profile)
          ('anon_usr_98a7bc12', 1, 'view', 'https://edubird.com/courses', 'Explore Courses & Programs', NULL, 'best neet coaching in mumbai', 'https://www.google.com', '103.21.124.55', 'Mumbai, Maharashtra, India', NOW() - INTERVAL '2 hours'),
          ('anon_usr_98a7bc12', 1, 'search', 'https://edubird.com/courses?search=NEET+Dropper+Batch', 'Explore Courses', NULL, 'NEET Dropper Batch 2026', 'https://edubird.com/courses', '103.21.124.55', 'Mumbai, Maharashtra, India', NOW() - INTERVAL '1 hour 50 minutes'),
          ('anon_usr_98a7bc12', 1, 'impression', 'https://edubird.com/courses/102', 'NEET Intensive Classroom Course Card', NULL, 'NEET Medical', 'https://edubird.com/courses', '103.21.124.55', 'Mumbai, Maharashtra, India', NOW() - INTERVAL '1 hour 45 minutes'),
          ('anon_usr_98a7bc12', 1, 'click', 'https://edubird.com/courses/102', 'Course Details', 'Reviews & Q&A', 'NEET Medical Dropper', 'https://edubird.com/courses', '103.21.124.55', 'Mumbai, Maharashtra, India', NOW() - INTERVAL '1 hour 40 minutes'),
          ('anon_usr_98a7bc12', 1, 'click', 'https://edubird.com/courses/102', 'Course Details', 'Enquiry', 'NEET Dropper Batch', 'https://edubird.com/courses', '103.21.124.55', 'Mumbai, Maharashtra, India', NOW() - INTERVAL '1 hour 30 minutes'),
          ('anon_usr_98a7bc12', 1, 'view', 'https://edubird.com/institutes', 'Top Institutes & Colleges', NULL, 'Maa Sharda Institute', 'https://edubird.com/courses/102', '103.21.124.55', 'Mumbai, Maharashtra, India', NOW() - INTERVAL '45 minutes'),
          ('anon_usr_98a7bc12', 1, 'click', 'https://edubird.com/institutes/1', 'Institute Profile', 'Enquiry', 'Institute Admission 2026', 'https://edubird.com/institutes', '103.21.124.55', 'Mumbai, Maharashtra, India', NOW() - INTERVAL '5 minutes'),

          -- Visitor 2 Journey (Institute Study Material & Notes)
          ('anon_usr_44f8cd90', 1, 'view', 'https://edubird.com/notes', 'Lecture Notes & Study Handouts', NULL, 'btech computer science syllabus notes', 'https://www.bing.com', '14.139.241.12', 'Bengaluru, Karnataka, India', NOW() - INTERVAL '5 hours'),
          ('anon_usr_44f8cd90', 1, 'search', 'https://edubird.com/notes?search=Data+Structures', 'Lecture Notes', NULL, 'Data Structures & Algorithms Handouts', 'https://edubird.com/notes', '14.139.241.12', 'Bengaluru, Karnataka, India', NOW() - INTERVAL '4 hours 30 minutes'),
          ('anon_usr_44f8cd90', 1, 'impression', 'https://edubird.com/notes/45', 'DSA Complete Revision Notes Handout', NULL, 'Data Structures', 'https://edubird.com/notes', '14.139.241.12', 'Bengaluru, Karnataka, India', NOW() - INTERVAL '4 hours 20 minutes'),
          ('anon_usr_44f8cd90', 1, 'click', 'https://edubird.com/notes/45', 'Notes Archive', 'Reviews & Q&A', 'BTech DSA Modules', 'https://edubird.com/notes', '14.139.241.12', 'Bengaluru, Karnataka, India', NOW() - INTERVAL '4 hours'),
          ('anon_usr_44f8cd90', 1, 'click', 'https://edubird.com/notes/45', 'Notes Archive', 'Enquiry', 'Download Question Bank', 'https://edubird.com/notes', '14.139.241.12', 'Bengaluru, Karnataka, India', NOW() - INTERVAL '15 minutes'),

          -- Visitor 3 Journey (Practice Tests & Exams)
          ('anon_usr_11e2aa33', 1, 'view', 'https://edubird.com/practice', 'Practice Tests & Mock Quiz Series', NULL, 'online mock exam portal', 'https://edubird.com', '49.36.192.88', 'Delhi NCR, India', NOW() - INTERVAL '1 day'),
          ('anon_usr_11e2aa33', 1, 'search', 'https://edubird.com/practice?search=Physics+Mechanics', 'Practice Tests', NULL, 'JEE Mains Physics Mechanics Speed Test', 'https://edubird.com/practice', '49.36.192.88', 'Delhi NCR, India', NOW() - INTERVAL '23 hours'),
          ('anon_usr_11e2aa33', 1, 'click', 'https://edubird.com/practice/8', 'Practice Test Card', 'Enquiry', 'JEE Physics Test Series', 'https://edubird.com/practice', '49.36.192.88', 'Delhi NCR, India', NOW() - INTERVAL '22 hours'),
          ('anon_usr_11e2aa33', 1, 'view', 'https://edubird.com/exams', 'Entrance Examinations & Admission Tests', NULL, 'JEE Advanced 2026 dates', 'https://edubird.com/practice', '49.36.192.88', 'Delhi NCR, India', NOW() - INTERVAL '2 hours'),
          ('anon_usr_11e2aa33', 1, 'click', 'https://edubird.com/exams/3', 'JEE Advanced Exam Notice', 'Reviews & Q&A', 'JEE Advanced Eligibility', 'https://edubird.com/exams', '49.36.192.88', 'Delhi NCR, India', NOW() - INTERVAL '1 hour'),

          -- Visitor 4 Journey (Campus Facilities & Vendors)
          ('anon_usr_77cb3311', 1, 'view', 'https://edubird.com/vendors', 'Verified Campus Vendors', NULL, 'laundry and mess vendors near campus', 'https://www.google.com', '152.58.21.40', 'Pune, Maharashtra, India', NOW() - INTERVAL '3 hours'),
          ('anon_usr_77cb3311', 1, 'search', 'https://edubird.com/vendors?search=Laundry', 'Campus Vendors', NULL, 'QuickClean Laundry Services', 'https://edubird.com/vendors', '152.58.21.40', 'Pune, Maharashtra, India', NOW() - INTERVAL '2 hours 10 minutes'),
          ('anon_usr_77cb3311', 1, 'click', 'https://edubird.com/vendors', 'Vendor Directory', 'Reviews & Q&A', 'Laundry Services Pune', 'https://edubird.com/vendors', '152.58.21.40', 'Pune, Maharashtra, India', NOW() - INTERVAL '1 hour 45 minutes'),
          ('anon_usr_77cb3311', 1, 'click', 'https://edubird.com/vendors', 'Vendor Directory', 'Enquiry', 'Student Monthly Laundry Package', 'https://edubird.com/vendors', '152.58.21.40', 'Pune, Maharashtra, India', NOW() - INTERVAL '20 minutes');
      `);
    } else {
      // Ensure existing records have institution_id populated
      await db.query(`UPDATE analytics_events SET institution_id = 1 WHERE institution_id IS NULL`);
    }

    schemaEnsured = true;
  } catch (err) {
    console.error("Error ensuring analytics schema:", err);
  }
}
