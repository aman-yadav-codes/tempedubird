import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getFrontendConfig } from "@/lib/config/frontend-config";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paramBizId = searchParams.get("businessId") ? Number(searchParams.get("businessId")) : null;
    const paramInstId = searchParams.get("institutionId") ? Number(searchParams.get("institutionId")) : null;
    const config = getFrontendConfig();
    const envBizId = config.mode === "business" && config.businessId ? config.businessId : null;

    const targetId = paramBizId || paramInstId || envBizId;
    let targetUrl: string | null = null;

    if (targetId && Number.isInteger(targetId) && targetId > 0) {
      // 1. Check business_profiles
      const bizCheck = await db.query(
        `SELECT slug, id FROM business_profiles WHERE (id = $1 OR institution_profile_id = $1) AND COALESCE(is_active, TRUE) = TRUE ORDER BY (id = $1) DESC LIMIT 1`,
        [targetId]
      );
      if (bizCheck.rows.length > 0) {
        targetUrl = `/business/${bizCheck.rows[0].slug || bizCheck.rows[0].id}`;
      }

      // 2. Check professional_profiles
      if (!targetUrl) {
        const profCheck = await db.query(
          `SELECT slug, id FROM professional_profiles WHERE (id = $1 OR institution_profile_id = $1) AND COALESCE(is_active, TRUE) = TRUE LIMIT 1`,
          [targetId]
        );
        if (profCheck.rows.length > 0) {
          targetUrl = `/professional/${profCheck.rows[0].slug || profCheck.rows[0].id}`;
        }
      }

      // 3. Check institution_profiles
      if (!targetUrl) {
        const instCheck = await db.query(
          `SELECT slug, id FROM institution_profiles WHERE id = $1 LIMIT 1`,
          [targetId]
        );
        if (instCheck.rows.length > 0) {
          targetUrl = `/institutes/${instCheck.rows[0].slug || instCheck.rows[0].id}`;
        }
      }
    }

    if (!targetUrl) {
      let user: any = null;
      try {
        user = await getAuthenticatedUser(req);
      } catch {
        user = null;
      }
      if (user?.id) {
        const bizRes = await db.query(
          `SELECT slug, id FROM business_profiles WHERE user_id = $1 AND COALESCE(is_active, TRUE) = TRUE ORDER BY id DESC LIMIT 1`,
          [user.id]
        );
        if (bizRes.rows.length > 0) {
          targetUrl = `/business/${bizRes.rows[0].slug || bizRes.rows[0].id}`;
        } else {
          const profRes = await db.query(
            `SELECT slug, id FROM professional_profiles WHERE user_id = $1 AND COALESCE(is_active, TRUE) = TRUE ORDER BY id DESC LIMIT 1`,
            [user.id]
          );
          if (profRes.rows.length > 0) {
            targetUrl = `/professional/${profRes.rows[0].slug || profRes.rows[0].id}`;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      url: targetUrl || "/explore",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, url: "/explore", error: error.message }, { status: 500 });
  }
}
