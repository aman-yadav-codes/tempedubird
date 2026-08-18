import type { Pool, PoolClient } from "pg";

type Queryable = Pool | PoolClient;

export type CompanyPageRow = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  content: string;
  metadata: Record<string, any>;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  updated_by?: number | null;
};

export type CompanyFaqRow = {
  id: number;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

const DEFAULT_PAGES: Array<{
  slug: string;
  title: string;
  subtitle: string;
  content: string;
  metadata: Record<string, any>;
}> = [
  {
    slug: "about-us",
    title: "About EduBird",
    subtitle: "Empowering education through transparent, verified learning networks and modern administration tools.",
    content: `<h2>Welcome to EduBird</h2>
<p>EduBird is a leading educational management and learning platform designed to bridge the gap between students, educators, and institutions. Our platform brings together course discovery, institution verification, classroom management, attendance, fee processing, and performance tracking into one unified experience.</p>
<h3>Our Mission</h3>
<p>Our mission is to make quality education accessible, structured, and manageable for learners and institutions worldwide. We empower schools, colleges, and coaching institutes with modern digital workflows while giving students and parents complete clarity over academic progress.</p>
<h3>What We Offer</h3>
<ul>
  <li><strong>Verified Institutions:</strong> Browse and connect with top-tier accredited institutions and institutes.</li>
  <li><strong>Comprehensive Course Directory:</strong> Explore structured programs across diverse streams and levels.</li>
  <li><strong>Seamless Classroom Management:</strong> Track assignments, exams, attendance, and fee status in real time.</li>
  <li><strong>Dedicated Parent & Student Portals:</strong> Stay informed with direct updates, notices, and progress reports.</li>
</ul>`,
    metadata: {
      highlights: [
        { title: "Quality Education", description: "Vetted institutions and structured courses." },
        { title: "Transparent Administration", description: "Real-time fee, exam, and attendance tracking." },
        { title: "Student-First Design", description: "Accessible tools for learners and parents alike." }
      ]
    }
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    subtitle: "We are committed to protecting your personal information and your right to privacy.",
    content: `<h2>Privacy Policy</h2>
<p>Last updated: August 14, 2026</p>
<p>This Privacy Policy describes Our policies and procedures on the collection, use, and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>

<h3>1. Information We Collect</h3>
<p>While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You, including but not limited to:</p>
<ul>
  <li>Email address</li>
  <li>First name and last name</li>
  <li>Phone number</li>
  <li>Address, State, Province, ZIP/Postal code, City</li>
  <li>Academic and enrollment details</li>
</ul>

<h3>2. How We Use Your Information</h3>
<p>EduBird uses the collected data for various purposes:</p>
<ul>
  <li>To provide and maintain our Service</li>
  <li>To notify you about changes to our Service</li>
  <li>To allow you to participate in interactive features of our Service</li>
  <li>To provide customer support</li>
  <li>To monitor the usage of the Service</li>
</ul>

<h3>3. Data Protection & Security</h3>
<p>The security of your data is important to us. We employ industry-standard encryption, role-based access control, and secure database connections to protect your personal information.</p>`,
    metadata: {}
  },
  {
    slug: "contact-us",
    title: "Contact Us",
    subtitle: "Have questions or need assistance? Reach out to our team.",
    content: `<h2>Get in Touch</h2>
<p>Whether you are an institution looking to join EduBird, a student needing technical support, or a parent inquiring about admissions, our team is here to assist you.</p>
<p>Feel free to contact us using the details below or send us a message directly through the contact form.</p>`,
    metadata: {
      email: "support@edubird.com",
      phone: "+91 1234567890",
      address: "Orderly Bazar, Varanasi, Uttar Pradesh, India",
      working_hours: "Monday - Saturday: 9:00 AM - 6:00 PM IST",
      map_embed_url: ""
    }
  },
  {
    slug: "terms-and-conditions",
    title: "Terms & Conditions",
    subtitle: "Please read these terms carefully before using our platform and services.",
    content: `<h2>Terms of Service</h2>
<p>Last updated: August 14, 2026</p>

<h3>1. Acceptance of Terms</h3>
<p>By accessing or using EduBird, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, you may not access or use the platform.</p>

<h3>2. User Accounts & Responsibilities</h3>
<p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use.</p>

<h3>3. Acceptable Use</h3>
<p>Users must not engage in any activity that interferes with or disrupts EduBird's services, servers, or networks, nor violate any applicable laws or intellectual property rights.</p>

<h3>4. Modifications</h3>
<p>EduBird reserves the right to modify or replace these terms at any time. Continued use of the platform following any changes constitutes acceptance of those changes.</p>`,
    metadata: {}
  },
  {
    slug: "copyright-policy",
    title: "Copyright Policy",
    subtitle: "Guidelines regarding intellectual property, course material, and content ownership.",
    content: `<h2>Copyright Policy</h2>
<p>All content on EduBird—including text, graphics, logos, software, course templates, examination materials, and media—is the property of EduBird or its content suppliers and is protected by copyright and intellectual property laws.</p>

<h3>1. Intellectual Property Ownership</h3>
<p>Materials provided by institutions remain the property of their respective owners. EduBird is granted a non-exclusive license to host and display such materials for educational purposes on the platform.</p>

<h3>2. Permitted Use</h3>
<p>Users are granted a limited, non-transferable license to access and view content solely for personal, non-commercial educational use.</p>

<h3>3. Reporting Infringement</h3>
<p>If you believe that any content hosted on EduBird infringes upon your copyright, please contact our designated copyright agent at <strong>copyright@edubird.com</strong> with details of the alleged infringement.</p>`,
    metadata: {}
  },
  {
    slug: "refund-policy",
    title: "Refund & Cancellation Policy",
    subtitle: "Understanding fee payments, subscriptions, and refund requests.",
    content: `<h2>Refund Policy</h2>
<p>Last updated: August 14, 2026</p>

<h3>1. Overview</h3>
<p>EduBird facilitates course subscriptions, institution fee payments, and administrative software access. Refund eligibility varies based on the transaction type as detailed below.</p>

<h3>2. Institution Fee Payments</h3>
<p>Tuition fees, admission fees, and examination fees collected on behalf of educational institutions are governed by the respective institution's refund policies. Refund requests for such fees must be submitted directly to the institution.</p>

<h3>3. Platform Subscription & Services</h3>
<p>Platform subscription fees paid directly to EduBird are refundable within 7 days of purchase if no significant services have been utilized. Requests after 7 days are non-refundable except where required by law.</p>

<h3>4. Processing Refunds</h3>
<p>Approved refunds will be processed to the original payment method within 5 to 7 business days.</p>`,
    metadata: {}
  },
  {
    slug: "social-links",
    title: "Social Media Links",
    subtitle: "Manage official social media profiles (Facebook, X/Twitter, Pinterest, WhatsApp, Instagram, YouTube, LinkedIn).",
    content: "<p>Official social media channels and communication handles for your institution.</p>",
    metadata: {
      facebook: "",
      twitter: "",
      pinterest: "",
      whatsapp: "",
      instagram: "",
      youtube: "",
      linkedin: ""
    }
  },
  {
    slug: "faqs",
    title: "Frequently Asked Questions",
    subtitle: "Find answers to commonly asked questions about EduBird, account access, and courses.",
    content: `<p>Explore our frequently asked questions below. If you cannot find the answer you are looking for, please contact our support team.</p>`,
    metadata: {}
  }
];

const DEFAULT_FAQS = [
  {
    question: "What is EduBird?",
    answer: "EduBird is an all-in-one educational platform connecting students with verified learning institutions, offering course discovery, fee management, classroom updates, and academic analytics.",
    category: "General",
    sort_order: 1
  },
  {
    question: "How do I register as a student?",
    answer: "You can register by clicking the Register button on the top navigation bar, choosing your institution or course, and submitting your details.",
    category: "Account",
    sort_order: 2
  },
  {
    question: "How can institutions join the EduBird platform?",
    answer: "Institutions can contact our partnership team via the Contact Us page or submit an inquiry to support@edubird.com to set up an institution admin profile.",
    category: "Institutions",
    sort_order: 3
  },
  {
    question: "How do fee payments work on EduBird?",
    answer: "Students and parents can view fee breakups and make secure online fee payments directly through their dashboard using UPI, cards, or net banking.",
    category: "Payments",
    sort_order: 4
  },
  {
    question: "Is my personal data secure?",
    answer: "Yes, EduBird uses role-based access control, secure SSL encryption, and strict privacy controls to keep all student and institution data safe.",
    category: "Security",
    sort_order: 5
  }
];

export async function ensureCompanyTables(db: Queryable): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS company_pages (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NULL,
      content TEXT NOT NULL DEFAULT '',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_published BOOLEAN NOT NULL DEFAULT true,
      updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS company_faqs (
      id SERIAL PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT 'General',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default pages if not existing
  for (const page of DEFAULT_PAGES) {
    await db.query(
      `
      INSERT INTO company_pages (slug, title, subtitle, content, metadata, is_published)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (slug) DO NOTHING;
      `,
      [page.slug, page.title, page.subtitle, page.content, JSON.stringify(page.metadata)]
    );
  }

  // Seed default FAQs if empty
  const faqCountRes = await db.query(`SELECT COUNT(*)::int AS count FROM company_faqs;`);
  if (faqCountRes.rows[0]?.count === 0) {
    for (const faq of DEFAULT_FAQS) {
      await db.query(
        `
        INSERT INTO company_faqs (question, answer, category, sort_order, is_published)
        VALUES ($1, $2, $3, $4, true);
        `,
        [faq.question, faq.answer, faq.category, faq.sort_order]
      );
    }
  }
}

export async function getAllCompanyPages(db: Queryable): Promise<CompanyPageRow[]> {
  await ensureCompanyTables(db);
  const result = await db.query(`
    SELECT * FROM company_pages ORDER BY id ASC;
  `);
  return result.rows;
}

export async function getCompanyPageBySlug(db: Queryable, slug: string): Promise<CompanyPageRow | null> {
  await ensureCompanyTables(db);
  const result = await db.query(
    `SELECT * FROM company_pages WHERE slug = $1 LIMIT 1;`,
    [slug]
  );
  return result.rows[0] ?? null;
}

export async function updateCompanyPage(
  db: Queryable,
  slug: string,
  data: {
    title?: string;
    subtitle?: string | null;
    content?: string;
    metadata?: Record<string, any>;
    is_published?: boolean;
    updated_by?: number | null;
  }
): Promise<CompanyPageRow | null> {
  await ensureCompanyTables(db);
  const existing = await getCompanyPageBySlug(db, slug);
  if (!existing) return null;

  const title = data.title ?? existing.title;
  const subtitle = data.subtitle !== undefined ? data.subtitle : existing.subtitle;
  const content = data.content ?? existing.content;
  const metadata = data.metadata ? JSON.stringify(data.metadata) : JSON.stringify(existing.metadata);
  const is_published = data.is_published !== undefined ? data.is_published : existing.is_published;
  const updated_by = data.updated_by ?? null;

  const result = await db.query(
    `
    UPDATE company_pages
    SET title = $1,
        subtitle = $2,
        content = $3,
        metadata = $4,
        is_published = $5,
        updated_by = $6,
        updated_at = CURRENT_TIMESTAMP
    WHERE slug = $7
    RETURNING *;
    `,
    [title, subtitle, content, metadata, is_published, updated_by, slug]
  );

  return result.rows[0] ?? null;
}

export async function getAllCompanyFaqs(db: Queryable, publishedOnly = false): Promise<CompanyFaqRow[]> {
  await ensureCompanyTables(db);
  const queryText = publishedOnly
    ? `SELECT * FROM company_faqs WHERE is_published = true ORDER BY sort_order ASC, id ASC;`
    : `SELECT * FROM company_faqs ORDER BY sort_order ASC, id ASC;`;
  const result = await db.query(queryText);
  return result.rows;
}

export async function createCompanyFaq(
  db: Queryable,
  data: { question: string; answer: string; category?: string; sort_order?: number; is_published?: boolean }
): Promise<CompanyFaqRow> {
  await ensureCompanyTables(db);
  const category = data.category || "General";
  const sort_order = data.sort_order ?? 0;
  const is_published = data.is_published ?? true;

  const result = await db.query(
    `
    INSERT INTO company_faqs (question, answer, category, sort_order, is_published)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
    `,
    [data.question, data.answer, category, sort_order, is_published]
  );
  return result.rows[0];
}

export async function updateCompanyFaq(
  db: Queryable,
  id: number,
  data: { question?: string; answer?: string; category?: string; sort_order?: number; is_published?: boolean }
): Promise<CompanyFaqRow | null> {
  await ensureCompanyTables(db);
  const res = await db.query(`SELECT * FROM company_faqs WHERE id = $1;`, [id]);
  const existing = res.rows[0];
  if (!existing) return null;

  const question = data.question ?? existing.question;
  const answer = data.answer ?? existing.answer;
  const category = data.category ?? existing.category;
  const sort_order = data.sort_order !== undefined ? data.sort_order : existing.sort_order;
  const is_published = data.is_published !== undefined ? data.is_published : existing.is_published;

  const result = await db.query(
    `
    UPDATE company_faqs
    SET question = $1, answer = $2, category = $3, sort_order = $4, is_published = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *;
    `,
    [question, answer, category, sort_order, is_published, id]
  );
  return result.rows[0] ?? null;
}

export async function deleteCompanyFaq(db: Queryable, id: number): Promise<boolean> {
  await ensureCompanyTables(db);
  const result = await db.query(`DELETE FROM company_faqs WHERE id = $1;`, [id]);
  return (result.rowCount ?? 0) > 0;
}
