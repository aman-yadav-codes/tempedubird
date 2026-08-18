import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getLanguageById, updateLanguage, softDeleteLanguage, toggleLanguageActive } from "@/lib/queries/institutions";
import { masterUpdateSchema } from "@/lib/validations/institution.schema";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(req);
        const { id } = await params;
        const body = await req.json();
        const langId = Number(id);

        if (typeof body.isActive === "boolean") {
            await toggleLanguageActive(db, langId, body.isActive);
        }

        if (body.name || body.slug) {
            const parsed = masterUpdateSchema.parse({ id: langId, name: body.name, slug: body.slug });
            await updateLanguage(db, parsed as any);
        }

        const updated = await getLanguageById(db, langId);
        return NextResponse.json({ data: updated });
    } catch (err: any) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(req);
        const { id } = await params;
        await softDeleteLanguage(db, Number(id));
        return NextResponse.json({ success: true });
    } catch (err: any) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(req);
        const { id } = await params;
        const item = await getLanguageById(db, Number(id));
        if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ data: item });
    } catch (err: any) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
