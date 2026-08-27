import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

let schemaEnquiriesReady = false;
async function ensureEnquiriesColumns() {
    if (schemaEnquiriesReady) return;
    try {
        await db.query(`ALTER TABLE visitor_sessions ALTER COLUMN tracking_token DROP NOT NULL`);
    } catch {}
    try {
        await db.query(`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(40) DEFAULT 'new'`);
        await db.query(`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(12,2) DEFAULT 25000`);
        await db.query(`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE SET NULL`);
        schemaEnquiriesReady = true;
    } catch {
        // ignore
    }
}

export async function GET(req: Request) {
    try {
        const user = await requireAdmin(req);
        await ensureEnquiriesColumns();
        const url = new URL(req.url);
        const { limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
        const search = url.searchParams.get("search")?.trim() || "";
        const status = url.searchParams.get("status")?.trim() || "";
        const institutionIdParam = url.searchParams.get("institutionId") || req.headers.get("x-institution-id");

        let institutionId: number | null = null;
        if (institutionIdParam && !isNaN(Number(institutionIdParam))) {
            institutionId = Number(institutionIdParam);
        } else if (user?.memberships?.length > 0) {
            const instMem = user.memberships.find((m: any) => m.institution_id);
            if (instMem) institutionId = Number(instMem.institution_id);
        }

        const whereClauses: string[] = [];
        const params: unknown[] = [];

        if (institutionId) {
            params.push(institutionId);
            whereClauses.push(`(ce.institution_id = $${params.length} OR ce.institution_id IS NULL)`);
        }

        if (search) {
            params.push(`%${search}%`);
            whereClauses.push(`(ce.student_name ILIKE $${params.length} OR ce.email ILIKE $${params.length} OR ce.phone ILIKE $${params.length} OR ce.preferred_program ILIKE $${params.length} OR ce.notes ILIKE $${params.length})`);
        }

        if (status && status !== "all") {
            params.push(status);
            whereClauses.push(`ce.status = $${params.length}`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

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
                    vs.lead_status AS status,
                    COALESCE(vs.pipeline_stage, 'new') AS pipeline_stage,
                    COALESCE(vs.estimated_value, 25000)::numeric AS estimated_value,
                    vs.follow_up AS notes,
                    vs.current_page_url AS preferred_program,
                    CASE 
                        WHEN vs.metadata->>'source_type' = 'institution_website' OR vs.follow_up ILIKE '%Origin: Institution Website%' THEN 'Institution Website'
                        WHEN vs.metadata->>'source_type' = 'edubird' OR vs.follow_up ILIKE '%Origin: EduBird%' THEN 'EduBird Platform'
                        ELSE COALESCE(NULLIF(TRIM(SUBSTRING(vs.follow_up FROM 'Source:\\s*([^|]+)')), ''), 'EduBird Platform')
                    END AS source,
                    vs.created_at,
                    vs.institution_id
                FROM visitor_sessions vs
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
                    'EduBird Platform' AS source,
                    se.created_at,
                    se.institution_id
                FROM student_enrollments se
                INNER JOIN student_profiles sp ON sp.id = se.student_id
                INNER JOIN users u ON u.id = sp.user_id
                LEFT JOIN institution_programs p ON p.id = se.program_id
                WHERE COALESCE(se.is_deleted, FALSE) = FALSE
            )
        `;

        const [countRes, dataRes] = await Promise.all([
            db.query<{ count: number }>(
                `${baseCte} SELECT COUNT(*)::int AS count FROM combined_enquiries ce ${whereSql}`,
                params
            ),
            db.query(
                `
                ${baseCte}
                SELECT
                    ce.id,
                    ce.student_name,
                    ce.phone,
                    ce.email,
                    ce.status,
                    ce.pipeline_stage,
                    ce.estimated_value,
                    ce.notes,
                    ce.preferred_program,
                    ce.source,
                    ce.created_at
                FROM combined_enquiries ce
                ${whereSql}
                ORDER BY ce.created_at DESC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
                `,
                [...params, limit, offset]
            ),
        ]);

        const total = countRes.rows[0]?.count || 0;
        return NextResponse.json({ data: dataRes.rows, total, pageCount: getPageCount(total, limit) });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unauthorized";
        return NextResponse.json({ error: message }, { status: message.includes("Forbidden") ? 403 : 401 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await requireAdmin(req);
        await ensureEnquiriesColumns();
        const body = await req.json();
        const studentName = String(body.student_name || "").trim();
        const phone = String(body.phone || "").trim();
        const email = String(body.email || "").trim();
        const parentName = String(body.parent_name || "").trim();
        const preferredProgram = String(body.preferred_program || "").trim();
        const source = String(body.source || "Walk-in").trim();
        const notes = String(body.notes || "").trim();
        const estimatedValue = Number(body.estimated_value || body.value || 25000);
        const pipelineStage = String(body.pipeline_stage || "new").trim();
        const url = new URL(req.url);
        const institutionIdParam = url.searchParams.get("institutionId") || req.headers.get("x-institution-id");
        let institutionId: number | null = null;
        if (institutionIdParam && !isNaN(Number(institutionIdParam))) {
            institutionId = Number(institutionIdParam);
        } else if (user?.memberships?.length > 0) {
            const instMem = user.memberships.find((m: any) => m.institution_id);
            if (instMem) institutionId = Number(instMem.institution_id);
        }

        if (!studentName || !phone) {
            return NextResponse.json({ error: "Student name and phone number are required" }, { status: 400 });
        }

        const trackingToken = randomUUID();
        const fullNotes = [
            notes,
            parentName ? `Parent/Guardian: ${parentName}` : null,
            `Source: ${source}`,
        ].filter(Boolean).join(" | ");

        const res = await db.query(
            `
            INSERT INTO visitor_sessions (
                tracking_token,
                institution_id,
                full_name,
                phone,
                email,
                lead_status,
                pipeline_stage,
                estimated_value,
                follow_up,
                current_page_url,
                created_at
            )
            VALUES ($1::uuid, $2, $3, $4, $5, 'new enquiry', $6, $7, $8, $9, NOW())
            RETURNING id
            `,
            [
                trackingToken,
                institutionId,
                studentName,
                phone,
                email || null,
                pipelineStage,
                estimatedValue,
                fullNotes,
                preferredProgram || "/courses",
            ]
        );

        return NextResponse.json({ success: true, id: res.rows[0]?.id });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to record enquiry";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
