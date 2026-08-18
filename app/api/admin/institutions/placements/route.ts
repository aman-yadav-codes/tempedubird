import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPagination, getPageCount } from "@/lib/queries/pagination";
import { createInstitutionPlacement, listInstitutionPlacements } from "@/lib/queries/institutions";
import { applyInstitutionScope, assertCanAccessInstitution, assertRowsWithinInstitutionScope } from "@/lib/auth/institution-scope";
import { notifyInstitutionModuleUpdated } from "@/lib/notifications/admin-events";

async function assertPlacementProgramBelongsToInstitution(programId: number | null | undefined, institutionId: number) {
    if (!programId) return;

    const result = await db.query<{ id: number }>(
        `SELECT id
           FROM institution_programs
          WHERE id = $1
            AND institution_id = $2
            AND COALESCE(is_deleted, FALSE) = FALSE
          LIMIT 1`,
        [programId, institutionId]
    );

    if (!result.rows.length) {
        throw new Error("Selected program does not belong to this institution");
    }
}

export async function GET(req: Request) {
    try {
        const currentUser = await requireAdmin(req);
        const url = new URL(req.url);
        const { limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
        const search = url.searchParams.get("search")?.trim() || "";
        const institutionId = url.searchParams.get("institutionId") ? Number(url.searchParams.get("institutionId")) : undefined;

        const { data, total } = await listInstitutionPlacements(db, applyInstitutionScope({ search, institutionId, limit, offset }, currentUser));
        return NextResponse.json({ data, pageCount: getPageCount(total, limit), total });
    } catch (err: any) {
        const status = err.message === "Forbidden: Admin access required" ? 403 : 401;
        return NextResponse.json({ error: err.message }, { status });
    }
}

export async function POST(req: Request) {
    try {
        const currentUser = await requireAdmin(req);
        const body = await req.json();
        if (!body.institutionId || !body.year) {
            return NextResponse.json({ error: "institutionId and year are required" }, { status: 400 });
        }
        assertCanAccessInstitution(currentUser, Number(body.institutionId));
        await assertPlacementProgramBelongsToInstitution(
            body.programId == null ? null : Number(body.programId),
            Number(body.institutionId)
        );

        const created = await createInstitutionPlacement(db, {
            institutionId: Number(body.institutionId),
            programId: body.programId == null ? null : Number(body.programId),
            year: Number(body.year),
            averagePackage: body.averagePackage ?? null,
            highestPackage: body.highestPackage ?? null,
            lowestPackage: body.lowestPackage ?? null,
            placementPercentage: body.placementPercentage ?? null,
            totalStudents: body.totalStudents ?? null,
            placedStudents: body.placedStudents ?? null,
        });
        await notifyInstitutionModuleUpdated(db, {
            actor: currentUser,
            institutionId: Number((created as any).institution_id ?? (created as any).institutionId ?? body.institutionId),
            moduleName: "Placements",
            entityType: "placement",
            entityId: Number((created as any).id) || null,
        });

        return NextResponse.json({ data: created }, { status: 201 });
    } catch (err: any) {
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
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_placements", numericIds);
        const institutionRows = await db.query<{ institution_id: number }>(
            `SELECT DISTINCT institution_id FROM institution_placements WHERE id = ANY($1::int[])`,
            [numericIds]
        );

        if (softDelete === true) {
            await db.query(
                `UPDATE institution_placements
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
                    moduleName: "Placements",
                    entityType: "placement",
                })
            )
        );
        return NextResponse.json({ success: true });
    } catch (err: any) {
        const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: err.message }, { status });
    }
}
