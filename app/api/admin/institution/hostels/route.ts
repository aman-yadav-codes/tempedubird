import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

let schemaHostelReady = false;
async function ensureHostelTables() {
  if (schemaHostelReady) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS institution_hostels (
        id SERIAL PRIMARY KEY,
        institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'Co-ed',
        capacity INTEGER DEFAULT 100,
        available_beds INTEGER DEFAULT 25,
        annual_fee NUMERIC(12, 2) DEFAULT 45000,
        monthly_rent NUMERIC(12, 2) DEFAULT 4500,
        room_types VARCHAR(255) DEFAULT 'Single, Double & Triple Sharing',
        mess_facility VARCHAR(100) DEFAULT 'Four Meals Daily (Veg & Non-Veg)',
        ac_available BOOLEAN DEFAULT TRUE,
        wifi_available BOOLEAN DEFAULT TRUE,
        security_deposit NUMERIC(12, 2) DEFAULT 5000,
        description TEXT,
        rules TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    schemaHostelReady = true;
  } catch (err) {
    console.error("Error creating institution_hostels table:", err);
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureHostelTables();
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
      `SELECT * FROM institution_hostels WHERE institution_id = $1 AND COALESCE(is_active, TRUE) = TRUE ORDER BY id ASC`,
      [institutionId]
    );

    return NextResponse.json({ data: res.rows, institutionId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch hostels" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureHostelTables();
    const body = await req.json();

    const name = String(body.name || "").trim();
    const type = String(body.type || "Co-ed").trim();
    const capacity = Number(body.capacity || 100);
    const availableBeds = Number(body.available_beds || 25);
    const annualFee = Number(body.annual_fee || 45000);
    const roomTypes = String(body.room_types || "Single, Double & Triple Sharing").trim();
    const messFacility = String(body.mess_facility || "Four Meals Daily").trim();
    const acAvailable = Boolean(body.ac_available ?? true);
    const wifiAvailable = Boolean(body.wifi_available ?? true);
    const securityDeposit = Number(body.security_deposit || 5000);
    const description = String(body.description || "").trim();
    const rules = String(body.rules || "").trim();

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
      return NextResponse.json({ error: "Hostel Name is required" }, { status: 400 });
    }

    if (body.id) {
      // Update
      const updateRes = await db.query(
        `UPDATE institution_hostels SET
          name = $1,
          type = $2,
          capacity = $3,
          available_beds = $4,
          annual_fee = $5,
          room_types = $6,
          mess_facility = $7,
          ac_available = $8,
          wifi_available = $9,
          security_deposit = $10,
          description = $11,
          rules = $12,
          updated_at = NOW()
        WHERE id = $13 AND institution_id = $14
        RETURNING *`,
        [
          name,
          type,
          capacity,
          availableBeds,
          annualFee,
          roomTypes,
          messFacility,
          acAvailable,
          wifiAvailable,
          securityDeposit,
          description,
          rules,
          Number(body.id),
          institutionId,
        ]
      );
      return NextResponse.json({ success: true, data: updateRes.rows[0] });
    } else {
      // Insert
      const insertRes = await db.query(
        `INSERT INTO institution_hostels (
          institution_id,
          name,
          type,
          capacity,
          available_beds,
          annual_fee,
          room_types,
          mess_facility,
          ac_available,
          wifi_available,
          security_deposit,
          description,
          rules
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          institutionId,
          name,
          type,
          capacity,
          availableBeds,
          annualFee,
          roomTypes,
          messFacility,
          acAvailable,
          wifiAvailable,
          securityDeposit,
          description,
          rules,
        ]
      );
      return NextResponse.json({ success: true, data: insertRes.rows[0] });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save hostel" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureHostelTables();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Hostel ID is required" }, { status: 400 });
    }

    await db.query(`UPDATE institution_hostels SET is_active = FALSE WHERE id = $1`, [Number(id)]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete hostel" }, { status: 500 });
  }
}
