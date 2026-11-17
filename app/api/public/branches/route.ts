import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { getFrontendConfig } from "@/lib/config/frontend-config";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const url = new URL(req.url);
    const paramBizId = url.searchParams.get("businessId") || url.searchParams.get("business_id");
    const paramInstId = url.searchParams.get("institutionId") || url.searchParams.get("institution_id");

    const config = getFrontendConfig();
    const targetId = paramBizId || paramInstId || (config.mode === "business" ? config.businessId : null);

    let res;
    if (targetId && Number(targetId) > 0) {
      res = await db.query(
        `SELECT * FROM platform_branches WHERE (business_id = $1 OR institution_id = $1) AND status = 'active' ORDER BY is_headquarters DESC, id ASC`,
        [Number(targetId)]
      );
      if (res.rows.length === 0) {
        // Fallback to checking institution_branches
        res = await db.query(
          `SELECT id, branch_name, address, city, state, pincode, is_primary as is_headquarters, 'active' as status
           FROM institution_branches
           WHERE institution_id = $1 AND COALESCE(is_active, TRUE) = TRUE
           ORDER BY is_primary DESC, id ASC`,
          [Number(targetId)]
        );
      }
    } else {
      res = await db.query(
        `SELECT * FROM platform_branches WHERE business_id IS NULL AND status = 'active' ORDER BY is_headquarters DESC, id ASC`
      );
    }

    return NextResponse.json({ branches: res.rows });
  } catch (error: any) {
    console.error("[Public Branches GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch branches" }, { status: 500 });
  }
}
