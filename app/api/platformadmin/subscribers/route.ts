import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    let user = null;
    try {
      user = await getAuthenticatedUser(req);
    } catch {}

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const pageFilter = searchParams.get("page_name")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "25", 10)));
    const offset = (page - 1) * limit;

    const isPlatform = isPlatformAdminUser(user);

    // Build filter conditions
    const conditions: string[] = ["1=1"];
    const params: any[] = [];

    // Seller Scoping: Sellers only see subscribers for their business/store/pages or which they created
    if (!isPlatform && user?.id) {
      const [bpRes, ppRes, instRes] = await Promise.all([
        db.query(`SELECT id, name, slug FROM business_profiles WHERE user_id = $1`, [user.id]).catch(() => ({ rows: [] })),
        db.query(`SELECT id, name, slug FROM professional_profiles WHERE user_id = $1`, [user.id]).catch(() => ({ rows: [] })),
        db.query(`SELECT id, name, slug FROM institution_profiles WHERE user_id = $1 OR id IN (SELECT institution_id FROM institution_memberships WHERE user_id = $1)`, [user.id]).catch(() => ({ rows: [] })),
      ]);

      const businessIds: number[] = bpRes.rows.map((r: any) => Number(r.id)).filter(Boolean);
      const professionalIds: number[] = ppRes.rows.map((r: any) => Number(r.id)).filter(Boolean);
      const institutionIds: number[] = instRes.rows.map((r: any) => Number(r.id)).filter(Boolean);

      const names: string[] = [
        ...bpRes.rows.map((r: any) => r.name),
        ...ppRes.rows.map((r: any) => r.name),
        ...instRes.rows.map((r: any) => r.name),
      ].filter(Boolean);

      const slugs: string[] = [
        ...bpRes.rows.map((r: any) => `%${r.slug}%`),
        ...ppRes.rows.map((r: any) => `%${r.slug}%`),
        ...instRes.rows.map((r: any) => `%${r.slug}%`),
      ].filter(Boolean);

      const bIdStrings = businessIds.map(String);
      const iIdStrings = institutionIds.map(String);

      params.push(user.id);
      const uIdx = params.length;
      params.push(businessIds);
      const bIdx = params.length;
      params.push(professionalIds);
      const pIdx = params.length;
      params.push(institutionIds);
      const iIdx = params.length;
      params.push(bIdStrings);
      const bsIdx = params.length;
      params.push(iIdStrings);
      const isIdx = params.length;
      params.push(names);
      const nIdx = params.length;
      params.push(slugs);
      const slIdx = params.length;

      conditions.push(`(
        (metadata->>'user_id' = $${uIdx}::text)
        OR (metadata->>'created_by' = $${uIdx}::text)
        OR (metadata->>'business_id' = ANY($${bsIdx}))
        OR (metadata->>'institution_id' = ANY($${isIdx}))
        OR (cardinality($${bIdx}::int[]) > 0 AND (page_url LIKE ANY($${slIdx}) OR page_name = ANY($${nIdx})))
        OR (cardinality($${pIdx}::int[]) > 0 AND (page_url LIKE ANY($${slIdx}) OR page_name = ANY($${nIdx})))
        OR (cardinality($${iIdx}::int[]) > 0 AND (page_url LIKE ANY($${slIdx}) OR page_name = ANY($${nIdx})))
      )`);
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(
        `(LOWER(email) LIKE $${params.length} OR LOWER(page_name) LIKE $${params.length} OR LOWER(page_url) LIKE $${params.length})`
      );
    }

    if (pageFilter && pageFilter !== "all") {
      params.push(pageFilter);
      conditions.push(`page_name = $${params.length}`);
    }

    if (statusFilter && statusFilter !== "all") {
      params.push(statusFilter);
      conditions.push(`status = $${params.length}`);
    }

    const whereClause = conditions.join(" AND ");

    // 1. Fetch KPI Summary (scoped)
    const statsRes = await db.query(`
      SELECT
        COUNT(*) AS total_count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today_count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS week_count,
        COUNT(*) FILTER (WHERE status = 'active') AS active_count
      FROM newsletter_subscribers
      WHERE ${whereClause}
    `, params);

    // 2. Fetch Top Pages Breakdown (scoped)
    const topPagesRes = await db.query(`
      SELECT page_name, COUNT(*) as count
      FROM newsletter_subscribers
      WHERE ${whereClause} AND page_name IS NOT NULL AND page_name <> ''
      GROUP BY page_name
      ORDER BY count DESC
      LIMIT 10
    `, params);

    // 3. Fetch list of distinct page names for the dropdown filter (scoped)
    const distinctPagesRes = await db.query(`
      SELECT DISTINCT page_name
      FROM newsletter_subscribers
      WHERE ${whereClause} AND page_name IS NOT NULL AND page_name <> ''
      ORDER BY page_name ASC
    `, params);

    // 4. Fetch Paginated Records
    const countRes = await db.query(
      `SELECT COUNT(*) as total FROM newsletter_subscribers WHERE ${whereClause}`,
      params
    );
    const totalFiltered = parseInt(countRes.rows[0]?.total || "0", 10);

    const listParams = [...params, limit, offset];
    const listRes = await db.query(
      `SELECT id, email, page_name, page_url, referrer, status, subscribe_count, created_at, updated_at
       FROM newsletter_subscribers
       WHERE ${whereClause}
       ORDER BY updated_at DESC, created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    return NextResponse.json({
      success: true,
      stats: {
        total: Number(statsRes.rows[0]?.total_count || 0),
        today: Number(statsRes.rows[0]?.today_count || 0),
        thisWeek: Number(statsRes.rows[0]?.week_count || 0),
        active: Number(statsRes.rows[0]?.active_count || 0),
      },
      topPages: topPagesRes.rows.map((r) => ({
        page_name: r.page_name,
        count: Number(r.count),
      })),
      distinctPages: distinctPagesRes.rows.map((r) => r.page_name),
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit),
      },
      data: listRes.rows,
    });
  } catch (err: any) {
    console.error("[GET /api/platformadmin/subscribers] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch subscribers" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Subscriber ID is required" },
        { status: 400 }
      );
    }

    await db.query(`DELETE FROM newsletter_subscribers WHERE id = $1`, [id]);

    return NextResponse.json({
      success: true,
      message: "Subscriber removed successfully",
    });
  } catch (err: any) {
    console.error("[DELETE /api/platformadmin/subscribers] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete subscriber" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "ID and status are required" },
        { status: 400 }
      );
    }

    await db.query(
      `UPDATE newsletter_subscribers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, id]
    );

    return NextResponse.json({
      success: true,
      message: "Subscriber status updated",
    });
  } catch (err: any) {
    console.error("[PATCH /api/platformadmin/subscribers] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update subscriber status" },
      { status: 500 }
    );
  }
}
