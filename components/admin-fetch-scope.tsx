"use client";

import { useEffect } from "react";

import {
  ACTIVE_CHILD_QUERY_PARAM,
  getStoredActiveChildStudentId,
} from "@/lib/auth/active-child";
import {
  ACTIVE_STUDENT_ENROLLMENT_EVENT,
  ACTIVE_STUDENT_ENROLLMENT_HEADER,
  getStoredActiveStudentEnrollmentId,
} from "@/lib/auth/active-student-enrollment";
import {
  ACTIVE_ACADEMIC_SESSION_EVENT,
  getStoredActiveAcademicYearId,
} from "@/lib/auth/active-academic-session";
import { useActiveInstitution } from "@/hooks/use-active-institution";

const INSTITUTION_SCOPED_ADMIN_API_PREFIXES = [
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

const STUDENT_ACADEMIC_YEAR_SCOPED_PREFIXES = [
  "/api/admin/students",
  "/api/admin/master-data/assignments",
  "/api/admin/master-data/exams",
  "/api/admin/master-data/practice-exams",
  "/api/admin/master-data/notes",
];

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

function getRequestUrl(input: RequestInfo | URL) {
  if (input instanceof Request) return input.url;
  return String(input);
}

function shouldScopeInstitution(url: URL) {
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
  return INSTITUTION_SCOPED_ADMIN_API_PREFIXES.some((prefix) =>
    url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
  );
}

function shouldScopeChild(url: URL) {
  if (url.searchParams.has(ACTIVE_CHILD_QUERY_PARAM)) return false;
  return PARENT_CHILD_SCOPED_PREFIXES.some((prefix) =>
    url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
  );
}

function shouldScopeAcademicYear(url: URL) {
  if (url.searchParams.has("academicYearId")) return false;
  if (url.pathname === "/api/admin/students/roll-number-check") return false;
  if (url.pathname === "/api/admin/students/identifier-check") return false;
  if (url.pathname === "/api/admin/students/siblings") return false;
  return STUDENT_ACADEMIC_YEAR_SCOPED_PREFIXES.some((prefix) =>
    url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
  );
}

function toScopedInput(input: RequestInfo | URL, url: URL) {
  return input instanceof Request
    ? new Request(url.toString(), input)
    : url.toString();
}

export function AdminFetchScope() {
  const { activeInstitutionId } = useActiveInstitution();

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const method = getRequestMethod(input, init);
      const url = new URL(getRequestUrl(input), window.location.origin);
      let nextInput = input;

      if (method === "GET" && activeInstitutionId && shouldScopeInstitution(url)) {
        url.searchParams.set("institutionId", String(activeInstitutionId));
        nextInput = toScopedInput(input, url);
      }

      const childStudentId = getStoredActiveChildStudentId();
      if (method === "GET" && childStudentId && shouldScopeChild(url)) {
        url.searchParams.set(ACTIVE_CHILD_QUERY_PARAM, String(childStudentId));
        nextInput = toScopedInput(nextInput, url);
      }

      const academicYearId = getStoredActiveAcademicYearId(activeInstitutionId);
      if (method === "GET" && academicYearId && shouldScopeAcademicYear(url)) {
        url.searchParams.set("academicYearId", String(academicYearId));
        nextInput = toScopedInput(nextInput, url);
      }

      const enrollmentId = getStoredActiveStudentEnrollmentId();
      if (
        enrollmentId &&
        url.pathname.startsWith("/api/admin/") &&
        url.pathname !== "/api/admin/student/enrollments" &&
        url.pathname !== "/api/admin/notifications"
      ) {
        const headers = new Headers(nextInput instanceof Request ? nextInput.headers : undefined);
        new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
        headers.set(ACTIVE_STUDENT_ENROLLMENT_HEADER, String(enrollmentId));
        return originalFetch(nextInput, { ...init, headers });
      }

      return originalFetch(nextInput, init);
    };

    const refresh = () => window.location.reload();
    window.addEventListener(ACTIVE_STUDENT_ENROLLMENT_EVENT, refresh);
    window.addEventListener(ACTIVE_ACADEMIC_SESSION_EVENT, refresh);
    return () => {
      window.fetch = originalFetch;
      window.removeEventListener(ACTIVE_STUDENT_ENROLLMENT_EVENT, refresh);
      window.removeEventListener(ACTIVE_ACADEMIC_SESSION_EVENT, refresh);
    };
  }, [activeInstitutionId]);

  return null;
}
