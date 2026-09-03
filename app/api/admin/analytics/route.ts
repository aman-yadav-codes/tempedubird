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

    // 4. ENQUIRIES TAB (All enquiries received by any institutions)
    if (tab === "enquiries" || tab === "enquiry") {
      const selectedInstId = url.searchParams.get("institutionFilter") || url.searchParams.get("institutionId");
      const statusParam = url.searchParams.get("status") || "";
      const timeframe = url.searchParams.get("timeframe") || "";
      const enquirySearch = url.searchParams.get("search")?.trim() || "";

      const whereConditions: string[] = [];
      const enquiryParams: unknown[] = [];

      // If user filtered by specific institution
      if (selectedInstId && selectedInstId !== "all") {
        if (selectedInstId === "platform" || selectedInstId === "edubird") {
          whereConditions.push(`ce.institution_id IS NULL`);
        } else if (!isNaN(Number(selectedInstId))) {
          enquiryParams.push(Number(selectedInstId));
          whereConditions.push(`ce.institution_id = $${enquiryParams.length}`);
        }
      } else if (!isPlatformAdmin && scopedInstId) {
        enquiryParams.push(scopedInstId);
        whereConditions.push(`ce.institution_id = $${enquiryParams.length}`);
      }

      if (statusParam && statusParam !== "all") {
        enquiryParams.push(statusParam.toLowerCase());
        whereConditions.push(`LOWER(ce.status) = $${enquiryParams.length}`);
      }

      if (timeframe === "today") {
        whereConditions.push(`ce.created_at >= CURRENT_DATE`);
      } else if (timeframe === "week") {
        whereConditions.push(`ce.created_at >= CURRENT_DATE - INTERVAL '7 days'`);
      } else if (timeframe === "month") {
        whereConditions.push(`ce.created_at >= CURRENT_DATE - INTERVAL '30 days'`);
      }

      if (enquirySearch) {
        enquiryParams.push(`%${enquirySearch}%`);
        const pIdx = enquiryParams.length;
        whereConditions.push(`(
          ce.student_name ILIKE $${pIdx}
          OR COALESCE(ce.parent_name, '') ILIKE $${pIdx}
          OR ce.phone ILIKE $${pIdx}
          OR COALESCE(ce.email, '') ILIKE $${pIdx}
          OR ce.preferred_program ILIKE $${pIdx}
          OR COALESCE(ip.name, '') ILIKE $${pIdx}
          OR COALESCE(ce.source, '') ILIKE $${pIdx}
        )`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

      const baseCte = `
        WITH combined_enquiries AS (
          SELECT
            'vs_' || vs.id::text AS id,
            vs.full_name AS student_name,
            COALESCE(vs.metadata->>'parent_name', NULLIF(TRIM(SUBSTRING(vs.follow_up FROM 'Parent:\\s*([^(|]+)')), '')) AS parent_name,
            COALESCE(vs.metadata->>'parent_phone', NULLIF(TRIM(SUBSTRING(vs.follow_up FROM 'Parent:\\s*[^(]+\\(([^)]+)\\)')), '')) AS parent_phone,
            COALESCE(vs.metadata->>'parent_email', '') AS parent_email,
            COALESCE(vs.metadata->>'child_name', '') AS child_name,
            vs.phone,
            vs.email,
            COALESCE(vs.pipeline_stage, vs.lead_status, 'new enquiry') AS status,
            COALESCE(vs.pipeline_stage, 'new enquiry') AS pipeline_stage,
            COALESCE(vs.estimated_value, 25000)::numeric AS estimated_value,
            COALESCE(vs.notes, vs.follow_up, 'Direct Course Enquiry') AS notes,
            COALESCE(
              vs.metadata->>'package_name',
              vs.metadata->>'preferred_package',
              prog.title,
              vs.metadata->>'preferred_program',
              vs.current_page_url,
              'Course Program'
            ) AS preferred_program,
            COALESCE(vs.metadata->>'enquiry_type', CASE WHEN vs.metadata->>'package_name' IS NOT NULL OR vs.metadata->>'package_id' IS NOT NULL THEN 'package' ELSE 'program' END) AS enquiry_type,
            vs.metadata->>'package_id' AS package_id,
            COALESCE(vs.metadata->>'package_name', vs.metadata->>'preferred_package', vs.metadata->>'package_title') AS package_name,
            vs.metadata->>'package_price' AS package_price,
            vs.metadata->>'package_for' AS package_for,
            vs.metadata->>'package_validity' AS package_validity,
            COALESCE(vs.metadata, '{}'::jsonb) AS metadata,
            COALESCE(
              NULLIF(vs.metadata->>'source', ''),
              NULLIF(vs.metadata->>'origin_source', ''),
              CASE 
                WHEN vs.source_type = 'own_website' OR vs.source_type = 'institution_website' OR vs.metadata->>'source_type' = 'own_website' OR vs.metadata->>'source_type' = 'institution_website' OR vs.follow_up ILIKE '%Origin: Institution Website%' OR vs.follow_up ILIKE '%Origin: Own Website%' THEN 'Own Website'
                WHEN vs.source_type = 'product' OR vs.metadata->>'source_type' = 'product' OR vs.follow_up ILIKE '%EduBird Store%' OR vs.follow_up ILIKE '%Product:%' THEN 'Store Product'
                WHEN vs.source_type IS NOT NULL AND vs.source_type != '' AND vs.source_type != 'edubird' THEN vs.source_type
                WHEN vs.institution_id IS NOT NULL THEN 'Own Website'
                ELSE 'EduBird'
              END
            ) AS source,
            vs.created_at,
            vs.institution_id
          FROM visitor_sessions vs
          LEFT JOIN institution_programs prog ON prog.id = vs.program_id
          WHERE (COALESCE(vs.full_name, '') != '' OR COALESCE(vs.phone, '') != '' OR COALESCE(vs.email, '') != '')

          UNION ALL

          SELECT
            'se_' || se.id::text AS id,
            u.full_name AS student_name,
            NULL AS parent_name,
            NULL AS parent_phone,
            NULL AS parent_email,
            NULL AS child_name,
            COALESCE(u.phone, '') AS phone,
            COALESCE(u.email, '') AS email,
            'enrolled' AS status,
            'enrolled' AS pipeline_stage,
            COALESCE(p.fee_amount, 25000)::numeric AS estimated_value,
            'Direct Student Enrollment Application' AS notes,
            COALESCE(p.title, 'Academic Course') AS preferred_program,
            'program' AS enquiry_type,
            NULL AS package_id,
            NULL AS package_name,
            NULL AS package_price,
            NULL AS package_for,
            NULL AS package_validity,
            '{}'::jsonb AS metadata,
            CASE 
              WHEN se.institution_id IS NOT NULL THEN 'Own Website'
              ELSE 'EduBird'
            END AS source,
            se.created_at,
            se.institution_id
          FROM student_enrollments se
          INNER JOIN student_profiles sp ON sp.id = se.student_id
          INNER JOIN users u ON u.id = sp.user_id
          LEFT JOIN institution_programs p ON p.id = se.program_id
          WHERE COALESCE(se.is_deleted, FALSE) = FALSE
        )
      `;

      const [countRes, dataRes, summaryRes, institutionsRes] = await Promise.all([
        db.query(`
          ${baseCte}
          SELECT COUNT(*)::int AS count
          FROM combined_enquiries ce
          LEFT JOIN institution_profiles ip ON ip.id = ce.institution_id
          ${whereClause}
        `, enquiryParams),
        db.query(`
          ${baseCte}
          SELECT
            ce.id,
            ce.student_name,
            ce.parent_name,
            ce.parent_phone,
            ce.parent_email,
            ce.child_name,
            ce.phone,
            ce.email,
            ce.status,
            ce.pipeline_stage,
            ce.estimated_value,
            ce.notes,
            ce.preferred_program,
            ce.enquiry_type,
            ce.package_id,
            ce.package_name,
            ce.package_price,
            ce.package_for,
            ce.package_validity,
            ce.metadata,
            ce.source,
            ce.created_at,
            ce.institution_id,
            COALESCE(ip.name, ip.slug, 'EduBird Platform') AS institution_name,
            ip.slug AS institution_slug,
            ip.logo_url AS institution_logo
          FROM combined_enquiries ce
          LEFT JOIN institution_profiles ip ON ip.id = ce.institution_id
          ${whereClause}
          ORDER BY ce.created_at DESC
          LIMIT $${enquiryParams.length + 1} OFFSET $${enquiryParams.length + 2}
        `, [...enquiryParams, limit, offset]),
        db.query(`
          ${baseCte}
          SELECT
            COUNT(*)::int AS total_enquiries,
            COUNT(DISTINCT ce.institution_id)::int AS total_institutions,
            COUNT(*) FILTER (WHERE ce.status ILIKE '%new%' OR ce.status ILIKE '%lead%')::int AS new_enquiries,
            COUNT(*) FILTER (WHERE ce.status ILIKE '%contact%' OR ce.status ILIKE '%progress%' OR ce.status ILIKE '%call%')::int AS in_progress,
            COUNT(*) FILTER (WHERE ce.status ILIKE '%enroll%' OR ce.status ILIKE '%paid%' OR ce.status ILIKE '%won%')::int AS admissions_taken
          FROM combined_enquiries ce
        `),
        db.query(`
          SELECT DISTINCT ip.id, ip.name
          FROM institution_profiles ip
          ORDER BY ip.name ASC
        `),
      ]);

      const total = Number(countRes.rows[0]?.count || 0);
      return NextResponse.json({
        data: dataRes.rows,
        total,
        pageCount: Math.ceil(total / limit),
        summary: summaryRes.rows[0] || {
          total_enquiries: total,
          total_institutions: 0,
          new_enquiries: 0,
          in_progress: 0,
          admissions_taken: 0,
        },
        institutions: institutionsRes.rows,
      });
    }

    // 5. CLICKS, VIEWS, IMPRESSIONS, SEARCHES TABS
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
