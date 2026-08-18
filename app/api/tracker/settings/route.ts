import { NextResponse } from "next/server";

import { db } from "@/lib/db/db";
import { getTrackerSettings } from "@/lib/queries/tracker";

export async function GET() {
    const settings = await getTrackerSettings(db);
    return NextResponse.json({ data: settings });
}
