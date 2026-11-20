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
  const disabledBusinessTypeRoutes = useAuthStore((s) => s.disabledBusinessTypeRoutes) || [];
  const isPlatformAdmin = Boolean(user?.role_codes?.includes("platform_admin") || user?.is_super_admin);
  const isPlatformAdminPanel = isPlatformAdmin && Boolean(pathname?.startsWith("/platformadmin"));

  // Route blocked if it belongs to a disabled module/section for the active business type
  const isRouteBlockedByBusinessType = !isPlatformAdminPanel && disabledBusinessTypeRoutes.some((dr) => {
    const cleanPath = canonicalPathname.split("?")[0].split("#")[0];
    const cleanDr = dr.split("?")[0].split("#")[0];
    return cleanPath === cleanDr || cleanPath.startsWith(cleanDr + "/");
  });

  const hasPageAccess = (isPublicPage || isSelfServicePage || hasAdminPagePermission(user, canonicalPathname)) && !isRouteBlockedByBusinessType;
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
      const errorMsg = isRouteBlockedByBusinessType
        ? "This module is not enabled for your business type."
        : "You don't have permission to access this area.";
      toast.error(errorMsg, {
        id: "permission-required",
      });
      router.replace("/admin");
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
