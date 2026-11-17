import { redirect, RedirectType } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getFrontendConfig } from "@/lib/config/frontend-config";

export const dynamic = "force-dynamic";

interface Props {
  searchParams?: Promise<{ institutionId?: string; type?: string; businessId?: string }> | { institutionId?: string; type?: string; businessId?: string };
}

export default async function StorefrontRedirectPage({ searchParams }: Props) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const config = getFrontendConfig();

  const paramBizId = resolvedSearchParams?.businessId ? Number(resolvedSearchParams.businessId) : null;
  const paramInstId = resolvedSearchParams?.institutionId ? Number(resolvedSearchParams.institutionId) : null;
  const envBizId = config.mode === "business" && config.businessId ? config.businessId : null;

  const targetId = paramBizId || paramInstId || envBizId;

  let targetUrl: string | null = null;

  // 1. If target ID is present
  if (targetId && Number.isInteger(targetId) && targetId > 0) {
    try {
      // 1.1 Check if linked to a business_profile by id or institution_profile_id
      const bizCheck = await db.query(
        `SELECT slug, id FROM business_profiles WHERE (id = $1 OR institution_profile_id = $1) AND COALESCE(is_active, TRUE) = TRUE ORDER BY (id = $1) DESC LIMIT 1`,
        [targetId]
      );
      if (bizCheck.rows.length > 0) {
        targetUrl = `/business/${bizCheck.rows[0].slug || bizCheck.rows[0].id}`;
      }

      // 1.2 Check if linked to a professional_profile
      if (!targetUrl) {
        const profCheck = await db.query(
          `SELECT slug, id FROM professional_profiles WHERE (id = $1 OR institution_profile_id = $1) AND COALESCE(is_active, TRUE) = TRUE LIMIT 1`,
          [targetId]
        );
        if (profCheck.rows.length > 0) {
          targetUrl = `/professional/${profCheck.rows[0].slug || profCheck.rows[0].id}`;
        }
      }

      // 1.3 Fallback to institute page
      if (!targetUrl) {
        const instCheck = await db.query(
          `SELECT slug, id FROM institution_profiles WHERE id = $1 LIMIT 1`,
          [targetId]
        );
        if (instCheck.rows.length > 0) {
          targetUrl = `/institutes/${instCheck.rows[0].slug || instCheck.rows[0].id}`;
        }
      }
    } catch (error) {
      console.error("[StorefrontRedirect targetId] error:", error);
    }
  }

  // 2. If targetUrl found, redirect immediately
  if (targetUrl) {
    redirect(targetUrl, RedirectType.replace);
  }

  // 3. Fallback to authenticated user's own business / professional / institution profile
  let user: any = null;
  try {
    user = await getAuthenticatedUser();
  } catch {
    user = null;
  }

  if (user?.id) {
    try {
      // 3.1 User's own business profile
      const bizRes = await db.query(
        `SELECT slug, id FROM business_profiles 
         WHERE user_id = $1 AND COALESCE(is_active, TRUE) = TRUE 
         ORDER BY id DESC LIMIT 1`,
        [user.id]
      );
      if (bizRes.rows.length > 0) {
        targetUrl = `/business/${bizRes.rows[0].slug || bizRes.rows[0].id}`;
      }

      // 3.2 User's own professional profile
      if (!targetUrl) {
        const profRes = await db.query(
          `SELECT slug, id FROM professional_profiles 
           WHERE user_id = $1 AND COALESCE(is_active, TRUE) = TRUE 
           ORDER BY id DESC LIMIT 1`,
          [user.id]
        );
        if (profRes.rows.length > 0) {
          targetUrl = `/professional/${profRes.rows[0].slug || profRes.rows[0].id}`;
        }
      }

      // 3.3 User's institution membership
      if (!targetUrl) {
        const instRes = await db.query(
          `SELECT ip.slug, ip.id FROM institution_memberships im
           JOIN institution_profiles ip ON ip.id = im.institution_id
           WHERE im.user_id = $1 AND im.is_active = TRUE
           ORDER BY im.id DESC LIMIT 1`,
          [user.id]
        );
        if (instRes.rows.length > 0) {
          const inst = instRes.rows[0];
          const instBiz = await db.query(
            `SELECT slug, id FROM business_profiles WHERE (institution_profile_id = $1 OR id = $1) LIMIT 1`,
            [inst.id]
          );
          if (instBiz.rows.length > 0) {
            targetUrl = `/business/${instBiz.rows[0].slug || instBiz.rows[0].id}`;
          } else {
            targetUrl = `/institutes/${inst.slug || inst.id}`;
          }
        }
      }
    } catch (error) {
      console.error("[StorefrontRedirect user] error:", error);
    }
  }

  redirect(targetUrl || "/explore", RedirectType.replace);
}
