import { getAppModeForHost } from "@/lib/deployment/app-mode";
import { isPlatformAdminUser, type PermissionUser } from "@/lib/auth/permissions";
import type { InstitutionTenant } from "@/lib/tenancy/institution-domain";

export const DEPLOYMENT_ACCESS_ERROR_CODE = "DEPLOYMENT_ACCESS_DENIED";

export type DeploymentAccessReason =
  | "PLATFORM_SITE_REQUIRES_PLATFORM_ADMIN"
  | "INSTITUTION_SITE_REQUIRES_INSTITUTION_ACCOUNT"
  | "INSTITUTION_SITE_REQUIRES_KNOWN_TENANT"
  | "INSTITUTION_SITE_REQUIRES_TENANT_MEMBERSHIP";

export type DeploymentAccessResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: DeploymentAccessReason;
      message: string;
    };

export function getDeploymentAccessMessage(reason: DeploymentAccessReason) {
  switch (reason) {
    case "PLATFORM_SITE_REQUIRES_PLATFORM_ADMIN":
      return "This is the platform portal. Please use platform admin credentials.";
    case "INSTITUTION_SITE_REQUIRES_INSTITUTION_ACCOUNT":
      return "This site belongs to an institution. Please use institution admin credentials.";
    case "INSTITUTION_SITE_REQUIRES_KNOWN_TENANT":
      return "This institution site is not configured yet.";
    case "INSTITUTION_SITE_REQUIRES_TENANT_MEMBERSHIP":
      return "You do not belong to this institution.";
  }
}

export function checkDeploymentAccess(
  user: PermissionUser,
  tenant: Pick<InstitutionTenant, "institution_id"> | null,
  host?: string | null
): DeploymentAccessResult {
  const mode = getAppModeForHost(host);

  if (mode === "all" || mode === "platform_admin" || mode === "business") {
    return { allowed: true };
  }

  if (mode === "platform") {
    if (isPlatformAdminUser(user)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: "PLATFORM_SITE_REQUIRES_PLATFORM_ADMIN",
      message: getDeploymentAccessMessage("PLATFORM_SITE_REQUIRES_PLATFORM_ADMIN"),
    };
  }

  if (isPlatformAdminUser(user)) {
    return { allowed: true };
  }

  // End-users (students, guardians, customers, clients) are always allowed to access and browse public/storefront
  const isEndUser =
    user.role_codes?.some((r: string) =>
      ["student", "guardian", "parent", "customer", "client", "guest"].includes(r.toLowerCase())
    ) ||
    user.roles?.some((r: any) =>
      ["student", "guardian", "parent", "customer", "client", "guest"].includes((r.code || r.name || "").toLowerCase())
    );

  if (isEndUser) {
    return { allowed: true };
  }

  if (!tenant?.institution_id) {
    return {
      allowed: false,
      reason: "INSTITUTION_SITE_REQUIRES_KNOWN_TENANT",
      message: getDeploymentAccessMessage("INSTITUTION_SITE_REQUIRES_KNOWN_TENANT"),
    };
  }

  const hasTenantMembership =
    user.memberships?.some(
      (membership) => membership.institution_id === tenant.institution_id
    ) ||
    (user as any).under_institution_id === tenant.institution_id ||
    (user as any).institution_id === tenant.institution_id ||
    (user as any).business_id === tenant.institution_id ||
    (tenant as any)?.created_by === user.id ||
    (tenant as any)?.user_id === user.id;

  if (!hasTenantMembership) {
    return {
      allowed: false,
      reason: "INSTITUTION_SITE_REQUIRES_TENANT_MEMBERSHIP",
      message: getDeploymentAccessMessage("INSTITUTION_SITE_REQUIRES_TENANT_MEMBERSHIP"),
    };
  }

  return { allowed: true };
}
