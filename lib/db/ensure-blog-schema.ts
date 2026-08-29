import { db } from "@/lib/db/db";

let blogSchemaReady = false;

export async function ensureBlogPostsTable() {
  if (blogSchemaReady) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE,
        institution_id INTEGER NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'Academic & Curriculum',
        cover_image TEXT NULL,
        video_url TEXT NULL,
        summary TEXT NULL,
        tags TEXT NULL,
        content JSONB NOT NULL DEFAULT '{}'::jsonb,
        content_html TEXT NULL,
        status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'review', 'published')),
        is_featured BOOLEAN DEFAULT FALSE,
        read_time_mins INT DEFAULT 5,
        views_count INT DEFAULT 0,
        publish_at TIMESTAMPTZ NULL,
        published_at TIMESTAMPTZ NULL DEFAULT CURRENT_TIMESTAMP,
        author_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
        author_name VARCHAR(255) NULL,
        author_role VARCHAR(100) NULL DEFAULT 'Educational Contributor',
        author_avatar TEXT NULL,
        meta_title VARCHAR(255) NULL,
        meta_description TEXT NULL,
        meta_keywords TEXT NULL,
        canonical_url TEXT NULL,
        created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Ensure newly added columns exist in older database environments
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS content_html TEXT;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS read_time_mins INT DEFAULT 5;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author_name VARCHAR(255);
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author_role VARCHAR(100) DEFAULT 'Educational Contributor';
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author_avatar TEXT;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255);
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_description TEXT;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_keywords TEXT;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS canonical_url TEXT;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug) WHERE slug IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_blog_posts_institution_status ON blog_posts(institution_id, status, published_at DESC);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(is_featured);
    `);

    // Backfill any missing slugs for older blog rows
    await db.query(`
      UPDATE blog_posts
      SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(title), '[^a-zA-Z0-9\\s-]', '', 'g'), '\\s+', '-', 'g')) || '-' || id
      WHERE slug IS NULL OR slug = '';
    `);

    // Seed comprehensive initial articles if table is empty
    const countCheck = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM blog_posts`);
    if (parseInt(countCheck.rows[0]?.count || "0", 10) === 0) {
      await db.query(`
        INSERT INTO blog_posts (
          title,
          slug,
          category,
          summary,
          content_html,
          cover_image,
          status,
          is_featured,
          read_time_mins,
          author_name,
          author_role,
          author_avatar,
          tags,
          published_at
        )
        VALUES 
        (
          'Complete Guide to BCA & Computer Science Career Roadmaps in 2026',
          'complete-guide-to-bca-computer-science-career-roadmaps-2026',
          'Academic & Curriculum',
          'Discover top technical specializations, high-growth engineering domains, full-stack frameworks, and placement strategies for computer applications students.',
          '<h2>Overview of Computer Applications in 2026</h2><p>The field of Computer Applications and Information Technology has evolved rapidly with cloud computing, artificial intelligence, and full-stack software architecture becoming standard industry prerequisites.</p><h3>Key Skill Pillars</h3><ul><li><strong>Data Structures & Algorithmic Thinking:</strong> Crucial for technical interviews and scalable system design.</li><li><strong>Full Stack Web & Mobile Engineering:</strong> Modern frameworks like Next.js, React, Node.js, and TypeScript.</li><li><strong>Cloud Infrastructure & DevOps:</strong> AWS, Docker, Kubernetes, and automated CI/CD pipelines.</li></ul><blockquote>Continuous hands-on project building and open-source contribution remain the highest-yielding habits for computer science aspirants.</blockquote><h3>Placement Strategies</h3><p>Start building real-world projects by your second year. Participate in hackathons, publish your GitHub repositories, and maintain an active technical portfolio.</p>',
          'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
          'published',
          true,
          6,
          'Dr. Ananya Sharma',
          'Dean of Computing Sciences',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          'BCA, Programming, Career, Tech',
          NOW() - INTERVAL '2 days'
        ),
        (
          'Top Strategies for Cracking National Entrance Exams & Engineering Cutoffs',
          'top-strategies-for-cracking-national-entrance-exams-cutoffs',
          'Exams, Cutoffs & Results',
          'Master time management, high-yield subject revision, mock test analysis, and stress resilience for competitive entrance assessments.',
          '<h2>Strategic Exam Preparation</h2><p>Scoring in the top percentile of competitive entrance exams requires disciplined consistency, conceptual mastery, and targeted simulation through timed practice tests.</p><h3>1. The 80/20 Revision Rule</h3><p>Focus 80% of your revision energy on the high-weightage core syllabus topics that consistently appear year after year.</p><h3>2. Active Mock Test Analysis</h3><p>Taking a mock test is only half the battle. Spend double the time analyzing your incorrect attempts, time-drains, and calculation slips.</p>',
          'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80',
          'published',
          false,
          5,
          'Prof. Rajesh Verma',
          'Senior Entrance Examiner',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
          'Exams, Study Tips, Strategy',
          NOW() - INTERVAL '4 days'
        ),
        (
          'How Modern Institutions Are Transforming Hybrid Classroom Learning',
          'how-modern-institutions-are-transforming-hybrid-classroom-learning',
          'Campus Life & Culture',
          'Exploring digital smart campuses, interactive laboratory modules, virtual internships, and next-generation student support systems.',
          '<h2>The Future of Education Delivery</h2><p>Classrooms are no longer restricted to four walls. Hybrid learning models blend dynamic in-person mentorship with anytime-accessible digital study repositories, automated assessments, and interactive doubt resolution.</p>',
          'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80',
          'published',
          false,
          4,
          'EduBird Editorial Team',
          'Education Research Desk',
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
          'Campus, Digital Education, Hybrid',
          NOW() - INTERVAL '7 days'
        );
      `);
    }

    blogSchemaReady = true;
  } catch (err) {
    console.error("[ensureBlogPostsTable] Schema verification error:", err);
  }
}
