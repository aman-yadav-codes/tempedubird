"use client";

import { useEffect } from "react";

import {
  ACTIVE_STUDENT_ENROLLMENT_EVENT,
  ACTIVE_STUDENT_ENROLLMENT_HEADER,
  getStoredActiveStudentEnrollmentId,
} from "@/lib/auth/active-student-enrollment";

export function ActiveStudentEnrollmentFetchScope() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin);
      const enrollmentId = getStoredActiveStudentEnrollmentId();
      if (!enrollmentId || !url.pathname.startsWith("/api/admin/")) return originalFetch(input, init);
      if (url.pathname === "/api/admin/student/enrollments") return originalFetch(input, init);

      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
      headers.set(ACTIVE_STUDENT_ENROLLMENT_HEADER, String(enrollmentId));
      return originalFetch(input, { ...init, headers });
    };
    const refresh = () => window.location.reload();
    window.addEventListener(ACTIVE_STUDENT_ENROLLMENT_EVENT, refresh);
    return () => {
      window.fetch = originalFetch;
      window.removeEventListener(ACTIVE_STUDENT_ENROLLMENT_EVENT, refresh);
    };
  }, []);
  return null;
}
