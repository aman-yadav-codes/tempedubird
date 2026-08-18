import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import { listVisitorSessions, updateVisitorSessionsFollowUp } from "@/lib/queries/tracker";

export async function GET(req: Request) {
    try {
        await requireAdmin(req);
        const url = new URL(req.url);
        const { limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
        const search = url.searchParams.get("search")?.trim() || "";
        const leadStatus = url.searchParams.get("status")?.trim() || "";
        const { data, total } = await listVisitorSessions(db, { search, leadStatus, limit, offset });
        return NextResponse.json({ data, total, pageCount: getPageCount(total, limit) });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unauthorized";
        return NextResponse.json({ error: message }, { status: message.includes("Forbidden") ? 403 : 401 });
    }
}

export async function PATCH(req: Request) {
    try {
        await requireAdmin(req);
        const body = await req.json();
        const trackingTokens = Array.isArray(body?.tracking_tokens)
            ? body.tracking_tokens.filter((value: unknown): value is string => typeof value === "string")
            : [];

        if (!trackingTokens.length) {
            return NextResponse.json({ error: "tracking_tokens is required" }, { status: 400 });
        }
        if (typeof body?.follow_up !== "string" || !body.follow_up.trim()) {
            return NextResponse.json({ error: "Follow-up details are required" }, { status: 422 });
        }

        const result = await updateVisitorSessionsFollowUp(
            db,
            trackingTokens,
            body?.follow_up,
            body?.lead_status
        );
        return NextResponse.json({ data: result });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unauthorized";
        return NextResponse.json({ error: message }, { status: message.includes("Forbidden") ? 403 : 401 });
    }
}
