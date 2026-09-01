"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";

export type CategoryKey =
  | "courses"
  | "products"
  | "institutes"
  | "practice"
  | "notes"
  | "teachers"
  | "exams"
  | "libraries"
  | "hostels"
  | "blogs"
  | "gallery"
  | "contact";

export type CategoryAvailabilityItem = {
  hasData: boolean;
  count: number;
  label: string;
  href: string;
};

export type CategoryAvailabilityMap = Record<CategoryKey, CategoryAvailabilityItem>;

export function useCategoryAvailability() {
  const { user, isAuthenticated } = useAuthStore();
  const { activeInstitutionId, activeInstitution, defaultEnvInstitutionId } = useActiveInstitution();

  const resolvedInstitutionId = defaultEnvInstitutionId ?? null;
  const isInstitutionalAdmin = Boolean(resolvedInstitutionId);
  const isPlatformAdmin = !isInstitutionalAdmin;

  const [categories, setCategories] = useState<CategoryAvailabilityMap | null>(null);
  const [loading, setLoading] = useState(true);

  const targetInstitutionId = resolvedInstitutionId;

  const fetchAvailability = useCallback(async (signal?: AbortSignal) => {
    try {
      const url = targetInstitutionId
        ? `/api/public/categories/availability?institutionId=${targetInstitutionId}`
        : "/api/public/categories/availability";

      const res = await fetch(url, { signal });
      if (res.ok) {
        const json = await res.json();
        if (json?.categories) {
          setCategories(json.categories);
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Gracefully handle transient network errors
    } finally {
      setLoading(false);
    }
  }, [targetInstitutionId]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchAvailability(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchAvailability]);

  const isCategoryVisible = useCallback(
    (key: CategoryKey) => {
      if (!isInstitutionalAdmin && !targetInstitutionId) return true; // Platform Admin or public marketplace guest sees all categories
      if (!categories) return false; // While loading institution categories, don't show unverified categories
      return Boolean(categories[key]?.hasData);
    },
    [isInstitutionalAdmin, targetInstitutionId, categories]
  );

  return {
    categories,
    loading,
    isPlatformAdmin,
    isInstitutionalAdmin,
    activeInstitutionId: targetInstitutionId,
    activeInstitutionName: activeInstitution?.name ?? null,
    isCategoryVisible,
    refresh: fetchAvailability,
  };
}
