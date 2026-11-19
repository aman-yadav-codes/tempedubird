"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";

export type CategoryKey =
  | "courses"
  | "products"
  | "services"
  | "institutes"
  | "practice"
  | "notes"
  | "teachers"
  | "exams"
  | "libraries"
  | "hostels"
  | "blogs"
  | "gallery"
  | "contact"
  | "jobs";

export type CategoryAvailabilityItem = {
  hasData: boolean;
  count: number;
  label: string;
  href: string;
};

export type CategoryAvailabilityMap = Record<CategoryKey, CategoryAvailabilityItem>;

let cachedCategories: CategoryAvailabilityMap | null = null;
let cachedTargetId: number | null = null;

export function useCategoryAvailability() {
  const { user, isAuthenticated } = useAuthStore();
  const { activeInstitutionId, activeInstitution, defaultEnvInstitutionId } = useActiveInstitution();

  const resolvedInstitutionId = defaultEnvInstitutionId ?? activeInstitutionId ?? null;
  const isInstitutionalAdmin = Boolean(resolvedInstitutionId);
  const isPlatformAdmin = !isInstitutionalAdmin;

  const [categories, setCategories] = useState<CategoryAvailabilityMap | null>(() => {
    if (cachedTargetId === resolvedInstitutionId && cachedCategories) {
      return cachedCategories;
    }
    return null;
  });
  const [loading, setLoading] = useState(!categories);

  const targetInstitutionId = resolvedInstitutionId;

  const fetchAvailability = useCallback(async (signal?: AbortSignal) => {
    try {
      const url = targetInstitutionId
        ? `/api/public/categories/availability?institutionId=${targetInstitutionId}&businessId=${targetInstitutionId}`
        : "/api/public/categories/availability";

      const res = await fetch(url, { signal });
      if (res.ok) {
        const json = await res.json();
        if (json?.categories) {
          cachedCategories = json.categories;
          cachedTargetId = targetInstitutionId;
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
      if (categories) {
        return Boolean(categories[key]?.hasData);
      }
      // While loading categories, default to true so menu items are stable and don't flash/disappear
      return true;
    },
    [categories]
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
