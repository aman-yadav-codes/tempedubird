import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  getPlatformAdminAffiliates,
  getAffiliateDetailForAdmin,
} from "@/lib/queries/affiliates";
import { isPlatformAdminUser, hasPermission } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isPlatformAdmin = isPlatformAdminUser(user);
    const canViewUsers = hasPermission(user, "users.allusers.view") || isPlatformAdmin;

    if (!canViewUsers && !isPlatformAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Platform Admin access required to view affiliates." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const affiliateId = url.searchParams.get("affiliateId");

    if (affiliateId && !isNaN(Number(affiliateId))) {
      const detail = await getAffiliateDetailForAdmin(db, Number(affiliateId));
      if (!detail) {
        return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
      }
      return NextResponse.json(detail);
    }

    const search = url.searchParams.get("search") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);

    const result = await getPlatformAdminAffiliates(db, {
      search,
      status,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[GET /api/admin/affiliates] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch platform affiliates" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isPlatformAdmin = isPlatformAdminUser(user);
    if (!isPlatformAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Platform Admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, affiliateId, amount, description, status, commissionRate } = body;

    if (!affiliateId) {
      return NextResponse.json({ error: "Affiliate ID is required" }, { status: 400 });
    }

    if (action === "credit_bonus") {
      const bonusAmount = parseFloat(amount);
      if (isNaN(bonusAmount) || bonusAmount <= 0) {
        return NextResponse.json({ error: "Valid bonus amount required" }, { status: 400 });
      }

      const aff = await db.query<{ user_id: number }>(
        "SELECT user_id FROM affiliates WHERE id = $1",
        [affiliateId]
      );
      if (!aff.rows[0]) {
        return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
      }

      await db.query(
        `
          INSERT INTO affiliate_earnings (affiliate_id, user_id, source_type, amount, status, description)
          VALUES ($1, $2, 'admin_bonus', $3, 'completed', $4)
        `,
        [
          affiliateId,
          aff.rows[0].user_id,
          bonusAmount,
          description || "Admin bonus credit",
        ]
      );

      await db.query(
        `
          UPDATE affiliates
          SET total_earnings = total_earnings + $1,
              updated_at = NOW()
          WHERE id = $2
        `,
        [bonusAmount, affiliateId]
      );

      return NextResponse.json({ message: "Bonus credited successfully" });
    }

    if (action === "update_status") {
      if (!status) {
        return NextResponse.json({ error: "Status is required" }, { status: 400 });
      }
      await db.query(
        "UPDATE affiliates SET status = $1, updated_at = NOW() WHERE id = $2",
        [status, affiliateId]
      );
      return NextResponse.json({ message: "Status updated successfully" });
    }

    if (action === "update_commission") {
      const rate = parseFloat(commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return NextResponse.json({ error: "Valid commission rate (0-100%) required" }, { status: 400 });
      }
      await db.query(
        "UPDATE affiliates SET commission_rate = $1, updated_at = NOW() WHERE id = $2",
        [rate, affiliateId]
      );
      return NextResponse.json({ message: "Commission rate updated successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[POST /api/admin/affiliates] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update affiliate" },
      { status: 500 }
    );
  }
}
