import type { Metadata } from "next";
import { db } from "@/lib/db/db";

export type PageSeoRecord = {
  id: number;
  institution_id?: number | null;
  page_path: string;
  page_name: string;
  meta_title: string;
  meta_description?: string | null;
  meta_keywords?: string | null;
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  twitter_card?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  twitter_image?: string | null;
  favicon_url?: string | null;
  robots?: string | null;
  schema_json?: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
};

export async function ensurePageSeoTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS page_seo_metadata (
      id SERIAL PRIMARY KEY,
      institution_id INT,
      page_path VARCHAR(255) NOT NULL,
      page_name VARCHAR(255) NOT NULL,
      meta_title VARCHAR(255) NOT NULL,
      meta_description TEXT,
      meta_keywords TEXT,
      canonical_url VARCHAR(500),
      og_title VARCHAR(255),
      og_description TEXT,
      og_image TEXT,
      twitter_card VARCHAR(50) DEFAULT 'summary_large_image',
      twitter_title VARCHAR(255),
      twitter_description TEXT,
      twitter_image TEXT,
      favicon_url TEXT,
      robots VARCHAR(100) DEFAULT 'index, follow',
      schema_json TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export const DEFAULT_PLATFORM_SEO_PAGES: Array<Omit<PageSeoRecord, "id" | "created_at" | "updated_at">> = [
  {
    institution_id: null,
    page_path: "/",
    page_name: "Home Page",
    meta_title: "EduBird - Unified Education Platform & Campus ERP System",
    meta_description: "Explore verified courses, colleges, schools, coaching institutes, and automated campus ERP solutions across India. Discover courses or manage your educational institution.",
    meta_keywords: "education, courses, institutes, schools, colleges, coaching, ERP, admissions, tutors, student management",
    canonical_url: "https://edubird.in",
    og_title: "EduBird - India's Leading Education & Campus Platform",
    og_description: "Discover courses, top schools, and modern institute management tools.",
    og_image: "/icons/edubird.webp",
    twitter_card: "summary_large_image",
    twitter_title: "EduBird - Unified Education Platform",
    twitter_description: "Explore courses, coaching institutes, and smart education ERP.",
    twitter_image: "/icons/edubird.webp",
    favicon_url: "/favicon.ico",
    robots: "index, follow",
    is_active: true,
    is_default: true,
  },
  {
    institution_id: null,
    page_path: "/courses",
    page_name: "Courses Marketplace",
    meta_title: "Explore Top Online & Offline Courses - EduBird",
    meta_description: "Browse thousands of verified academic, competitive, vocational, and technical courses from premier institutes and tutors.",
    meta_keywords: "online courses, academic classes, competitive exam courses, engineering, medical coaching, CBSE courses",
    canonical_url: "https://edubird.in/courses",
    og_title: "Browse Trending Courses on EduBird",
    og_description: "Find verified courses, syllabus, class timings, and fee structures.",
    og_image: "/icons/edubird.webp",
    twitter_card: "summary_large_image",
    favicon_url: "/favicon.ico",
    robots: "index, follow",
    is_active: true,
    is_default: true,
  },
  {
    institution_id: null,
    page_path: "/institutes",
    page_name: "Institutes Directory",
    meta_title: "Find Schools, Colleges & Coaching Institutes - EduBird",
    meta_description: "Discover top-rated schools, colleges, coaching centers, and educational organizations near you with verified reviews and facility details.",
    meta_keywords: "schools, colleges, coaching institutes, IIT JEE coaching, NEET coaching, best schools, top colleges in India",
    canonical_url: "https://edubird.in/institutes",
    og_title: "Explore Verified Educational Institutions - EduBird",
    og_description: "Compare campus facilities, faculty ratings, programs, and admission criteria.",
    og_image: "/icons/edubird.webp",
    twitter_card: "summary_large_image",
    favicon_url: "/favicon.ico",
    robots: "index, follow",
    is_active: true,
    is_default: true,
  },
  {
    institution_id: null,
    page_path: "/teachers",
    page_name: "Teacher & Tutor Profiles",
    meta_title: "Verified Teachers & Faculty Profiles - EduBird",
    meta_description: "Connect with certified teachers, subject matter experts, and private tutors across multiple academic boards and competitive fields.",
    meta_keywords: "teachers, private tutors, verified faculty, home tutors, online teachers, subject experts",
    canonical_url: "https://edubird.in/teachers",
    og_title: "Find Top Tutors and Expert Teachers - EduBird",
    og_description: "Certified educators and experienced faculty for all subjects.",
    og_image: "/icons/edubird.webp",
    twitter_card: "summary_large_image",
    favicon_url: "/favicon.ico",
    robots: "index, follow",
    is_active: true,
    is_default: true,
  },
  {
    institution_id: null,
    page_path: "/hostels",
    page_name: "Student Hostels & PGs",
    meta_title: "Student Hostels & PG Accommodations - EduBird",
    meta_description: "Find safe, verified student hostels and PG accommodations near your school, college, or coaching institute with transparent pricing.",
    meta_keywords: "student hostels, boys hostel, girls hostel, PG near college, campus accommodation, student rooms",
    canonical_url: "https://edubird.in/hostels",
    og_title: "Find Safe & Verified Student Hostels - EduBird",
    og_description: "Comfortable hostels and PGs with meal plans, Wi-Fi, and 24/7 security.",
    og_image: "/icons/edubird.webp",
    twitter_card: "summary_large_image",
    favicon_url: "/favicon.ico",
    robots: "index, follow",
    is_active: true,
    is_default: true,
  },
  {
    institution_id: null,
    page_path: "/libraries",
    page_name: "Study Libraries & Reading Rooms",
    meta_title: "Public & Digital Libraries - EduBird",
    meta_description: "Locate quiet study spaces, reading rooms, air-conditioned libraries, and digital academic repositories in your city.",
    meta_keywords: "study library, reading room, digital library, silent study space, self-study library near me",
    canonical_url: "https://edubird.in/libraries",
    og_title: "Find Study Libraries & Reading Spaces - EduBird",
    og_description: "Quiet, air-conditioned study libraries with high-speed internet and book resources.",
    og_image: "/icons/edubird.webp",
    twitter_card: "summary_large_image",
    favicon_url: "/favicon.ico",
    robots: "index, follow",
    is_active: true,
    is_default: true,
  },
  {
    institution_id: null,
    page_path: "/exams",
    page_name: "Exams & Mock Tests",
    meta_title: "Upcoming Competitive Exams & Test Series - EduBird",
    meta_description: "Stay updated on national entrance tests, board schedules, syllabus breakdowns, and online mock test papers.",
    meta_keywords: "competitive exams, mock tests, exam dates, test series, sample papers, admit card alerts",
    canonical_url: "https://edubird.in/exams",
    og_title: "Exams Hub & Mock Tests - EduBird",
    og_description: "Prepare with curated question papers and real-time exam notifications.",
    og_image: "/icons/edubird.webp",
    twitter_card: "summary_large_image",
    favicon_url: "/favicon.ico",
    robots: "index, follow",
    is_active: true,
    is_default: true,
  },
  {
    institution_id: null,
    page_path: "/notes",
    page_name: "Study Notes & Materials",
    meta_title: "Download Free Study Notes & Revision Guides - EduBird",
    meta_description: "Access curated lecture notes, formula sheets, chapter summaries, and PDF study guides contributed by top faculty.",
    meta_keywords: "study notes, PDF notes, revision guide, formula sheet, lecture notes, textbook solutions",
    canonical_url: "https://edubird.in/notes",
    og_title: "Academic Notes & Study Materials - EduBird",
    og_description: "Download verified study notes and revision summaries for all subjects.",
    og_image: "/icons/edubird.webp",
    twitter_card: "summary_large_image",
    favicon_url: "/favicon.ico",
    robots: "index, follow",
    is_active: true,
    is_default: true,
  },
  {
    institution_id: null,
    page_path: "/blogs",
    page_name: "Blog & Educational Articles",
    meta_title: "EduBird Blog - Education News, Tips & Career Advice",
    meta_description: "Read the latest educational insights, exam preparation tips, campus news, and career guidance written by experts.",
    meta_keywords: "education blog, exam tips, career guidance, study hacks, university news, NEP 2020 updates",
    canonical_url: "https://edubird.in/blogs",
    og_title: "EduBird Educational Insights & Blog",
    og_description: "Latest news, study guides, and expert advice for students and educators.",
    og_image: "/icons/edubird.webp",
    twitter_card: "summary_large_image",
    favicon_url: "/favicon.ico",
    robots: "index, follow",
    is_active: true,
    is_default: true,
  },
  {
    institution_id: null,
    page_path: "/about",
    page_name: "About Us",
    meta_title: "About EduBird - Empowering India's Education Ecosystem",
    meta_description: "Learn about EduBird's mission to bridge students, educators, and institutions with technology, verified discovery, and unified ERP.",
    meta_keywords: "about edubird, edtech india, education management system, student portal",
    canonical_url: "https://edubird.in/about",
    og_title: "About EduBird - Unified Education Platform",
    og_description: "Transforming learning and campus administration across India.",
    og_image: "/icons/edubird.webp",
    twitter_card: "summary_large_image",
    favicon_url: "/favicon.ico",
    robots: "index, follow",
    is_active: true,
    is_default: true,
  },
  {
    institution_id: null,
    page_path: "/contact",
    page_name: "Contact Us",
    meta_title: "Contact EduBird - Support & Partnerships",
    meta_description: "Get in touch with the EduBird team for student admissions support, institution onboarding, partnerships, and technical assistance.",
    meta_keywords: "contact edubird, customer support, helpdesk, institution onboarding, contact number",
    canonical_url: "https://edubird.in/contact",
    og_title: "Contact Us - EduBird Support & Inquiries",
    og_description: "We are here to assist students, parents, and educational institutions.",
    og_image: "/icons/edubird.webp",
    twitter_card: "summary_large_image",
    favicon_url: "/favicon.ico",
    robots: "index, follow",
    is_active: true,
    is_default: true,
  },
  {
    institution_id: null,
    page_path: "/privacy",
    page_name: "Privacy Policy",
    meta_title: "Privacy Policy - EduBird",
    meta_description: "Read the official Privacy Policy of EduBird regarding data protection, user privacy, and security practices.",
    meta_keywords: "privacy policy, data protection, edubird privacy, security",
    canonical_url: "https://edubird.in/privacy",
    robots: "index, follow",
    is_active: true,
    is_default: true,
  },
  {
    institution_id: null,
    page_path: "/terms",
    page_name: "Terms of Service",
    meta_title: "Terms & Conditions - EduBird",
    meta_description: "Review terms and conditions for using the EduBird student discovery portal, marketplace, and institutional ERP software.",
    meta_keywords: "terms of service, terms and conditions, edubird rules, user agreement",
    canonical_url: "https://edubird.in/terms",
    robots: "index, follow",
    is_active: true,
    is_default: true,
  },
];

export async function resolvePageMetadata(
  pathname: string,
  institutionId?: number | null,
  fallback?: Metadata
): Promise<Metadata> {
  try {
    await ensurePageSeoTable();

    // 1. Clean path
    const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";

    // 2. Query page seo (prioritize institution-specific if available, fallback to platform global)
    let query = `
      SELECT * FROM page_seo_metadata
      WHERE page_path = $1 AND is_active = TRUE
      ORDER BY (CASE WHEN institution_id = $2 THEN 0 WHEN institution_id IS NULL THEN 1 ELSE 2 END) ASC, id ASC
      LIMIT 1
    `;
    const res = await db.query<PageSeoRecord>(query, [cleanPath, institutionId ?? null]);

    let record = res.rows[0];

    // If no exact match and route has dynamic segments (e.g. /courses/123 -> match /courses)
    if (!record && cleanPath.includes("/")) {
      const topSegment = "/" + cleanPath.split("/").filter(Boolean)[0];
      const fallbackRes = await db.query<PageSeoRecord>(
        `
        SELECT * FROM page_seo_metadata
        WHERE page_path = $1 AND is_active = TRUE
        ORDER BY (CASE WHEN institution_id = $2 THEN 0 WHEN institution_id IS NULL THEN 1 ELSE 2 END) ASC, id ASC
        LIMIT 1
        `,
        [topSegment, institutionId ?? null]
      );
      record = fallbackRes.rows[0];
    }

    if (!record) {
      return fallback || {
        title: "EduBird - Unified Education Platform",
        description: "Explore verified courses, colleges, schools, coaching institutes, and automated campus ERP solutions.",
      };
    }

    const title = record.meta_title || fallback?.title?.toString() || "EduBird";
    const description = record.meta_description || fallback?.description?.toString() || "";
    const keywords = record.meta_keywords ? record.meta_keywords.split(",").map((s) => s.trim()) : undefined;

    return {
      title,
      description,
      keywords,
      icons: record.favicon_url ? { icon: record.favicon_url, shortcut: record.favicon_url, apple: record.favicon_url } : fallback?.icons,
      alternates: record.canonical_url ? { canonical: record.canonical_url } : fallback?.alternates,
      openGraph: {
        title: record.og_title || title,
        description: record.og_description || description,
        images: record.og_image ? [{ url: record.og_image }] : undefined,
      },
      twitter: {
        card: (record.twitter_card as any) || "summary_large_image",
        title: record.twitter_title || record.og_title || title,
        description: record.twitter_description || record.og_description || description,
        images: record.twitter_image ? [record.twitter_image] : record.og_image ? [record.og_image] : undefined,
      },
      robots: record.robots || "index, follow",
    };
  } catch {
    return fallback || {
      title: "EduBird - Unified Education Platform",
      description: "Explore verified courses, colleges, schools, coaching institutes, and automated campus ERP solutions.",
    };
  }
}
