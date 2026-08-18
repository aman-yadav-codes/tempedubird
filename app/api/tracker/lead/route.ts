import { NextResponse } from "next/server";

import { db } from "@/lib/db/db";
import { createVisitorSession } from "@/lib/queries/tracker";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const fullName = String(body.fullName || "").trim();
        const email = String(body.email || "").trim();
        const phone = String(body.phone || "").trim();

        if (fullName.length < 2) {
            return NextResponse.json({ error: "Enter your full name" }, { status: 400 });
        }

        if (!email && !phone) {
            return NextResponse.json({ error: "Enter email or phone" }, { status: 400 });
        }

        const created = await createVisitorSession(db, {
            fullName,
            email: email || null,
            phone: phone || null,
            firstPageUrl: body.firstPageUrl || null,
            currentPageUrl: body.currentPageUrl || body.firstPageUrl || null,
            utmSource: body.utmSource || null,
            utmMedium: body.utmMedium || null,
            utmCampaign: body.utmCampaign || null,
            utmTerm: body.utmTerm || null,
            utmContent: body.utmContent || null,
        });

        if (!created) {
            return NextResponse.json({ trackingEnabled: false });
        }

        const token = created.tracking_token;
        const res = NextResponse.json({ trackingToken: token, trackingEnabled: true });
        res.cookies.set("visitor_tracking_token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
        });
        return res;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to submit enquiry";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
