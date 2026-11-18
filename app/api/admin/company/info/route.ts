import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { getFrontendConfig } from "@/lib/config/frontend-config";

let companyInfoSchemaReady = false;
let companyInfoSchemaPromise: Promise<void> | null = null;

async function ensureCompanyInfoSchema() {
  if (companyInfoSchemaReady) return;
  if (companyInfoSchemaPromise) return companyInfoSchemaPromise;

  companyInfoSchemaPromise = (async () => {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS platform_company_info (
          id SERIAL PRIMARY KEY,
          company_name VARCHAR(255) NOT NULL DEFAULT 'EduBird Technologies Pvt. Ltd.',
          brand_name VARCHAR(150) NOT NULL DEFAULT 'EduBird Platform',
          tagline VARCHAR(255) DEFAULT 'Next-Gen Education & Institutional Platform',
          logo_url TEXT DEFAULT '/favicon.ico',
          dark_logo_url TEXT,
          favicon_url TEXT DEFAULT '/favicon.ico',
          about TEXT DEFAULT 'EduBird is a unified education management platform providing state-of-the-art tools for institutions, staff, educators, and students.',
          registration_no VARCHAR(100) DEFAULT 'U72900DL2026PTC123456',
          cin_number VARCHAR(100) DEFAULT 'U72900DL2026PTC123456',
          gstin VARCHAR(50) DEFAULT '07AAAAA0000A1Z5',
          certified_or_affiliated_with TEXT DEFAULT 'ISO 9001:2015 Certified, UGC Recognized Platform Partner',
          support_email VARCHAR(255) DEFAULT 'support@edubird.com',
          phone VARCHAR(50) DEFAULT '+91 98765 43210',
          toll_free VARCHAR(50) DEFAULT '1800-123-EDUBIRD',
          website_url VARCHAR(255) DEFAULT 'https://edubird.com',
          headquarters_address TEXT DEFAULT '124, Connaught Place, Central Delhi',
          city VARCHAR(100) DEFAULT 'New Delhi',
          state VARCHAR(100) DEFAULT 'Delhi',
          pincode VARCHAR(20) DEFAULT '110001',
          working_hours VARCHAR(150) DEFAULT 'Monday - Saturday: 9:00 AM - 6:00 PM IST',
          social_links JSONB DEFAULT '{}'::jsonb,
          updated_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()),
          updated_by INTEGER
        );

        INSERT INTO platform_company_info (id, company_name, brand_name, tagline, logo_url, support_email, phone, city, state, pincode)
        VALUES (1, 'EduBird Technologies Pvt. Ltd.', 'EduBird Platform', 'Next-Gen Education & Institutional Platform', '/favicon.ico', 'support@edubird.com', '+91 98765 43210', 'New Delhi', 'Delhi', '110001')
        ON CONFLICT (id) DO NOTHING;

        SELECT setval(
          pg_get_serial_sequence('platform_company_info', 'id'),
          GREATEST(COALESCE((SELECT MAX(id) FROM platform_company_info), 1), 1),
          true
        );

        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS certified_or_affiliated_with TEXT;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS cin_number VARCHAR(100);
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS business_id INTEGER;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS institution_id INTEGER;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS listing_type VARCHAR(50) DEFAULT 'business';
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS category_id INTEGER;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS subcategory_id INTEGER;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS subcategory_ids INTEGER[];
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS business_type VARCHAR(255);
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS experience_years INTEGER;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS skills TEXT;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS qualifications TEXT;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS banner_url TEXT;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS gallery_images TEXT[];
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS founder_name VARCHAR(255);
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS founder_title VARCHAR(255);
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS founder_image_url TEXT;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS founder_about TEXT;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS mission TEXT;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS vision TEXT;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS goal TEXT;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS established_year INTEGER;
        ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS opening_hours JSONB;
        ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS subcategory_ids INTEGER[];
        ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS subcategory_ids INTEGER[];
        ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS gallery_images TEXT[];
        CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_company_info_business_id ON platform_company_info(business_id) WHERE business_id IS NOT NULL;

        ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS state VARCHAR(100);
        ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
        ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS branch_type VARCHAR(50) DEFAULT 'Branch Office';
        ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS is_headquarters BOOLEAN DEFAULT FALSE;
        ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS business_id INTEGER;
        ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS institution_id INTEGER;
        CREATE INDEX IF NOT EXISTS idx_platform_branches_business_id ON platform_branches(business_id);
      `);
      companyInfoSchemaReady = true;
    } catch (err: any) {
      console.warn("[ensureCompanyInfoSchema] init:", err?.message || err);
      companyInfoSchemaReady = true;
    } finally {
      companyInfoSchemaPromise = null;
    }
  })();

  return companyInfoSchemaPromise;
}

async function resolveActiveBusinessId(req: Request, user?: any, body?: any): Promise<number | null> {
  const url = new URL(req.url);
  const qBiz = url.searchParams.get("businessId") || url.searchParams.get("business_id");
  if (qBiz && /^\d+$/.test(qBiz)) {
    return Number(qBiz);
  }
  const qInst = url.searchParams.get("institutionId") || url.searchParams.get("institution_id");
  if (qInst && /^\d+$/.test(qInst)) {
    return Number(qInst);
  }
  const headerBiz = req.headers.get("x-business-id");
  if (headerBiz && /^\d+$/.test(headerBiz)) {
    return Number(headerBiz);
  }
  const headerInst = req.headers.get("x-institution-id");
  if (headerInst && /^\d+$/.test(headerInst)) {
    return Number(headerInst);
  }
  if (body?.business_id && !isNaN(Number(body.business_id))) {
    return Number(body.business_id);
  }
  if (body?.institution_id && !isNaN(Number(body.institution_id))) {
    return Number(body.institution_id);
  }
  const config = getFrontendConfig();
  if (config.mode === "business" && config.businessId) {
    return config.businessId;
  }
  if (user?.id) {
    const userBiz = await db.query(
      `SELECT id FROM business_profiles WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [user.id]
    );
    if (userBiz.rows.length > 0) return userBiz.rows[0].id;
    const instBiz = await db.query(
      `SELECT COALESCE(bp.id, ip.id) as resolved_id FROM institution_memberships im
       JOIN institution_profiles ip ON ip.id = im.institution_id
       LEFT JOIN business_profiles bp ON bp.institution_profile_id = ip.id
       WHERE im.user_id = $1 AND im.is_active = TRUE
       LIMIT 1`,
      [user.id]
    );
    if (instBiz.rows.length > 0) return instBiz.rows[0].resolved_id;
  }

  const pciFirst = await db.query(`SELECT business_id FROM platform_company_info WHERE business_id IS NOT NULL ORDER BY id ASC LIMIT 1`);
  if (pciFirst.rows.length > 0 && pciFirst.rows[0].business_id) {
    return pciFirst.rows[0].business_id;
  }
  const bpFirst = await db.query(`SELECT id FROM business_profiles ORDER BY id ASC LIMIT 1`);
  if (bpFirst.rows.length > 0) return bpFirst.rows[0].id;

  return null;
}

export async function GET(req: Request) {
  try {
    await ensureCompanyInfoSchema();
    const url = new URL(req.url);
    const parentIdParam = url.searchParams.get("category_id") || url.searchParams.get("parent_id");
    if (url.searchParams.get("action") === "subcategories" || (parentIdParam && url.searchParams.get("action") !== "info")) {
      const parentId = Number(parentIdParam);
      if (parentId) {
        const parentRes = await db.query(`SELECT category_type FROM categories WHERE id = $1 LIMIT 1`, [parentId]);
        const pType = parentRes.rows[0]?.category_type;
        const subRes = await db.query(
          `SELECT id, name, slug, parent_id, depth, category_type
           FROM categories
           WHERE (parent_id = $1 OR business_category_id = $1)
             AND ($2::text IS NULL OR category_type = $2::text)
             AND COALESCE(is_deleted, false) = false
             AND is_active = true
           ORDER BY name ASC`,
          [parentId, pType || null]
        );
        return NextResponse.json({ subcategories: subRes.rows, data: subRes.rows });
      }
      return NextResponse.json({ subcategories: [], data: [] });
    }

    const user = await getAuthenticatedUser(req).catch(() => null);
    const activeBizId = await resolveActiveBusinessId(req, user);

    const [bizCatsRes, profCatsRes] = await Promise.all([
      db.query(
        `SELECT id, name, slug, parent_id, depth, category_type
         FROM categories
         WHERE category_type = 'business' AND (parent_id IS NULL OR depth = 1)
           AND COALESCE(is_deleted, false) = false
           AND is_active = true
         ORDER BY name ASC`
      ),
      db.query(
        `SELECT id, name, slug, parent_id, depth, category_type
         FROM categories
         WHERE category_type = 'professional' AND (parent_id IS NULL OR depth = 1)
           AND COALESCE(is_deleted, false) = false
           AND is_active = true
         ORDER BY name ASC`
      ),
    ]);

    let row = null;
    if (activeBizId) {
      const res = await db.query(
        `SELECT * FROM platform_company_info
         WHERE business_id = $1
            OR institution_id = $1
            OR institution_id IN (SELECT institution_profile_id FROM business_profiles WHERE id = $1)
            OR business_id IN (SELECT id FROM business_profiles WHERE institution_profile_id = $1)
         ORDER BY (business_id = $1) DESC LIMIT 1`,
        [activeBizId]
      );
      if (res.rows.length > 0) {
        row = res.rows[0];
      } else {
        // Auto-seed from business_profiles or institution_profiles
        const bpRes = await db.query(
          `SELECT * FROM business_profiles WHERE id = $1 LIMIT 1`,
          [activeBizId]
        );
        if (bpRes.rows.length > 0) {
          const b = bpRes.rows[0];
          await db.query(`SELECT setval(pg_get_serial_sequence('platform_company_info', 'id'), COALESCE((SELECT MAX(id) FROM platform_company_info), 1), true)`);
          const inserted = await db.query(
            `INSERT INTO platform_company_info (
              company_name, brand_name, tagline, logo_url, favicon_url, about,
              support_email, phone, website_url, headquarters_address, city, state, pincode,
              listing_type, category_id, subcategory_id, business_type,
              business_id, institution_id, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
            ON CONFLICT (business_id) WHERE business_id IS NOT NULL DO NOTHING
            RETURNING *`,
            [
              b.name,
              b.name,
              b.about ? b.about.slice(0, 100) : "",
              b.logo_url || "/favicon.ico",
              "/favicon.ico",
              b.about || "",
              b.email || "",
              b.phone || "",
              b.website || null,
              b.address || "",
              b.city || "",
              b.state || "",
              b.postal_code || "",
              "business",
              b.category_id || null,
              b.subcategory_id || null,
              b.business_type || null,
              b.id,
              b.institution_profile_id || null,
            ]
          );
          row = inserted.rows[0];
        } else {
          // Check institution_profiles
          const ipRes = await db.query(
            `SELECT ip.*,
                    ib.address as branch_address, ib.city as branch_city, ib.state as branch_state, ib.pincode as branch_pincode,
                    ib.phones, ib.emails
             FROM institution_profiles ip
             LEFT JOIN institution_branches ib ON ib.institution_id = ip.id AND ib.is_primary = TRUE
             WHERE ip.id = $1 OR ip.id IN (SELECT institution_profile_id FROM business_profiles WHERE id = $1)
             LIMIT 1`,
            [activeBizId]
          );
          if (ipRes.rows.length > 0) {
            const ip = ipRes.rows[0];
            const pPhone = ip.phone || ip.phones?.[0]?.phone || "";
            const pEmail = ip.email || ip.emails?.[0]?.email || "";
            const pAddr = ip.branch_address || "";
            const pCity = ip.branch_city || "";
            const pState = ip.branch_state || "";
            const pPin = ip.branch_pincode || "";

            await db.query(`SELECT setval(pg_get_serial_sequence('platform_company_info', 'id'), COALESCE((SELECT MAX(id) FROM platform_company_info), 1), true)`);
            const inserted = await db.query(
              `INSERT INTO platform_company_info (
                company_name, brand_name, tagline, logo_url, favicon_url, about,
                support_email, phone, website_url, headquarters_address, city, state, pincode,
                listing_type, category_id, subcategory_id, business_type,
                business_id, institution_id, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
              ON CONFLICT (business_id) WHERE business_id IS NOT NULL DO NOTHING
              RETURNING *`,
              [
                ip.name,
                ip.name,
                ip.about ? ip.about.slice(0, 100) : "Next-Gen Institutional Platform",
                ip.logo_url || "/favicon.ico",
                "/favicon.ico",
                ip.about || "",
                pEmail,
                pPhone,
                ip.website || null,
                pAddr,
                pCity,
                pState,
                pPin,
                "business",
                null,
                null,
                null,
                activeBizId,
                ip.id,
              ]
            );
            row = inserted.rows[0];
          }
        }
      }
    }

    if (!row) {
      const res = await db.query(
        `SELECT * FROM platform_company_info WHERE business_id IS NULL ORDER BY id ASC LIMIT 1`
      );
      row = res.rows[0];
    }

    if (!row) {
      const resAny = await db.query(
        `SELECT * FROM platform_company_info ORDER BY id ASC LIMIT 1`
      );
      row = resAny.rows[0];
    }

    // Comprehensive fallback sync from institution_profiles if founder / mission / vision / etc. are null or empty
    const targetInstId = row?.institution_id || row?.business_id || activeBizId;
    if (targetInstId || row?.brand_name || row?.company_name) {
      try {
        const ipQuery = await db.query(
          `SELECT * FROM institution_profiles
           WHERE (id = $1 OR id IN (SELECT institution_profile_id FROM business_profiles WHERE id = $1) OR LOWER(TRIM(name)) = LOWER(TRIM($2)))
           ORDER BY (founder_name IS NOT NULL) DESC
           LIMIT 1`,
          [targetInstId || 0, row?.brand_name || row?.company_name || ""]
        );
        if (ipQuery.rows.length > 0) {
          const ip = ipQuery.rows[0];
          if (row) {
            row.founder_name = row.founder_name || ip.founder_name || "";
            row.founder_title = row.founder_title || ip.founder_title || "";
            row.founder_image_url = row.founder_image_url || ip.founder_image_url || "";
            row.founder_about = row.founder_about || ip.founder_about || "";
            row.mission = row.mission || ip.mission || "";
            row.vision = row.vision || ip.vision || "";
            row.goal = row.goal || ip.goal || "";
            row.about = row.about || ip.about || "";
            row.established_year = row.established_year || ip.established_year || "";
            if (!row.support_email) row.support_email = ip.email || "";
            if (!row.phone) row.phone = ip.phone || "";
            if (!row.website_url) row.website_url = ip.website || "";
            if (!row.logo_url || row.logo_url === "/favicon.ico") row.logo_url = ip.logo_url || row.logo_url;
          }
        }
      } catch (e) {
        console.warn("[Company Info GET] Institution profile fallback warning:", e);
      }
    }

    let initialSubcategories: any[] = [];
    if (row?.category_id) {
      const parentRes = await db.query(`SELECT category_type FROM categories WHERE id = $1 LIMIT 1`, [row.category_id]);
      const pType = parentRes.rows[0]?.category_type;
      const subRes = await db.query(
        `SELECT id, name, slug, parent_id, depth, category_type
         FROM categories
         WHERE (parent_id = $1 OR business_category_id = $1)
           AND ($2::text IS NULL OR category_type = $2::text)
           AND COALESCE(is_deleted, false) = false
           AND is_active = true
         ORDER BY name ASC`,
        [row.category_id, pType || null]
      );
      initialSubcategories = subRes.rows;
    }

    const rawSubcatIds = row?.subcategory_ids;
    let resolvedSubcatIds = Array.isArray(rawSubcatIds) && rawSubcatIds.length > 0
      ? rawSubcatIds.map(Number).filter((n: number) => !isNaN(n))
      : (row?.subcategory_id ? [Number(row.subcategory_id)] : []);

    if (resolvedSubcatIds.length === 0 && activeBizId) {
      try {
        const bpCheck = await db.query(
          `SELECT subcategory_ids, subcategory_id FROM business_profiles WHERE id = $1 LIMIT 1`,
          [activeBizId]
        );
        if (bpCheck.rows.length > 0) {
          const bpSubIds = bpCheck.rows[0].subcategory_ids;
          if (Array.isArray(bpSubIds) && bpSubIds.length > 0) {
            resolvedSubcatIds = bpSubIds.map(Number).filter((n: number) => !isNaN(n));
          } else if (bpCheck.rows[0].subcategory_id) {
            resolvedSubcatIds = [Number(bpCheck.rows[0].subcategory_id)];
          }
        }
      } catch { }
    }

    let company = row
      ? {
        ...row,
        listing_type: row.listing_type || "business",
        banner_url: row.banner_url || "",
        gallery_images: Array.isArray(row.gallery_images) ? row.gallery_images : [],
        category_id: row.category_id || null,
        subcategory_id: resolvedSubcatIds[0] || row.subcategory_id || null,
        subcategory_ids: resolvedSubcatIds,
        business_type: row.business_type || "",
        experience_years: row.experience_years !== null && row.experience_years !== undefined ? row.experience_years : "",
        skills: row.skills || "",
        qualifications: row.qualifications || "",
        cin_number: row.registration_no || row.cin_number || "",
        registration_no: row.registration_no || row.cin_number || "",
        certified_or_affiliated_with: row.certified_or_affiliated_with || "",
        address_street: row.headquarters_address || row.address_street || "",
        address_city: row.city || "",
        address_state: row.state || "",
        address_pincode: row.pincode || "",
        support_phone: row.phone || "",
        helpline_toll_free: row.toll_free || "",
        about_text: row.about || "",
        about: row.about || "",
        founder_name: row.founder_name || "",
        founder_title: row.founder_title || "",
        founder_image_url: row.founder_image_url || "",
        founder_about: row.founder_about || "",
        mission: row.mission || "",
        vision: row.vision || "",
        goal: row.goal || "",
        established_year: row.established_year ? String(row.established_year) : "",
      }
      : {
        listing_type: "business",
        banner_url: "",
        gallery_images: [],
        category_id: null,
        subcategory_id: null,
        subcategory_ids: [],
        business_type: "",
        experience_years: "",
        skills: "",
        qualifications: "",
        company_name: "EduBird Technologies Pvt. Ltd.",
        brand_name: "EduBird Platform",
        tagline: "Next-Gen Education & Institutional Platform",
        logo_url: "/favicon.ico",
        favicon_url: "/favicon.ico",
        registration_no: "U72900DL2026PTC123456",
        cin_number: "U72900DL2026PTC123456",
        gstin: "07AAAAA0000A1Z5",
        certified_or_affiliated_with: "ISO 9001:2015 Certified",
        support_email: "support@edubird.com",
        support_phone: "+91 98765 43210",
        phone: "+91 98765 43210",
        city: "New Delhi",
        address_city: "New Delhi",
        state: "Delhi",
        address_state: "Delhi",
        about: "EduBird is a unified education management platform providing state-of-the-art tools for institutions, staff, educators, and students.",
        about_text: "EduBird is a unified education management platform providing state-of-the-art tools for institutions, staff, educators, and students.",
        founder_name: "",
        founder_title: "",
        founder_image_url: "",
        founder_about: "",
        mission: "",
        vision: "",
        goal: "",
        established_year: "",
      };

    if (activeBizId) {
      try {
        if (company.listing_type === "professional") {
          const profRes = await db.query(
            `SELECT avatar_url, banner_url, portfolio_images, gallery_images, experience_years, skills, qualifications, about, working_hours FROM professional_profiles
             WHERE business_profile_id = $1 OR user_id = $2 OR institution_profile_id = $1
             LIMIT 1`,
            [activeBizId, user?.id || null]
          );
          if (profRes.rows.length > 0) {
            const prof = profRes.rows[0];
            if (!company.logo_url && prof.avatar_url) company.logo_url = prof.avatar_url;
            if (!company.banner_url && prof.banner_url) company.banner_url = prof.banner_url;
            const g = prof.gallery_images || prof.portfolio_images;
            if ((!company.gallery_images || company.gallery_images.length === 0) && g) {
              company.gallery_images = Array.isArray(g) ? g : [];
            }
            if (!company.experience_years && prof.experience_years) company.experience_years = prof.experience_years;
            if (!company.skills && prof.skills) {
              company.skills = Array.isArray(prof.skills) ? prof.skills.join(", ") : String(prof.skills);
            }
            if (!company.qualifications && prof.qualifications) {
              company.qualifications = Array.isArray(prof.qualifications) ? prof.qualifications.join(", ") : String(prof.qualifications);
            }
            if (prof.working_hours && typeof prof.working_hours === "object" && Object.keys(prof.working_hours).length > 0) {
              company.opening_hours = prof.working_hours;
            }
          }
        } else {
          const bizRes = await db.query(
            `SELECT logo_url, banner_url, gallery_images, opening_hours FROM business_profiles
             WHERE id = $1 OR institution_profile_id = $1 OR user_id = $2
             LIMIT 1`,
            [activeBizId, user?.id || null]
          );
          if (bizRes.rows.length > 0) {
            const b = bizRes.rows[0];
            if (!company.logo_url && b.logo_url) company.logo_url = b.logo_url;
            if (!company.banner_url && b.banner_url) company.banner_url = b.banner_url;
            if ((!company.gallery_images || company.gallery_images.length === 0) && b.gallery_images) {
              company.gallery_images = Array.isArray(b.gallery_images) ? b.gallery_images : [];
            }
            if (b.opening_hours && typeof b.opening_hours === "object" && Object.keys(b.opening_hours).length > 0) {
              company.opening_hours = b.opening_hours;
            }
          }
        }
      } catch (profErr) {
        console.warn("[Company Info GET] Profile images & credentials check warning:", profErr);
      }
    }
    return NextResponse.json({
      data: company,
      businessCategories: bizCatsRes.rows,
      professionalCategories: profCatsRes.rows,
      categories: bizCatsRes.rows,
      subcategories: initialSubcategories,
    });
  } catch (error: any) {
    console.error("[Company Info GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch company information" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureCompanyInfoSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const activeBizId = await resolveActiveBusinessId(req, user, body);
    const {
      company_name,
      brand_name,
      tagline,
      logo_url,
      dark_logo_url,
      favicon_url,
      listing_type,
      category_id,
      subcategory_id,
      subcategory_ids,
      business_type,
      experience_years,
      skills,
      qualifications,
      about,
      about_text,
      registration_no,
      cin_number,
      certified_or_affiliated_with,
      gstin,
      support_email,
      phone,
      support_phone,
      toll_free,
      helpline_toll_free,
      website_url,
      headquarters_address,
      address_street,
      city,
      address_city,
      state,
      address_state,
      pincode,
      address_pincode,
      working_hours,
      opening_hours,
      banner_url,
      gallery_images,
      founder_name,
      founder_title,
      founder_image_url,
      founder_about,
      mission,
      vision,
      goal,
      established_year,
    } = body;

    const finalFounderName = founder_name !== undefined ? (founder_name ? String(founder_name).trim() : null) : undefined;
    const finalFounderTitle = founder_title !== undefined ? (founder_title ? String(founder_title).trim() : null) : undefined;
    const finalFounderImageUrl = founder_image_url !== undefined ? (founder_image_url ? String(founder_image_url).trim() : null) : undefined;
    const finalFounderAbout = founder_about !== undefined ? (founder_about ? String(founder_about).trim() : null) : undefined;
    const finalMission = mission !== undefined ? (mission ? String(mission).trim() : null) : undefined;
    const finalVision = vision !== undefined ? (vision ? String(vision).trim() : null) : undefined;
    const finalGoal = goal !== undefined ? (goal ? String(goal).trim() : null) : undefined;
    const finalEstablishedYear = established_year !== undefined && established_year !== "" && !isNaN(Number(established_year))
      ? Number(established_year)
      : null;

    const finalBannerUrl = banner_url || null;
    const finalOpeningHours = (opening_hours && typeof opening_hours === "object" && Object.keys(opening_hours).length > 0)
      ? JSON.stringify(opening_hours)
      : null;
    const finalGalleryImages = Array.isArray(gallery_images)
      ? gallery_images.filter((img: any) => typeof img === "string" && img.trim().length > 0)
      : [];
    const finalRegNo = registration_no || cin_number || null;
    const finalAbout = about !== undefined ? about : (about_text || null);
    const finalPhone = phone || support_phone || null;
    const finalTollFree = toll_free || helpline_toll_free || null;
    const finalAddress = headquarters_address || address_street || null;
    const finalCity = city || address_city || null;
    const finalState = state || address_state || null;
    const finalPin = pincode || address_pincode || null;
    const finalListingType = listing_type || "business";
    const finalCatId = category_id ? Number(category_id) : null;
    const rawSubcatIds = Array.isArray(subcategory_ids)
      ? subcategory_ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)
      : (subcategory_id ? [Number(subcategory_id)] : []);
    const finalSubcatIds = rawSubcatIds;
    const finalSubcatId = finalSubcatIds.length > 0 ? finalSubcatIds[0] : (subcategory_id ? Number(subcategory_id) : null);
    const finalExpYears = experience_years !== undefined && experience_years !== "" && !isNaN(Number(experience_years))
      ? Number(experience_years)
      : null;
    const finalSkills = skills !== undefined
      ? (typeof skills === "string" ? skills : (Array.isArray(skills) ? skills.join(", ") : String(skills)))
      : null;
    const finalQualifications = qualifications !== undefined
      ? (typeof qualifications === "string" ? qualifications : (Array.isArray(qualifications) ? qualifications.join(", ") : String(qualifications)))
      : null;

    let finalBusinessType = business_type || null;
    if (!finalBusinessType && finalCatId) {
      const catRow = await db.query(`SELECT name FROM categories WHERE id = $1 LIMIT 1`, [finalCatId]);
      if (catRow.rows.length > 0) {
        finalBusinessType = catRow.rows[0].name;
      }
    }

    let updatedRow = null;

    if (activeBizId) {
      // Find associated institution_id
      const instCheck = await db.query(
        `SELECT institution_profile_id FROM business_profiles WHERE id = $1`,
        [activeBizId]
      );
      const instId = instCheck.rows[0]?.institution_profile_id || activeBizId;

      const targetRecordId = (body?.id && !isNaN(Number(body.id))) ? Number(body.id) : null;
      const existing = await db.query(
        `SELECT id FROM platform_company_info
         WHERE ($2::integer IS NOT NULL AND id = $2::integer)
            OR business_id = $1
            OR institution_id = $1
            OR institution_id IN (SELECT institution_profile_id FROM business_profiles WHERE id = $1)
            OR business_id IN (SELECT id FROM business_profiles WHERE institution_profile_id = $1)
         ORDER BY (id = $2::integer) DESC, (business_id = $1) DESC LIMIT 1`,
        [activeBizId, targetRecordId]
      );

      let res;
      if (existing.rows.length > 0) {
        res = await db.query(
          `UPDATE platform_company_info SET
             business_id = COALESCE($1::integer, platform_company_info.business_id),
             institution_id = COALESCE($2::integer, platform_company_info.institution_id),
             company_name = COALESCE($3, platform_company_info.company_name),
             brand_name = COALESCE($4, platform_company_info.brand_name),
             tagline = $5,
             logo_url = $6,
             dark_logo_url = $7,
             favicon_url = $8,
             about = $9,
             registration_no = $10,
             cin_number = $10,
             gstin = $11,
             certified_or_affiliated_with = $12,
             support_email = $13,
             phone = $14,
             toll_free = $15,
             website_url = $16,
             headquarters_address = $17,
             city = $18,
             state = $19,
             pincode = $20,
             working_hours = $21,
             listing_type = COALESCE($22, platform_company_info.listing_type),
             category_id = $23::integer,
             subcategory_id = $24::integer,
             subcategory_ids = $32::integer[],
             business_type = $25,
             experience_years = $26::integer,
             skills = $27,
             qualifications = $28,
             banner_url = $29,
             gallery_images = $30::text[],
             founder_name = COALESCE($34, platform_company_info.founder_name),
             founder_title = COALESCE($35, platform_company_info.founder_title),
             founder_image_url = COALESCE($36, platform_company_info.founder_image_url),
             founder_about = COALESCE($37, platform_company_info.founder_about),
             mission = COALESCE($38, platform_company_info.mission),
             vision = COALESCE($39, platform_company_info.vision),
             goal = COALESCE($40, platform_company_info.goal),
             established_year = COALESCE($41::integer, platform_company_info.established_year),
             updated_at = timezone('Asia/Kolkata', NOW()),
             updated_by = $31::integer
           WHERE id = $33::integer
           RETURNING *`,
          [
            activeBizId,
            instId,
            company_name || null,
            brand_name || null,
            tagline || null,
            logo_url || null,
            dark_logo_url || null,
            favicon_url || null,
            finalAbout,
            finalRegNo,
            gstin || null,
            certified_or_affiliated_with || null,
            support_email || null,
            finalPhone,
            finalTollFree,
            website_url || null,
            finalAddress,
            finalCity,
            finalState,
            finalPin,
            working_hours || null,
            finalListingType,
            finalCatId,
            finalSubcatId,
            finalBusinessType,
            finalExpYears,
            finalSkills,
            finalQualifications,
            finalBannerUrl,
            finalGalleryImages,
            user?.id || null,
            finalSubcatIds.length > 0 ? finalSubcatIds : null,
            existing.rows[0].id,
            finalFounderName !== undefined ? finalFounderName : null,
            finalFounderTitle !== undefined ? finalFounderTitle : null,
            finalFounderImageUrl !== undefined ? finalFounderImageUrl : null,
            finalFounderAbout !== undefined ? finalFounderAbout : null,
            finalMission !== undefined ? finalMission : null,
            finalVision !== undefined ? finalVision : null,
            finalGoal !== undefined ? finalGoal : null,
            finalEstablishedYear !== null ? finalEstablishedYear : null,
          ]
        );
      } else {
        await db.query(`SELECT setval(pg_get_serial_sequence('platform_company_info', 'id'), COALESCE((SELECT MAX(id) FROM platform_company_info), 1), true)`);
        res = await db.query(
          `INSERT INTO platform_company_info (
             business_id, institution_id, company_name, brand_name, tagline, logo_url, dark_logo_url, favicon_url,
             about, registration_no, cin_number, gstin, certified_or_affiliated_with,
             support_email, phone, toll_free, website_url, headquarters_address,
             city, state, pincode, working_hours, listing_type, category_id, subcategory_id, subcategory_ids, business_type,
             experience_years, skills, qualifications, banner_url, gallery_images,
             founder_name, founder_title, founder_image_url, founder_about, mission, vision, goal, established_year,
             updated_at, updated_by
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
             $22, $23, $24, $32::integer[], $25, $26, $27, $28, $29, $30::text[],
             $33, $34, $35, $36, $37, $38, $39, $40::integer,
             timezone('Asia/Kolkata', NOW()), $31
           )
           ON CONFLICT (business_id) WHERE business_id IS NOT NULL
           DO UPDATE SET
             company_name = EXCLUDED.company_name,
             brand_name = EXCLUDED.brand_name,
             tagline = EXCLUDED.tagline,
             logo_url = EXCLUDED.logo_url,
             about = EXCLUDED.about,
             updated_at = NOW()
           RETURNING *`,
          [
            activeBizId,
            instId,
            company_name || null,
            brand_name || null,
            tagline || null,
            logo_url || null,
            dark_logo_url || null,
            favicon_url || null,
            finalAbout,
            finalRegNo,
            gstin || null,
            certified_or_affiliated_with || null,
            support_email || null,
            finalPhone,
            finalTollFree,
            website_url || null,
            finalAddress,
            finalCity,
            finalState,
            finalPin,
            working_hours || null,
            finalListingType,
            finalCatId,
            finalSubcatId,
            finalBusinessType,
            finalExpYears,
            finalSkills,
            finalQualifications,
            finalBannerUrl,
            finalGalleryImages,
            user?.id || null,
            finalSubcatIds.length > 0 ? finalSubcatIds : null,
            finalFounderName !== undefined ? finalFounderName : null,
            finalFounderTitle !== undefined ? finalFounderTitle : null,
            finalFounderImageUrl !== undefined ? finalFounderImageUrl : null,
            finalFounderAbout !== undefined ? finalFounderAbout : null,
            finalMission !== undefined ? finalMission : null,
            finalVision !== undefined ? finalVision : null,
            finalGoal !== undefined ? finalGoal : null,
            finalEstablishedYear !== null ? finalEstablishedYear : null,
          ]
        );
      }
      updatedRow = res.rows[0];

      const candidateSlug = (brand_name || company_name || "listing")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || `listing-${Date.now().toString().slice(-4)}`;

      // Synchronize / Store into business_profiles if listing_type is business
      if (finalListingType === "business") {
        const catIdsArr = finalCatId ? [finalCatId] : [];
        const subcatIdsArr = finalSubcatIds.length > 0 ? finalSubcatIds : (finalSubcatId ? [finalSubcatId] : []);

        const bpUpdate = await db.query(
          `UPDATE business_profiles
           SET name = COALESCE($1, name),
               logo_url = COALESCE($2, logo_url),
               phone = COALESCE($3, phone),
               email = COALESCE($4, email),
               website = COALESCE($5, website),
               address = COALESCE($6, address),
               city = COALESCE($7, city),
               state = COALESCE($8, state),
               postal_code = COALESCE($9, postal_code),
               about = COALESCE($10, about),
               custom_description = COALESCE($10, custom_description),
               category_id = COALESCE($11, category_id),
               subcategory_id = COALESCE($12, subcategory_id),
               category_ids = CASE WHEN $11::integer IS NOT NULL THEN ARRAY[$11::integer] ELSE category_ids END,
               subcategory_ids = CASE WHEN $18::integer[] IS NOT NULL THEN $18::integer[] ELSE subcategory_ids END,
               business_type = COALESCE($13, business_type),
               banner_url = COALESCE($16, banner_url),
               gallery_images = CASE WHEN $17::text[] IS NOT NULL THEN $17::text[] ELSE gallery_images END,
               opening_hours = CASE WHEN $19::jsonb IS NOT NULL THEN $19::jsonb ELSE opening_hours END,
               updated_at = NOW()
          WHERE id = $14 OR institution_profile_id = $14 OR user_id = $15
          RETURNING id`,
          [
            brand_name || company_name || null,
            logo_url || null,
            finalPhone,
            support_email || null,
            website_url || null,
            finalAddress,
            finalCity,
            finalState,
            finalPin,
            finalAbout,
            finalCatId,
            finalSubcatId,
            finalBusinessType,
            activeBizId,
            user?.id || null,
            finalBannerUrl,
            finalGalleryImages,
            finalSubcatIds.length > 0 ? finalSubcatIds : null,
            finalOpeningHours,
          ]
        );

        if (bpUpdate.rowCount === 0 && user?.id) {
          await db.query(
            `INSERT INTO business_profiles (
               user_id, institution_profile_id, name, slug, business_type,
               category_id, subcategory_id, category_ids, subcategory_ids,
               state, city, postal_code, address,
               phone, email, website,
               logo_url, banner_url, gallery_images, about, custom_description,
               opening_hours, is_verified, is_active, created_at, updated_at
             ) VALUES (
               $1, $2, $3, $4, $5,
               $6, $7, $8, $9,
               $10, $11, $12, $13,
               $14, $15, $16,
               $17, $18, $19, $20, $21,
               $22::jsonb, true, true, NOW(), NOW()
             ) RETURNING id`,
            [
              user.id,
              instId,
              brand_name || company_name || "New Business",
              candidateSlug,
              finalBusinessType || "Business",
              finalCatId,
              finalSubcatId,
              catIdsArr,
              subcatIdsArr,
              finalState,
              finalCity,
              finalPin,
              finalAddress,
              finalPhone,
              support_email || null,
              website_url || null,
              logo_url || null,
              finalBannerUrl,
              finalGalleryImages,
              finalAbout,
              finalAbout,
              finalOpeningHours,
            ]
          );
        }
      }

      // Synchronize / Store into professional_profiles if listing_type is professional
      if (finalListingType === "professional") {
        const skillsArray = typeof skills === "string"
          ? skills.split(",").map((s: string) => s.trim()).filter(Boolean)
          : (Array.isArray(skills) ? skills : []);
        const qualArray = typeof qualifications === "string"
          ? qualifications.split(",").map((s: string) => s.trim()).filter(Boolean)
          : (Array.isArray(qualifications) ? qualifications : []);
        const catIdsArr = finalCatId ? [finalCatId] : [];
        const subcatIdsArr = finalSubcatIds.length > 0 ? finalSubcatIds : (finalSubcatId ? [finalSubcatId] : []);

        const profUpdate = await db.query(
          `UPDATE professional_profiles
           SET name = COALESCE($1, name),
               avatar_url = COALESCE($2, avatar_url),
               phone = COALESCE($3, phone),
               email = COALESCE($4, email),
               website = COALESCE($5, website),
               address = COALESCE($6, address),
               city = COALESCE($7, city),
               state = COALESCE($8, state),
               postal_code = COALESCE($9, postal_code),
               about = COALESCE($10, about),
               category_id = COALESCE($11, category_id),
               subcategory_id = COALESCE($12, subcategory_id),
               category_ids = CASE WHEN $11::integer IS NOT NULL THEN ARRAY[$11::integer] ELSE category_ids END,
               subcategory_ids = CASE WHEN $21::integer[] IS NOT NULL THEN $21::integer[] ELSE subcategory_ids END,
               profession_type = COALESCE($13, profession_type),
               designation = COALESCE($13, designation),
               professional_title = COALESCE($13, professional_title),
               experience_years = COALESCE($14, experience_years),
               skills = CASE WHEN $15::text[] IS NOT NULL AND cardinality($15::text[]) > 0 THEN $15::text[] ELSE skills END,
               qualifications = CASE WHEN $16::text[] IS NOT NULL AND cardinality($16::text[]) > 0 THEN $16::text[] ELSE qualifications END,
               banner_url = COALESCE($19, banner_url),
               portfolio_images = CASE WHEN $20::text[] IS NOT NULL THEN $20::text[] ELSE portfolio_images END,
               gallery_images = CASE WHEN $20::text[] IS NOT NULL THEN $20::text[] ELSE gallery_images END,
               working_hours = CASE WHEN $22::jsonb IS NOT NULL THEN $22::jsonb ELSE working_hours END,
               updated_at = NOW()
           WHERE id = $17 OR business_profile_id = $17 OR institution_profile_id = $17 OR user_id = $18
           RETURNING id`,
          [
            brand_name || company_name || null,
            logo_url || null,
            finalPhone,
            support_email || null,
            website_url || null,
            finalAddress,
            finalCity,
            finalState,
            finalPin,
            finalAbout,
            finalCatId,
            finalSubcatId,
            finalBusinessType || "Professional",
            finalExpYears,
            skillsArray.length > 0 ? skillsArray : null,
            qualArray.length > 0 ? qualArray : null,
            activeBizId,
            user?.id || null,
            finalBannerUrl,
            finalGalleryImages,
            finalSubcatIds.length > 0 ? finalSubcatIds : null,
            finalOpeningHours,
          ]
        );

        if (profUpdate.rowCount === 0 && user?.id) {
          await db.query(
            `INSERT INTO professional_profiles (
               user_id, institution_profile_id, business_profile_id, name, slug, profession_type,
               designation, professional_title, skills, qualifications,
               category_id, subcategory_id, category_ids, subcategory_ids,
               state, city, postal_code, address,
               phone, email, website,
               avatar_url, banner_url, portfolio_images, gallery_images, about, experience_years,
               working_hours, is_verified, is_active, created_at, updated_at
             ) VALUES (
               $1, $2, $3, $4, $5, $6,
               $7, $8, $9, $10,
               $11, $12, $13, $14,
               $15, $16, $17, $18,
               $19, $20, $21,
               $22, $23, $24, $25, $26, $27,
               $28::jsonb, true, true, NOW(), NOW()
             ) RETURNING id`,
            [
              user.id,
              instId,
              activeBizId,
              brand_name || company_name || "New Professional",
              candidateSlug,
              finalBusinessType || "Professional",
              finalBusinessType || "Professional",
              finalBusinessType || "Professional",
              skillsArray,
              qualArray,
              finalCatId,
              finalSubcatId,
              catIdsArr,
              subcatIdsArr,
              finalState,
              finalCity,
              finalPin,
              finalAddress,
              finalPhone,
              support_email || null,
              website_url || null,
              logo_url || null,
              finalBannerUrl,
              finalGalleryImages,
              finalGalleryImages,
              finalAbout,
              finalExpYears || 0,
              finalOpeningHours,
            ]
          );
        }
      }

      // Synchronize with institution_profiles
      await db.query(
        `UPDATE institution_profiles
         SET name = COALESCE($1, name),
        logo_url = COALESCE($2, logo_url),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        website = COALESCE($5, website),
        about = COALESCE($6, about),
             founder_name = COALESCE($8, founder_name),
             founder_title = COALESCE($9, founder_title),
             founder_image_url = COALESCE($10, founder_image_url),
             founder_about = COALESCE($11, founder_about),
             mission = COALESCE($12, mission),
             vision = COALESCE($13, vision),
             goal = COALESCE($14, goal),
             established_year = COALESCE($15::integer, established_year),
        updated_at = NOW()
         WHERE id = $7 OR id = (SELECT institution_profile_id FROM business_profiles WHERE id = $7)`,
        [
          brand_name || company_name || null,
          logo_url || null,
          finalPhone,
          support_email || null,
          website_url || null,
          finalAbout,
          activeBizId,
          finalFounderName !== undefined ? finalFounderName : null,
          finalFounderTitle !== undefined ? finalFounderTitle : null,
          finalFounderImageUrl !== undefined ? finalFounderImageUrl : null,
          finalFounderAbout !== undefined ? finalFounderAbout : null,
          finalMission !== undefined ? finalMission : null,
          finalVision !== undefined ? finalVision : null,
          finalGoal !== undefined ? finalGoal : null,
          finalEstablishedYear !== null ? finalEstablishedYear : null,
        ]
      );
    } else {
      const res = await db.query(
        `UPDATE platform_company_info
         SET company_name = COALESCE($1, company_name),
        brand_name = COALESCE($2, brand_name),
        tagline = $3,
        logo_url = $4,
        dark_logo_url = $5,
        favicon_url = $6,
        about = $7,
        registration_no = $8,
        cin_number = $8,
        gstin = $9,
        certified_or_affiliated_with = $10,
        support_email = $11,
        phone = $12,
        toll_free = $13,
        website_url = $14,
        headquarters_address = $15,
        city = $16,
        state = $17,
        pincode = $18,
        working_hours = $19,
        listing_type = COALESCE($20, listing_type),
        category_id = $21,
        subcategory_id = $22,
        subcategory_ids = $28::integer[],
        business_type = $23,
        experience_years = $24,
        skills = $25,
        qualifications = $26,
        banner_url = $29,
        gallery_images = $30::text[],
        opening_hours = CASE WHEN $31::jsonb IS NOT NULL THEN $31::jsonb ELSE opening_hours END,
        founder_name = COALESCE($32, founder_name),
        founder_title = COALESCE($33, founder_title),
        founder_image_url = COALESCE($34, founder_image_url),
        founder_about = COALESCE($35, founder_about),
        mission = COALESCE($36, mission),
        vision = COALESCE($37, vision),
        goal = COALESCE($38, goal),
        established_year = COALESCE($39::integer, established_year),
        updated_at = timezone('Asia/Kolkata', NOW()),
        updated_by = $27
         WHERE id = COALESCE(
           (SELECT id FROM platform_company_info WHERE business_id IS NULL ORDER BY id ASC LIMIT 1),
           (SELECT id FROM platform_company_info ORDER BY id ASC LIMIT 1)
         )
      RETURNING * `,
        [
          company_name || null,
          brand_name || null,
          tagline || null,
          logo_url || null,
          dark_logo_url || null,
          favicon_url || null,
          finalAbout,
          finalRegNo,
          gstin || null,
          certified_or_affiliated_with || null,
          support_email || null,
          finalPhone,
          finalTollFree,
          website_url || null,
          finalAddress,
          finalCity,
          finalState,
          finalPin,
          working_hours || null,
          finalListingType,
          finalCatId,
          finalSubcatId,
          finalBusinessType,
          finalExpYears,
          finalSkills,
          finalQualifications,
          user?.id || null,
          finalSubcatIds.length > 0 ? finalSubcatIds : null,
          finalBannerUrl,
          finalGalleryImages,
          finalOpeningHours,
          finalFounderName !== undefined ? finalFounderName : null,
          finalFounderTitle !== undefined ? finalFounderTitle : null,
          finalFounderImageUrl !== undefined ? finalFounderImageUrl : null,
          finalFounderAbout !== undefined ? finalFounderAbout : null,
          finalMission !== undefined ? finalMission : null,
          finalVision !== undefined ? finalVision : null,
          finalGoal !== undefined ? finalGoal : null,
          finalEstablishedYear !== null ? finalEstablishedYear : null,
        ]
      );
      updatedRow = res.rows[0];
    }

    const data = updatedRow
      ? {
        ...updatedRow,
        subcategory_id: finalSubcatId,
        subcategory_ids: finalSubcatIds,
        experience_years: updatedRow.experience_years !== null && updatedRow.experience_years !== undefined ? updatedRow.experience_years : "",
        skills: updatedRow.skills || "",
        qualifications: updatedRow.qualifications || "",
        cin_number: updatedRow.registration_no || updatedRow.cin_number || "",
        registration_no: updatedRow.registration_no || updatedRow.cin_number || "",
        certified_or_affiliated_with: updatedRow.certified_or_affiliated_with || "",
        address_street: updatedRow.headquarters_address || updatedRow.address_street || "",
        address_city: updatedRow.city || "",
        address_state: updatedRow.state || "",
        address_pincode: updatedRow.pincode || "",
        support_phone: updatedRow.phone || "",
        helpline_toll_free: updatedRow.toll_free || "",
        about_text: updatedRow.about || "",
        banner_url: updatedRow.banner_url || "",
        gallery_images: Array.isArray(updatedRow.gallery_images) ? updatedRow.gallery_images : [],
      }
      : null;

    return NextResponse.json({
      data,
      message: "Company profile and brand information updated successfully",
    });
  } catch (error: any) {
    console.error("[Company Info PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update company information" }, { status: 500 });
  }
}
