import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";

async function ensureCompanyInfoSchema() {
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
    SELECT 1, 'EduBird Technologies Pvt. Ltd.', 'EduBird Platform', 'Next-Gen Education & Institutional Platform', '/favicon.ico', 'support@edubird.com', '+91 98765 43210', 'New Delhi', 'Delhi', '110001'
    WHERE NOT EXISTS (SELECT 1 FROM platform_company_info WHERE id = 1);

    ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS certified_or_affiliated_with TEXT;
    ALTER TABLE platform_company_info ADD COLUMN IF NOT EXISTS cin_number VARCHAR(100);
    ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS state VARCHAR(100);
    ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
    ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS branch_type VARCHAR(50) DEFAULT 'Branch Office';
    ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS is_headquarters BOOLEAN DEFAULT FALSE;
  `);
}

export async function GET(req: Request) {
  try {
    await ensureCompanyInfoSchema();
    const res = await db.query(
      `SELECT * FROM platform_company_info ORDER BY id ASC LIMIT 1`
    );
    const row = res.rows[0];
    const company = row
      ? {
          ...row,
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
        }
      : {
          company_name: "EduBird Technologies Pvt. Ltd.",
          brand_name: "EduBird Platform",
          tagline: "Next-Gen Education & Institutional Platform",
          logo_url: "/favicon.ico",
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
        };
    return NextResponse.json({ data: company });
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
    const {
      company_name,
      brand_name,
      tagline,
      logo_url,
      dark_logo_url,
      favicon_url,
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
    } = body;

    const finalRegNo = registration_no || cin_number || null;
    const finalAbout = about !== undefined ? about : (about_text || null);
    const finalPhone = phone || support_phone || null;
    const finalTollFree = toll_free || helpline_toll_free || null;
    const finalAddress = headquarters_address || address_street || null;
    const finalCity = city || address_city || null;
    const finalState = state || address_state || null;
    const finalPin = pincode || address_pincode || null;

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
           updated_at = timezone('Asia/Kolkata', NOW()),
           updated_by = $20
       WHERE id = (SELECT id FROM platform_company_info ORDER BY id ASC LIMIT 1)
       RETURNING *`,
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
        user.id || null,
      ]
    );

    const updatedRow = res.rows[0];
    const data = updatedRow ? {
      ...updatedRow,
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
    } : null;

    return NextResponse.json({
      data,
      message: "Company profile and brand information updated successfully",
    });
  } catch (error: any) {
    console.error("[Company Info PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update company information" }, { status: 500 });
  }
}
