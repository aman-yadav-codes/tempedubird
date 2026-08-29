import { Pool } from "pg";

import type {
    CreateVisitorSessionData,
    TrackerSettings,
    TrackVisitorActivityData,
} from "@/lib/types/tracker";

let schemaReady = false;

async function ensureTrackerSchema(db: Pool) {
    if (schemaReady) return;

    await db.query(`
        ALTER TABLE app_settings
        ADD COLUMN IF NOT EXISTS tracker_update_interval_minutes INT NOT NULL DEFAULT 60
    `);

    await db.query(`
        ALTER TABLE visitor_activities
        ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50)
    `);

    await db.query(`
        ALTER TABLE visitor_sessions
        ADD COLUMN IF NOT EXISTS follow_up TEXT
    `);

    await db.query(`
        ALTER TABLE visitor_sessions
        ADD COLUMN IF NOT EXISTS lead_status VARCHAR(30) NOT NULL DEFAULT 'new'
    `);

    schemaReady = true;
}

export async function getTrackerSettings(db: Pool): Promise<TrackerSettings> {
    await ensureTrackerSchema(db);

    const res = await db.query(
        `INSERT INTO app_settings (id)
         VALUES (1)
         ON CONFLICT (id) DO NOTHING
         RETURNING tracking_enabled, tracker_update_interval_minutes`
    );

    if (res.rows[0]) return res.rows[0];

    const existing = await db.query(
        `SELECT tracking_enabled, tracker_update_interval_minutes
         FROM app_settings
         WHERE id = 1`
    );
    return existing.rows[0] ?? { tracking_enabled: true, tracker_update_interval_minutes: 60 };
}

export async function updateTrackerSettings(
    db: Pool,
    input: TrackerSettings
): Promise<TrackerSettings> {
    await ensureTrackerSchema(db);

    const res = await db.query(
        `INSERT INTO app_settings (id, tracking_enabled, tracker_update_interval_minutes)
         VALUES (1, $1, $2)
         ON CONFLICT (id) DO UPDATE
         SET tracking_enabled = EXCLUDED.tracking_enabled,
             tracker_update_interval_minutes = EXCLUDED.tracker_update_interval_minutes,
             updated_at = NOW()
         RETURNING tracking_enabled, tracker_update_interval_minutes`,
        [input.tracking_enabled, input.tracker_update_interval_minutes]
    );
    return res.rows[0];
}

export async function isTrackingEnabled(db: Pool) {
    const settings = await getTrackerSettings(db);
    return settings.tracking_enabled;
}

export async function createVisitorSession(db: Pool, data: CreateVisitorSessionData) {
    await ensureTrackerSchema(db);

    if (!(await isTrackingEnabled(db))) return null;

    const token = crypto.randomUUID();
    const res = await db.query(
        `INSERT INTO visitor_sessions (
            tracking_token, full_name, email, phone, first_page_url, current_page_url,
            utm_source, utm_medium, utm_campaign, utm_term, utm_content
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING tracking_token`,
        [
            token,
            data.fullName,
            data.email ?? null,
            data.phone ?? null,
            data.firstPageUrl ?? null,
            data.currentPageUrl ?? data.firstPageUrl ?? null,
            data.utmSource ?? null,
            data.utmMedium ?? null,
            data.utmCampaign ?? null,
            data.utmTerm ?? null,
            data.utmContent ?? null,
        ]
    );

    await trackVisitorActivity(db, {
        trackingToken: token,
        pageUrl: data.currentPageUrl || data.firstPageUrl || "/",
        pageTitle: null,
        triggerType: "enquiry",
    });

    return res.rows[0];
}

export async function trackVisitorActivity(db: Pool, data: TrackVisitorActivityData) {
    await ensureTrackerSchema(db);

    if (!(await isTrackingEnabled(db))) return null;

    const session = await db.query(
        `UPDATE visitor_sessions
         SET current_page_url = $1,
             last_seen_at = NOW()
         WHERE tracking_token = $2
         RETURNING tracking_token`,
        [data.pageUrl, data.trackingToken]
    );

    if (!session.rows.length) return null;
    if (data.updateOnly) return { tracked: true };

    await db.query(
        `INSERT INTO visitor_activities (tracking_token, page_url, page_title, trigger_type)
         VALUES ($1,$2,$3,$4)`,
        [data.trackingToken, data.pageUrl, data.pageTitle ?? null, data.triggerType]
    );

    return { tracked: true };
}

export async function listVisitorSessions(
    db: Pool,
    opts: { search?: string; leadStatus?: string; limit?: number; offset?: number }
) {
    await ensureTrackerSchema(db);

    const search = opts.search?.trim() || "";
    const limit = opts.limit ?? 20;
    const offset = opts.offset ?? 0;
    const params: unknown[] = [];
    const where: string[] = [];

    if (search) {
        params.push(`%${search}%`);
        where.push(`(full_name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length} OR tracking_token::text ILIKE $${params.length})`);
    }
    if (opts.leadStatus && leadStatuses.has(opts.leadStatus)) {
        params.push(opts.leadStatus);
        where.push(`lead_status = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [dataRes, countRes] = await Promise.all([
        db.query(
            `SELECT vs.*,
                    COALESCE(ip.name, ip.slug, 'EduBird Partner Institute') AS institution_name,
                    (SELECT COUNT(*)::int FROM visitor_activities va WHERE va.tracking_token = vs.tracking_token) AS activity_count
             FROM visitor_sessions vs
             LEFT JOIN institution_profiles ip ON ip.id = vs.institution_id
             ${whereSql}
             ORDER BY vs.last_seen_at DESC
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, limit, offset]
        ),
        db.query(`SELECT COUNT(*)::int AS count FROM visitor_sessions vs ${whereSql}`, params),
    ]);

    return { data: dataRes.rows, total: countRes.rows[0].count as number };
}

export async function listVisitorActivities(db: Pool, trackingToken: string) {
    await ensureTrackerSchema(db);

    const [sessionRes, activitiesRes] = await Promise.all([
        db.query(`SELECT * FROM visitor_sessions WHERE tracking_token = $1`, [trackingToken]),
        db.query(
            `SELECT *
             FROM visitor_activities
             WHERE tracking_token = $1
             ORDER BY visited_at DESC, id DESC`,
            [trackingToken]
        ),
    ]);

    return {
        session: sessionRes.rows[0] ?? null,
        activities: activitiesRes.rows,
    };
}

function normalizeFollowUp(value: unknown) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

const leadStatuses = new Set([
    "new",
    "contacted",
    "follow_up",
    "won",
    "lost",
    "not_interested",
    "no_response",
    "on_hold",
    "invalid",
]);

function normalizeLeadStatus(value: unknown) {
    if (typeof value !== "string") return "new";
    return leadStatuses.has(value) ? value : "new";
}

export async function updateVisitorSessionFollowUp(
    db: Pool,
    trackingToken: string,
    followUp: unknown,
    leadStatus: unknown
) {
    await ensureTrackerSchema(db);

    const res = await db.query(
        `UPDATE visitor_sessions
         SET follow_up = $2,
             lead_status = $3
         WHERE tracking_token = $1
         RETURNING *`,
        [trackingToken, normalizeFollowUp(followUp), normalizeLeadStatus(leadStatus)]
    );

    return res.rows[0] ?? null;
}

export async function updateVisitorSessionsFollowUp(
    db: Pool,
    trackingTokens: string[],
    followUp: unknown,
    leadStatus: unknown
) {
    await ensureTrackerSchema(db);

    const validTokens = trackingTokens
        .map((token) => token.trim())
        .filter(Boolean);

    if (!validTokens.length) return { updatedCount: 0 };

    const res = await db.query(
        `UPDATE visitor_sessions
         SET follow_up = $2,
             lead_status = $3
         WHERE tracking_token = ANY($1::text[])
         RETURNING tracking_token`,
        [validTokens, normalizeFollowUp(followUp), normalizeLeadStatus(leadStatus)]
    );

    return { updatedCount: res.rowCount ?? 0 };
}
