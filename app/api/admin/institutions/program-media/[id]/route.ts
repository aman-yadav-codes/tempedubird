import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { deleteProgramMedia } from "@/lib/queries/institutions";
import { canAccessInstitution } from "@/lib/auth/institution-scope";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await requireAdmin(req);
        const { id } = await params;

        const mediaRes = await db.query(
            `
                SELECT pm.id, pm.url, pm.media_type, ip.institution_id
                FROM program_media pm
                INNER JOIN institution_programs ip ON ip.id = pm.program_id
                WHERE pm.id = $1
            `,
            [Number(id)]
        );

        const media = mediaRes.rows[0];
        if (!media) {
            return NextResponse.json({ error: "Program media not found" }, { status: 404 });
        }
        if (!canAccessInstitution(currentUser, Number(media.institution_id))) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        // Delete from DB
        await deleteProgramMedia(db, Number(id));

        // If stored in local uploads directory, clean it up
        if (typeof media.url === "string" && media.url.startsWith("/uploads/")) {
            try {
                const relativePath = media.url.replace(/^\/+/, "");
                const localFilePath = path.join(process.cwd(), "public", relativePath);
                await fs.unlink(localFilePath);
            } catch {}
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
