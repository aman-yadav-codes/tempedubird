import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { canAccessAdminArea, hasPermission } from "@/lib/auth/permissions";
import { isOpeninaryConfigured, isMediaSupportedByOpeninary, uploadToOpeninary } from "@/lib/uploads/openinary";

const MAX_DOCUMENT_FILE_SIZE = 100 * 1024 * 1024; // 100MB for video/media support
const ACCEPTED_DOCUMENT_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
  // PDF & Word
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Excel & Spreadsheets
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  // Videos
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/mpeg",
  "video/ogg",
  "video/x-matroska",
  // Generic fallback (verified via extension)
  "application/octet-stream",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp",
  ".pdf", ".doc", ".docx",
  ".xls", ".xlsx", ".csv",
  ".mp4", ".mov", ".webm", ".avi", ".mkv", ".mpeg"
]);

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
        { error: "Document file is required" },
        { status: 400 },
      );
    }
    const ext = path.extname(file.name).toLowerCase();
    const isAcceptedType = ACCEPTED_DOCUMENT_TYPES.has(file.type) || ALLOWED_EXTENSIONS.has(ext);

    if (!isAcceptedType) {
      return NextResponse.json(
        { error: "Only images, video, PDF, Word (.doc, .docx), and Excel (.xls, .xlsx, .csv) files are allowed" },
        { status: 422 },
      );
    }
    if (file.size > MAX_DOCUMENT_FILE_SIZE) {
      return NextResponse.json(
        { error: "File must be 100MB or smaller" },
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
            resource_type: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "raw",
            file_type: file.type,
            file_name: file.name,
          },
        });
      } catch (openinaryErr) {
        console.error("Openinary document upload failed, falling back to local storage:", openinaryErr);
      }
    }

    // Fallback: Local file storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileExt = ext || (file.type.startsWith("video/") ? ".mp4" : file.type === "application/pdf" ? ".pdf" : ".png");
    const safeBaseName = path.basename(file.name, fileExt).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    const uniqueFileName = `${Date.now()}_${safeBaseName}_${randomBytes(4).toString("hex")}${fileExt}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "documents");
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, uniqueFileName), buffer);

    let resourceType = "raw";
    if (file.type.startsWith("image/")) resourceType = "image";
    else if (file.type.startsWith("video/")) resourceType = "video";

    return NextResponse.json({
      data: {
        url: `/uploads/documents/${uniqueFileName}`,
        public_id: `local_documents_${uniqueFileName}`,
        resource_type: resourceType,
        file_type: file.type,
        file_name: file.name,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    const status = message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
