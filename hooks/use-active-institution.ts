"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ACTIVE_INSTITUTION_CHANGE_EVENT,
  getStoredActiveInstitutionId,
  getUserInstitutionOptions,
  parseActiveInstitutionId,
  setStoredActiveInstitutionId,
} from "@/lib/auth/active-institution";
import { useAuthStore } from "@/store";

export function useActiveInstitution() {
  const user = useAuthStore((state) => state.user);
  const [activeInstitutionId, setActiveInstitutionStateId] = useState<number | null>(() =>
    getStoredActiveInstitutionId()
  );
  const institutions = useMemo(() => getUserInstitutionOptions(user), [user]);
  const activeInstitution = useMemo(() => {
    if (!institutions.length) return null;
    return (
      institutions.find((institution) => institution.id === activeInstitutionId) ??
      institutions[0]
    );
  }, [activeInstitutionId, institutions]);

  useEffect(() => {
    if (!activeInstitution) return;
    if (activeInstitution.id === activeInstitutionId) return;
    setStoredActiveInstitutionId(activeInstitution.id);
  }, [activeInstitution, activeInstitutionId]);

  useEffect(() => {
    function handleChange(event: Event) {
      const nextId = parseActiveInstitutionId(
        (event as CustomEvent<{ institutionId?: number }>).detail?.institutionId ??
          getStoredActiveInstitutionId()
      );
      setActiveInstitutionStateId(nextId);
    }

    window.addEventListener(ACTIVE_INSTITUTION_CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(ACTIVE_INSTITUTION_CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const defaultEnvId = parseActiveInstitutionId(
    process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID ||
    process.env.NEXT_PUBLIC_INSTITUTION_ID
  );

  // Return the user's actual institution membership/selection.
  // Do NOT blindly fall back to the env default — that would scope
  // all public marketplace pages to a single institute.
  // `defaultEnvInstitutionId` is exposed separately for components
  // that explicitly need it (e.g. HomeLandingContainer).
  const resolvedId = activeInstitution?.id ?? activeInstitutionId ?? null;

  return {
    institutions,
    activeInstitution,
    activeInstitutionId: resolvedId,
    defaultEnvInstitutionId: defaultEnvId,
    setActiveInstitutionId: setStoredActiveInstitutionId,
  };
}

