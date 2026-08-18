"use client";

import { useEffect } from "react";

import { useActiveInstitution } from "@/hooks/use-active-institution";

const SCOPED_ADMIN_API_PREFIXES = [
  "/api/admin/users",
  "/api/admin/students",
  "/api/admin/master-data/syllabi",
  "/api/admin/master-data/card-templates",
  "/api/admin/master-data/assignments",
  "/api/admin/master-data/exams",
  "/api/admin/master-data/practice-exams",
  "/api/admin/master-data/institute-calendar",
  "/api/admin/classroom/my-timetable",
  "/api/admin/institutions/programs",
  "/api/admin/institutions/placements",
  "/api/admin/institutions/cutoffs",
  "/api/admin/institutions/scholarships",
  "/api/admin/institutions/news",
  "/api/admin/institutions/academic-years",
  "/api/admin/timetable",
];

function shouldScopeRequest(url: URL) {
  if (url.searchParams.has("institutionId")) return false;
  if (
    (url.pathname === "/api/admin/master-data/syllabi" ||
      url.pathname === "/api/admin/master-data/assignments" ||
      url.pathname === "/api/admin/master-data/exams" ||
      url.pathname === "/api/admin/master-data/practice-exams") &&
    url.searchParams.get("view") === "marketplace"
  ) {
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
      if (!activeInstitutionId || getRequestMethod(input, init) !== "GET") {
        return originalFetch(input, init);
      }

      const nextUrl = new URL(getRequestUrl(input), window.location.origin);
      if (!shouldScopeRequest(nextUrl)) {
        return originalFetch(input, init);
      }

      nextUrl.searchParams.set("institutionId", String(activeInstitutionId));
      const nextInput =
        input instanceof Request
          ? new Request(nextUrl.toString(), input)
          : nextUrl.toString();

      return originalFetch(nextInput, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [activeInstitutionId]);

  return null;
}
