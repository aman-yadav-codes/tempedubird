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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: rawId } = await params;
    const slabId = Number(rawId);
    if (!Number.isInteger(slabId) || slabId <= 0) {
      return NextResponse.json({ error: "Invalid slab ID" }, { status: 400 });
    }

    const body = await req.json();

    // Check existing slab
    const existingRes = await db.query(
      `SELECT * FROM institution_transport_fee_slabs WHERE id = $1`,
      [slabId]
    );
    if (existingRes.rowCount === 0) {
      return NextResponse.json({ error: "Slab not found" }, { status: 404 });
    }
    const existing = existingRes.rows[0];

    // Verify scope
    if (!isPlatformAdminUser(user)) {
      if (!isInstitutionAdminUser(user)) {
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
      }
      const allowedInstIds = userInstitutionIds(user);
      if (existing.institution_id && !allowedInstIds.has(Number(existing.institution_id))) {
        return NextResponse.json({ error: "Forbidden: Access denied to this institution slab" }, { status: 403 });
      }
    }

    const slabName = body.slab_name !== undefined ? String(body.slab_name).trim() : existing.slab_name;
    const minKm = body.min_km !== undefined ? Number(body.min_km) : Number(existing.min_km);
    const maxKm = body.max_km !== undefined ? Number(body.max_km) : Number(existing.max_km);
    const monthlyFee = body.monthly_fee !== undefined ? Number(body.monthly_fee) : Number(existing.monthly_fee);

    if (minKm < 0 || Number.isNaN(minKm)) {
      return NextResponse.json({ error: "Min KM must be a positive number or 0" }, { status: 400 });
    }
    if (maxKm <= minKm || Number.isNaN(maxKm)) {
      return NextResponse.json({ error: "Max KM must be greater than Min KM" }, { status: 400 });
    }
    if (monthlyFee < 0 || Number.isNaN(monthlyFee)) {
      return NextResponse.json({ error: "Monthly Fee must be a valid amount" }, { status: 400 });
    }

    const quarterlyFee = body.quarterly_fee !== undefined ? (body.quarterly_fee ? Number(body.quarterly_fee) : null) : existing.quarterly_fee;
    const annualFee = body.annual_fee !== undefined ? (body.annual_fee ? Number(body.annual_fee) : null) : existing.annual_fee;
    const oneWayDiscount = body.one_way_discount_percent !== undefined ? Number(body.one_way_discount_percent) : Number(existing.one_way_discount_percent || 0);
    const vehicleType = body.vehicle_type !== undefined ? String(body.vehicle_type).trim() : existing.vehicle_type;
    const description = body.description !== undefined ? (body.description ? String(body.description).trim() : null) : existing.description;
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : existing.is_active;
    const displayOrder = body.display_order !== undefined ? Number(body.display_order) : existing.display_order;

    const updateQuery = `
      UPDATE institution_transport_fee_slabs
      SET
        slab_name = $1,
        min_km = $2,
        max_km = $3,
        monthly_fee = $4,
        quarterly_fee = $5,
        annual_fee = $6,
        one_way_discount_percent = $7,
        vehicle_type = $8,
        description = $9,
        is_active = $10,
        display_order = $11,
        updated_at = NOW()
      WHERE id = $12
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

    const res = await db.query(updateQuery, [
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
      slabId,
    ]);

    return NextResponse.json({ data: res.rows[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: rawId } = await params;
    const slabId = Number(rawId);
    if (!Number.isInteger(slabId) || slabId <= 0) {
      return NextResponse.json({ error: "Invalid slab ID" }, { status: 400 });
    }

    const existingRes = await db.query(
      `SELECT * FROM institution_transport_fee_slabs WHERE id = $1`,
      [slabId]
    );
    if (existingRes.rowCount === 0) {
      return NextResponse.json({ error: "Slab not found" }, { status: 404 });
    }
    const existing = existingRes.rows[0];

    // Verify scope
    if (!isPlatformAdminUser(user)) {
      if (!isInstitutionAdminUser(user)) {
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
      }
      const allowedInstIds = userInstitutionIds(user);
      if (existing.institution_id && !allowedInstIds.has(Number(existing.institution_id))) {
        return NextResponse.json({ error: "Forbidden: Access denied to this institution slab" }, { status: 403 });
      }
    }

    await db.query(`DELETE FROM institution_transport_fee_slabs WHERE id = $1`, [slabId]);

    return NextResponse.json({ success: true, message: "Slab deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 400 }
    );
  }
}
