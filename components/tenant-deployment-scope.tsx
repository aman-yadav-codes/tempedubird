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

let cachedTenantResponse: TenantResponse | null = null;
let cachedTenantPromise: Promise<TenantResponse | null> | null = null;

function getStoredTenant(): TenantResponse | null {
  if (cachedTenantResponse) return cachedTenantResponse;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("edubird_cached_tenant");
    if (raw) {
      cachedTenantResponse = JSON.parse(raw);
      return cachedTenantResponse;
    }
  } catch { }
  return null;
}

async function getCachedTenant(): Promise<TenantResponse | null> {
  if (cachedTenantPromise) return cachedTenantPromise;

  cachedTenantPromise = fetch("/api/tenant/current")
    .then(async (res) => {
      if (!res.ok) return null;
      const json = await readJsonResponse<TenantResponse>(res);
      cachedTenantResponse = json;
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("edubird_cached_tenant", JSON.stringify(json));
        }
      } catch { }
      return json;
    })
    .catch(() => null)
    .finally(() => {
      cachedTenantPromise = null;
    });

  return cachedTenantPromise;
}

export function TenantDeploymentScope() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, clearAuth } = useAuthStore();
  const [tenant, setTenant] = useState<TenantResponse["tenant"]>(cachedTenantResponse?.tenant ?? null);
  const [appType, setAppType] = useState<TenantResponse["appType"]>(
    cachedTenantResponse?.appType ??
    ((process.env.NEXT_PUBLIC_APP_TYPE as TenantResponse["appType"] | undefined) ?? "all")
  );

  useEffect(() => {
    let cancelled = false;

    async function loadTenant() {
      try {
        const json = await getCachedTenant();
        if (cancelled || !json || !json.appType) return;
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
      const loginPath = "/";
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
      return;
    }

    // End-users (students, guardians, customers) are always permitted
    const isEndUser =
      user.role_codes?.some((r: string) =>
        ["student", "guardian", "parent", "customer", "client", "guest"].includes(r.toLowerCase())
      ) ||
      user.roles?.some((r: any) =>
        ["student", "guardian", "parent", "customer", "client", "guest"].includes((r.code || r.name || "").toLowerCase())
      );

    if (isEndUser) {
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

    const canAccessTenant =
      user.memberships?.some(
        (membership) => membership.institution_id === tenant.institution_id
      ) ||
      (user as any).under_institution_id === tenant.institution_id ||
      (user as any).institution_id === tenant.institution_id ||
      (user as any).business_id === tenant.institution_id ||
      (tenant as any)?.created_by === user.id ||
      (tenant as any)?.user_id === user.id;

    if (!canAccessTenant) {
      void logoutToLogin(
        "INSTITUTION_SITE_REQUIRES_TENANT_MEMBERSHIP",
        "You do not belong to this institution."
      );
    }
  }, [appType, clearAuth, isAuthenticated, isInitialized, router, tenant, user]);

  return null;
}
