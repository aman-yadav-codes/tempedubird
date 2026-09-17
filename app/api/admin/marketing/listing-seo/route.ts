import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS listing_page_seo (
      id SERIAL PRIMARY KEY,
      listing_type VARCHAR(50) DEFAULT 'institutes',
      city VARCHAR(100) NOT NULL,
      area VARCHAR(150) DEFAULT 'all',
      course VARCHAR(150) DEFAULT 'all',
      slug VARCHAR(255),
      page_title VARCHAR(255),
      meta_title VARCHAR(255),
      meta_description TEXT,
      keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
      h1_heading VARCHAR(255),
      subheading TEXT,
      intro_content TEXT,
      bottom_content TEXT,
      quick_highlights JSONB DEFAULT '[]'::jsonb,
      faqs JSONB DEFAULT '[]'::jsonb,
      canonical_url VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_listing_seo_lookup 
      ON listing_page_seo(listing_type, LOWER(city), LOWER(area), LOWER(course));
  `);
}

const DEFAULT_SEEDS = [
  {
    listing_type: "institutes",
    city: "Indore",
    area: "Bhawarkua",
    course: "NEET",
    slug: "institutes/indore/bhawarkua/neet",
    page_title: "Top NEET Coaching Institutes in Bhawarkua, Indore",
    meta_title: "Best NEET Coaching in Bhawarkua, Indore (2026) - Fees & Reviews",
    meta_description: "Compare verified NEET medical coaching centers in Bhawarkua, Indore. Check expert faculty, batch fees, scholarship discounts, and hostel facilities.",
    keywords: ["neet coaching bhawarkua", "best neet institute indore", "medical coaching in bhawarkua", "allen resonance aakash indore"],
    h1_heading: "Best NEET Coaching Institutes in Bhawarkua, Indore",
    subheading: "Explore premier medical entrance training centers, expert biology & physics faculty, and proven selection track records in Indore’s student hub.",
    intro_content: "Bhawarkua is renowned as the coaching capital of Central India. With over 50+ specialized coaching centers, state-of-the-art test series libraries, and dedicated medical mentor cells, aspirants from Madhya Pradesh and neighboring states prepare here for NEET-UG with proven results.",
    bottom_content: "### How to Choose the Best NEET Coaching in Bhawarkua, Indore\n\nWhen shortlisting an institute in the Bhawarkua and Tower Square belt, focus on faculty continuity, batch size (ideally 40-60 students for personalized doubt-clearing), and integrated testing frequency.\n\n#### Fee Structure in Bhawarkua\n- **1-Year Dropper / Repeater Batch**: ₹65,000 - ₹1,20,000\n- **2-Year Foundation (Class 11 & 12)**: ₹1,10,000 - ₹2,10,000\n- **Crash Course & Test Series**: ₹15,000 - ₹35,000\n\n#### Accommodation & Hostel Facilities\nBhawarkua hosts hundreds of student hostels and PGs with mess facilities ranging from ₹5,500 to ₹9,000 per month, within walking distance of top coaching hubs.",
    quick_highlights: ["50+ Verified Centers", "Avg Fees: ₹65k - ₹1.2L", "Hostels Within 500m", "Free Demo Batches Available"],
    faqs: [
      { question: "Which is the best NEET coaching in Bhawarkua, Indore?", answer: "Leading institutes with consistent top AIR ranks include Maa Sharda Institute, Allen Indore, Aakash Institute, and specialized Biology academy batches around Tower Square and Bhawarkua Main Road." },
      { question: "What is the average monthly living cost for students in Bhawarkua?", answer: "Including single or twin-sharing PG accommodation, food/mess, and library fees, students typically spend between ₹6,000 to ₹10,000 per month." },
      { question: "Are scholarships available for NEET coaching in Indore?", answer: "Yes, most major institutes conduct admission-cum-scholarship tests offering up to 90% tuition fee waivers based on performance." }
    ],
    canonical_url: "https://edubird.in/institutes?city=Indore&area=Bhawarkua&course=NEET",
    is_active: true
  },
  {
    listing_type: "institutes",
    city: "Varanasi",
    area: "Lanka",
    course: "IIT-JEE",
    slug: "institutes/varanasi/lanka/iit-jee",
    page_title: "Top IIT-JEE Coaching Centers in Lanka, Varanasi",
    meta_title: "Best IIT-JEE Coaching in Lanka, Varanasi (2026) - EduBird",
    meta_description: "Find top IIT-JEE (Main & Advanced) coaching institutes in Lanka, Varanasi near BHU. Compare faculty, fees, success rates, and mock test centers.",
    keywords: ["iit jee coaching lanka", "best engineering coaching varanasi", "varanasi jee coaching bhu", "jee advanced classes varanasi"],
    h1_heading: "Premier IIT-JEE Coaching Centers in Lanka, Varanasi",
    subheading: "Prepare with top engineering mentors, rigorous test series, and dedicated study libraries near the prestigious BHU campus.",
    intro_content: "Located near Banaras Hindu University (BHU), Lanka is Varanasi’s premier educational corridor. Students gain access to experienced IIT alumni faculties, daily practice problem (DPP) sessions, and competitive peer circles.",
    bottom_content: "### Engineering Entrance Preparation in Lanka, Varanasi\n\nWith BHU IIT right around the corner, Lanka attracts high-caliber engineering mentors and competitive students across Eastern UP and Bihar.\n\n#### Key Preparation Features in Lanka\n- Comprehensive coverage of JEE Main + JEE Advanced syllabi.\n- High-yield problem solving and computer-based test (CBT) mock labs.\n- Dedicated faculty doubt clinics available after lecture hours.",
    quick_highlights: ["Proximity to BHU Campus", "IITian Faculty Mentors", "CBT Mock Exam Labs", "Class 11, 12 & Dropper Batches"],
    faqs: [
      { question: "What are the top IIT-JEE coaching centers in Lanka, Varanasi?", answer: "Reputed centers in Lanka and Durgakund include Origin, JRS Tutorials, Fiitjee Varanasi, and local expert coaching academies with proven records in JEE Advanced." },
      { question: "What is the fee range for 2-year JEE prep in Varanasi?", answer: "The typical fee for a 2-year classroom program ranges between ₹80,000 and ₹1,60,000, with merit scholarships offered based on 10th board percentages." }
    ],
    canonical_url: "https://edubird.in/institutes?city=Varanasi&area=Lanka&course=IIT-JEE",
    is_active: true
  },
  {
    listing_type: "institutes",
    city: "Kota",
    area: "all",
    course: "IIT-JEE",
    slug: "institutes/kota/all/iit-jee",
    page_title: "Best IIT-JEE Coaching Institutes in Kota (Rajasthan)",
    meta_title: "Best IIT-JEE Coaching in Kota (Rajasthan) - EduBird",
    meta_description: "Explore the nation’s top coaching institutes, faculty legends, and classroom programs in Kota, Rajasthan. Compare hostel facilities, batch fees, and admission tests.",
    keywords: ["kota coaching", "iit jee in kota", "best institutes in kota", "kota classroom programs"],
    h1_heading: "Premier IIT-JEE Coaching Institutes in Kota",
    subheading: "Explore the nation’s leading engineering entrance coaching hubs, faculty legends, and immersive study ecosystems in Kota.",
    intro_content: "Kota is globally recognized as India's coaching epicenter for engineering entrance exams. With specialized pedagogy, round-the-clock doubt counters, and national-level test benchmarks, thousands of students crack JEE Advanced every year from Kota.",
    bottom_content: "### Why Prepare for IIT-JEE in Kota?\n\nKota's unique ecosystem combines intensive classroom teaching with comprehensive study material and high-stakes national test series benchmarking.",
    quick_highlights: ["All India Rank 1 Track Record", "100,000+ Annual Aspirants", "Specialized Study Materials", "Round-the-Clock Doubt Desks"],
    faqs: [
      { question: "When is the best time to join coaching in Kota for JEE?", answer: "Most students join right after Class 10 (April-May) for 2-year nurture batches, or immediately after Class 12 board results for repeater batches." }
    ],
    canonical_url: "https://edubird.in/institutes?city=Kota&course=IIT-JEE",
    is_active: true
  }
];

export async function GET(req: Request) {
  try {
    await ensureTable();
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const city = url.searchParams.get("city")?.trim() || "";
    const course = url.searchParams.get("course")?.trim() || "";
    const listingType = url.searchParams.get("listing_type")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "all";

    // Auto-seed if empty
    const countCheck = await db.query("SELECT COUNT(*) as count FROM listing_page_seo");
    if (parseInt(countCheck.rows[0]?.count || "0", 10) === 0) {
      for (const item of DEFAULT_SEEDS) {
        await db.query(`
          INSERT INTO listing_page_seo (
            listing_type, city, area, course, slug, page_title, meta_title,
            meta_description, keywords, h1_heading, subheading, intro_content,
            bottom_content, quick_highlights, faqs, canonical_url, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
          item.listing_type, item.city, item.area, item.course, item.slug,
          item.page_title, item.meta_title, item.meta_description, item.keywords,
          item.h1_heading, item.subheading, item.intro_content, item.bottom_content,
          JSON.stringify(item.quick_highlights), JSON.stringify(item.faqs),
          item.canonical_url, item.is_active
        ]);
      }
    }

    let query = "SELECT * FROM listing_page_seo WHERE 1=1";
    const params: any[] = [];

    if (listingType && listingType !== "all") {
      params.push(listingType);
      query += ` AND listing_type = $${params.length}`;
    }

    if (city && city !== "all") {
      params.push(city);
      query += ` AND LOWER(city) = LOWER($${params.length})`;
    }

    if (course && course !== "all") {
      params.push(course);
      query += ` AND LOWER(course) = LOWER($${params.length})`;
    }

    if (status === "active") {
      query += " AND is_active = true";
    } else if (status === "inactive") {
      query += " AND is_active = false";
    }

    if (search) {
      params.push(`%${search}%`);
      const pIdx = params.length;
      query += ` AND (city ILIKE $${pIdx} OR area ILIKE $${pIdx} OR course ILIKE $${pIdx} OR h1_heading ILIKE $${pIdx} OR meta_title ILIKE $${pIdx})`;
    }

    query += " ORDER BY updated_at DESC, id DESC";

    const result = await db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error("[LISTING_SEO_ADMIN_GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTable();
    const body = await req.json();

    const {
      listing_type = "institutes",
      city,
      area = "all",
      course = "all",
      slug,
      page_title,
      meta_title,
      meta_description,
      keywords = [],
      h1_heading,
      subheading,
      intro_content,
      bottom_content,
      quick_highlights = [],
      faqs = [],
      canonical_url,
      is_active = true
    } = body;

    if (!city) {
      return NextResponse.json({ success: false, error: "City is required" }, { status: 400 });
    }

    const calculatedSlug = slug || `${listing_type}/${city.toLowerCase().replace(/\s+/g, '-')}/${(area || 'all').toLowerCase().replace(/\s+/g, '-')}/${(course || 'all').toLowerCase().replace(/\s+/g, '-')}`;

    const insertRes = await db.query(`
      INSERT INTO listing_page_seo (
        listing_type, city, area, course, slug, page_title, meta_title,
        meta_description, keywords, h1_heading, subheading, intro_content,
        bottom_content, quick_highlights, faqs, canonical_url, is_active, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      RETURNING *
    `, [
      listing_type,
      city,
      area || "all",
      course || "all",
      calculatedSlug,
      page_title || h1_heading || `${course !== 'all' ? course : ''} in ${area !== 'all' ? area + ', ' : ''}${city}`,
      meta_title || h1_heading,
      meta_description,
      Array.isArray(keywords) ? keywords : typeof keywords === 'string' ? keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : [],
      h1_heading,
      subheading,
      intro_content,
      bottom_content,
      JSON.stringify(quick_highlights),
      JSON.stringify(faqs),
      canonical_url,
      is_active !== undefined ? is_active : true
    ]);

    return NextResponse.json({ success: true, data: insertRes.rows[0] });
  } catch (error: any) {
    console.error("[LISTING_SEO_ADMIN_POST] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureTable();
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    const {
      listing_type,
      city,
      area,
      course,
      slug,
      page_title,
      meta_title,
      meta_description,
      keywords,
      h1_heading,
      subheading,
      intro_content,
      bottom_content,
      quick_highlights,
      faqs,
      canonical_url,
      is_active
    } = body;

    const updateRes = await db.query(`
      UPDATE listing_page_seo
      SET
        listing_type = COALESCE($1, listing_type),
        city = COALESCE($2, city),
        area = COALESCE($3, area),
        course = COALESCE($4, course),
        slug = COALESCE($5, slug),
        page_title = COALESCE($6, page_title),
        meta_title = COALESCE($7, meta_title),
        meta_description = COALESCE($8, meta_description),
        keywords = COALESCE($9, keywords),
        h1_heading = COALESCE($10, h1_heading),
        subheading = COALESCE($11, subheading),
        intro_content = COALESCE($12, intro_content),
        bottom_content = COALESCE($13, bottom_content),
        quick_highlights = COALESCE($14, quick_highlights),
        faqs = COALESCE($15, faqs),
        canonical_url = COALESCE($16, canonical_url),
        is_active = COALESCE($17, is_active),
        updated_at = NOW()
      WHERE id = $18
      RETURNING *
    `, [
      listing_type,
      city,
      area,
      course,
      slug,
      page_title,
      meta_title,
      meta_description,
      Array.isArray(keywords) ? keywords : undefined,
      h1_heading,
      subheading,
      intro_content,
      bottom_content,
      quick_highlights ? JSON.stringify(quick_highlights) : undefined,
      faqs ? JSON.stringify(faqs) : undefined,
      canonical_url,
      is_active,
      id
    ]);

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updateRes.rows[0] });
  } catch (error: any) {
    console.error("[LISTING_SEO_ADMIN_PUT] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureTable();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    await db.query("DELETE FROM listing_page_seo WHERE id = $1", [id]);
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("[LISTING_SEO_ADMIN_DELETE] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
