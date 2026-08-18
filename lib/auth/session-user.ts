import {
  canAccessAdminArea,
  isPlatformFullAccess,
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
};

export function toSessionUser(user: PermissionUser): SessionUser {
  const isSuperAdmin = isPlatformFullAccess(user);

  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatar_url,
    is_active: user.is_active,
    roles: user.roles ?? [],
    role_codes: user.role_codes ?? [],
    primary_role: user.roles?.[0] ?? null,
    is_super_admin: isSuperAdmin,
    can_access_admin: canAccessAdminArea(user),
    permissions: user.permissions ?? [],
    memberships: user.memberships ?? [],
  };
}
