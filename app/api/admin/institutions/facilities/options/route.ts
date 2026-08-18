import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { getAllowedInstitutionIds } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { listFacilityTypes, listInstitutionProfiles } from "@/lib/queries/institutions";
import { getPagination, getPageCount } from "@/lib/queries/pagination";

export async function GET(req: Request) {
    try {
        const currentUser = await requireAdmin(req);
        const url = new URL(req.url);
        const kind = url.searchParams.get("kind") || "institutions";
        const search = url.searchParams.get("search")?.trim() || "";

        if (kind === "facility-types") {
            const { data } = await listFacilityTypes(db, { search, limit: 500, offset: 0 });
            return NextResponse.json({ data: data.filter((item) => item.is_active) });
        }

        const { limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
        const institutionIds = getAllowedInstitutionIds(currentUser);
        const { data, total } = await listInstitutionProfiles(db, {
            search,
            limit,
            offset,
            ...(institutionIds ? { institutionIds } : {}),
        });

        return NextResponse.json({ data, pageCount: getPageCount(total, limit), total });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load options";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
