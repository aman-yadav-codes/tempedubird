"use client";

import { useEffect } from "react";

import { useActiveInstitution } from "@/hooks/use-active-institution";

const SCOPED_ADMIN_API_PREFIXES = [
  "/api/admin/users",
  "/api/admin/students",
  "/api/admin/staff",
  "/api/admin/team",
  "/api/admin/vendors",
  "/api/admin/inventory",
  "/api/admin/finance",
  "/api/admin/sales",
  "/api/admin/marketing",
  "/api/admin/attendance",
  "/api/admin/operations",
  "/api/admin/company",
  "/api/admin/master-data",
  "/api/admin/classroom",
  "/api/admin/institutions",
  "/api/admin/timetable",
];

function shouldScopeRequest(url: URL) {
  if (url.searchParams.has("institutionId") || url.searchParams.has("institution_id")) return false;
  if (
    (url.pathname === "/api/admin/master-data/syllabi" ||
      url.pathname === "/api/admin/master-data/assignments" ||
      url.pathname === "/api/admin/master-data/exams" ||
      url.pathname === "/api/admin/master-data/practice-exams") &&
    url.searchParams.get("view") === "marketplace"
  ) {
    return false;
  }
  if (url.pathname === "/api/admin/institutions/options") {
    return false;
  }
  return SCOPED_ADMIN_API_PREFIXES.some((prefix) =>
    url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
  );
}

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

function getRequestUrl(input: RequestInfo | URL) {
  if (input instanceof Request) return input.url;
  return String(input);
}

export function ActiveInstitutionFetchScope() {
  const { activeInstitutionId } = useActiveInstitution();

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (!activeInstitutionId) {
        return originalFetch(input, init);
      }

      const method = getRequestMethod(input, init);
      const nextUrl = new URL(getRequestUrl(input), window.location.origin);
      const isMarketplace = nextUrl.searchParams.get("view") === "marketplace";
      const isAdminApi = nextUrl.pathname.startsWith("/api/admin/") && nextUrl.pathname !== "/api/admin/institutions/options";

      let nextInput = input;

      if (method === "GET" && shouldScopeRequest(nextUrl)) {
        nextUrl.searchParams.set("institutionId", String(activeInstitutionId));
        nextInput =
          input instanceof Request
            ? new Request(nextUrl.toString(), input)
            : nextUrl.toString();
      }

      if (isAdminApi && !isMarketplace) {
        const headers = new Headers(nextInput instanceof Request ? nextInput.headers : undefined);
        new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
        if (!headers.has("x-institution-id")) {
          headers.set("x-institution-id", String(activeInstitutionId));
        }
        return originalFetch(nextInput, { ...init, headers });
      }

      return originalFetch(nextInput, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [activeInstitutionId]);

  return null;
}
