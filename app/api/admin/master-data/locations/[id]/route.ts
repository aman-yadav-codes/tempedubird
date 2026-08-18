import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { deleteLocation, toggleLocationStatus, updateLocation } from "@/lib/queries/locations";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(req);
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);

        if (isNaN(id)) {
            return NextResponse.json({ error: "Invalid location ID" }, { status: 400 });
        }

        await deleteLocation(db, id);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: err.message }, { status });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(req);
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);

        if (isNaN(id)) {
            return NextResponse.json({ error: "Invalid location ID" }, { status: 400 });
        }

        const body = await req.json();

        // Toggle status
        if (body.is_active !== undefined) {
            const location = await toggleLocationStatus(db, id, body.is_active);
            return NextResponse.json({ data: location });
        }

        // Update fields
        if (body.name || body.slug || body.type || body.parent_id !== undefined || body.latitude !== undefined || body.longitude !== undefined || body.location_scope !== undefined) {
            const location = await updateLocation(db, id, {
                name: body.name,
                slug: body.slug,
                type: body.type,
                parent_id: body.parent_id,
                latitude: body.latitude,
                longitude: body.longitude,
                location_scope: body.location_scope,
            });
            return NextResponse.json({ data: location });
        }

        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    } catch (err: any) {
        if (err.code === "23505") {
            return NextResponse.json({ error: "A location with that slug already exists" }, { status: 409 });
        }
        const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: err.message }, { status });
    }
}
