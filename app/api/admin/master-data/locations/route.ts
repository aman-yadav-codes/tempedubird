import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { createLocation, listLocations } from "@/lib/queries/locations";
import { getPagination, getPageCount } from "@/lib/queries/pagination";

export async function GET(req: Request) {
    try {
        await requireAdmin(req);

        const url = new URL(req.url);
        const { page, limit, offset } = getPagination(
            url.searchParams.get("page"),
            url.searchParams.get("limit")
        );
        const search = url.searchParams.get("search")?.trim() || "";
        const scopesParam = url.searchParams.get("scopes");
        const scopes = scopesParam ? scopesParam.split(",") : undefined;

        const { data, total } = await listLocations(db, { search, limit, offset, scopes });

        return NextResponse.json({
            data,
            pageCount: getPageCount(total, limit),
            total,
        });
    } catch (err: any) {
        const status = err.message === "Forbidden: Admin access required" ? 403 : 401;
        return NextResponse.json({ error: err.message }, { status });
    }
}

export async function POST(req: Request) {
    try {
        await requireAdmin(req);
        const { name, slug, type, parent_id, latitude, longitude, location_scope } = await req.json();

        if (!name || !slug || !type) {
            return NextResponse.json({ error: "name, slug, and type are required" }, { status: 400 });
        }

        const location = await createLocation(db, {
            name,
            slug,
            type,
            parent_id: parent_id ?? null,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            location_scope: location_scope || "global",
        });
        return NextResponse.json({ data: location }, { status: 201 });
    } catch (err: any) {
        if (err.code === "23505") {
            return NextResponse.json({ error: "A location with that slug already exists" }, { status: 409 });
        }
        const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: err.message }, { status });
    }
}
