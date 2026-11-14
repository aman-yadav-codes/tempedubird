import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const status = searchParams.get("status"); // active, inactive, pending, verified
    const professionalId = searchParams.get("id");

    // Drilldown detail for a single professional
    if (professionalId) {
      const pId = Number(professionalId);
      const [pRes, sRes, rRes, eRes] = await Promise.all([
        db.query(
          `SELECT pp.*, u.full_name as owner_name, u.email as owner_email, u.phone as owner_phone
           FROM professional_profiles pp
           LEFT JOIN users u ON u.id = pp.user_id
           WHERE pp.id = $1`,
          [pId]
        ),
        db.query(
          `SELECT ps.*, ms.name as master_service_name, ms.pricing_model, ms.suggested_price
           FROM professional_services ps
           LEFT JOIN master_services ms ON ms.id = ps.master_service_id
           WHERE ps.professional_id = $1
           ORDER BY ps.id ASC`,
          [pId]
        ),
        db.query(
          `SELECT pr.id, pr.rating, pr.title, pr.comment, pr.created_at, u.full_name as reviewer_name
           FROM platform_reviews pr
           LEFT JOIN users u ON u.id = pr.author_user_id
           WHERE pr.professional_id = $1
           ORDER BY pr.created_at DESC LIMIT 10`,
          [pId]
        ),
        db.query(
          `SELECT ci.id, ci.customer_name, ci.customer_email, ci.customer_phone, ci.message, ci.status, ci.created_at
           FROM customer_inquiries ci
           WHERE ci.professional_id = $1
           ORDER BY ci.created_at DESC LIMIT 10`,
          [pId]
        ),
      ]);

      if (!pRes.rows[0]) {
        return NextResponse.json({ error: "Professional not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        professional: {
          ...pRes.rows[0],
          services: sRes.rows,
          reviews: rRes.rows,
          enquiries: eRes.rows,
        },
      });
    }

    // List all professionals
    const where: string[] = ["1=1"];
    const params: any[] = [];
    let pIdx = 1;

    if (search) {
      where.push(`(
        LOWER(pp.name) LIKE $${pIdx} OR 
        LOWER(COALESCE(pp.professional_title, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(pp.profession_type, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(pp.city, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(u.full_name, '')) LIKE $${pIdx}
      )`);
      params.push(`%${search}%`);
      pIdx++;
    }

    if (status === "active") {
      where.push(`pp.is_active = TRUE`);
    } else if (status === "inactive") {
      where.push(`pp.is_active = FALSE`);
    } else if (status === "pending") {
      where.push(`pp.verification_status = 'pending'`);
    } else if (status === "verified") {
      where.push(`pp.is_verified = TRUE`);
    }

    const query = `
      SELECT 
        pp.id,
        pp.user_id,
        pp.name,
        pp.slug,
        pp.professional_title,
        pp.profession_type,
        pp.phone,
        pp.email,
        pp.city,
        pp.state,
        pp.country_code,
        pp.experience_years,
        pp.is_active,
        pp.is_verified,
        pp.verification_status,
        pp.remote_available,
        pp.onsite_available,
        pp.created_at,
        u.full_name as owner_name,
        (SELECT COUNT(*)::int FROM professional_services ps WHERE ps.professional_id = pp.id) as services_count,
        (SELECT COUNT(*)::int FROM platform_reviews pr WHERE pr.professional_id = pp.id) as reviews_count,
        (SELECT COALESCE(AVG(pr.rating), 0)::numeric(2,1) FROM platform_reviews pr WHERE pr.professional_id = pp.id) as average_rating,
        (SELECT COUNT(*)::int FROM customer_inquiries ci WHERE ci.professional_id = pp.id) as enquiries_count
      FROM professional_profiles pp
      LEFT JOIN users u ON u.id = pp.user_id
      WHERE ${where.join(" AND ")}
      ORDER BY pp.created_at DESC
      LIMIT 100
    `;

    const result = await db.query(query, params);

    return NextResponse.json({
      success: true,
      professionals: result.rows,
      totalCount: result.rows.length,
    });
  } catch (err: unknown) {
    console.error("[GET /api/admin/professionals] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load professionals" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { professionalId, action, verificationStatus, isActive, isVerified } = body;

    if (!professionalId) {
      return NextResponse.json({ error: "professionalId is required" }, { status: 400 });
    }

    const pId = Number(professionalId);

    if (action === "approve") {
      await db.query(
        `UPDATE professional_profiles SET verification_status = 'approved', is_verified = TRUE, updated_at = NOW() WHERE id = $1`,
        [pId]
      );
    } else if (action === "reject") {
      await db.query(
        `UPDATE professional_profiles SET verification_status = 'rejected', is_verified = FALSE, updated_at = NOW() WHERE id = $1`,
        [pId]
      );
    } else if (action === "verify") {
      await db.query(
        `UPDATE professional_profiles SET is_verified = $1, updated_at = NOW() WHERE id = $2`,
        [Boolean(isVerified), pId]
      );
    } else if (action === "toggle_status") {
      await db.query(
        `UPDATE professional_profiles SET is_active = $1, updated_at = NOW() WHERE id = $2`,
        [Boolean(isActive), pId]
      );
    } else {
      // General update
      const updates: string[] = ["updated_at = NOW()"];
      const params: any[] = [];
      let idx = 1;

      if (typeof isActive === "boolean") {
        updates.push(`is_active = $${idx++}`);
        params.push(isActive);
      }
      if (typeof isVerified === "boolean") {
        updates.push(`is_verified = $${idx++}`);
        params.push(isVerified);
      }
      if (verificationStatus) {
        updates.push(`verification_status = $${idx++}`);
        params.push(verificationStatus);
      }

      params.push(pId);
      await db.query(`UPDATE professional_profiles SET ${updates.join(", ")} WHERE id = $${idx}`, params);
    }

    return NextResponse.json({ success: true, message: "Professional profile updated successfully" });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update professional" },
      { status: 500 }
    );
  }
}

