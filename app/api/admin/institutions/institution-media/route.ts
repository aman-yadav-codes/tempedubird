import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { listInstitutionMedia, createInstitutionMedia } from "@/lib/queries/institutions";

export async function GET(req: Request) {
    try {
        await requireAdmin(req);
        const url = new URL(req.url);
        const institutionId = Number(url.searchParams.get("institutionId"));
        const page = Number(url.searchParams.get("page") || "1");
        const limit = Number(url.searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        if (!institutionId) return NextResponse.json({ error: "institutionId is required" }, { status: 400 });

        const data = await listInstitutionMedia(db, institutionId, limit, offset);
        return NextResponse.json({ data });
    } catch (err: any) {
        const status = err.message === "Forbidden: Admin access required" ? 403 : 401;
        return NextResponse.json({ error: err.message }, { status });
    }
}

export async function POST(req: Request) {
    try {
        await requireAdmin(req);
        const body = await req.json();
        const { institutionId, mediaType, url, title, sortOrder } = body;
        if (!institutionId || !mediaType || !url) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        const created = await createInstitutionMedia(db, { institutionId: Number(institutionId), mediaType, url, title, sortOrder });
        return NextResponse.json({ data: created }, { status: 201 });
    } catch (err: any) {
        const message = err instanceof Error ? err.message : "Invalid input";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
