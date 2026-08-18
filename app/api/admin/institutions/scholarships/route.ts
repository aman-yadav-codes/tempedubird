import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPagination, getPageCount } from "@/lib/queries/pagination";
import { createInstitutionScholarship, listInstitutionScholarships } from "@/lib/queries/institutions";
import { aiScholarshipResponseSchema } from "@/lib/validations/ai.schema";
import { applyInstitutionScope, assertCanAccessInstitution, assertRowsWithinInstitutionScope } from "@/lib/auth/institution-scope";
import { notifyInstitutionModuleUpdated } from "@/lib/notifications/admin-events";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalBoolean(value: unknown, fallback: boolean) {
    return typeof value === "boolean" ? value : fallback;
}

function getAdminErrorStatus(message: string) {
    if (message === "Forbidden: Admin access required") return 403;
    if (/unauthorized|invalid token|session expired/i.test(message)) return 401;
    return 500;
}

export async function GET(req: Request) {
    try {
        const currentUser = await requireAdmin(req);
        const url = new URL(req.url);
        const { limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
        const search = url.searchParams.get("search")?.trim() || "";
        const institutionId = url.searchParams.get("institutionId") ? Number(url.searchParams.get("institutionId")) : undefined;

        const { data, total } = await listInstitutionScholarships(db, applyInstitutionScope({ search, institutionId, limit, offset }, currentUser));
        return NextResponse.json({ data, pageCount: getPageCount(total, limit), total });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load scholarships";
        return NextResponse.json({ error: message }, { status: getAdminErrorStatus(message) });
    }
}

export async function POST(req: Request) {
    try {
        const currentUser = await requireAdmin(req);
        const body: unknown = await req.json();
        if (!isRecord(body)) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        if (!body.institutionId) {
            return NextResponse.json({ error: "institutionId is required" }, { status: 400 });
        }
        const institutionId = Number(body.institutionId);
        assertCanAccessInstitution(currentUser, institutionId);

        const parsed = aiScholarshipResponseSchema.parse(body.aiResponse ?? body.ai_response);

        const created = await createInstitutionScholarship(db, {
            institutionId,
            aiResponse: parsed,
            isAiGenerated: optionalBoolean(body.isAiGenerated, true),
            isActive: optionalBoolean(body.isActive, true),
        });
        await notifyInstitutionModuleUpdated(db, {
            actor: currentUser,
            institutionId: Number(created.institution_id ?? institutionId),
            moduleName: "Scholarships",
            entityType: "scholarship",
            entityId: Number(created.id) || null,
        });

        return NextResponse.json({ data: created }, { status: 201 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid input";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function PATCH(req: Request) {
    try {
        const currentUser = await requireAdmin(req);
        const body = await req.json();
        const { ids, softDelete } = body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
        }
        const numericIds = ids.map(Number);
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_scholarships", numericIds);
        const institutionRows = await db.query<{ institution_id: number }>(
            `SELECT DISTINCT institution_id FROM institution_scholarships WHERE id = ANY($1::int[])`,
            [numericIds]
        );

        if (softDelete === true) {
            await db.query(
                `UPDATE institution_scholarships
                    SET is_deleted = TRUE,
                        deleted_at = NOW(),
                        updated_at = NOW()
                  WHERE id = ANY($1::int[])
                    AND COALESCE(is_deleted, FALSE) = FALSE`,
                [numericIds]
            );
        }
        await Promise.all(
            institutionRows.rows.map((row) =>
                notifyInstitutionModuleUpdated(db, {
                    actor: currentUser,
                    institutionId: Number(row.institution_id),
                    moduleName: "Scholarships",
                    entityType: "scholarship",
                })
            )
        );
        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid input";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
