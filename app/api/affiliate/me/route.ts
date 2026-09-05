import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getUserAffiliateDashboard, ensureAffiliateProfile } from "@/lib/queries/affiliates";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Automatically ensure user has affiliate record (affiliate_code = user.phone)
    await ensureAffiliateProfile(db, user.id, user.phone);

    const data = await getUserAffiliateDashboard(db, user.id);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[GET /api/affiliate/me] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch affiliate dashboard" },
      { status: 500 }
    );
  }
}
