import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { listInstitutionProfiles, createInstitutionProfile } from "@/lib/queries/institutions";
import { getPagination, getPageCount } from "@/lib/queries/pagination";
import { institutionProfileCreateSchema } from "@/lib/validations/institution-profile.schema";
import { applyInstitutionScope, assertRowsWithinInstitutionScope, getAllowedInstitutionIds } from "@/lib/auth/institution-scope";
import { handlePublicInstitutionsGet } from "@/lib/api/public-institutions";
import { notifyInstitutionStatusChanged } from "@/lib/notifications/admin-events";
import type { CreateInstitutionData, ListInstitutionsOptions } from "@/lib/types/institution";
import {
    archiveInstitutionLifecycle,
    restoreInstitutionLifecycle,
    softDeleteInstitutionLifecycle,
    suspendInstitutionLifecycle,
} from "@/lib/queries/institution-lifecycle";

async function attachCreatorAsInstitutionAdmin(userId: number, institutionId: number) {
    const role = await db.query<{ id: number }>(
        `
        SELECT id
        FROM roles
        WHERE code = 'institution_admin'
          AND COALESCE(is_deleted, FALSE) = FALSE
        LIMIT 1
        `
    );
    const roleId = role.rows[0]?.id;
    if (!roleId) return;

    await db.query(
        `
        INSERT INTO institution_memberships (
            institution_id,
            user_id,
            role_id,
            is_active,
            status,
            join_date,
            is_current
        )
        VALUES ($1, $2, $3, TRUE, 'ACTIVE', CURRENT_TIMESTAMP, TRUE)
        ON CONFLICT (institution_id, user_id)
        DO UPDATE SET
            role_id = EXCLUDED.role_id,
            is_active = TRUE,
            status = 'ACTIVE',
            leave_date = NULL,
            is_current = TRUE,
            is_deleted = FALSE,
            deleted_at = NULL,
            deleted_by = NULL,
            updated_at = NOW()
        `,
        [institutionId, userId, roleId]
    );
}

export async function GET(req: Request) {
    try {
        if (!req.headers.get("authorization")?.startsWith("Bearer ")) {
            return handlePublicInstitutionsGet(req);
        }

        const currentUser = await requireAdmin(req);
        const url = new URL(req.url);
        const { limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
        const search = url.searchParams.get("search")?.trim() || "";
        const typeId = url.searchParams.get("typeId") ? Number(url.searchParams.get("typeId")) : undefined;
        const typeSearch = url.searchParams.get("typeSearch")?.trim() || "";
        const subtypeId = url.searchParams.get("subtypeId") ? Number(url.searchParams.get("subtypeId")) : undefined;
        const locationId = url.searchParams.get("locationId") ? Number(url.searchParams.get("locationId")) : undefined;
        const categoryId = url.searchParams.get("categoryId") ? Number(url.searchParams.get("categoryId")) : undefined;
        const institutionId = url.searchParams.get("institutionId") ? Number(url.searchParams.get("institutionId")) : undefined;
        const isActive = url.searchParams.get("isActive");
        const parentUniversityLookup = url.searchParams.get("parentUniversityLookup") === "1";

        const opts: ListInstitutionsOptions = { search, limit, offset };
        if (typeId) opts.typeId = typeId;
        if (typeSearch) opts.typeSearch = typeSearch;
        if (subtypeId) opts.subtypeId = subtypeId;
        if (locationId) opts.locationId = locationId;
        if (categoryId) opts.categoryId = categoryId;
        if (institutionId) opts.institutionId = institutionId;
        if (isActive !== null) opts.isActive = isActive === "true";

        const shouldBypassInstitutionScopeForParentUniversities =
            parentUniversityLookup &&
            typeSearch.toLowerCase().includes("university") &&
            isActive === "true";
        const scopedOpts = shouldBypassInstitutionScopeForParentUniversities
            ? opts
            : applyInstitutionScope(opts, currentUser);

        const { data, total } = await listInstitutionProfiles(db, scopedOpts);
        return NextResponse.json({ data, pageCount: getPageCount(total, limit), total });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        const status = message === "Forbidden: Admin access required" ? 403 : 401;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function POST(req: Request) {
    try {
        const currentUser = await requireAdmin(req);
        const body = await req.json();
        const allowedInstitutionIds = getAllowedInstitutionIds(currentUser);
        const parsed = institutionProfileCreateSchema.parse(body);
        const created = await createInstitutionProfile(db, {
            ...parsed,
            createdBy: currentUser.id,
        } as CreateInstitutionData);

        if (allowedInstitutionIds !== null && created?.id) {
            await attachCreatorAsInstitutionAdmin(currentUser.id, Number(created.id));
        }

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
        const { ids, isActive, softDelete, restore, archive } = body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
        }
        const numericIds = ids.map(Number);
        await assertRowsWithinInstitutionScope(db, currentUser, "institution_profiles", numericIds, "id");

        if (typeof isActive === "boolean") {
            if (isActive) {
                await restoreInstitutionLifecycle(db, numericIds);
            } else {
                await suspendInstitutionLifecycle(db, numericIds);
            }
            await Promise.all(
                numericIds.map((institutionId) =>
                    notifyInstitutionStatusChanged(db, {
                        actor: currentUser,
                        institutionId,
                        isActive,
                    })
                )
            );
        }
        if (softDelete === true) {
            await softDeleteInstitutionLifecycle(db, numericIds);
        }
        if (archive === true) {
            await archiveInstitutionLifecycle(db, numericIds);
        }
        if (restore === true) {
            await restoreInstitutionLifecycle(db, numericIds);
        }
        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
