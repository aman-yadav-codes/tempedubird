import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { canAccessAdminArea, hasPermission } from "@/lib/auth/permissions";

const MAX_DOCUMENT_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_DOCUMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1";

function canUploadAdminFile(
  user: Awaited<ReturnType<typeof getAuthenticatedUser>>,
) {
  return (
    canAccessAdminArea(user) ||
    user.role_codes.includes("teacher") ||
    user.role_codes.includes("institution_admin") ||
    user.role_codes.includes("platform_admin") ||
    hasPermission(user, "student.myclassroom.assignments.view")
  );
}

function createSignature(
  params: Record<string, string | number>,
  apiSecret: string,
) {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1").update(`${serialized}${apiSecret}`).digest("hex");
}

export async function POST(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!canUploadAdminFile(currentUser)) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary is not configured" },
        { status: 500 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Document file is required" },
        { status: 400 },
      );
    }
    if (!ACCEPTED_DOCUMENT_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG and WebP images are allowed" },
        { status: 422 },
      );
    }
    if (file.size > MAX_DOCUMENT_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be 2MB or smaller" },
        { status: 422 },
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = "documents";
    const signature = createSignature({ folder, timestamp }, apiSecret);
    const uploadFormData = new FormData();

    uploadFormData.append("file", file);
    uploadFormData.append("api_key", apiKey);
    uploadFormData.append("timestamp", String(timestamp));
    uploadFormData.append("folder", folder);
    uploadFormData.append("signature", signature);

    const uploadRes = await fetch(
      `${CLOUDINARY_UPLOAD_URL}/${cloudName}/auto/upload`,
      {
        method: "POST",
        body: uploadFormData,
      },
    );
    const uploadJson = await uploadRes.json();
    if (!uploadRes.ok) {
      return NextResponse.json(
        { error: uploadJson.error?.message ?? "Document upload failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      data: {
        url: uploadJson.secure_url,
        public_id: uploadJson.public_id,
        resource_type: uploadJson.resource_type,
        file_type: file.type,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    const status = message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
