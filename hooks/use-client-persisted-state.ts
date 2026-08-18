"use client";

import { useEffect, useState } from "react";

type Options<T> = {
  version?: number;
  validate?: (value: unknown) => value is T;
};

type PersistedValue<T> = {
  version: number;
  value: T;
};

export function useClientPersistedState<T>(
  key: string,
  initialValue: T,
  options: Options<T> = {},
) {
  const version = options.version ?? 1;
  const validate = options.validate;
  const [state, setState] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    try {
      const raw = window.localStorage.getItem(key);
      let nextState: T | null = null;

      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedValue<unknown>>;
        if (parsed.version === version && (!validate || validate(parsed.value))) {
          nextState = parsed.value as T;
        }
      }

      window.setTimeout(() => {
        if (cancelled) return;
        if (nextState !== null) setState(nextState);
        setHydrated(true);
      }, 0);
    } catch {
      // Keep the default state if storage is unavailable or invalid.
      window.setTimeout(() => {
        if (!cancelled) setHydrated(true);
      }, 0);
    }

    return () => {
      cancelled = true;
    };
  }, [key, validate, version]);

  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem(key, JSON.stringify({ version, value: state }));
    } catch {
      // Ignore storage failures so filters continue working normally.
    }
  }, [hydrated, key, state, version]);

  return [state, setState] as const;
}
