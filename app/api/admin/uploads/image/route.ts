import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { canAccessAdminArea } from "@/lib/auth/permissions";
import { isOpeninaryConfigured, isMediaSupportedByOpeninary, uploadToOpeninary } from "@/lib/uploads/openinary";

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_FILE_SIZE = 100 * 1024 * 1024;
const MAX_DOCUMENT_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
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

    const requestedFolder = String(formData.get("folder") ?? "crmtaskassets");
    const targetFolder = requestedFolder || "crmtaskassets";

    // Primary: Upload to Openinary self-hosted media service
    if (isOpeninaryConfigured() && isMediaSupportedByOpeninary(file.name, file.type)) {
      try {
        const result = await uploadToOpeninary(file, file.name, targetFolder, file.type);
        return NextResponse.json({
          data: {
            url: result.fullUrl,
            public_id: result.path,
            resource_type: mediaKind === "file" ? "raw" : mediaKind,
            media_type: mediaKind,
            file_name: file.name,
            file_type: file.type,
          },
        });
      } catch (openinaryErr: any) {
        console.error("Openinary upload failed:", openinaryErr);
        const errMsg = openinaryErr?.message || "Failed to upload media to Openinary";
        return NextResponse.json(
          { error: `Upload to media service failed: ${errMsg}` },
          { status: 502 }
        );
      }
    }

    // Durable storage for document types not supported by Openinary (e.g. PDF/Office files)
    // or when Openinary is not configured.
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = path.extname(file.name) || ".png";
    const safeBaseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    const uniqueFileName = `${Date.now()}_${safeBaseName}_${randomBytes(4).toString("hex")}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "media");
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, uniqueFileName), buffer);

    return NextResponse.json({
      data: {
        url: `/uploads/media/${uniqueFileName}`,
        public_id: `local_media_${uniqueFileName}`,
        resource_type: mediaKind === "file" ? "raw" : mediaKind,
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
