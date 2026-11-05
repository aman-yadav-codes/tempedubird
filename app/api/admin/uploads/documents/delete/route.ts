import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";

export async function POST(req: Request) {
  try {
    await requireAdmin(req);

    const body = await req.json();
    const publicId = typeof body.publicId === "string" ? body.publicId.trim() : "";
    if (!publicId) return NextResponse.json({ error: "publicId is required" }, { status: 400 });

    if (publicId.startsWith("local_documents_")) {
      const fileName = publicId.replace("local_documents_", "");
      const filePath = path.join(process.cwd(), "public", "uploads", "documents", fileName);
      try {
        await fs.unlink(filePath);
      } catch {}
      return NextResponse.json({ data: { result: "ok" } });
    }

    if (publicId.startsWith("local_media_")) {
      const fileName = publicId.replace("local_media_", "");
      const filePath = path.join(process.cwd(), "public", "uploads", "media", fileName);
      try {
        await fs.unlink(filePath);
      } catch {}
      return NextResponse.json({ data: { result: "ok" } });
    }

    // Remote asset deletion acknowledgment
    return NextResponse.json({ data: { result: "ok" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    const status = message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
