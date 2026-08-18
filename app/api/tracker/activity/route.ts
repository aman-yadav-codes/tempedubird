import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/lib/db/db";
import { trackVisitorActivity } from "@/lib/queries/tracker";
import type { TrackerTriggerType } from "@/lib/types/tracker";

const allowedTriggers = new Set<TrackerTriggerType>([
    "page_view",
    "enroll",
    "contact",
    "demo",
    "callback",
    "enquiry",
]);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const cookieStore = await cookies();
        const cookieToken = cookieStore.get("visitor_tracking_token")?.value;
        const trackingToken = String(body.trackingToken || "");

        if (!cookieToken || cookieToken !== trackingToken) {
            return NextResponse.json({ error: "Invalid tracker token" }, { status: 403 });
        }

        const triggerType = String(body.triggerType || "page_view") as TrackerTriggerType;
        if (!allowedTriggers.has(triggerType)) {
            return NextResponse.json({ error: "Invalid trigger type" }, { status: 400 });
        }

        const pageUrl = String(body.pageUrl || "").trim();
        if (!pageUrl) {
            return NextResponse.json({ error: "pageUrl is required" }, { status: 400 });
        }

        const tracked = await trackVisitorActivity(db, {
            trackingToken,
            pageUrl,
            pageTitle: body.pageTitle || null,
            triggerType,
            updateOnly: body.updateOnly === true,
        });

        return NextResponse.json({ tracked: Boolean(tracked) });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to track activity";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
