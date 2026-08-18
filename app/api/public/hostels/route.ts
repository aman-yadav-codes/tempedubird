import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  try {
    const hostelsRes = await db.query(`
      SELECT
        h.id,
        h.institution_id,
        h.name,
        h.type,
        h.capacity,
        h.available_beds,
        h.annual_fee,
        h.room_types,
        h.mess_facility,
        h.ac_available,
        h.wifi_available,
        h.security_deposit,
        h.description,
        h.rules,
        h.created_at,
        p.name AS institution_name,
        p.city AS institution_city,
        p.logo_url AS institution_logo
      FROM institution_hostels h
      LEFT JOIN user_profiles p ON p.id = h.institution_id
      ORDER BY h.id DESC
    `);

    return NextResponse.json({
      success: true,
      hostels: hostelsRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/public/hostels error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch hostels" }, { status: 500 });
  }
}
