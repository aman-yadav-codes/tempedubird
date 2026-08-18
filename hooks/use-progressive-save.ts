"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type UseProgressiveSaveOptions<T> = {
  formKey: string;
  formState: T;
  onSave?: (data: T) => Promise<void> | void;
  debounceMs?: number;
  enabled?: boolean;
};

export function useProgressiveSave<T extends Record<string, any>>({
  formKey,
  formState,
  onSave,
  debounceMs = 2000,
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
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [formKey]);

  // Clear draft
  const clearDraft = useCallback(() => {
    if (typeof window === "undefined" || !formKey) return;
    try {
      window.sessionStorage.removeItem(`progressive_draft:${formKey}`);
    } catch {
      // Ignore storage errors
    }
  }, [formKey]);

  // Execute progressive save
  const triggerSave = useCallback(
    async (overrideData?: T) => {
      if (!enabled) return;
      const dataToSave = overrideData ?? formStateRef.current;

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

  // Debounced auto-save on form state changes (2 seconds after last keystroke)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!enabled) return;

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
    void triggerSave();
  }, [triggerSave]);

  return {
    saveStatus,
    handleBlur,
    triggerSave,
    restoreDraft,
    clearDraft,
  };
}
