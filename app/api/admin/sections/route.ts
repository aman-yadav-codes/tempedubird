import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { listSections } from "@/lib/queries/institutions";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

export async function GET(req: Request) {
    try {
        await requireAdmin(req);
        const url = new URL(req.url);
        const { limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
        const search = url.searchParams.get("search")?.trim() || "";

        const { data, total } = await listSections(db, { search, limit, offset });
        return NextResponse.json({ data, pageCount: getPageCount(total, limit), total });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message === "Forbidden: Admin access required" ? 403 : 401;
        return NextResponse.json({ error: message }, { status });
    }
}
