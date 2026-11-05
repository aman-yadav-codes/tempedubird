import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isOpeninaryConfigured, isMediaSupportedByOpeninary, uploadToOpeninary } from "@/lib/uploads/openinary";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export async function POST(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only PDF, JPG, PNG, and WebP images are allowed" },
        { status: 422 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 15MB limit" },
        { status: 422 }
      );
    }

    // Primary: Upload to Openinary self-hosted media service
    if (isOpeninaryConfigured() && isMediaSupportedByOpeninary(file.name, file.type)) {
      try {
        const result = await uploadToOpeninary(file, file.name, "crmtaskassets", file.type);
        return NextResponse.json({
          url: result.fullUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        });
      } catch (openinaryErr: any) {
        console.error("Openinary finance upload failed:", openinaryErr);
        const errMsg = openinaryErr?.message || "Failed to upload file to Openinary";
        return NextResponse.json(
          { error: `Upload to media service failed: ${errMsg}` },
          { status: 502 }
        );
      }
    }

    // Durable storage for documents not supported by Openinary (e.g. PDF, Word, Excel)
    // or when Openinary is not configured.
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFileName = `${Date.now()}_${safeName}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "finance");

    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, uniqueFileName);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/finance/${uniqueFileName}`;

    return NextResponse.json({
      url: publicUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
  } catch (err: any) {
    console.error("Finance request upload error:", err);
    return NextResponse.json(
      { error: err?.message || "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
