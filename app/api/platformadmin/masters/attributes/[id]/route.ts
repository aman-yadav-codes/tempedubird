import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureMasterDataSchema } from "@/lib/db/ensure-master-schema";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureMasterDataSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Platform Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const attrId = Number(id);
    if (isNaN(attrId)) {
      return NextResponse.json({ error: "Invalid attribute ID" }, { status: 400 });
    }

    await db.query(`UPDATE master_attributes SET is_active = FALSE, updated_at = NOW() WHERE id = $1`, [attrId]);

    return NextResponse.json({
      success: true,
      message: "Attribute archived successfully",
    });
  } catch (err: any) {
    console.error("[Master Attribute DELETE] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete attribute" }, { status: 500 });
  }
}
