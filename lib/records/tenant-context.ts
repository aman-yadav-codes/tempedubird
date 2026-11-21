import { getAuthenticatedUser } from "@/lib/auth/auth";
import { getFrontendConfig } from "@/lib/config/frontend-config";
import { db } from "@/lib/db/db";
import { getCatalogCountryMeta } from "@/lib/config/country-config";

export type TenantContext = {
  businessId: number;
  institutionId: number | null;
  businessName: string;
  isPlatformAdmin: boolean;
  userId: number | null;
  countryCode: string;
  currencyCode: string;
  currencySymbol: string;
};

export async function resolveTenantContext(req: Request): Promise<TenantContext | null> {
  const user = await getAuthenticatedUser(req).catch(() => null);
  const isPlatformAdmin = Boolean(
    user?.role_codes?.some((r: string) => r.includes("super") || r.includes("platform")) ||
    (user as any)?.role === "platform_admin" ||
    (user as any)?.is_super_admin
  );

  const url = new URL(req.url);
  const qBiz = url.searchParams.get("businessId") || url.searchParams.get("business_id");
  const qInst = url.searchParams.get("institutionId") || url.searchParams.get("institution_id");
  const headerBiz = req.headers.get("x-business-id");
  const headerInst = req.headers.get("x-institution-id");

  // 1. Candidate IDs from query or header
  let candidateBizId = (qBiz && /^\d+$/.test(qBiz)) ? Number(qBiz) : ((headerBiz && /^\d+$/.test(headerBiz)) ? Number(headerBiz) : null);
  let candidateInstId = (qInst && /^\d+$/.test(qInst)) ? Number(qInst) : ((headerInst && /^\d+$/.test(headerInst)) ? Number(headerInst) : null);

  // If user is NOT platform admin and user is authenticated:
  // User can ONLY access their own business/records, never other users' records!
  if (user?.id && !isPlatformAdmin) {
    // 2. Fetch all businesses and institutions owned by this authenticated user
    const userBizRes = await db.query(
      `SELECT id, institution_profile_id, name, country_code FROM business_profiles WHERE user_id = $1 ORDER BY id DESC`,
      [user.id]
    );

    const ownedBizIds = userBizRes.rows.map((r: any) => r.id);
    const ownedInstIds = userBizRes.rows.map((r: any) => r.institution_profile_id).filter(Boolean);

    if (Array.isArray(user.memberships) && user.memberships.length > 0) {
      user.memberships.forEach((m: any) => {
        if (m.institution_id) ownedInstIds.push(Number(m.institution_id));
      });
    }

    // Validate candidate IDs: if candidate does NOT belong to this user, ignore it!
    if (candidateBizId && !ownedBizIds.includes(candidateBizId)) {
      candidateBizId = null;
    }
    if (candidateInstId && !ownedInstIds.includes(candidateInstId)) {
      candidateInstId = null;
    }

    // Select the user's primary owned business
    if (!candidateBizId) {
      if (userBizRes.rows.length > 0) {
        candidateBizId = userBizRes.rows[0].id;
        candidateInstId = candidateInstId || userBizRes.rows[0].institution_profile_id;
      } else {
        // User has no business profile yet: auto-create an isolated business profile for this user
        const newBiz = await db.query(
          `INSERT INTO business_profiles (user_id, name, country_code, is_active, created_at, updated_at)
           VALUES ($1, $2, 'IN', TRUE, NOW(), NOW())
           RETURNING id, name, country_code`,
          [user.id, (user as any).name ? `${(user as any).name}'s Business` : `My Business`]
        );
        candidateBizId = newBiz.rows[0].id;
      }
    }

    const currentBiz = userBizRes.rows.find((r: any) => r.id === candidateBizId) || {
      id: candidateBizId,
      name: (user as any).name ? `${(user as any).name}'s Business` : "My Business",
      institution_profile_id: candidateInstId,
      country_code: "IN",
    };

    const cMeta = getCatalogCountryMeta(currentBiz.country_code || "IN");

    return {
      businessId: candidateBizId,
      institutionId: currentBiz.institution_profile_id || candidateInstId || candidateBizId,
      businessName: currentBiz.name,
      isPlatformAdmin: false,
      userId: user.id,
      countryCode: cMeta.code,
      currencyCode: cMeta.currencyCode,
      currencySymbol: cMeta.currencySymbol,
    };
  }

  // If user is Platform Admin:
  if (isPlatformAdmin) {
    if (!candidateBizId) {
      const config = getFrontendConfig();
      if (config.mode === "business" && config.businessId) {
        candidateBizId = config.businessId;
      }
    }
    if (!candidateBizId) {
      const firstBiz = await db.query(`SELECT id, institution_profile_id, name, country_code FROM business_profiles ORDER BY id ASC LIMIT 1`);
      if (firstBiz.rows.length > 0) {
        candidateBizId = firstBiz.rows[0].id;
        candidateInstId = candidateInstId || firstBiz.rows[0].institution_profile_id;
      }
    }

    if (candidateBizId) {
      const bizRow = await db.query(
        `SELECT id, institution_profile_id, name, country_code FROM business_profiles WHERE id = $1 LIMIT 1`,
        [candidateBizId]
      );
      const biz = bizRow.rows[0] || { id: candidateBizId, name: "Platform Admin Workspace", institution_profile_id: candidateInstId, country_code: "IN" };
      const cMeta = getCatalogCountryMeta(biz.country_code || "IN");

      return {
        businessId: biz.id,
        institutionId: biz.institution_profile_id || candidateInstId || biz.id,
        businessName: biz.name,
        isPlatformAdmin: true,
        userId: user?.id || null,
        countryCode: cMeta.code,
        currencyCode: cMeta.currencyCode,
        currencySymbol: cMeta.currencySymbol,
      };
    }
  }

  // Unauthenticated user
  return null;
}
