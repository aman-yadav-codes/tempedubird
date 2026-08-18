import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";

const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1";

function createSignature(params: Record<string, string | number>, apiSecret: string) {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1").update(`${serialized}${apiSecret}`).digest("hex");
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 });
    }

    const body = await req.json();
    const publicId = typeof body.publicId === "string" ? body.publicId.trim() : "";
    const resourceType = typeof body.resourceType === "string" ? body.resourceType.trim() : "image";
    if (!publicId) return NextResponse.json({ error: "publicId is required" }, { status: 400 });

    const timestamp = Math.round(Date.now() / 1000);
    const signature = createSignature({ public_id: publicId, timestamp }, apiSecret);
    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);

    const destroyRes = await fetch(`${CLOUDINARY_UPLOAD_URL}/${cloudName}/${resourceType}/destroy`, {
      method: "POST",
      body: formData,
    });
    const destroyJson = await destroyRes.json();
    if (!destroyRes.ok) {
      return NextResponse.json({ error: destroyJson.error?.message ?? "Document cleanup failed" }, { status: 502 });
    }

    return NextResponse.json({ data: destroyJson });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    const status = message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
