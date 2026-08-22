import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get("institutionId") ? Number(searchParams.get("institutionId")) : null;
    const search = searchParams.get("search")?.trim() || "";

    const whereConditions: string[] = ["COALESCE(h.is_active, TRUE) = TRUE"];
    const params: unknown[] = [];

    if (institutionId && Number.isInteger(institutionId) && institutionId > 0) {
      params.push(institutionId);
      whereConditions.push(`h.institution_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(h.name ILIKE $${params.length} OR h.type ILIKE $${params.length} OR ip.name ILIKE $${params.length})`);
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const hostelsRes = await db.query(`
      SELECT
        h.id,
        h.institution_id,
        h.name,
        h.type,
        h.capacity,
        h.available_beds,
        h.annual_fee,
        COALESCE(h.monthly_rent, '₹4,500/mo') AS monthly_rent,
        h.room_types,
        h.mess_facility,
        h.ac_available,
        h.wifi_available,
        h.canteen_available,
        h.canteen_details,
        h.facilities,
        h.gallery_urls,
        h.security_deposit,
        h.description,
        h.rules,
        h.created_at,
        COALESCE(ip.name, ip.slug, 'Institution') AS institution_name,
        ip.slug AS institution_slug
      FROM institution_hostels h
      LEFT JOIN institution_profiles ip ON ip.id = h.institution_id
      ${whereClause}
      ORDER BY h.id DESC
    `, params);

    return NextResponse.json({
      success: true,
      hostels: hostelsRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/public/hostels error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch hostels" }, { status: 500 });
  }
}
