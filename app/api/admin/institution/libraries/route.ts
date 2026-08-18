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
    schemaLibraryReady = true;
  } catch (err) {
    console.error("Error creating institution_libraries table:", err);
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureLibraryTables();
    const url = new URL(req.url);
    const institutionIdParam = url.searchParams.get("institutionId") || req.headers.get("x-institution-id");

    let institutionId: number | null = null;
    if (institutionIdParam && !isNaN(Number(institutionIdParam))) {
      institutionId = Number(institutionIdParam);
    } else if (user?.memberships?.length > 0) {
      const instMem = user.memberships.find((m: any) => m.institution_id);
      if (instMem) institutionId = Number(instMem.institution_id);
    }

    if (!institutionId) {
      const firstInst = await db.query<{ id: number }>(`SELECT id FROM institution_profiles LIMIT 1`);
      institutionId = firstInst.rows[0]?.id || 1;
    }

    const res = await db.query(
      `SELECT * FROM institution_libraries WHERE institution_id = $1 AND COALESCE(is_active, TRUE) = TRUE ORDER BY id ASC`,
      [institutionId]
    );

    return NextResponse.json({ data: res.rows, institutionId });
  } catch (err: any) {
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
    const readingHallAvailable = Boolean(body.reading_hall_available ?? true);
    const eResourcesAccess = Boolean(body.e_resources_access ?? true);
    const openingHours = String(body.opening_hours || "8:00 AM - 10:00 PM").trim();
    const borrowingRules = String(body.borrowing_rules || "Students can issue up to 4 books for 14 days.").trim();
    const librarianName = String(body.librarian_name || "Head Librarian").trim();
    const librarianEmail = String(body.librarian_email || "").trim();
    const librarianPhone = String(body.librarian_phone || "").trim();
    const description = String(body.description || "").trim();

    const url = new URL(req.url);
    const institutionIdParam = url.searchParams.get("institutionId") || req.headers.get("x-institution-id") || body.institution_id;
    let institutionId: number | null = null;
    if (institutionIdParam && !isNaN(Number(institutionIdParam))) {
      institutionId = Number(institutionIdParam);
    } else if (user?.memberships?.length > 0) {
      const instMem = user.memberships.find((m: any) => m.institution_id);
      if (instMem) institutionId = Number(instMem.institution_id);
    }

    if (!institutionId) {
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
          name = $1,
          total_books = $2,
          digital_titles = $3,
          journals_subscribed = $4,
          seating_capacity = $5,
          reading_hall_available = $6,
          e_resources_access = $7,
          opening_hours = $8,
          borrowing_rules = $9,
          librarian_name = $10,
          librarian_email = $11,
          librarian_phone = $12,
          description = $13,
          updated_at = NOW()
        WHERE id = $14 AND institution_id = $15
        RETURNING *`,
        [
          name,
          totalBooks,
          digitalTitles,
          journalsSubscribed,
          seatingCapacity,
          readingHallAvailable,
          eResourcesAccess,
          openingHours,
          borrowingRules,
          librarianName,
          librarianEmail,
          librarianPhone,
          description,
          Number(body.id),
          institutionId,
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
          reading_hall_available,
          e_resources_access,
          opening_hours,
          borrowing_rules,
          librarian_name,
          librarian_email,
          librarian_phone,
          description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          institutionId,
          name,
          totalBooks,
          digitalTitles,
          journalsSubscribed,
          seatingCapacity,
          readingHallAvailable,
          eResourcesAccess,
          openingHours,
          borrowingRules,
          librarianName,
          librarianEmail,
          librarianPhone,
          description,
        ]
      );
      return NextResponse.json({ success: true, data: insertRes.rows[0] });
    }
  } catch (err: any) {
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
