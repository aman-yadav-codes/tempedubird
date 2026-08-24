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

    // Add extra columns if missing
    await db.query(`
      ALTER TABLE institution_hostels ADD COLUMN IF NOT EXISTS gallery_urls TEXT;
      ALTER TABLE institution_hostels ADD COLUMN IF NOT EXISTS video_urls TEXT;
      ALTER TABLE institution_hostels ADD COLUMN IF NOT EXISTS facilities TEXT;
      ALTER TABLE institution_hostels ADD COLUMN IF NOT EXISTS canteen_available BOOLEAN DEFAULT TRUE;
      ALTER TABLE institution_hostels ADD COLUMN IF NOT EXISTS canteen_details TEXT;
      ALTER TABLE institution_hostels ADD COLUMN IF NOT EXISTS mess_menu_details TEXT;
      ALTER TABLE institution_hostels ADD COLUMN IF NOT EXISTS mess_menu_urls TEXT;
      ALTER TABLE institution_hostels ADD COLUMN IF NOT EXISTS sell_on_marketplace BOOLEAN DEFAULT FALSE;
      ALTER TABLE institution_hostels ADD COLUMN IF NOT EXISTS marketplace_price NUMERIC(12, 2) DEFAULT 0;
    `);

    schemaHostelReady = true;
  } catch (err) {
    console.error("Error setting up institution_hostels table:", err);
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureHostelTables();
    const url = new URL(req.url);
    const institutionIdParam = url.searchParams.get("institutionId") || req.headers.get("x-institution-id");

    let query = `
      SELECT 
        h.*,
        COALESCE(h.video_urls, '') AS video_urls,
        COALESCE(h.mess_menu_details, '') AS mess_menu_details,
        COALESCE(h.mess_menu_urls, '') AS mess_menu_urls,
        COALESCE(h.sell_on_marketplace, FALSE) AS sell_on_marketplace,
        COALESCE(h.marketplace_price, 0) AS marketplace_price,
        ip.name as institution_name,
        COALESCE(ip.name, ip.slug) as institution_org_name
      FROM institution_hostels h
      LEFT JOIN institution_profiles ip ON ip.id = h.institution_id
      WHERE COALESCE(h.is_active, TRUE) = TRUE
    `;
    const params: any[] = [];

    if (institutionIdParam && institutionIdParam !== "all" && !isNaN(Number(institutionIdParam))) {
      query += ` AND h.institution_id = $1`;
      params.push(Number(institutionIdParam));
    }

    query += ` ORDER BY h.id DESC`;

    const res = await db.query(query, params);

    return NextResponse.json({ data: res.rows });
  } catch (err: any) {
    console.error("GET /api/admin/institution/hostels error:", err);
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
    const monthlyRent = Number(body.monthly_rent || 4500);
    const roomTypes = String(body.room_types || "Single, Double & Triple Sharing").trim();
    const messFacility = String(body.mess_facility || "Four Meals Daily (Veg & Non-Veg)").trim();
    const acAvailable = Boolean(body.ac_available ?? true);
    const wifiAvailable = Boolean(body.wifi_available ?? true);
    const canteenAvailable = Boolean(body.canteen_available ?? true);
    const canteenDetails = String(body.canteen_details || "Student mess & cafeteria menu").trim();
    const messMenuDetails = String(body.mess_menu_details || "").trim();
    const messMenuUrls = String(body.mess_menu_urls || "").trim();
    const facilities = String(body.facilities || "1Gbps Wi-Fi, 24x7 Security, Power Backup, Gym, Biometric Access").trim();
    const galleryUrls = String(body.gallery_urls || "").trim();
    const videoUrls = String(body.video_urls || "").trim();
    const securityDeposit = Number(body.security_deposit || 5000);
    const description = String(body.description || "").trim();
    const rules = String(body.rules || "").trim();
    const sellOnMarketplace = Boolean(body.sell_on_marketplace ?? false);
    const marketplacePrice = Number(body.marketplace_price ?? (sellOnMarketplace ? body.monthly_rent || 0 : 0));

    let institutionId: number = Number(body.institution_id || 1);
    if (!institutionId || isNaN(institutionId)) {
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
          institution_id = $1,
          name = $2,
          type = $3,
          capacity = $4,
          available_beds = $5,
          annual_fee = $6,
          monthly_rent = $7,
          room_types = $8,
          mess_facility = $9,
          ac_available = $10,
          wifi_available = $11,
          canteen_available = $12,
          canteen_details = $13,
          facilities = $14,
          gallery_urls = $15,
          security_deposit = $16,
          description = $17,
          rules = $18,
          sell_on_marketplace = $19,
          marketplace_price = $20,
          video_urls = $21,
          mess_menu_details = $22,
          mess_menu_urls = $23,
          updated_at = NOW()
        WHERE id = $24
        RETURNING *`,
        [
          institutionId, name, type, capacity, availableBeds, annualFee, monthlyRent,
          roomTypes, messFacility, acAvailable, wifiAvailable, canteenAvailable,
          canteenDetails, facilities, galleryUrls, securityDeposit, description, rules,
          sellOnMarketplace, marketplacePrice, videoUrls, messMenuDetails, messMenuUrls,
          Number(body.id),
        ]
      );
      return NextResponse.json({ success: true, data: updateRes.rows[0] });
    } else {
      // Insert
      const insertRes = await db.query(
        `INSERT INTO institution_hostels (
          institution_id, name, type, capacity, available_beds, annual_fee, monthly_rent,
          room_types, mess_facility, ac_available, wifi_available, canteen_available,
          canteen_details, facilities, gallery_urls, security_deposit, description, rules,
          sell_on_marketplace, marketplace_price, video_urls, mess_menu_details, mess_menu_urls
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
        RETURNING *`,
        [
          institutionId, name, type, capacity, availableBeds, annualFee, monthlyRent,
          roomTypes, messFacility, acAvailable, wifiAvailable, canteenAvailable,
          canteenDetails, facilities, galleryUrls, securityDeposit, description, rules,
          sellOnMarketplace, marketplacePrice, videoUrls, messMenuDetails, messMenuUrls,
        ]
      );
      return NextResponse.json({ success: true, data: insertRes.rows[0] });
    }
  } catch (err: any) {
    console.error("POST /api/admin/institution/hostels error:", err);
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
