import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";

type CurrentUser = Awaited<ReturnType<typeof getAuthenticatedUser>>;

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
    slab_name: "Zone C — Suburban & Extended",
    min_km: 10,
    max_km: 20,
    monthly_fee: 1200,
    quarterly_fee: 3400,
    annual_fee: 12800,
    one_way_discount_percent: 25,
    vehicle_type: "all",
    description: "Outer sectors, suburban residential belts, and express corridors (10–20 km)",
    display_order: 3,
  },
  {
    slab_name: "Zone D — Outer District",
    min_km: 20,
    max_km: 35,
    monthly_fee: 1800,
    quarterly_fee: 5100,
    annual_fee: 19500,
    one_way_discount_percent: 25,
    vehicle_type: "all",
    description: "Outer perimeter, neighboring rural/urban peripheries, and regional highway stops (20–35 km)",
    display_order: 4,
  },
  {
    slab_name: "Zone E — Long Distance Express",
    min_km: 35,
    max_km: 60,
    monthly_fee: 2500,
    quarterly_fee: 7100,
    annual_fee: 27000,
    one_way_discount_percent: 25,
    vehicle_type: "all",
    description: "Inter-town special chartered transport routes (35+ km)",
    display_order: 5,
  },
];

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json().catch(() => ({}));
    const rawInstitutionId = body.institutionId ? Number(body.institutionId) : null;

    let targetInstId: number | null = null;
    if (isPlatformAdminUser(user)) {
      targetInstId = rawInstitutionId;
    } else if (isInstitutionAdminUser(user)) {
      const allowed = userInstitutionIds(user);
      targetInstId = rawInstitutionId && allowed.has(rawInstitutionId) ? rawInstitutionId : Array.from(allowed)[0] ?? null;
      if (!targetInstId) {
        return NextResponse.json({ error: "Forbidden: Institution access required" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Insert default slabs that don't already exist for this institution
    for (const slab of DEFAULT_SLABS) {
      await db.query(
        `
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, NOW(), NOW())
        `,
        [
          targetInstId,
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

    // Fetch and return the newly populated list
    const res = await db.query(
      `
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
      WHERE institution_id = $1
      ORDER BY min_km ASC, display_order ASC;
      `,
      [targetInstId]
    );

    return NextResponse.json({
      success: true,
      message: "Standard distance slabs seeded successfully",
      data: res.rows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 400 }
    );
  }
}
