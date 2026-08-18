"use client"

import { useEffect, useState } from "react"

type Options<T> = {
  version?: number
  validate?: (value: unknown) => value is T
}

type PersistedValue<T> = {
  version: number
  value: T
}

export function usePersistedState<T>(
  key: string,
  initialValue: T | (() => T),
  options: Options<T> = {}
) {
  const version = options.version ?? 1
  const [state, setState] = useState<T>(() => {
    const fallback = typeof initialValue === "function"
      ? (initialValue as () => T)()
      : initialValue

    if (typeof window === "undefined") return fallback

    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) return fallback
      const parsed = JSON.parse(raw) as Partial<PersistedValue<unknown>>
      if (parsed.version !== version) return fallback
      if (options.validate && !options.validate(parsed.value)) return fallback
      return parsed.value as T
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify({ version, value: state }))
    } catch {
      // Ignore storage failures so filters still work in private/restricted contexts.
    }
  }, [key, state, version])

  return [state, setState] as const
}
