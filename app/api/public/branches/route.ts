import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET() {
  try {
    await ensureFeatureSchema();
    const res = await db.query(
      `SELECT * FROM platform_branches WHERE status = 'active' ORDER BY id ASC`
    );
    return NextResponse.json({ branches: res.rows });
  } catch (error: any) {
    console.error("[Public Branches GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch branches" }, { status: 500 });
  }
}
