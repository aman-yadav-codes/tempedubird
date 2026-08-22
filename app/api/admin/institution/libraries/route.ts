import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

let schemaLibraryReady = false;
async function ensureLibraryTables() {
  if (schemaLibraryReady) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS institution_libraries (
        id SERIAL PRIMARY KEY,
        institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        total_books INTEGER DEFAULT 15000,
        digital_titles INTEGER DEFAULT 5000,
        journals_subscribed INTEGER DEFAULT 120,
        seating_capacity INTEGER DEFAULT 250,
        reading_hall_available BOOLEAN DEFAULT TRUE,
        e_resources_access BOOLEAN DEFAULT TRUE,
        opening_hours VARCHAR(100) DEFAULT '8:00 AM - 10:00 PM',
        borrowing_rules TEXT DEFAULT 'Students can issue up to 4 books for 14 days.',
        librarian_name VARCHAR(255) DEFAULT 'Central Librarian',
        librarian_email VARCHAR(255),
        librarian_phone VARCHAR(50),
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add extra columns if missing
    await db.query(`
      ALTER TABLE institution_libraries ADD COLUMN IF NOT EXISTS membership_fee NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE institution_libraries ADD COLUMN IF NOT EXISTS features TEXT;
      ALTER TABLE institution_libraries ADD COLUMN IF NOT EXISTS available_categories TEXT;
      ALTER TABLE institution_libraries ADD COLUMN IF NOT EXISTS sell_on_marketplace BOOLEAN DEFAULT FALSE;
      ALTER TABLE institution_libraries ADD COLUMN IF NOT EXISTS marketplace_price NUMERIC(12, 2) DEFAULT 0;
    `);

    schemaLibraryReady = true;
  } catch (err) {
    console.error("Error setting up institution_libraries table:", err);
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureLibraryTables();
    const url = new URL(req.url);
    const institutionIdParam = url.searchParams.get("institutionId") || req.headers.get("x-institution-id");

    let query = `
      SELECT 
        l.*,
        COALESCE(l.sell_on_marketplace, FALSE) AS sell_on_marketplace,
        COALESCE(l.marketplace_price, 0) AS marketplace_price,
        ip.name as institution_name,
        COALESCE(ip.name, ip.slug) as institution_org_name
      FROM institution_libraries l
      LEFT JOIN institution_profiles ip ON ip.id = l.institution_id
      WHERE COALESCE(l.is_active, TRUE) = TRUE
    `;
    const params: any[] = [];

    if (institutionIdParam && institutionIdParam !== "all" && !isNaN(Number(institutionIdParam))) {
      query += ` AND l.institution_id = $1`;
      params.push(Number(institutionIdParam));
    }

    query += ` ORDER BY l.id DESC`;

    const res = await db.query(query, params);

    return NextResponse.json({ data: res.rows });
  } catch (err: any) {
    console.error("GET /api/admin/institution/libraries error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch libraries" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureLibraryTables();
    const body = await req.json();

    const name = String(body.name || "").trim();
    const totalBooks = Number(body.total_books || 15000);
    const digitalTitles = Number(body.digital_titles || 5000);
    const journalsSubscribed = Number(body.journals_subscribed || 120);
    const seatingCapacity = Number(body.seating_capacity || 250);
    const membershipFee = Number(body.membership_fee || 0);
    const readingHallAvailable = Boolean(body.reading_hall_available ?? true);
    const eResourcesAccess = Boolean(body.e_resources_access ?? true);
    const openingHours = String(body.opening_hours || "8:00 AM - 10:00 PM").trim();
    const borrowingRules = String(body.borrowing_rules || "Students can issue up to 4 books for 14 days.").trim();
    const features = String(body.features || "Air Conditioned, High-Speed Wi-Fi, Quiet Pods, Photocopy / Print Service").trim();
    const availableCategories = String(body.available_categories || "Engineering, Medical, Science, Management, Humanities").trim();
    const librarianName = String(body.librarian_name || "Head Librarian").trim();
    const librarianEmail = String(body.librarian_email || "").trim();
    const librarianPhone = String(body.librarian_phone || "").trim();
    const description = String(body.description || "").trim();
    const sellOnMarketplace = Boolean(body.sell_on_marketplace ?? false);
    const marketplacePrice = Number(body.marketplace_price ?? (sellOnMarketplace ? body.membership_fee || 0 : 0));

    let institutionId: number = Number(body.institution_id || 1);
    if (!institutionId || isNaN(institutionId)) {
      const firstInst = await db.query<{ id: number }>(`SELECT id FROM institution_profiles LIMIT 1`);
      institutionId = firstInst.rows[0]?.id || 1;
    }

    if (!name) {
      return NextResponse.json({ error: "Library Name is required" }, { status: 400 });
    }

    if (body.id) {
      // Update
      const updateRes = await db.query(
        `UPDATE institution_libraries SET
          institution_id = $1,
          name = $2,
          total_books = $3,
          digital_titles = $4,
          journals_subscribed = $5,
          seating_capacity = $6,
          membership_fee = $7,
          reading_hall_available = $8,
          e_resources_access = $9,
          opening_hours = $10,
          borrowing_rules = $11,
          features = $12,
          available_categories = $13,
          librarian_name = $14,
          librarian_email = $15,
          librarian_phone = $16,
          description = $17,
          sell_on_marketplace = $18,
          marketplace_price = $19,
          updated_at = NOW()
        WHERE id = $20
        RETURNING *`,
        [
          institutionId,
          name,
          totalBooks,
          digitalTitles,
          journalsSubscribed,
          seatingCapacity,
          membershipFee,
          readingHallAvailable,
          eResourcesAccess,
          openingHours,
          borrowingRules,
          features,
          availableCategories,
          librarianName,
          librarianEmail,
          librarianPhone,
          description,
          sellOnMarketplace,
          marketplacePrice,
          Number(body.id),
        ]
      );
      return NextResponse.json({ success: true, data: updateRes.rows[0] });
    } else {
      // Insert
      const insertRes = await db.query(
        `INSERT INTO institution_libraries (
          institution_id,
          name,
          total_books,
          digital_titles,
          journals_subscribed,
          seating_capacity,
          membership_fee,
          reading_hall_available,
          e_resources_access,
          opening_hours,
          borrowing_rules,
          features,
          available_categories,
          librarian_name,
          librarian_email,
          librarian_phone,
          description,
          sell_on_marketplace,
          marketplace_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *`,
        [
          institutionId,
          name,
          totalBooks,
          digitalTitles,
          journalsSubscribed,
          seatingCapacity,
          membershipFee,
          readingHallAvailable,
          eResourcesAccess,
          openingHours,
          borrowingRules,
          features,
          availableCategories,
          librarianName,
          librarianEmail,
          librarianPhone,
          description,
          sellOnMarketplace,
          marketplacePrice,
        ]
      );
      return NextResponse.json({ success: true, data: insertRes.rows[0] });
    }
  } catch (err: any) {
    console.error("POST /api/admin/institution/libraries error:", err);
    return NextResponse.json({ error: err.message || "Failed to save library" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureLibraryTables();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Library ID is required" }, { status: 400 });
    }

    await db.query(`UPDATE institution_libraries SET is_active = FALSE WHERE id = $1`, [Number(id)]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete library" }, { status: 500 });
  }
}
