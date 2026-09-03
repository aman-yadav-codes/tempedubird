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
  const isPublicPage = !canonicalPathname.startsWith("/admin");
  const isSelfServicePage = canonicalPathname === "/admin/account";
  const hasPageAccess = isPublicPage || isSelfServicePage || hasAdminPagePermission(user, canonicalPathname);
  const isForbidden = !isPublicPage && isInitialized && isAuthenticated && (!hasAdminAccess || !hasPageAccess);
  const isReady = isPublicPage || (isInitialized && isAuthenticated && hasAdminAccess && hasPageAccess);

  useEffect(() => {
    if (!isInitialized || isPublicPage) return;

    if (!isAuthenticated) {
      const timer = setTimeout(() => {
        router.replace("/");
      }, 0);
      return () => clearTimeout(timer);
    }

    if (!hasAdminAccess || !hasPageAccess) {
      toast.error("You don't have permission to access this area.", {
        id: "permission-required",
      });
      return;
    }

    if (shouldUseRoleRoutePrefix(pathname, user)) {
      const timer = setTimeout(() => {
        router.replace(toRoleRoutePath(pathname, user));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [hasAdminAccess, hasPageAccess, isAuthenticated, isInitialized, isPublicPage, pathname, router, user]);

  return { isReady, isForbidden };
}
