"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setStoredActiveInstitutionId } from "@/lib/auth/active-institution";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { useAuthStore } from "@/store";
import { readJsonResponse } from "@/lib/api/read-json-response";

type TenantResponse = {
  appType: "all" | "hybrid" | "platform" | "institution";
  host: string;
  tenant: {
    institution_id: number;
    institution_name: string;
    institution_slug: string | null;
    domain: string | null;
  } | null;
};

export function TenantDeploymentScope() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, clearAuth } = useAuthStore();
  const [tenant, setTenant] = useState<TenantResponse["tenant"]>(null);
  const [appType, setAppType] = useState<TenantResponse["appType"]>(
    (process.env.NEXT_PUBLIC_APP_TYPE as TenantResponse["appType"] | undefined) ?? "all"
  );

  useEffect(() => {
    let cancelled = false;

    async function loadTenant() {
      try {
        const response = await fetch("/api/tenant/current", { cache: "no-store" });
        if (!response.ok) return;
        const json = await readJsonResponse<TenantResponse>(response);
        if (cancelled || !json.appType) return;
        setAppType(json.appType);
        setTenant(json.tenant);
        if (json.appType === "institution" && json.tenant?.institution_id) {
          setStoredActiveInstitutionId(json.tenant.institution_id);
        }
      } catch {
        // Tenant discovery should never block rendering.
      }
    }

    void loadTenant();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !user) return;

    const logoutToLogin = async (reason: string, message: string) => {
      const loginPath = appType === "institution" ? "/institution/login" : "/admin/login";
      toast.error(message);
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        clearAuth();
        router.replace(`${loginPath}?auth_error=${encodeURIComponent(reason)}`);
        router.refresh();
      }
    };

    if (appType === "platform" && !isPlatformAdminUser(user)) {
      void logoutToLogin(
        "PLATFORM_SITE_REQUIRES_PLATFORM_ADMIN",
        "This is the platform portal. Please use platform admin credentials."
      );
      return;
    }

    if (appType !== "institution") return;

    if (isPlatformAdminUser(user)) {
      void logoutToLogin(
        "INSTITUTION_SITE_REQUIRES_INSTITUTION_ACCOUNT",
        "This site belongs to an institution. Please use institution admin credentials."
      );
      return;
    }

    if (!tenant) return;

    if (!tenant.institution_id) {
      void logoutToLogin(
        "INSTITUTION_SITE_REQUIRES_KNOWN_TENANT",
        "This institution site is not configured yet."
      );
      return;
    }

    const canAccessTenant = user.memberships?.some((membership) =>
      membership.institution_id === tenant.institution_id
    );

    if (!canAccessTenant) {
      void logoutToLogin(
        "INSTITUTION_SITE_REQUIRES_TENANT_MEMBERSHIP",
        "You do not belong to this institution."
      );
    }
  }, [appType, clearAuth, isAuthenticated, isInitialized, router, tenant, user]);

  return null;
}
