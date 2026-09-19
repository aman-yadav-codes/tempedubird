import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

const DEFAULT_PRESET_TEMPLATES = [
  {
    page_path: "/business/[slug]",
    template_name: "Business Detail",
    page_type: "dynamic_template",
    entity_type: "institution",
    meta_title: "{{institution_name}} - Verified Campus, Courses & Reviews | {{city}}",
    meta_description: "Explore {{institution_name}} located in {{area}}, {{city}}, {{state}}. View curriculum, faculty credentials, facilities, fees, and student admissions.",
    keywords: ["{{institution_name}}", "verified institute {{city}}", "coaching in {{area}}", "campus admissions"],
    og_title: "{{institution_name}} - Admissions Open | {{city}}",
    og_description: "Connect with {{institution_name}} in {{city}}. Check courses, faculty ratings, and enroll online.",
    og_image: "{{institution_banner}}",
    og_url: "https://edubird.net/business/{{slug}}",
    canonical_url: "https://edubird.net/business/{{slug}}",
    robots_directive: "index, follow",
    schema_markup_type: "EducationalOrganization",
    conditional_rules: [
      { condition: "city_present", action: "append_title", value: "in {{city}}, {{state}}" }
    ]
  },
  {
    page_path: "/services/[category]",
    template_name: "Category",
    page_type: "dynamic_template",
    entity_type: "category",
    meta_title: "Top {{category}} Courses, Institutes & Training Centers | {{site_name}}",
    meta_description: "Compare the highest rated {{category}} programs across {{city}}. Verified student reviews, fee breakdowns, and certified batches.",
    keywords: ["{{category}}", "{{category}} courses {{city}}", "best {{category}} coaching", "certification in {{category}}"],
    og_title: "Explore Premier {{category}} Programs | {{site_name}}",
    og_description: "Find top-rated {{category}} institutes, flexible batches, and syllabus details.",
    og_image: "/images/og-category.jpg",
    og_url: "https://edubird.net/services/{{category}}",
    canonical_url: "https://edubird.net/services/{{category}}",
    robots_directive: "index, follow",
    schema_markup_type: "CollectionPage"
  },
  {
    page_path: "/courses/[slug]",
    template_name: "Course Detail",
    page_type: "dynamic_template",
    entity_type: "course",
    meta_title: "{{course_title}} Course Syllabus, Fees & Admissions | {{institution_name}}",
    meta_description: "Enroll in {{course_title}} by {{institution_name}} in {{city}}, {{area}}. Complete curriculum, batches, faculty credentials, and online enrollment.",
    keywords: ["{{course_title}}", "{{course_title}} fees", "{{institution_name}} {{course_title}}", "coaching in {{city}}"],
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
    page_path: "/",
    template_name: "Home Page",
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
    schema_markup_type: "EducationalOrganization"
  },
  {
    page_path: "/blog/[slug]",
    template_name: "Blog & Article",
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
    template_name: "Services & Vendors",
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
  },
  {
    page_path: "/location/[city]",
    template_name: "Location Hub",
    page_type: "dynamic_template",
    entity_type: "location",
    meta_title: "Best Institutes, Coaching & Tutors in {{city}}, {{state}} | {{site_name}}",
    meta_description: "Explore accredited coaching centers, competitive exam academies, and top faculty in {{city}}. Compare fees, batches, and locations across {{area}}.",
    keywords: ["coaching in {{city}}", "institutes in {{city}}", "tutors {{city}}", "top classes {{city}}"],
    og_title: "Find Top Coaching & Classes in {{city}}",
    og_description: "Browse verified education institutes and learning centers across {{city}}.",
    og_image: "/images/og-location.jpg",
    og_url: "https://edubird.net/location/{{city}}",
    canonical_url: "https://edubird.net/location/{{city}}",
    robots_directive: "index, follow",
    schema_markup_type: "Place"
  }
];

async function ensureSeoTables() {
  await ensureFeatureSchema();
  await db.query(`
    CREATE TABLE IF NOT EXISTS seo_global_settings (
      id INT PRIMARY KEY DEFAULT 1,
      site_name VARCHAR(255) DEFAULT 'EduBird',
      title_suffix VARCHAR(255) DEFAULT ' | EduBird',
      default_meta_description TEXT DEFAULT 'Manage default SEO templates, custom page SEO settings, and global defaults for public EduBird pages.',
      default_og_image TEXT DEFAULT '/images/og-home.jpg',
      default_robots_index VARCHAR(20) DEFAULT 'Index',
      default_robots_follow VARCHAR(20) DEFAULT 'Follow',
      google_search_console_tag VARCHAR(255) DEFAULT '',
      bing_webmaster_tag VARCHAR(255) DEFAULT '',
      google_analytics_id VARCHAR(100) DEFAULT '',
      gtm_container_id VARCHAR(100) DEFAULT '',
      organization_schema JSONB DEFAULT '{"name":"EduBird","logo":"/logo.png"}'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    INSERT INTO seo_global_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
  `);

  // Ensure template_name column exists on seo_meta_tags
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seo_meta_tags' AND column_name = 'template_name'
      ) THEN
        ALTER TABLE seo_meta_tags ADD COLUMN template_name VARCHAR(255);
      END IF;
    END $$;
  `);
}

export async function GET(req: Request) {
  try {
    await ensureSeoTables();
    const url = new URL(req.url);
    const path = url.searchParams.get("path")?.trim();
    const search = url.searchParams.get("search")?.trim();
    const pageType = url.searchParams.get("page_type")?.trim();

    // Auto seed templates if fewer than 7 exist
    const currentCountRes = await db.query(`SELECT COUNT(*) as count FROM seo_meta_tags`);
    const currentCount = parseInt(currentCountRes.rows[0]?.count || "0", 10);

    if (currentCount < DEFAULT_PRESET_TEMPLATES.length && !search && !path) {
      for (const preset of DEFAULT_PRESET_TEMPLATES) {
        const check = await db.query(`SELECT id FROM seo_meta_tags WHERE page_path = $1 OR route_path = $1 LIMIT 1`, [preset.page_path]);
        if (check.rows.length === 0) {
          await db.query(
            `
            INSERT INTO seo_meta_tags (
              page_path, route_path, template_name, page_type, entity_type, meta_title, meta_description, keywords,
              og_title, og_description, og_image, og_url, canonical_url, robots_directive, schema_markup_type, conditional_rules, is_active, updated_at
            ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, NOW())
            ON CONFLICT (page_path) DO NOTHING
            `,
            [
              preset.page_path,
              preset.template_name,
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
        } else {
          // Update template_name if null
          await db.query(`UPDATE seo_meta_tags SET template_name = $1 WHERE page_path = $2 AND template_name IS NULL`, [preset.template_name, preset.page_path]);
        }
      }
    }

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
      query += ` AND (page_path ILIKE $${params.length} OR meta_title ILIKE $${params.length} OR meta_description ILIKE $${params.length} OR template_name ILIKE $${params.length})`;
    }

    query += ` ORDER BY page_type DESC, id ASC`;

    const [tagsRes, globalRes] = await Promise.all([
      db.query(query, params),
      db.query(`SELECT * FROM seo_global_settings WHERE id = 1 LIMIT 1`)
    ]);

    const globalSettings = globalRes.rows[0] || {
      site_name: "EduBird",
      title_suffix: " | EduBird",
      default_meta_description: "Manage default SEO templates, custom page SEO settings, and global defaults for public EduBird pages.",
      default_og_image: "/images/og-home.jpg",
      default_robots_index: "Index",
      default_robots_follow: "Follow",
    };

    return NextResponse.json({ 
      tags: tagsRes.rows,
      global_settings: globalSettings,
      counts: {
        total: tagsRes.rows.length,
        active: tagsRes.rows.filter(t => t.is_active).length,
        templates: tagsRes.rows.filter(t => t.page_type === "dynamic_template" || t.page_path.includes("[")).length,
        static_pages: tagsRes.rows.filter(t => t.page_type === "static" && !t.page_path.includes("[")).length,
      }
    });
  } catch (error: any) {
    console.error("[SEO GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch SEO tags" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSeoTables();
    const body = await req.json();

    // Check if saving global settings
    if (body.action === "save_global_settings") {
      const {
        site_name = "EduBird",
        title_suffix = " | EduBird",
        default_meta_description = "",
        default_og_image = "",
        default_robots_index = "Index",
        default_robots_follow = "Follow",
        google_search_console_tag = "",
        bing_webmaster_tag = "",
        google_analytics_id = "",
        gtm_container_id = "",
        organization_schema = {}
      } = body;

      const updated = await db.query(
        `
        UPDATE seo_global_settings SET
          site_name = $1,
          title_suffix = $2,
          default_meta_description = $3,
          default_og_image = $4,
          default_robots_index = $5,
          default_robots_follow = $6,
          google_search_console_tag = $7,
          bing_webmaster_tag = $8,
          google_analytics_id = $9,
          gtm_container_id = $10,
          organization_schema = $11,
          updated_at = NOW()
        WHERE id = 1
        RETURNING *
        `,
        [
          site_name,
          title_suffix,
          default_meta_description,
          default_og_image,
          default_robots_index,
          default_robots_follow,
          google_search_console_tag,
          bing_webmaster_tag,
          google_analytics_id,
          gtm_container_id,
          JSON.stringify(organization_schema)
        ]
      );

      return NextResponse.json({ success: true, global_settings: updated.rows[0], message: "Global SEO settings updated successfully" });
    }

    const {
      page_path,
      template_name,
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

    const computedTemplateName = template_name || (
      page_path === "/business/[slug]" ? "Business Detail" :
      page_path === "/services/[category]" ? "Category" :
      page_path === "/courses/[slug]" ? "Course Detail" :
      page_path === "/" ? "Home Page" :
      page_path === "/blog/[slug]" ? "Blog & Article" :
      page_path === "/vendors" ? "Services & Vendors" :
      page_path === "/location/[city]" ? "Location Hub" :
      page_path.replace(/^\//, "").replace(/\//g, " ").replace(/\[.*?\]/g, "Detail") || "Custom Page"
    );

    const res = await db.query(
      `
      INSERT INTO seo_meta_tags (
        page_path, route_path, template_name, page_type, entity_type, meta_title, meta_description, keywords, og_title, og_description, og_image, og_url, canonical_url, robots_directive, schema_markup_type, conditional_rules, template_variables, is_active, updated_at
      ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      ON CONFLICT (page_path)
      DO UPDATE SET
        template_name = COALESCE(EXCLUDED.template_name, seo_meta_tags.template_name),
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
        computedTemplateName,
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

export async function PATCH(req: Request) {
  try {
    await ensureSeoTables();
    const body = await req.json();
    const { id, is_active, toggle_index, toggle_follow, robots_directive } = body;

    if (!id) {
      return NextResponse.json({ error: "SEO tag ID is required" }, { status: 400 });
    }

    let updates: string[] = [];
    let params: any[] = [id];

    if (typeof is_active === "boolean") {
      params.push(is_active);
      updates.push(`is_active = $${params.length}`);
    }

    if (typeof robots_directive === "string") {
      params.push(robots_directive);
      updates.push(`robots_directive = $${params.length}`);
    } else if (toggle_index || toggle_follow) {
      const curr = await db.query(`SELECT robots_directive FROM seo_meta_tags WHERE id = $1`, [id]);
      if (curr.rows.length > 0) {
        let directive = curr.rows[0].robots_directive || "index, follow";
        let isIndex = directive.toLowerCase().includes("index") && !directive.toLowerCase().includes("noindex");
        let isFollow = directive.toLowerCase().includes("follow") && !directive.toLowerCase().includes("nofollow");

        if (toggle_index) isIndex = !isIndex;
        if (toggle_follow) isFollow = !isFollow;

        const newDirective = `${isIndex ? "index" : "noindex"}, ${isFollow ? "follow" : "nofollow"}`;
        params.push(newDirective);
        updates.push(`robots_directive = $${params.length}`);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    const query = `UPDATE seo_meta_tags SET ${updates.join(", ")} WHERE id = $1 RETURNING *`;
    const res = await db.query(query, params);

    return NextResponse.json({ success: true, tag: res.rows[0], message: "SEO configuration updated" });
  } catch (error: any) {
    console.error("[SEO PATCH] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update SEO tag" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureSeoTables();
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
