"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { canAccessAdminArea, hasAdminPagePermission } from "@/lib/auth/permissions";
import { shouldUseRoleRoutePrefix, toCanonicalAdminPath, toRoleRoutePath } from "@/lib/auth/role-routes";

export function useAdminGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const canonicalPathname = toCanonicalAdminPath(pathname);
  const hasAdminAccess = canAccessAdminArea(user);
  const isSelfServicePage = canonicalPathname === "/admin/account";
  const hasPageAccess = isSelfServicePage || hasAdminPagePermission(user, canonicalPathname);
  const isForbidden = isInitialized && isAuthenticated && (!hasAdminAccess || !hasPageAccess);
  const isReady = isInitialized && isAuthenticated && hasAdminAccess && hasPageAccess;

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.replace("/");
      return;
    }

    if (!hasAdminAccess || !hasPageAccess) {
      toast.error("You don't have permission to access this area.", {
        id: "permission-required",
      });
      return;
    }

    if (shouldUseRoleRoutePrefix(pathname, user)) {
      router.replace(toRoleRoutePath(pathname, user));
    }
  }, [hasAdminAccess, hasPageAccess, isAuthenticated, isInitialized, pathname, router, user]);

  return { isReady, isForbidden };
}
