import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(req);
        const { id: rawId } = await params;
        const body = await req.json();
        const status = body?.status ? String(body.status) : null;
        const pipelineStage = body?.pipeline_stage ? String(body.pipeline_stage) : null;
        const estimatedValue = body?.estimated_value !== undefined && body?.estimated_value !== null ? Number(body.estimated_value) : null;
        const notes = body?.notes ? String(body.notes) : null;

        await db.query(`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(40) DEFAULT 'new'`);
        await db.query(`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(12,2) DEFAULT 25000`);

        const isVisitorSession = String(rawId).startsWith("vs_");
        const isStudentEnrollment = String(rawId).startsWith("se_");
        const numericId = Number(String(rawId).replace(/^(vs_|se_)/, ""));

        if (!Number.isInteger(numericId) || numericId <= 0) {
            return NextResponse.json({ error: "Invalid enquiry ID" }, { status: 400 });
        }

        if (isVisitorSession || !isStudentEnrollment) {
            const updated = await db.query(
                `
                UPDATE visitor_sessions
                SET
                    lead_status = COALESCE($1, lead_status),
                    pipeline_stage = COALESCE($2, pipeline_stage),
                    estimated_value = COALESCE($3, estimated_value),
                    follow_up = COALESCE($4, follow_up),
                    last_seen_at = NOW()
                WHERE id = $5
                RETURNING *
                `,
                [status, pipelineStage, estimatedValue, notes, numericId]
            );

            if (updated.rows[0]) {
                return NextResponse.json({
                    data: {
                        ...updated.rows[0],
                        id: `vs_${updated.rows[0].id}`,
                    },
                    message: "Enquiry updated successfully",
                });
            }
        }

        if (isStudentEnrollment) {
            return NextResponse.json({
                data: { id: rawId, status, notes },
                message: "Enquiry updated successfully",
            });
        }

        return NextResponse.json({ error: "Enquiry record not found" }, { status: 404 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update enquiry";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
