import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

const DEFAULT_PRESET_TEMPLATES = [
  {
    page_path: "/",
    page_type: "static",
    entity_type: "general",
    meta_title: "{{site_name}} - Leading Coaching, Courses & Campus Platform in {{city}}",
    meta_description: "Discover top-rated institutes, verified coaching centers, mock exams, and career skill courses on {{site_name}}.",
    keywords: ["education portal", "online coaching", "competitive exams", "test series", "top institutes"],
    og_title: "{{site_name}} - Transform Your Learning & Career",
    og_description: "Find the best courses, expert teachers, and coaching institutes across your city.",
    og_image: "/images/og-home.jpg",
    og_url: "https://edubird.net/",
    canonical_url: "https://edubird.net/",
    robots_directive: "index, follow",
    schema_markup_type: "EducationalOrganization",
    conditional_rules: [
      { condition: "city_present", action: "append_title", value: "in {{city}}, {{state}}" }
    ]
  },
  {
    page_path: "/courses",
    page_type: "static",
    entity_type: "course",
    meta_title: "Explore All Courses & Career Certification Programs | {{site_name}}",
    meta_description: "Browse comprehensive courses in Engineering, Medical, Coding, UPSC, and School boards. Compare syllabus, fees, and teacher ratings.",
    keywords: ["courses catalog", "certification programs", "exam prep", "online courses", "skills training"],
    og_title: "Top Trending Courses & Programs | {{site_name}}",
    og_description: "Explore 100+ high-impact courses with verified student reviews.",
    og_image: "/images/og-courses.jpg",
    og_url: "https://edubird.net/courses",
    canonical_url: "https://edubird.net/courses",
    robots_directive: "index, follow",
    schema_markup_type: "Course"
  },
  {
    page_path: "/courses/[slug]",
    page_type: "dynamic_template",
    entity_type: "course",
    meta_title: "{{course_title}} Course Syllabus, Fees & Admissions | {{institution_name}}",
    meta_description: "Enroll in {{course_title}} by {{institution_name}} in {{city}}, {{area}}. Complete curriculum, batches, faculty credentials, and online enrollment.",
    keywords: ["{{course_title}}", "{{course_title}} fees", "{{institution_name}} {{course_title}}", "coaching in {{city}}", "best course {{area}}"],
    og_title: "{{course_title}} by {{institution_name}} - Admissions Open",
    og_description: "Join {{course_title}}. Flexible batches, verified teachers, and affordable fees.",
    og_image: "{{thumbnail}}",
    og_url: "https://edubird.net/courses/{{slug}}",
    canonical_url: "https://edubird.net/courses/{{slug}}",
    robots_directive: "index, follow",
    schema_markup_type: "Course",
    conditional_rules: [
      { condition: "discount_active", action: "append_title", value: "({{discount}}% Special Discount)" }
    ]
  },
  {
    page_path: "/institutions/[id]",
    page_type: "dynamic_template",
    entity_type: "institution",
    meta_title: "{{institution_name}} {{city}} - Courses, Faculty, Reviews & Campus Info",
    meta_description: "{{institution_name}} located in {{area}}, {{city}}, {{state}}. Check top courses offered, facilities, hostel living, student reviews, and contact info.",
    keywords: ["{{institution_name}}", "{{institution_name}} {{city}}", "institute in {{area}}", "top coaching {{city}}", "campus portal"],
    og_title: "{{institution_name}} Campus Portal & Admissions | {{city}}",
    og_description: "Explore courses, faculty, and facilities at {{institution_name}}.",
    og_image: "{{institution_banner}}",
    og_url: "https://edubird.net/institutions/{{id}}",
    canonical_url: "https://edubird.net/institutions/{{id}}",
    robots_directive: "index, follow",
    schema_markup_type: "EducationalOrganization"
  },
  {
    page_path: "/blog/[slug]",
    page_type: "dynamic_template",
    entity_type: "blog",
    meta_title: "{{blog_title}} | Educational Articles & Guides | {{site_name}}",
    meta_description: "Read \"{{blog_title}}\" by {{author_name}}. Expert study tips, exam strategies, career advice, and syllabus breakdowns.",
    keywords: ["{{blog_title}}", "exam tips", "career guide", "study notes {{category}}"],
    og_title: "{{blog_title}}",
    og_description: "Read the latest educational insights and study strategies.",
    og_image: "{{blog_cover}}",
    og_url: "https://edubird.net/blog/{{slug}}",
    canonical_url: "https://edubird.net/blog/{{slug}}",
    robots_directive: "index, follow",
    schema_markup_type: "Article"
  },
  {
    page_path: "/vendors",
    page_type: "static",
    entity_type: "vendor",
    meta_title: "Student Utilities, Accommodations & Vendor Directory | {{site_name}}",
    meta_description: "Verified student service providers in {{city}}: House cleaners, laundry, PG & hostel owners, IT repairs, mess catering, and job consultancies.",
    keywords: ["student services", "PG in {{city}}", "student mess", "hostel cleaners", "laptop repair {{area}}"],
    og_title: "Verified Student Utilities & Services Directory in {{city}}",
    og_description: "Connect with trusted service providers, cleaners, mess, and accommodations.",
    og_image: "/images/og-vendors.jpg",
    og_url: "https://edubird.net/vendors",
    canonical_url: "https://edubird.net/vendors",
    robots_directive: "index, follow",
    schema_markup_type: "LocalBusiness"
  }
];

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const url = new URL(req.url);
    const path = url.searchParams.get("path")?.trim();
    const search = url.searchParams.get("search")?.trim();
    const pageType = url.searchParams.get("page_type")?.trim();

    let query = `SELECT * FROM seo_meta_tags WHERE 1=1`;
    const params: any[] = [];

    if (path) {
      params.push(path);
      query += ` AND (page_path = $${params.length} OR route_path = $${params.length})`;
    }

    if (pageType && pageType !== "all") {
      params.push(pageType);
      query += ` AND page_type = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (page_path ILIKE $${params.length} OR meta_title ILIKE $${params.length} OR meta_description ILIKE $${params.length})`;
    }

    query += ` ORDER BY page_type DESC, page_path ASC`;

    const res = await db.query(query, params);

    // Auto seed if empty
    if (res.rows.length === 0 && !search && !path && (!pageType || pageType === "all")) {
      for (const preset of DEFAULT_PRESET_TEMPLATES) {
        const check = await db.query(`SELECT id FROM seo_meta_tags WHERE page_path = $1 OR route_path = $1 LIMIT 1`, [preset.page_path]);
        if (check.rows.length === 0) {
          await db.query(
            `
            INSERT INTO seo_meta_tags (
              page_path, route_path, page_type, entity_type, meta_title, meta_description, keywords,
              og_title, og_description, og_image, og_url, canonical_url, robots_directive, schema_markup_type, conditional_rules, is_active, updated_at
            ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, NOW())
            `,
            [
              preset.page_path,
              preset.page_type,
              preset.entity_type,
              preset.meta_title,
              preset.meta_description,
              preset.keywords,
              preset.og_title,
              preset.og_description,
              preset.og_image,
              preset.og_url,
              preset.canonical_url,
              preset.robots_directive,
              preset.schema_markup_type,
              JSON.stringify(preset.conditional_rules || [])
            ]
          );
        }
      }
      const seeded = await db.query(`SELECT * FROM seo_meta_tags ORDER BY page_type DESC, page_path ASC`);
      return NextResponse.json({ tags: seeded.rows });
    }

    return NextResponse.json({ tags: res.rows });
  } catch (error: any) {
    console.error("[SEO GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch SEO tags" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const {
      page_path,
      page_type = "static",
      entity_type = "general",
      meta_title,
      meta_description,
      keywords,
      og_title,
      og_description,
      og_image,
      og_url,
      canonical_url,
      robots_directive = "index, follow",
      schema_markup_type = "WebPage",
      conditional_rules = [],
      template_variables = [],
      is_active = true
    } = body;

    if (!page_path || !meta_title) {
      return NextResponse.json({ error: "Page Path and Meta Title are required" }, { status: 400 });
    }

    const keywordsArray = Array.isArray(keywords) 
      ? keywords 
      : typeof keywords === "string" 
        ? keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
        : [];

    const res = await db.query(
      `
      INSERT INTO seo_meta_tags (
        page_path, route_path, page_type, entity_type, meta_title, meta_description, keywords, og_title, og_description, og_image, og_url, canonical_url, robots_directive, schema_markup_type, conditional_rules, template_variables, is_active, updated_at
      ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
      ON CONFLICT (page_path)
      DO UPDATE SET
        page_type = EXCLUDED.page_type,
        entity_type = EXCLUDED.entity_type,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        keywords = EXCLUDED.keywords,
        og_title = EXCLUDED.og_title,
        og_description = EXCLUDED.og_description,
        og_image = EXCLUDED.og_image,
        og_url = EXCLUDED.og_url,
        canonical_url = EXCLUDED.canonical_url,
        robots_directive = EXCLUDED.robots_directive,
        schema_markup_type = EXCLUDED.schema_markup_type,
        conditional_rules = EXCLUDED.conditional_rules,
        template_variables = EXCLUDED.template_variables,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *
      `,
      [
        page_path.trim(),
        page_type,
        entity_type,
        meta_title.trim(),
        meta_description?.trim() || null,
        keywordsArray,
        og_title?.trim() || meta_title.trim(),
        og_description?.trim() || meta_description?.trim() || null,
        og_image?.trim() || null,
        og_url?.trim() || canonical_url?.trim() || null,
        canonical_url?.trim() || null,
        robots_directive || "index, follow",
        schema_markup_type || "WebPage",
        JSON.stringify(conditional_rules || []),
        JSON.stringify(template_variables || []),
        is_active ?? true,
      ]
    );

    return NextResponse.json({ tag: res.rows[0], message: "SEO configuration saved successfully" });
  } catch (error: any) {
    console.error("[SEO POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save SEO meta configuration" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "SEO tag ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM seo_meta_tags WHERE id = $1`, [id]);
    return NextResponse.json({ message: "SEO configuration deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete SEO tag" }, { status: 500 });
  }
}
