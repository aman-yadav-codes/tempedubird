import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ success: true, data: [] });
    }

    const res = await db.query(
      `SELECT
         f.id,
         f.target_type,
         f.business_id,
         f.professional_id,
         f.product_id,
         f.service_id,
         f.created_at,
         bp.name AS business_name,
         bp.city AS business_city,
         bp.business_type,
         bp.logo_url AS business_logo,
         pp.name AS professional_name,
         pp.city AS professional_city,
         pp.profession_type,
         pp.avatar_url AS professional_avatar
       FROM customer_favorites f
       LEFT JOIN business_profiles bp ON bp.id = f.business_id
       LEFT JOIN professional_profiles pp ON pp.id = f.professional_id
       WHERE f.user_id = $1
       ORDER BY f.id DESC`,
      [user.id]
    );

    return NextResponse.json({ success: true, data: res.rows });
  } catch (err: unknown) {
    console.error("[favorites GET] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load favorites" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Please log in to save favorites" }, { status: 401 });
    }

    const body = await req.json();
    const targetType = body.targetType; // 'business' | 'professional' | 'product' | 'service'
    const businessId = body.businessId ? Number(body.businessId) : null;
    const professionalId = body.professionalId ? Number(body.professionalId) : null;
    const productId = body.productId ? Number(body.productId) : null;
    const serviceId = body.serviceId ? Number(body.serviceId) : null;

    if (!targetType) {
      return NextResponse.json({ error: "targetType is required" }, { status: 400 });
    }

    // Check if already favorited
    const existing = await db.query(
      `SELECT id FROM customer_favorites
       WHERE user_id = $1 AND target_type = $2
         AND ($3::int IS NULL OR business_id = $3)
         AND ($4::int IS NULL OR professional_id = $4)
         AND ($5::int IS NULL OR product_id = $5)
         AND ($6::int IS NULL OR service_id = $6)
       LIMIT 1`,
      [user.id, targetType, businessId, professionalId, productId, serviceId]
    );

    if (existing.rows.length > 0) {
      // Toggle off (remove)
      await db.query(`DELETE FROM customer_favorites WHERE id = $1`, [existing.rows[0].id]);
      return NextResponse.json({ success: true, saved: false, message: "Removed from saved favorites" });
    }

    // Insert new favorite
    const res = await db.query(
      `INSERT INTO customer_favorites (user_id, target_type, business_id, professional_id, product_id, service_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [user.id, targetType, businessId, professionalId, productId, serviceId]
    );

    return NextResponse.json({ success: true, saved: true, data: res.rows[0], message: "Saved to your favorites!" });
  } catch (err: unknown) {
    console.error("[favorites POST] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to toggle favorite" },
      { status: 500 }
    );
  }
}

