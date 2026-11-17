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
    const status = searchParams.get("status"); // active, inactive, all
    const customerId = searchParams.get("id");

    // Single customer detail drilldown
    if (customerId) {
      const cId = Number(customerId);
      const [uRes, favRes, inqRes, revRes, repRes] = await Promise.all([
        db.query(
          `SELECT u.id, u.full_name, u.email, u.phone, u.avatar_url, u.is_active, u.created_at, u.last_login_at
           FROM users u
           WHERE u.id = $1`,
          [cId]
        ),
        db.query(
          `SELECT cf.id, cf.target_type, cf.created_at,
                  bp.name as business_name, bp.slug as business_slug,
                  pp.name as professional_name, pp.slug as professional_slug
           FROM customer_favorites cf
           LEFT JOIN business_profiles bp ON bp.id = cf.business_id
           LEFT JOIN professional_profiles pp ON pp.id = cf.professional_id
           WHERE cf.user_id = $1
           ORDER BY cf.created_at DESC`,
          [cId]
        ),
        db.query(
          `SELECT ci.id, ci.message, ci.status, ci.created_at,
                  bp.name as business_name, pp.name as professional_name
           FROM customer_inquiries ci
           LEFT JOIN business_profiles bp ON bp.id = ci.business_id
           LEFT JOIN professional_profiles pp ON pp.id = ci.professional_id
           WHERE ci.customer_user_id = $1
           ORDER BY ci.created_at DESC`,
          [cId]
        ),
        db.query(
          `SELECT pr.id, pr.rating, pr.title, pr.comment, pr.created_at,
                  bp.name as business_name, pp.name as professional_name
           FROM platform_reviews pr
           LEFT JOIN business_profiles bp ON bp.id = pr.business_id
           LEFT JOIN professional_profiles pp ON pp.id = pr.professional_id
           WHERE pr.author_user_id = $1
           ORDER BY pr.created_at DESC`,
          [cId]
        ),
        db.query(
          `SELECT lr.id, lr.target_type, lr.report_reason, lr.description, lr.status, lr.created_at
           FROM listing_reports lr
           WHERE lr.reporter_user_id = $1
           ORDER BY lr.created_at DESC`,
          [cId]
        ),
      ]);

      if (!uRes.rows[0]) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        customer: {
          ...uRes.rows[0],
          favorites: favRes.rows,
          inquiries: inqRes.rows,
          reviews: revRes.rows,
          reports: repRes.rows,
        },
      });
    }

    // List all customers
    const where: string[] = ["COALESCE(u.is_deleted, FALSE) = FALSE"];
    const params: any[] = [];
    let pIdx = 1;

    // Filter to customers
    where.push(`(
      EXISTS (
        SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
        WHERE ur.user_id = u.id AND r.code = 'customer'
      ) OR NOT EXISTS (
        SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = u.id AND r.code IN ('super_admin', 'platform_admin', 'institution_admin', 'staff', 'teacher')
      )
    )`);

    if (search) {
      where.push(`(LOWER(u.full_name) LIKE $${pIdx} OR LOWER(u.email) LIKE $${pIdx} OR u.phone LIKE $${pIdx})`);
      params.push(`%${search}%`);
      pIdx++;
    }

    if (status === "active") {
      where.push(`u.is_active = TRUE`);
    } else if (status === "inactive") {
      where.push(`u.is_active = FALSE`);
    }

    const query = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.avatar_url,
        u.is_active,
        u.created_at,
        u.last_login_at,
        (SELECT COUNT(*)::int FROM customer_favorites cf WHERE cf.user_id = u.id) as favorites_count,
        (SELECT COUNT(*)::int FROM customer_inquiries ci WHERE ci.customer_user_id = u.id) as inquiries_count,
        (SELECT COUNT(*)::int FROM platform_reviews pr WHERE pr.author_user_id = u.id) as reviews_count,
        (SELECT COUNT(*)::int FROM listing_reports lr WHERE lr.reporter_user_id = u.id) as reports_count
      FROM users u
      WHERE ${where.join(" AND ")}
      ORDER BY u.created_at DESC
      LIMIT 100
    `;

    const result = await db.query(query, params);

    return NextResponse.json({
      success: true,
      customers: result.rows,
      totalCount: result.rows.length,
    });
  } catch (err: unknown) {
    console.error("[GET /api/admin/customers] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load customers" },
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
    const { customerId, isActive } = body;

    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    await db.query(
      `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2`,
      [Boolean(isActive), Number(customerId)]
    );

    return NextResponse.json({ success: true, message: `Customer status updated` });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update customer" },
      { status: 500 }
    );
  }
}

