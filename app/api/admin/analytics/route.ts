import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureAnalyticsSchema } from "@/lib/db/ensure-analytics-schema";
import { getRequestedInstitutionId } from "@/lib/auth/institution-scope";

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureAnalyticsSchema();

    const url = new URL(req.url);
    const tab = url.searchParams.get("tab") || "overview";
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get("search")?.trim() || "";
    const anonymousId = url.searchParams.get("anonymousId")?.trim() || "";
    const requestedInstId = getRequestedInstitutionId(url.searchParams);

    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const isInstitutionAdmin = isInstitutionAdminUser(currentUser);

    // Scoping: If institution admin, restrict to their institution's institutes, courses, exams, notes, etc.
    let institutionFilter = "";
    const params: unknown[] = [];
    let scopedInstId: number | null = null;

    if (!isPlatformAdmin) {
      const userInstIds = (currentUser.memberships ?? [])
        .map((m) => m.institution_id)
        .filter((id): id is number => Number.isInteger(id) && id > 0);

      const ownedInstRes = await db.query<{ id: number }>(`
        SELECT id FROM institution_profiles WHERE user_id = $1
      `, [currentUser.id]);
      const ownedIds = ownedInstRes.rows.map((r) => r.id);
      const allInstIds = Array.from(new Set([...userInstIds, ...ownedIds]));

      scopedInstId = requestedInstId && allInstIds.includes(requestedInstId)
        ? requestedInstId
        : (allInstIds[0] || requestedInstId || 1);

      if (scopedInstId) {
        params.push(scopedInstId);
        institutionFilter = ` AND (
          ae.institution_id = $${params.length}
          OR ae.metadata->>'institution_id' = '${scopedInstId}'
          OR ae.metadata->>'institutionId' = '${scopedInstId}'
          OR ae.page_url ILIKE '%/institutes/' || $${params.length} || '%'
          OR ae.page_url ILIKE '%/courses/' || $${params.length} || '%'
        )`;
      }
    } else if (requestedInstId) {
      scopedInstId = requestedInstId;
      params.push(requestedInstId);
      institutionFilter = ` AND ae.institution_id = $${params.length}`;
    }

    // 1. OVERVIEW TAB
    if (tab === "overview") {
      const [totalsRes, topClicksRes, topViewsRes, topSearchesRes, topLocationsRes] = await Promise.all([
        db.query(`
          SELECT
            COUNT(*) FILTER (WHERE ae.event_type = 'click') AS total_clicks,
            COUNT(*) FILTER (WHERE ae.event_type = 'view') AS total_views,
            COUNT(*) FILTER (WHERE ae.event_type = 'impression') AS total_impressions,
            COUNT(*) FILTER (WHERE ae.event_type = 'search') AS total_searches,
            COUNT(DISTINCT ae.anonymous_id) AS total_visitors
          FROM analytics_events ae
          WHERE 1=1 ${institutionFilter}
        `, params),
        db.query(`
          SELECT button_name, COUNT(*) AS count
          FROM analytics_events ae
          WHERE ae.event_type = 'click' AND button_name IS NOT NULL ${institutionFilter}
          GROUP BY button_name
          ORDER BY count DESC
          LIMIT 6
        `, params),
        db.query(`
          SELECT page_name, page_url, COUNT(*) AS count
          FROM analytics_events ae
          WHERE ae.event_type = 'view' ${institutionFilter}
          GROUP BY page_name, page_url
          ORDER BY count DESC
          LIMIT 6
        `, params),
        db.query(`
          SELECT keywords, COUNT(*) AS count
          FROM analytics_events ae
          WHERE ae.keywords IS NOT NULL AND TRIM(ae.keywords) <> '' ${institutionFilter}
          GROUP BY keywords
          ORDER BY count DESC
          LIMIT 6
        `, params),
        db.query(`
          SELECT location, COUNT(*) AS count
          FROM analytics_events ae
          WHERE location IS NOT NULL ${institutionFilter}
          GROUP BY location
          ORDER BY count DESC
          LIMIT 6
        `, params),
      ]);

      return NextResponse.json({
        summary: totalsRes.rows[0] || {
          total_clicks: 0,
          total_views: 0,
          total_impressions: 0,
          total_searches: 0,
          total_visitors: 0,
        },
        topClicks: topClicksRes.rows,
        topViews: topViewsRes.rows,
        topSearches: topSearchesRes.rows,
        topLocations: topLocationsRes.rows,
      });
    }

    // 2. USER JOURNEYS TAB (Visitors who interacted with this institution / platform)
    if (tab === "journeys") {
      let where = `WHERE 1=1`;
      const journeyParams = [...params];

      if (!isPlatformAdmin && institutionFilter) {
        where += ` AND v.anonymous_id IN (
          SELECT DISTINCT ae.anonymous_id FROM analytics_events ae WHERE 1=1 ${institutionFilter}
        )`;
      }

      if (search) {
        journeyParams.push(`%${search}%`);
        where += ` AND (
          v.anonymous_id ILIKE $${journeyParams.length}
          OR COALESCE(v.user_name, '') ILIKE $${journeyParams.length}
          OR COALESCE(v.ip_address, '') ILIKE $${journeyParams.length}
          OR COALESCE(v.location, '') ILIKE $${journeyParams.length}
          OR COALESCE(v.referrer, '') ILIKE $${journeyParams.length}
        )`;
      }

      const [countRes, dataRes] = await Promise.all([
        db.query(`SELECT COUNT(*) AS count FROM analytics_visitors v ${where}`, journeyParams),
        db.query(`
          SELECT 
            v.id,
            v.anonymous_id,
            v.user_id,
            v.user_name,
            v.ip_address,
            v.location,
            v.user_agent,
            v.referrer,
            v.first_seen_at,
            v.last_seen_at,
            v.total_events,
            (
              SELECT json_agg(steps ORDER BY steps.created_at ASC)
              FROM (
                SELECT event_type, page_name, page_url, button_name, keywords, created_at
                FROM analytics_events
                WHERE anonymous_id = v.anonymous_id
                ORDER BY created_at ASC
                LIMIT 15
              ) steps
            ) AS recent_steps
          FROM analytics_visitors v
          ${where}
          ORDER BY v.last_seen_at DESC
          LIMIT $${journeyParams.length + 1} OFFSET $${journeyParams.length + 2}
        `, [...journeyParams, limit, offset]),
      ]);

      const total = Number(countRes.rows[0]?.count || 0);
      return NextResponse.json({
        data: dataRes.rows,
        total,
        pageCount: Math.ceil(total / limit),
      });
    }

    // 3. JOURNEY DETAIL (Single visitor full timeline)
    if (tab === "journey_detail") {
      if (!anonymousId) {
        return NextResponse.json({ error: "anonymousId is required" }, { status: 400 });
      }

      const [visitorRes, timelineRes] = await Promise.all([
        db.query(`SELECT * FROM analytics_visitors WHERE anonymous_id = $1 LIMIT 1`, [anonymousId]),
        db.query(`
          SELECT *
          FROM analytics_events
          WHERE anonymous_id = $1
          ORDER BY created_at ASC
        `, [anonymousId]),
      ]);

      return NextResponse.json({
        visitor: visitorRes.rows[0] || null,
        timeline: timelineRes.rows,
      });
    }

    // 4. CLICKS, VIEWS, IMPRESSIONS, SEARCHES TABS
    let eventTypeFilter = "";
    if (tab === "clicks") eventTypeFilter = " AND ae.event_type = 'click'";
    else if (tab === "views") eventTypeFilter = " AND ae.event_type = 'view'";
    else if (tab === "impressions") eventTypeFilter = " AND ae.event_type = 'impression'";
    else if (tab === "searches") eventTypeFilter = " AND (ae.event_type = 'search' OR (ae.keywords IS NOT NULL AND TRIM(ae.keywords) <> ''))";

    let searchFilter = "";
    const listParams = [...params];

    if (search) {
      listParams.push(`%${search}%`);
      searchFilter = ` AND (
        ae.page_url ILIKE $${listParams.length}
        OR COALESCE(ae.page_name, '') ILIKE $${listParams.length}
        OR COALESCE(ae.button_name, '') ILIKE $${listParams.length}
        OR COALESCE(ae.keywords, '') ILIKE $${listParams.length}
        OR COALESCE(ae.ip_address, '') ILIKE $${listParams.length}
        OR COALESCE(ae.location, '') ILIKE $${listParams.length}
        OR ae.anonymous_id ILIKE $${listParams.length}
      )`;
    }

    const where = `WHERE 1=1 ${institutionFilter} ${eventTypeFilter} ${searchFilter}`;

    const [countRes, dataRes] = await Promise.all([
      db.query(`SELECT COUNT(*) AS count FROM analytics_events ae ${where}`, listParams),
      db.query(`
        SELECT 
          ae.id,
          ae.anonymous_id,
          ae.user_id,
          ae.institution_id,
          ae.event_type,
          ae.page_url,
          ae.page_name,
          ae.button_name,
          ae.keywords,
          ae.referrer,
          ae.ip_address,
          ae.location,
          ae.device_type,
          ae.metadata,
          ae.created_at,
          v.user_name
        FROM analytics_events ae
        LEFT JOIN analytics_visitors v ON v.anonymous_id = ae.anonymous_id
        ${where}
        ORDER BY ae.created_at DESC
        LIMIT $${listParams.length + 1} OFFSET $${listParams.length + 2}
      `, [...listParams, limit, offset]),
    ]);

    const total = Number(countRes.rows[0]?.count || 0);
    return NextResponse.json({
      data: dataRes.rows,
      total,
      pageCount: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Admin analytics error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load analytics" },
      { status: 500 }
    );
  }
}
