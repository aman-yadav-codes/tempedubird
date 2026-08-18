"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store";
import { readJsonResponse } from "@/lib/api/read-json-response";
import { DEPLOYMENT_ACCESS_ERROR_CODE } from "@/lib/deployment/auth-policy";
import type { SessionUser } from "@/lib/auth/session-user";

type AuthMeResponse = {
  user?: SessionUser;
  accessToken?: string;
  error?: string;
  error_code?: string;
  reason?: string;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, clearAuth, setInitialized, isInitialized } = useAuthStore();
  const hasFetched = useRef(false);
  const pathname = usePathname();
  const skipAuthHydration = pathname === "/account-suspended";

  useEffect(() => {
    if (skipAuthHydration) {
      hasFetched.current = true;
      clearAuth();
      if (!isInitialized) {
        setInitialized();
      }
      return;
    }

    if (hasFetched.current || isInitialized) return;
    hasFetched.current = true;

    const hydrateAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await readJsonResponse<AuthMeResponse>(res);

        if (res.ok) {
          // data.accessToken might be present if the backend refreshed the token,
          // or we just use the existing logic to store the user.
          // Wait, if it's the first load, we NEED the accessToken.
          // If we had no accessToken in memory and the backend didn't return one,
          // it means something's weird. But the backend SHOULD return it if using cookie fallback.
          if (data.user && data.accessToken) {
            setAuth(data.user, data.accessToken);
          } else if (data.user) {
            // If backend didn't return token but user is valid, we might be in an edge case
            // where we sent an auth header (which we didn't). 
            // In a fresh load, we expect the accessToken to be returned by /me fallback.
            setAuth(data.user, data.accessToken || "");
          } else {
            clearAuth();
          }
        } else {
          if (data?.error_code === DEPLOYMENT_ACCESS_ERROR_CODE) {
            clearAuth();
            const loginPath = String(data.reason ?? "").startsWith("INSTITUTION_SITE")
              ? "/institution/login"
              : "/admin/login";
            if (pathname !== loginPath) {
              const reason = encodeURIComponent(String(data.reason ?? data.error_code));
              window.location.replace(`${loginPath}?auth_error=${reason}`);
              return;
            }
          }

          if (
            data?.error_code === "ACCOUNT_SUSPENDED" ||
            data?.error_code === "INSTITUTION_SUSPENDED"
          ) {
            const reason =
              data.error_code === "INSTITUTION_SUSPENDED" ? "institution" : "account";
            window.location.replace(`/account-suspended?reason=${reason}`);
            return;
          }

          clearAuth();
        }
      } catch (err) {
        console.error("Failed to hydrate auth:", err);
        clearAuth();
      } finally {
        setInitialized();
      }
    };

    hydrateAuth();
  }, [setAuth, clearAuth, setInitialized, isInitialized, pathname, skipAuthHydration]);

  return <>{children}</>;
}
