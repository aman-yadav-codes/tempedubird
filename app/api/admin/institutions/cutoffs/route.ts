import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import { createInstitutionCutoff, listInstitutionCutoffs } from "@/lib/queries/institutions";
import { institutionCutoffCreateSchema } from "@/lib/validations";
import { applyInstitutionScope, assertCanAccessInstitution, assertRowsWithinInstitutionScope } from "@/lib/auth/institution-scope";
import { notifyInstitutionModuleUpdated } from "@/lib/notifications/admin-events";
import type { CreateCutoffData } from "@/lib/types/institution";

function getAdminErrorStatus(message: string) {
    if (message === "Forbidden: Admin access required") return 403;
    if (/unauthorized|invalid token|session expired/i.test(message)) return 401;
    return 500;
}

async function assertCutoffRelationsBelongToInstitution(input: {
    institutionId: number;
    programId?: number | null;
    academicYearId?: number | null;
}) {
    if (input.programId) {
        const program = await db.query<{ id: number }>(
            `SELECT id
               FROM institution_programs
              WHERE id = $1
                AND institution_id = $2
                AND COALESCE(is_deleted, FALSE) = FALSE
              LIMIT 1`,
            [input.programId, input.institutionId]
        );
        if (!program.rows.length) throw new Error("Selected program does not belong to this institution");
    }

    if (input.academicYearId) {
        const session = await db.query<{ id: number }>(
            `SELECT id
               FROM academic_years
              WHERE id = $1
                AND institution_id = $2
                AND COALESCE(is_deleted, FALSE) = FALSE
              LIMIT 1`,
            [input.academicYearId, input.institutionId]
        );
        if (!session.rows.length) throw new Error("Selected session does not belong to this institution");
    }
}

async function resolveDefaultAcademicYearId(institutionId: number) {
    const result = await db.query<{ default_academic_year_id: number | null }>(
        `SELECT default_academic_year_id
           FROM institution_profiles
          WHERE id = $1
          LIMIT 1`,
        [institutionId]
    );
    return result.rows[0]?.default_academic_year_id ? Number(result.rows[0].default_academic_year_id) : null;
}

export async function GET(req: Request) {
    try {
        const currentUser = await requireAdmin(req);
        const url = new URL(req.url);
        const { limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
        const search = url.searchParams.get("search")?.trim() || "";
        const institutionId = url.searchParams.get("institutionId") ? Number(url.searchParams.get("institutionId")) : undefined;
        const programId = url.searchParams.get("programId") ? Number(url.searchParams.get("programId")) : undefined;
        const academicYearId = url.searchParams.get("academicYearId")
            ? Number(url.searchParams.get("academicYearId"))
            : institutionId
                ? await resolveDefaultAcademicYearId(institutionId)
                : undefined;

        const { data, total } = await listInstitutionCutoffs(db, applyInstitutionScope({ search, institutionId, programId, academicYearId, limit, offset }, currentUser));
        return NextResponse.json({ data, pageCount: getPageCount(total, limit), total });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load cutoffs";
        return NextResponse.json({ error: message }, { status: getAdminErrorStatus(message) });
    }
}

export async function POST(req: Request) {
    try {
        const currentUser = await requireAdmin(req);
        const body = await req.json();

        const parsed = institutionCutoffCreateSchema.parse(body);
        assertCanAccessInstitution(currentUser, parsed.institutionId);
        const payload = {
            ...parsed,
            academicYearId: parsed.academicYearId ?? await resolveDefaultAcademicYearId(parsed.institutionId),
        };
        await assertCutoffRelationsBelongToInstitution(payload);
        const created = await createInstitutionCutoff(db, payload satisfies CreateCutoffData);
        await notifyInstitutionModuleUpdated(db, {
            actor: currentUser,
            institutionId: Number(created.institution_id ?? parsed.institutionId),
            moduleName: "Institution Cutoffs",
            entityType: "cutoff",
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
        const { ids, isActive, softDelete } = body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
        }
        const numericIds = ids.map(Number);
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_cutoffs", numericIds);
        const institutionRows = await db.query<{ institution_id: number }>(
            `SELECT DISTINCT institution_id FROM institution_cutoffs WHERE id = ANY($1::int[])`,
            [numericIds]
        );

        if (typeof isActive === "boolean") {
            await db.query(`UPDATE institution_cutoffs SET is_active = $1, updated_at = NOW() WHERE id = ANY($2::int[])`, [isActive, numericIds]);
        }

        if (softDelete === true) {
            await db.query(
                `UPDATE institution_cutoffs
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
                    moduleName: "Institution Cutoffs",
                    entityType: "cutoff",
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
