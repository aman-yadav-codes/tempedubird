import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/auth";
import { assertCanAccessInstitution, getAllowedInstitutionIds } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import {
    listInstitutionFacilitiesWithMedia,
    listInstitutionFacilitySummaries,
    replaceInstitutionFacilities,
} from "@/lib/queries/institutions";
import { getPagination, getPageCount } from "@/lib/queries/pagination";

const mediaInputSchema = z.object({
    mediaType: z.enum(["image", "video"]).optional(),
    url: z.string().trim().min(1),
    title: z.string().trim().max(150).optional().nullable(),
    sortOrder: z.number().int().optional(),
});

const facilityInputSchema = z.object({
    facilityTypeId: z.number().int().positive(),
    title: z.string().trim().max(200).optional().nullable(),
    description: z.string().trim().optional().nullable(),
    imageUrl: z.string().trim().optional().nullable(),
    aiDescription: z.record(z.string(), z.unknown()).optional().nullable(),
    media: z.array(mediaInputSchema).optional(),
    displayOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
});

const saveFacilitiesSchema = z.object({
    institutionId: z.number().int().positive(),
    facilities: z.array(facilityInputSchema).max(50),
}).superRefine(({ facilities }, ctx) => {
    const seen = new Set<number>();
    facilities.forEach((facility, index) => {
        if (seen.has(facility.facilityTypeId)) {
            ctx.addIssue({
                code: "custom",
                path: ["facilities", index, "facilityTypeId"],
                message: "Each facility type can only be selected once",
            });
        }
        seen.add(facility.facilityTypeId);
    });
});

export async function GET(req: Request) {
    try {
        const currentUser = await requireAdmin(req);
        const url = new URL(req.url);
        const institutionId = url.searchParams.get("institutionId") ? Number(url.searchParams.get("institutionId")) : null;
        const summaryMode = url.searchParams.get("view") === "summary";

        if (institutionId && !summaryMode) {
            assertCanAccessInstitution(currentUser, institutionId);
            const facilities = await listInstitutionFacilitiesWithMedia(db, institutionId);
            return NextResponse.json({ data: facilities });
        }

        if (institutionId) assertCanAccessInstitution(currentUser, institutionId);

        const { limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
        const search = url.searchParams.get("search")?.trim() || "";
        const { data, total } = await listInstitutionFacilitySummaries(db, {
            search,
            limit,
            offset,
            institutionIds: institutionId
                ? [institutionId]
                : getAllowedInstitutionIds(currentUser) ?? undefined,
        });

        return NextResponse.json({ data, pageCount: getPageCount(total, limit), total });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}

async function saveFacilities(req: Request) {
    try {
        const currentUser = await requireAdmin(req);
        const body = await req.json();
        const parsed = saveFacilitiesSchema.parse(body);

        assertCanAccessInstitution(currentUser, parsed.institutionId);
        const facilities = await replaceInstitutionFacilities(
            db,
            parsed.institutionId,
            parsed.facilities,
            currentUser.id ?? null
        );

        return NextResponse.json({ data: facilities });
    } catch (err: unknown) {
        const rawMessage = err instanceof Error ? err.message : "Invalid input";
        const message = rawMessage.includes("uq_institution_facility")
            ? "This facility is already configured for the selected institution"
            : rawMessage;
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function POST(req: Request) {
    return saveFacilities(req);
}

export async function PUT(req: Request) {
    return saveFacilities(req);
}
