"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ACTIVE_INSTITUTION_CHANGE_EVENT,
  getDefaultInstitutionId,
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

  const defaultEnvId = getDefaultInstitutionId();

  // Public site active institution is strictly controlled by defaultEnvId (.env.local)
  const resolvedId = defaultEnvId ?? null;

  return {
    institutions,
    activeInstitution,
    activeInstitutionId: resolvedId,
    defaultEnvInstitutionId: defaultEnvId,
    setActiveInstitutionId: setStoredActiveInstitutionId,
  };
}

