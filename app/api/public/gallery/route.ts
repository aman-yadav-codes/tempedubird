import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

const DEFAULT_CATEGORIES = [
  { key: "all", label: "All Photos" },
  { key: "campus", label: "Campus & Architecture" },
  { key: "labs", label: "Laboratories & Tech" },
  { key: "library", label: "Central Library" },
  { key: "hostels", label: "Hostels & Living" },
  { key: "classrooms", label: "Smart Classrooms" },
  { key: "events", label: "Events & Fests" },
];

let schemaChecked = false;
async function ensureGallerySchema() {
  if (schemaChecked) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS institution_gallery_categories (
        id SERIAL PRIMARY KEY,
        institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
        name VARCHAR(120) NOT NULL,
        slug VARCHAR(150) NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE institution_media ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES institution_gallery_categories(id) ON DELETE SET NULL;
      ALTER TABLE institution_media ADD COLUMN IF NOT EXISTS category VARCHAR(120);
      ALTER TABLE institution_media ADD COLUMN IF NOT EXISTS description TEXT;
    `);
    schemaChecked = true;
  } catch (err) {
    console.error("Error setting up gallery schema:", err);
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureGallerySchema();
    const { searchParams } = new URL(req.url);
    const institutionIdParam = searchParams.get("institutionId");
    const institutionId = institutionIdParam ? Number(institutionIdParam) : null;
    const category = searchParams.get("category")?.trim().toLowerCase() || "all";

    const params: unknown[] = [];
    const whereConditions = [
      "COALESCE(m.is_deleted, FALSE) = FALSE",
      "m.url IS NOT NULL",
      "m.url <> ''",
    ];

    if (institutionId && Number.isInteger(institutionId) && institutionId > 0) {
      params.push(institutionId);
      whereConditions.push(`m.institution_id = $${params.length}`);
    }

    const whereClause = whereConditions.join(" AND ");

    // Fetch media with categories
    const query = `
      SELECT
        m.id,
        m.institution_id,
        COALESCE(p.name, 'Educational Institution') AS institution_name,
        COALESCE(gc.slug, m.category, m.media_type, 'campus') AS category_slug,
        COALESCE(gc.name, m.category, 'Campus & Architecture') AS category_name,
        m.media_type,
        m.url,
        COALESCE(m.title, 'Campus Photo') AS title,
        m.description,
        m.sort_order,
        m.created_at
      FROM institution_media m
      LEFT JOIN institution_profiles p ON p.id = m.institution_id
      LEFT JOIN institution_gallery_categories gc ON gc.id = m.category_id
      WHERE ${whereClause}
      ORDER BY m.sort_order ASC, m.id DESC
    `;

    const res = await db.query(query, params);
    let items = res.rows || [];

    // Fetch custom categories for the institution
    let categories = [...DEFAULT_CATEGORIES];
    if (institutionId && Number.isInteger(institutionId) && institutionId > 0) {
      try {
        const catRes = await db.query(
          `SELECT id, name, slug FROM institution_gallery_categories WHERE institution_id = $1 AND COALESCE(is_active, TRUE) = TRUE ORDER BY sort_order ASC, name ASC`,
          [institutionId]
        );
        if (catRes.rows.length > 0) {
          const customCats = catRes.rows.map((c) => ({
            key: c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            label: c.name,
          }));
          // Merge unique categories with 'all' at the beginning
          const seen = new Set(["all"]);
          categories = [{ key: "all", label: "All Photos" }];
          for (const c of customCats) {
            if (!seen.has(c.key)) {
              seen.add(c.key);
              categories.push(c);
            }
          }
          for (const def of DEFAULT_CATEGORIES.slice(1)) {
            if (!seen.has(def.key)) {
              seen.add(def.key);
              categories.push(def);
            }
          }
        }
      } catch (catErr) {
        console.error("Error fetching gallery categories:", catErr);
      }
    }

    // Fallback demo gallery items if table is empty
    if (items.length === 0) {
      items = [
        {
          id: 1,
          institution_id: institutionId || 1,
          institution_name: "Apex Institute of Technology",
          media_type: "campus",
          category_slug: "campus",
          category_name: "Campus & Architecture",
          url: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80",
          title: "Central Administrative & Academic Campus Building",
          description: "25-acre sprawling Wi-Fi enabled green academic campus.",
        },
        {
          id: 2,
          institution_id: institutionId || 1,
          institution_name: "Apex Institute of Technology",
          media_type: "library",
          category_slug: "library",
          category_name: "Central Library",
          url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
          title: "Central Digital Knowledge Library",
          description: "Over 35,000 physical volumes and 24/7 e-resource stations.",
        },
        {
          id: 3,
          institution_id: institutionId || 1,
          institution_name: "Apex Institute of Technology",
          media_type: "labs",
          category_slug: "labs",
          category_name: "Laboratories & Tech",
          url: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=80",
          title: "High-Performance Robotics & AI Research Lab",
          description: "GPU-accelerated computing workstations and automation rigs.",
        },
        {
          id: 4,
          institution_id: institutionId || 1,
          institution_name: "Apex Institute of Technology",
          media_type: "classrooms",
          category_slug: "classrooms",
          category_name: "Smart Classrooms",
          url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80",
          title: "Interactive Smart Lecture Theatres",
          description: "Acoustically treated amphitheatres with 4K digital projection.",
        },
        {
          id: 5,
          institution_id: institutionId || 1,
          institution_name: "Apex Institute of Technology",
          media_type: "hostels",
          category_slug: "hostels",
          category_name: "Hostels & Living",
          url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80",
          title: "Air-Conditioned Student Residences & Hostels",
          description: "Comfortable single and sharing rooms with attached washrooms.",
        },
        {
          id: 6,
          institution_id: institutionId || 1,
          institution_name: "Apex Institute of Technology",
          media_type: "events",
          category_slug: "events",
          category_name: "Events & Fests",
          url: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=80",
          title: "Annual Convocation & Technical Hackathon",
          description: "Celebrating student innovation, research awards, and graduation.",
        },
      ];
    }

    return NextResponse.json({
      success: true,
      data: items,
      categories,
      total: items.length,
    });
  } catch (err: any) {
    console.error("GET /api/public/gallery error:", err);
    return NextResponse.json({ error: "Failed to fetch gallery media" }, { status: 500 });
  }
}
