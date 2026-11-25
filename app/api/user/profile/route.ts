import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await db.query(
      `SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.avatar_url,
        u.created_at,
        up.gender,
        up.date_of_birth,
        up.blood_group,
        up.marital_status,
        up.address,
        up.emergency_contact_name,
        up.emergency_contact_phone,
        up.designation,
        up.department,
        up.joining_date,
        up.bank_name,
        up.account_number,
        up.ifsc_code,
        up.pan_number,
        up.uan_number
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id = $1`,
      [user.id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: res.rows[0] });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/user/profile error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      full_name,
      phone,
      gender,
      date_of_birth,
      blood_group,
      marital_status,
      address,
      emergency_contact_name,
      emergency_contact_phone,
    } = body;

    // 1. Update basic user credentials in users table
    if (full_name !== undefined || phone !== undefined) {
      await db.query(
        `UPDATE users 
         SET full_name = COALESCE($1, full_name),
             phone = COALESCE($2, phone),
             updated_at = NOW()
         WHERE id = $3`,
        [full_name !== undefined ? full_name : null, phone !== undefined ? phone : null, user.id]
      );
    }

    // 2. Upsert biographical & personal records in user_profiles table
    await db.query(
      `INSERT INTO user_profiles (
        user_id,
        gender,
        date_of_birth,
        blood_group,
        marital_status,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        gender = COALESCE(EXCLUDED.gender, user_profiles.gender),
        date_of_birth = COALESCE(EXCLUDED.date_of_birth, user_profiles.date_of_birth),
        blood_group = COALESCE(EXCLUDED.blood_group, user_profiles.blood_group),
        marital_status = COALESCE(EXCLUDED.marital_status, user_profiles.marital_status),
        address = COALESCE(EXCLUDED.address, user_profiles.address),
        emergency_contact_name = COALESCE(EXCLUDED.emergency_contact_name, user_profiles.emergency_contact_name),
        emergency_contact_phone = COALESCE(EXCLUDED.emergency_contact_phone, user_profiles.emergency_contact_phone),
        updated_at = NOW()`,
      [
        user.id,
        gender !== undefined ? gender : null,
        date_of_birth !== undefined ? date_of_birth : null,
        blood_group !== undefined ? blood_group : null,
        marital_status !== undefined ? marital_status : null,
        address !== undefined ? address : null,
        emergency_contact_name !== undefined ? emergency_contact_name : null,
        emergency_contact_phone !== undefined ? emergency_contact_phone : null,
      ]
    );

    // 3. Fetch latest combined user profile
    const updated = await db.query(
      `SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.avatar_url,
        u.created_at,
        up.gender,
        up.date_of_birth,
        up.blood_group,
        up.marital_status,
        up.address,
        up.emergency_contact_name,
        up.emergency_contact_phone,
        up.designation,
        up.department,
        up.joining_date,
        up.bank_name,
        up.account_number,
        up.ifsc_code,
        up.pan_number,
        up.uan_number
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id = $1`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: updated.rows[0],
    });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/user/profile error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
