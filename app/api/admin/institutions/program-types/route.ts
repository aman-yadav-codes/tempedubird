import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { listProgramTypes, createProgramType } from "@/lib/queries/institutions";
import { getPagination, getPageCount } from "@/lib/queries/pagination";
import { masterCreateSchema } from "@/lib/validations/institution.schema";

export async function GET(req: Request) {
    try {
        await requireAdmin(req);
        const url = new URL(req.url);
        const { page, limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
        const search = url.searchParams.get("search")?.trim() || "";

        const { data, total } = await listProgramTypes(db, { search, limit, offset });
        return NextResponse.json({ data, pageCount: getPageCount(total, limit), total });
    } catch (err: any) {
        const status = err.message === "Forbidden: Admin access required" ? 403 : 401;
        return NextResponse.json({ error: err.message }, { status });
    }
}

export async function POST(req: Request) {
    try {
        await requireAdmin(req);
        const body = await req.json();
        const parsed = masterCreateSchema.parse(body);
        const item = await createProgramType(db, parsed);
        return NextResponse.json({ data: item }, { status: 201 });
    } catch (err: any) {
        if (err.code === "23505") return NextResponse.json({ error: "A record with that slug already exists" }, { status: 409 });
        const message = err instanceof Error ? err.message : "Invalid input";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function PATCH(req: Request) {
    try {
        await requireAdmin(req);
        const body = await req.json();
        const { ids, isActive, softDelete } = body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
        }
        const numericIds = ids.map(Number);

        if (typeof isActive === "boolean") {
            await db.query(
                `UPDATE program_types SET is_active = $1, updated_at = NOW() WHERE id = ANY($2::int[])`,
                [isActive, numericIds]
            );
        }
        if (softDelete === true) {
            await db.query(
                `UPDATE program_types SET is_deleted = TRUE, updated_at = NOW() WHERE id = ANY($1::int[])`,
                [numericIds]
            );
        }
        return NextResponse.json({ success: true });
    } catch (err: any) {
        const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: err.message }, { status });
    }
}
