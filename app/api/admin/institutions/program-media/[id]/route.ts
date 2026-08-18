import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { deleteProgramMedia } from "@/lib/queries/institutions";
import { canAccessInstitution } from "@/lib/auth/institution-scope";

const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1";

function createSignature(params: Record<string, string | number>, apiSecret: string) {
    const serialized = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&");

    return createHash("sha1")
        .update(`${serialized}${apiSecret}`)
        .digest("hex");
}

function resolveCloudinaryAsset(url: string, mediaType?: string | null) {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const uploadIndex = parts.indexOf("upload");

    if (uploadIndex < 0 || parts.length <= uploadIndex + 2) {
        return null;
    }

    const resourceType = mediaType === "video" ? "video" : mediaType === "image" ? "image" : parts[1] || "image";
    const publicId = parts.slice(uploadIndex + 2).join("/").replace(/\.[^.\/]+$/, "");

    if (!publicId) return null;

    return { resourceType, publicId };
}

async function deleteFromCloudinary(url: string, mediaType?: string | null) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error("Cloudinary is not configured");
    }

    const asset = resolveCloudinaryAsset(url, mediaType);
    if (!asset) {
        throw new Error("Unable to resolve Cloudinary asset");
    }

    const timestamp = Math.round(Date.now() / 1000);
    const signature = createSignature({ public_id: asset.publicId, timestamp }, apiSecret);
    const formData = new FormData();

    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("public_id", asset.publicId);
    formData.append("signature", signature);

    const response = await fetch(`${CLOUDINARY_UPLOAD_URL}/${cloudName}/${asset.resourceType}/destroy`, {
        method: "POST",
        body: formData,
    });

    const json = await response.json();
    if (!response.ok) {
        throw new Error(json.error?.message ?? "Cloudinary delete failed");
    }

    return { result: json.result, publicId: asset.publicId, resourceType: asset.resourceType };
}

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

        const [dbDeleteResult, cloudinaryDeleteResult] = await Promise.allSettled([
            deleteProgramMedia(db, Number(id)),
            deleteFromCloudinary(media.url, media.media_type),
        ]);

        console.log("[program-media] delete", {
            id: Number(id),
            database: dbDeleteResult.status,
            cloudinary: cloudinaryDeleteResult.status,
            cloudinaryResult: cloudinaryDeleteResult.status === "fulfilled" ? cloudinaryDeleteResult.value : null,
            cloudinaryError: cloudinaryDeleteResult.status === "rejected" ? String(cloudinaryDeleteResult.reason) : null,
        });

        if (dbDeleteResult.status === "rejected") {
            throw dbDeleteResult.reason;
        }

        if (cloudinaryDeleteResult.status === "rejected") {
            return NextResponse.json(
                {
                    success: true,
                    warning: "Removed from database, but Cloudinary cleanup failed",
                },
                { status: 207 }
            );
        }

        return NextResponse.json({ success: true, cloudinary: cloudinaryDeleteResult.value });
    } catch (err: any) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
