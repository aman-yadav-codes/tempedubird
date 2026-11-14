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
    const ownerId = searchParams.get("id");

    // Drilldown details for a specific owner
    if (ownerId) {
      const oId = Number(ownerId);
      const [ownerRes, bizRes, instRes, invRes, subRes] = await Promise.all([
        db.query(
          `SELECT u.id, u.full_name, u.email, u.phone, u.avatar_url, u.is_active, u.created_at, u.last_login_at
           FROM users u
           WHERE u.id = $1`,
          [oId]
        ),
        db.query(
          `SELECT bp.id, bp.name, bp.slug, bp.business_type, bp.city, bp.country_code, bp.is_verified, bp.verification_status, bp.is_active, bp.created_at,
                  (SELECT COUNT(*)::int FROM business_products bprod WHERE bprod.business_profile_id = bp.id OR bprod.business_id = bp.id) as products_count,
                  (SELECT COUNT(*)::int FROM business_services bserv WHERE bserv.business_id = bp.id) as services_count,
                  COALESCE(jsonb_array_length(bp.branches), 0) as branches_count
           FROM business_profiles bp
           WHERE bp.user_id = $1
           ORDER BY bp.created_at DESC`,
          [oId]
        ),
        db.query(
          `SELECT ip.id, ip.name, ip.slug, 'Educational / Academic Institution' as business_type, '' as city, 'IN' as country_code,
                  (ip.status = 'verified') as is_verified, ip.status as verification_status, ip.is_active, ip.created_at,
                  (SELECT COUNT(*)::int FROM products p WHERE p.institution_id = ip.id) as products_count,
                  0 as services_count,
                  0 as branches_count
           FROM institution_profiles ip
           WHERE ip.created_by = $1 AND COALESCE(ip.is_deleted, false) = false
           ORDER BY ip.created_at DESC`,
          [oId]
        ),
        db.query(
          `SELECT fie.id, fie.transaction_id, fie.amount, fie.payment_method, fie.payment_status, fie.income_date
           FROM finance_income_entries fie
           WHERE fie.payer_name = (SELECT full_name FROM users WHERE id = $1)
           ORDER BY fie.income_date DESC LIMIT 10`,
          [oId]
        ),
        db.query(
          `SELECT s.id, s.plan_name, s.status, s.price, s.billing_cycle, s.start_date, s.end_date
           FROM subscriptions s
           WHERE s.user_id = $1
           ORDER BY s.created_at DESC LIMIT 5`,
          [oId]
        ),
      ]);

      if (!ownerRes.rows[0]) {
        return NextResponse.json({ error: "Business owner not found" }, { status: 404 });
      }

      const combinedBusinesses = [...bizRes.rows, ...instRes.rows];

      return NextResponse.json({
        success: true,
        owner: {
          ...ownerRes.rows[0],
          businesses: combinedBusinesses,
          payments: invRes.rows,
          subscriptions: subRes.rows,
        },
      });
    }

    // List all business owners
    let query = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.avatar_url,
        u.is_active,
        u.created_at,
        u.last_login_at,
        (COUNT(DISTINCT bp.id) + COUNT(DISTINCT ip.id))::int as businesses_count,
        (
          COALESCE(SUM((SELECT COUNT(*)::int FROM business_products bprod WHERE bprod.business_profile_id = bp.id OR bprod.business_id = bp.id)), 0) +
          COALESCE(SUM((SELECT COUNT(*)::int FROM products p WHERE p.institution_id = ip.id)), 0)
        )::int as total_products,
        COALESCE(SUM((SELECT COUNT(*)::int FROM business_services bserv WHERE bserv.business_id = bp.id)), 0)::int as total_services,
        BOOL_OR(COALESCE(bp.is_verified, FALSE) OR COALESCE(ip.status, '') = 'verified') as has_verified_business,
        (SELECT s.plan_name FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' LIMIT 1) as active_subscription_plan
      FROM users u
      LEFT JOIN business_profiles bp ON bp.user_id = u.id
      LEFT JOIN institution_profiles ip ON ip.created_by = u.id AND COALESCE(ip.is_deleted, false) = false
      WHERE COALESCE(u.is_deleted, FALSE) = FALSE
        AND (
          bp.id IS NOT NULL 
          OR ip.id IS NOT NULL
          OR EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON r.id = ur.role_id 
            WHERE ur.user_id = u.id AND r.code IN ('institution_admin', 'business_owner', 'client')
          )
        )
    `;
    const params: any[] = [];
    let pIdx = 1;

    if (search) {
      query += ` AND (LOWER(u.full_name) LIKE $${pIdx} OR LOWER(u.email) LIKE $${pIdx} OR u.phone LIKE $${pIdx} OR LOWER(COALESCE(bp.name, '')) LIKE $${pIdx} OR LOWER(COALESCE(ip.name, '')) LIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }

    query += `
      GROUP BY u.id, u.full_name, u.email, u.phone, u.avatar_url, u.is_active, u.created_at, u.last_login_at
      ORDER BY u.created_at DESC
      LIMIT 100
    `;

    const result = await db.query(query, params);

    return NextResponse.json({
      success: true,
      owners: result.rows,
      totalCount: result.rows.length,
    });
  } catch (err: unknown) {
    console.error("[GET /api/admin/business-owners] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load business owners" },
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
    const { ownerId, isActive } = body;

    if (!ownerId) {
      return NextResponse.json({ error: "ownerId is required" }, { status: 400 });
    }

    // Suspend or reactivate user and their business profiles
    await db.query(
      `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2`,
      [Boolean(isActive), Number(ownerId)]
    );
    await db.query(
      `UPDATE business_profiles SET is_active = $1, updated_at = NOW() WHERE user_id = $2`,
      [Boolean(isActive), Number(ownerId)]
    );

    return NextResponse.json({
      success: true,
      message: `Business owner and associated listings ${isActive ? "reactivated" : "suspended"} successfully`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update business owner" },
      { status: 500 }
    );
  }
}

