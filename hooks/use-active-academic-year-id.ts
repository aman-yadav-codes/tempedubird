"use client";

import { useEffect, useState } from "react";

import {
  ACTIVE_ACADEMIC_SESSION_EVENT,
  getStoredActiveAcademicYearId,
} from "@/lib/auth/active-academic-session";

export function useActiveAcademicYearId(institutionId?: number | string | null) {
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setAcademicYearId(getStoredActiveAcademicYearId(institutionId));
    update();

    window.addEventListener(ACTIVE_ACADEMIC_SESSION_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(ACTIVE_ACADEMIC_SESSION_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [institutionId]);

  return academicYearId;
}
