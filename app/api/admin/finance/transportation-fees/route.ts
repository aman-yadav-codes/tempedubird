import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";

type CurrentUser = Awaited<ReturnType<typeof getAuthenticatedUser>>;

let schemaEnsured = false;
async function ensureTransportFeesSchema() {
  if (schemaEnsured) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS institution_transport_fee_slabs (
      id SERIAL PRIMARY KEY,
      institution_id INTEGER,
      slab_name VARCHAR(120) NOT NULL,
      min_km NUMERIC(6, 2) NOT NULL DEFAULT 0,
      max_km NUMERIC(6, 2) NOT NULL,
      monthly_fee NUMERIC(10, 2) NOT NULL,
      quarterly_fee NUMERIC(10, 2),
      annual_fee NUMERIC(10, 2),
      one_way_discount_percent NUMERIC(5, 2) DEFAULT 0,
      vehicle_type VARCHAR(60) DEFAULT 'all',
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_inst_transport_slabs_inst_id ON institution_transport_fee_slabs(institution_id);
    CREATE INDEX IF NOT EXISTS idx_inst_transport_slabs_km ON institution_transport_fee_slabs(min_km, max_km);
  `);
  schemaEnsured = true;
}

const DEFAULT_SLABS = [
  {
    slab_name: "Zone A — Local Radius",
    min_km: 0,
    max_km: 5,
    monthly_fee: 500,
    quarterly_fee: 1400,
    annual_fee: 5200,
    one_way_discount_percent: 25,
    vehicle_type: "all",
    description: "Immediate neighborhood and surrounding roads within 5 km distance",
    display_order: 1,
  },
  {
    slab_name: "Zone B — City Central",
    min_km: 5,
    max_km: 10,
    monthly_fee: 800,
    quarterly_fee: 2250,
    annual_fee: 8500,
    one_way_discount_percent: 25,
    vehicle_type: "all",
    description: "Town center, central residential complexes, and main road feeder stops (5–10 km)",
    display_order: 2,
  },
  {
    slab_name: "Zone C — Extended Suburbs",
    min_km: 10,
    max_km: 20,
    monthly_fee: 1200,
    quarterly_fee: 3400,
    annual_fee: 13000,
    one_way_discount_percent: 25,
    vehicle_type: "all",
    description: "Outlying sectors, bypass junctions, and adjacent towns (10–20 km)",
    display_order: 3,
  },
  {
    slab_name: "Zone D — Outer Perimeter",
    min_km: 20,
    max_km: 35,
    monthly_fee: 1800,
    quarterly_fee: 5100,
    annual_fee: 19500,
    one_way_discount_percent: 25,
    vehicle_type: "all",
    description: "Rural links, outer ring road, and distant townships (20–35 km)",
    display_order: 4,
  },
  {
    slab_name: "Zone E — Long Distance / Highway",
    min_km: 35,
    max_km: 60,
    monthly_fee: 2500,
    quarterly_fee: 7100,
    annual_fee: 27000,
    one_way_discount_percent: 20,
    vehicle_type: "bus",
    description: "Express corridor, satellite towns, and highway feeder points (35+ km)",
    display_order: 5,
  },
];

function userInstitutionIds(user: CurrentUser) {
  return new Set(
    (user.memberships ?? [])
      .filter((membership) =>
        [
          "institution_admin",
          "professional_organization",
          "school_owner",
          "college_owner",
          "university_owner",
          "library_owner",
          "pg_owner",
        ].includes(membership.role_code)
      )
      .map((membership) => Number(membership.institution_id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
}

function resolveScope(user: CurrentUser, institutionId: number | null): { isPlatform: boolean; institutionId: number | null } {
  if (!user) {
    return { isPlatform: false, institutionId };
  }

  if (isPlatformAdminUser(user)) {
    return { isPlatform: true, institutionId };
  }

  const institutionIds = userInstitutionIds(user);
  const targetId = institutionId ?? Array.from(institutionIds)[0] ?? null;
  return { isPlatform: false, institutionId: targetId };
}

export async function GET(req: NextRequest) {
  try {
    let user: CurrentUser | null = null;
    try {
      user = await getAuthenticatedUser(req);
    } catch {
      user = null;
    }
    await ensureTransportFeesSchema();

    const searchParams = req.nextUrl.searchParams;
    const instParam = searchParams.get("institutionId");
    const rawInstitutionId = instParam ? Number(instParam) : null;
    const { institutionId } = resolveScope(
      user,
      Number.isInteger(rawInstitutionId) && (rawInstitutionId ?? 0) > 0 ? rawInstitutionId : null
    );

    let query = `
      SELECT
        id,
        institution_id,
        slab_name,
        min_km::float AS min_km,
        max_km::float AS max_km,
        monthly_fee::float AS monthly_fee,
        quarterly_fee::float AS quarterly_fee,
        annual_fee::float AS annual_fee,
        one_way_discount_percent::float AS one_way_discount_percent,
        vehicle_type,
        description,
        is_active,
        display_order,
        created_at,
        updated_at
      FROM institution_transport_fee_slabs
    `;
    const params: any[] = [];

    if (institutionId) {
      params.push(institutionId);
      query += ` WHERE (institution_id = $1 OR institution_id IS NULL)`;
    }

    query += ` ORDER BY min_km ASC, display_order ASC, id ASC`;

    const res = await db.query(query, params);
    let rows = res.rows;

    if (rows.length === 0) {
      const seedTargetInstId = institutionId ?? null;
      for (const slab of DEFAULT_SLABS) {
        await db.query(
          `INSERT INTO institution_transport_fee_slabs (
            institution_id, slab_name, min_km, max_km, monthly_fee, quarterly_fee, annual_fee, one_way_discount_percent, vehicle_type, description, is_active, display_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)`,
          [
            seedTargetInstId,
            slab.slab_name,
            slab.min_km,
            slab.max_km,
            slab.monthly_fee,
            slab.quarterly_fee,
            slab.annual_fee,
            slab.one_way_discount_percent,
            slab.vehicle_type,
            slab.description,
            slab.display_order,
          ]
        );
      }
      const reQuery = await db.query(query, params);
      rows = reQuery.rows;
    }

    return NextResponse.json({ data: rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureTransportFeesSchema();

    const body = await req.json();
    const rawInstitutionId = body.institutionId ? Number(body.institutionId) : null;
    const { institutionId } = resolveScope(
      user,
      Number.isInteger(rawInstitutionId) && (rawInstitutionId ?? 0) > 0 ? rawInstitutionId : null
    );

    const slabName = String(body.slab_name || "").trim();
    if (!slabName) {
      return NextResponse.json({ error: "Slab / Zone name is required" }, { status: 400 });
    }

    const minKm = Number(body.min_km);
    const maxKm = Number(body.max_km);
    const monthlyFee = Number(body.monthly_fee);

    if (Number.isNaN(minKm) || minKm < 0) {
      return NextResponse.json({ error: "Min KM must be a positive number or 0" }, { status: 400 });
    }
    if (Number.isNaN(maxKm) || maxKm <= minKm) {
      return NextResponse.json({ error: "Max KM must be greater than Min KM" }, { status: 400 });
    }
    if (Number.isNaN(monthlyFee) || monthlyFee < 0) {
      return NextResponse.json({ error: "Monthly Fee must be a valid amount" }, { status: 400 });
    }

    const quarterlyFee = body.quarterly_fee ? Number(body.quarterly_fee) : null;
    const annualFee = body.annual_fee ? Number(body.annual_fee) : null;
    const oneWayDiscount = body.one_way_discount_percent ? Number(body.one_way_discount_percent) : 0;
    const vehicleType = String(body.vehicle_type || "all").trim();
    const description = body.description ? String(body.description).trim() : null;
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : true;
    const displayOrder = body.display_order ? Number(body.display_order) : 0;

    const insertQuery = `
      INSERT INTO institution_transport_fee_slabs (
        institution_id,
        slab_name,
        min_km,
        max_km,
        monthly_fee,
        quarterly_fee,
        annual_fee,
        one_way_discount_percent,
        vehicle_type,
        description,
        is_active,
        display_order,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING
        id,
        institution_id,
        slab_name,
        min_km::float AS min_km,
        max_km::float AS max_km,
        monthly_fee::float AS monthly_fee,
        quarterly_fee::float AS quarterly_fee,
        annual_fee::float AS annual_fee,
        one_way_discount_percent::float AS one_way_discount_percent,
        vehicle_type,
        description,
        is_active,
        display_order,
        created_at,
        updated_at;
    `;

    const res = await db.query(insertQuery, [
      institutionId,
      slabName,
      minKm,
      maxKm,
      monthlyFee,
      quarterlyFee,
      annualFee,
      oneWayDiscount,
      vehicleType,
      description,
      isActive,
      displayOrder,
    ]);

    return NextResponse.json({ data: res.rows[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 400 }
    );
  }
}
