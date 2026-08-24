import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

let schemaReady = false;

const DEFAULT_AMENITIES = [
  "1Gbps High-Speed Wi-Fi",
  "24x7 Power Backup Generator",
  "Biometric & RFID Security Access",
  "Modern Gymnasium & Fitness Center",
  "Automated Laundry & Ironing",
  "Dedicated Quiet Study Rooms",
  "RO UV Drinking Water Stations",
  "Hot Water Geysers / Solar Heating",
  "CCTV 24x7 Campus Surveillance",
  "First Aid & Emergency Doctor on Call",
  "Indoor Sports & Recreation Area",
  "Daily Room Housekeeping & Sanitation",
  "Air Conditioned (AC) Rooms",
  "Attached Private Washroom",
  "Dedicated Vehicle Parking",
];

const DEFAULT_RULES = [
  { title: "Night Curfew: Campus gates close strictly at 10:00 PM.", description: "All residents must return to hostel premises before 10:00 PM." },
  { title: "Visitor Policy: Visitors only permitted in the reception lounge until 7:00 PM.", description: "Outside guests are strictly forbidden from entering student rooms." },
  { title: "Strict Anti-Ragging Policy: Zero tolerance with immediate disciplinary action.", description: "Ragging in any form will lead to immediate expulsion and police notification." },
  { title: "Quiet Hours: Low noise levels between 10:00 PM and 6:00 AM.", description: "Ensure silence in corridors and study areas during designated night hours." },
  { title: "Leave Pass: Warden approval mandatory for overnight stay outside campus.", description: "Parents must authorize overnight leaves via written or SMS confirmation." },
  { title: "Safety Inspection: Weekly room safety and cleanliness checks.", description: "Routine health and hygiene checks conducted by the warden." },
  { title: "Substance Prohibition: Smoking, alcohol, and prohibited substances banned.", description: "Campus is a 100% tobacco, alcohol, and drug-free zone." },
  { title: "Mandatory Attendance: Daily roll-call attendance check at 9:00 PM.", description: "Residents must mark biometric/physical attendance before curfew." },
];

async function ensureMasterTables() {
  if (schemaReady) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS hostel_master_amenities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(100) DEFAULT 'General',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS hostel_master_rules (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        category VARCHAR(100) DEFAULT 'General',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed defaults if empty
    const amCount = await db.query(`SELECT COUNT(*)::int AS count FROM hostel_master_amenities`);
    if (Number(amCount.rows[0]?.count || 0) === 0) {
      for (const item of DEFAULT_AMENITIES) {
        await db.query(`INSERT INTO hostel_master_amenities (name) VALUES ($1) ON CONFLICT DO NOTHING`, [item]);
      }
    }

    const ruleCount = await db.query(`SELECT COUNT(*)::int AS count FROM hostel_master_rules`);
    if (Number(ruleCount.rows[0]?.count || 0) === 0) {
      for (const r of DEFAULT_RULES) {
        await db.query(`INSERT INTO hostel_master_rules (title, description) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [r.title, r.description]);
      }
    }

    schemaReady = true;
  } catch (err) {
    console.error("Error setting up hostel master tables:", err);
  }
}

export async function GET(req: Request) {
  try {
    await ensureMasterTables();
    const [amenitiesRes, rulesRes] = await Promise.all([
      db.query(`SELECT id, name FROM hostel_master_amenities ORDER BY id ASC`),
      db.query(`SELECT id, title, description FROM hostel_master_rules ORDER BY id ASC`),
    ]);

    return NextResponse.json({
      amenities: amenitiesRes.rows.map((r) => r.name),
      amenityObjects: amenitiesRes.rows,
      rules: rulesRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/admin/institution/hostels/master-config error:", err);
    return NextResponse.json({
      amenities: DEFAULT_AMENITIES,
      rules: DEFAULT_RULES.map((r, idx) => ({ id: idx + 1, ...r })),
    });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureMasterTables();
    const body = await req.json();
    const { type, name, title, description } = body;

    if (type === "amenity") {
      const amenityName = String(name || "").trim();
      if (!amenityName) {
        return NextResponse.json({ error: "Amenity name is required" }, { status: 400 });
      }

      const res = await db.query(
        `INSERT INTO hostel_master_amenities (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *`,
        [amenityName]
      );
      return NextResponse.json({ success: true, amenity: res.rows[0] });
    }

    if (type === "rule") {
      const ruleTitle = String(title || "").trim();
      const ruleDesc = String(description || "").trim();
      if (!ruleTitle) {
        return NextResponse.json({ error: "Rule title is required" }, { status: 400 });
      }

      const res = await db.query(
        `INSERT INTO hostel_master_rules (title, description) VALUES ($1, $2) ON CONFLICT (title) DO UPDATE SET description = EXCLUDED.description RETURNING *`,
        [ruleTitle, ruleDesc]
      );
      return NextResponse.json({ success: true, rule: res.rows[0] });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/admin/institution/hostels/master-config error:", err);
    return NextResponse.json({ error: err.message || "Failed to save master config" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureMasterTables();
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const id = url.searchParams.get("id");
    const name = url.searchParams.get("name");

    if (type === "amenity") {
      if (id) {
        await db.query(`DELETE FROM hostel_master_amenities WHERE id = $1`, [Number(id)]);
      } else if (name) {
        await db.query(`DELETE FROM hostel_master_amenities WHERE name = $1`, [name]);
      }
      return NextResponse.json({ success: true });
    }

    if (type === "rule") {
      if (id) {
        await db.query(`DELETE FROM hostel_master_rules WHERE id = $1`, [Number(id)]);
      } else if (name) {
        await db.query(`DELETE FROM hostel_master_rules WHERE title = $1`, [name]);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete item" }, { status: 500 });
  }
}
