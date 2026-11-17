import {
  canAccessAdminArea,
  isPlatformFullAccess,
  isInstitutionAdminUser,
  isStaffUser,
  type InstitutionMembership,
  type PermissionUser,
} from "@/lib/auth/permissions";

export type SessionUser = {
  id: number;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  roles: string[];
  role_codes: string[];
  primary_role: string | null;
  is_super_admin: boolean;
  can_access_admin: boolean;
  permissions: string[];
  memberships: InstitutionMembership[];
  has_business_profile?: boolean;
  has_professional_profile?: boolean;
  is_customer?: boolean;
  institution_id?: number | null;
  under_institution_id?: number | null;
};

export function toSessionUser(
  user: PermissionUser & {
    has_business_profile?: boolean;
    has_professional_profile?: boolean;
    is_customer?: boolean;
  }
): SessionUser {
  const isSuperAdmin = isPlatformFullAccess(user);
  const hasBiz = Boolean(user.has_business_profile);
  const hasProf = Boolean(user.has_professional_profile);
  const hasBusinessOrProfessional = hasBiz || hasProf;
  const isInstAdmin = Boolean(
    isInstitutionAdminUser(user) ||
    user.role_codes?.includes("institution_admin") ||
    hasBusinessOrProfessional
  );
  const isStaff = isStaffUser(user);
  const isCustomer = Boolean(
    !isSuperAdmin && !isInstAdmin && !isStaff && (user.is_customer ?? false)
  );

  const roleCodes = Array.from(new Set([...(user.role_codes ?? [])]));
  const roles = Array.from(new Set([...(user.roles ?? [])]));

  const resolvedBusinessRole = hasBiz && hasProf
    ? "Business & Professional Admin"
    : hasBiz
      ? "Business Owner"
      : hasProf
        ? "Professional Provider"
        : "Business Admin";

  if (hasBusinessOrProfessional && !isSuperAdmin) {
    if (!roleCodes.includes("institution_admin")) {
      roleCodes.unshift("institution_admin");
    }
    if (!roles.includes(resolvedBusinessRole)) {
      roles.unshift(resolvedBusinessRole);
    }
  }

  const primaryRole = (hasBusinessOrProfessional && !isSuperAdmin)
    ? resolvedBusinessRole
    : (roles[0] ?? (isCustomer ? "Customer" : null));

  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatar_url,
    is_active: user.is_active,
    roles,
    role_codes: roleCodes,
    primary_role: primaryRole,
    is_super_admin: isSuperAdmin,
    can_access_admin: canAccessAdminArea(user) || hasBusinessOrProfessional,
    permissions: user.permissions ?? [],
    memberships: user.memberships ?? [],
    has_business_profile: hasBiz,
    has_professional_profile: hasProf,
    is_customer: isCustomer,
    institution_id: (user as any).institution_id ?? user.memberships?.[0]?.institution_id ?? (user as any).under_institution_id ?? null,
    under_institution_id: (user as any).under_institution_id ?? null,
  };
}
