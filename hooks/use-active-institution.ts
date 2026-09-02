"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ACTIVE_INSTITUTION_CHANGE_EVENT,
  getDefaultInstitutionId,
  getStoredActiveInstitutionId,
  getStoredActiveInstitutionSummary,
  getUserInstitutionOptions,
  parseActiveInstitutionId,
  setStoredActiveInstitutionId,
  type ActiveInstitutionSummary,
} from "@/lib/auth/active-institution";
import { useAuthStore } from "@/store";

export function useActiveInstitution() {
  const user = useAuthStore((state) => state.user);
  const [activeInstitutionId, setActiveInstitutionStateId] = useState<number | null>(() =>
    getStoredActiveInstitutionId()
  );
  const [storedSummary, setStoredSummary] = useState<ActiveInstitutionSummary | null>(() =>
    getStoredActiveInstitutionSummary()
  );
  const [fetchedOptions, setFetchedOptions] = useState<ActiveInstitutionSummary[]>([]);

  const accessToken = useAuthStore((state) => state.accessToken);
  const isPlatformAdmin = Boolean(user?.role_codes?.includes("platform_admin") || user?.is_super_admin);
  const isInstitutionAdmin = Boolean(user?.role_codes?.includes("institution_admin") || (user as any)?.role === "institution_admin");

  useEffect(() => {
    if ((!isInstitutionAdmin && !isPlatformAdmin) || !accessToken) return;
    let cancelled = false;
    fetch("/api/admin/institutions/options", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { institutions?: Array<{ id: number; name: string; type_name?: string }> };
        const rows: ActiveInstitutionSummary[] = (json.institutions ?? []).map((inst) => ({
          id: inst.id,
          name: inst.name,
          roleName: isPlatformAdmin ? "Platform Admin" : "Institution Admin",
          boardId: null,
          boardName: null,
        }));
        if (rows.length > 0 && !cancelled) {
          setFetchedOptions(rows);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accessToken, isInstitutionAdmin, isPlatformAdmin]);

  const userInstitutionOptions = useMemo(() => getUserInstitutionOptions(user), [user]);

  const institutions = useMemo(() => {
    const unique = new Map<number, ActiveInstitutionSummary>();
    for (const inst of userInstitutionOptions) {
      unique.set(inst.id, inst);
    }
    for (const inst of fetchedOptions) {
      if (!unique.has(inst.id)) {
        unique.set(inst.id, inst);
      }
    }
    if (storedSummary && !unique.has(storedSummary.id)) {
      unique.set(storedSummary.id, storedSummary);
    }
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [userInstitutionOptions, fetchedOptions, storedSummary]);

  const activeInstitution = useMemo(() => {
    if (activeInstitutionId) {
      const match = institutions.find((institution) => institution.id === activeInstitutionId);
      if (match) return match;
      if (storedSummary && storedSummary.id === activeInstitutionId) return storedSummary;
    }
    if (storedSummary && !isPlatformAdmin) return storedSummary;
    if (isPlatformAdmin) return null;
    if (institutions.length > 0) return institutions[0];
    return null;
  }, [activeInstitutionId, institutions, storedSummary, isPlatformAdmin]);

  useEffect(() => {
    function handleChange(event: Event) {
      const detail = (event as CustomEvent<{ institutionId?: number; summary?: ActiveInstitutionSummary }>).detail;
      const nextId = parseActiveInstitutionId(
        detail?.institutionId ?? getStoredActiveInstitutionId()
      );
      setActiveInstitutionStateId(nextId);
      if (detail?.summary) {
        setStoredSummary(detail.summary);
      } else {
        setStoredSummary(getStoredActiveInstitutionSummary());
      }
    }

    window.addEventListener(ACTIVE_INSTITUTION_CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(ACTIVE_INSTITUTION_CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const defaultEnvId = getDefaultInstitutionId();

  const userMembershipInstId = user?.memberships?.[0]?.institution_id
    ? Number(user.memberships[0].institution_id)
    : null;
  const userProfileInstId = (user as any)?.institution_id
    ? Number((user as any).institution_id)
    : ((user as any)?.under_institution_id ? Number((user as any).under_institution_id) : null);

  const resolvedId = isPlatformAdmin
    ? (activeInstitutionId ?? activeInstitution?.id ?? null)
    : (activeInstitutionId ??
       activeInstitution?.id ??
       userMembershipInstId ??
       userProfileInstId ??
       defaultEnvId ??
       null);

  return {
    institutions,
    activeInstitution,
    activeInstitutionId: resolvedId,
    defaultEnvInstitutionId: defaultEnvId,
    setActiveInstitutionId: setStoredActiveInstitutionId,
  };
}
