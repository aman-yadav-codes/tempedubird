import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getTrackerSettings, updateTrackerSettings } from "@/lib/queries/tracker";

export async function GET(req: Request) {
    try {
        await requireAdmin(req);
        const settings = await getTrackerSettings(db);
        return NextResponse.json({ data: settings });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unauthorized";
        return NextResponse.json({ error: message }, { status: message.includes("Forbidden") ? 403 : 401 });
    }
}

export async function PATCH(req: Request) {
    try {
        await requireAdmin(req);
        const body = await req.json();
        const interval = Number(body.tracker_update_interval_minutes);
        if (!Number.isInteger(interval) || interval < 1) {
            return NextResponse.json({ error: "Interval must be at least 1 minute" }, { status: 400 });
        }

        const settings = await updateTrackerSettings(db, {
            tracking_enabled: body.tracking_enabled === true,
            tracker_update_interval_minutes: interval,
        });
        return NextResponse.json({ data: settings });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update tracker settings";
        return NextResponse.json({ error: message }, { status: message.includes("Forbidden") ? 403 : 400 });
    }
}
