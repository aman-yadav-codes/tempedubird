"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type UseProgressiveSaveOptions<T> = {
  formKey: string;
  formState: T;
  onSave?: (data: T) => Promise<void> | void;
  onRestore?: (data: T) => void;
  debounceMs?: number;
  enabled?: boolean;
};

// Check if form object contains any non-empty user entered data
function hasUserContent(obj: any): boolean {
  if (!obj) return false;
  if (typeof obj === "string") return obj.trim().length > 0;
  if (typeof obj === "number") return obj > 0;
  if (typeof obj === "boolean") return false;
  if (Array.isArray(obj)) return obj.some(hasUserContent);
  if (typeof obj === "object") {
    return Object.entries(obj).some(([key, val]) => {
      if (["is_active", "is_marketplace_enabled", "is_verified", "is_profile_complete", "gender", "status"].includes(key)) {
        return false;
      }
      return hasUserContent(val);
    });
  }
  return false;
}

export function useProgressiveSave<T extends Record<string, any>>({
  formKey,
  formState,
  onSave,
  onRestore,
  debounceMs = 1500,
  enabled = true,
}: UseProgressiveSaveOptions<T>) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  const formStateRef = useRef(formState);
  formStateRef.current = formState;

  // Restore draft state from sessionStorage
  const restoreDraft = useCallback((): T | null => {
    if (typeof window === "undefined" || !formKey) return null;
    try {
      const raw = window.sessionStorage.getItem(`progressive_draft:${formKey}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as T;
      if (hasUserContent(parsed)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }, [formKey]);

  // Clear draft
  const clearDraft = useCallback(() => {
    if (typeof window === "undefined" || !formKey) return;
    try {
      window.sessionStorage.removeItem(`progressive_draft:${formKey}`);
      setSaveStatus("idle");
    } catch {
      // Ignore storage errors
    }
  }, [formKey]);

  // Execute progressive save
  const triggerSave = useCallback(
    async (overrideData?: T) => {
      if (!enabled) return;
      const dataToSave = overrideData ?? formStateRef.current;

      // Only save if there is actual user-entered content
      if (!hasUserContent(dataToSave)) {
        setSaveStatus("idle");
        return;
      }

      setSaveStatus("saving");

      try {
        // Persist to sessionStorage draft
        if (typeof window !== "undefined" && formKey) {
          window.sessionStorage.setItem(
            `progressive_draft:${formKey}`,
            JSON.stringify(dataToSave)
          );
        }

        // Trigger optional custom onSave handler
        if (onSave) {
          await onSave(dataToSave);
        }

        setSaveStatus("saved");
      } catch (err) {
        console.error("Progressive save error:", err);
        setSaveStatus("error");
      }
    },
    [enabled, formKey, onSave]
  );

  // Check if draft exists on mount/enable and restore if onRestore callback provided
  useEffect(() => {
    if (!enabled || !formKey) return;
    const existing = restoreDraft();
    if (existing) {
      if (onRestore) {
        onRestore(existing);
      }
      setSaveStatus("saved");
    } else {
      setSaveStatus("idle");
    }
  }, [enabled, formKey]);

  // Debounced auto-save on form state changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!enabled) return;

    if (!hasUserContent(formState)) {
      setSaveStatus("idle");
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void triggerSave();
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [debounceMs, enabled, formState, triggerSave]);

  // Focus change handler (onBlur trigger)
  const handleBlur = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (hasUserContent(formStateRef.current)) {
      void triggerSave();
    }
  }, [triggerSave]);

  return {
    saveStatus,
    handleBlur,
    triggerSave,
    restoreDraft,
    clearDraft,
  };
}
