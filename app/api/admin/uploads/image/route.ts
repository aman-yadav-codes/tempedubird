import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { canAccessAdminArea } from "@/lib/auth/permissions";

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_FILE_SIZE = 100 * 1024 * 1024;
const MAX_DOCUMENT_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const ACCEPTED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/ogg",
]);
const ACCEPTED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
]);
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1";

function canUploadAdminFile(
  user: Awaited<ReturnType<typeof getAuthenticatedUser>>,
) {
  return (
    canAccessAdminArea(user) ||
    user.role_codes.includes("teacher") ||
    user.role_codes.includes("institution_admin") ||
    user.role_codes.includes("platform_admin")
  );
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
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

function getMediaKind(file: File) {
  if (ACCEPTED_IMAGE_TYPES.has(file.type)) return "image";
  if (ACCEPTED_VIDEO_TYPES.has(file.type)) return "video";
  if (ACCEPTED_DOCUMENT_TYPES.has(file.type)) return "file";
  return null;
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
        { error: "Media file is required" },
        { status: 400 },
      );
    }

    const mediaKind = getMediaKind(file);

    if (!mediaKind) {
      return NextResponse.json(
        { error: "Only image, video, PDF, Office, CSV, and text files are allowed" },
        { status: 422 },
      );
    }

    if (mediaKind === "image" && file.size > MAX_IMAGE_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be 5MB or smaller" },
        { status: 422 },
      );
    }

    if (mediaKind === "file" && file.size > MAX_DOCUMENT_FILE_SIZE) {
      return NextResponse.json(
        { error: "Document must be 25MB or smaller" },
        { status: 422 },
      );
    }

    if (mediaKind === "video" && file.size > MAX_VIDEO_FILE_SIZE) {
      return NextResponse.json(
        { error: "Video must be 100MB or smaller" },
        { status: 422 },
      );
    }

    const requestedFolder = String(formData.get("folder") ?? "");
    const timestamp = Math.round(Date.now() / 1000);
    const folder =
      requestedFolder === "document_templates"
        ? "document_templates"
        : requestedFolder === "notes"
          ? "notes"
        : "program_media";
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
        { error: uploadJson.error?.message ?? "Image upload failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      data: {
        url: uploadJson.secure_url,
        public_id: uploadJson.public_id,
        resource_type: uploadJson.resource_type,
        media_type: mediaKind,
        file_name: file.name,
        file_type: file.type,
      },
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
