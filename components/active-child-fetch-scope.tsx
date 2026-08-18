"use client";

import { useEffect } from "react";

import {
  ACTIVE_CHILD_QUERY_PARAM,
  getStoredActiveChildStudentId,
} from "@/lib/auth/active-child";

const PARENT_CHILD_SCOPED_PREFIXES = [
  "/api/admin/classroom/attendance",
  "/api/admin/classroom/assignments",
  "/api/admin/classroom/practice-exams",
  "/api/admin/classroom/exams",
  "/api/admin/classroom/my-timetable",
  "/api/admin/classroom/id-card",
  "/api/admin/classroom/fees",
  "/api/admin/institution/calendar",
  "/api/admin/dashboard",
];

function getRequestUrl(input: RequestInfo | URL) {
  if (input instanceof Request) return input.url;
  return String(input);
}

function shouldScopeRequest(url: URL) {
  if (url.searchParams.has(ACTIVE_CHILD_QUERY_PARAM)) return false;
  return PARENT_CHILD_SCOPED_PREFIXES.some((prefix) =>
    url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
  );
}

export function ActiveChildFetchScope() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const studentId = getStoredActiveChildStudentId();
      if (!studentId) return originalFetch(input, init);

      const nextUrl = new URL(getRequestUrl(input), window.location.origin);
      if (!shouldScopeRequest(nextUrl)) return originalFetch(input, init);

      nextUrl.searchParams.set(ACTIVE_CHILD_QUERY_PARAM, String(studentId));
      const nextInput =
        input instanceof Request
          ? new Request(nextUrl.toString(), input)
          : nextUrl.toString();

      return originalFetch(nextInput, init);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
