import { getAuthenticatedUser } from "@/lib/auth/auth";
import { getFrontendConfig } from "@/lib/config/frontend-config";
import { db } from "@/lib/db/db";

export type TenantContext = {
  businessId: number;
  institutionId: number | null;
  businessName: string;
  isPlatformAdmin: boolean;
  userId: number | null;
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

  // 1. Check explicit query or header parameter
  let candidateBizId = (qBiz && /^\d+$/.test(qBiz)) ? Number(qBiz) : ((headerBiz && /^\d+$/.test(headerBiz)) ? Number(headerBiz) : null);
  let candidateInstId = (qInst && /^\d+$/.test(qInst)) ? Number(qInst) : ((headerInst && /^\d+$/.test(headerInst)) ? Number(headerInst) : null);

  // 2. Check frontend config (Business Mode in env)
  if (!candidateBizId) {
    const config = getFrontendConfig();
    if (config.mode === "business" && config.businessId) {
      candidateBizId = config.businessId;
    }
  }

  // 3. Check authenticated user's ownership or membership
  if (!candidateBizId && user?.id) {
    const userBiz = await db.query(
      `SELECT id, institution_profile_id, name FROM business_profiles WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [user.id]
    );
    if (userBiz.rows.length > 0) {
      candidateBizId = userBiz.rows[0].id;
      candidateInstId = candidateInstId || userBiz.rows[0].institution_profile_id;
    } else if (user.memberships?.length > 0) {
      const instMem = user.memberships.find((m: any) => m.institution_id);
      if (instMem) {
        candidateInstId = Number(instMem.institution_id);
        const bp = await db.query(
          `SELECT id, name FROM business_profiles WHERE institution_profile_id = $1 LIMIT 1`,
          [candidateInstId]
        );
        if (bp.rows.length > 0) {
          candidateBizId = bp.rows[0].id;
        }
      }
    }
  }

  // 4. Default fallback: first business profile
  if (!candidateBizId) {
    const firstBiz = await db.query(`SELECT id, institution_profile_id, name FROM business_profiles ORDER BY id ASC LIMIT 1`);
    if (firstBiz.rows.length > 0) {
      candidateBizId = firstBiz.rows[0].id;
      candidateInstId = candidateInstId || firstBiz.rows[0].institution_profile_id;
    }
  }

  if (!candidateBizId) {
    return null;
  }

  const bizRow = await db.query(
    `SELECT id, institution_profile_id, name FROM business_profiles WHERE id = $1 LIMIT 1`,
    [candidateBizId]
  );
  const finalBiz = bizRow.rows[0] || { id: candidateBizId, name: "Business Workspace", institution_profile_id: candidateInstId };

  return {
    businessId: finalBiz.id,
    institutionId: candidateInstId || finalBiz.institution_profile_id || finalBiz.id,
    businessName: finalBiz.name,
    isPlatformAdmin,
    userId: user?.id || null,
  };
}
