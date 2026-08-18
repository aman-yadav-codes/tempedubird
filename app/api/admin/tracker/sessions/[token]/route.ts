import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { listVisitorActivities, updateVisitorSessionFollowUp } from "@/lib/queries/tracker";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        await requireAdmin(req);
        const { token } = await params;
        const data = await listVisitorActivities(db, token);
        if (!data.session) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ data });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unauthorized";
        return NextResponse.json({ error: message }, { status: message.includes("Forbidden") ? 403 : 401 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        await requireAdmin(req);
        const { token } = await params;
        const body = await req.json();
        const followUp = body?.follow_up;
        if (typeof followUp !== "string" || !followUp.trim()) {
            return NextResponse.json({ error: "Follow-up details are required" }, { status: 422 });
        }

        const updated = await updateVisitorSessionFollowUp(db, token, followUp, body?.lead_status);
        if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json({ data: updated });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unauthorized";
        return NextResponse.json({ error: message }, { status: message.includes("Forbidden") ? 403 : 401 });
    }
}
