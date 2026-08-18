"use client";

export function clearBrowserSessionData() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.clear();
  } catch {
    // Ignore storage access errors during logout.
  }

  try {
    window.sessionStorage.clear();
  } catch {
    // Ignore storage access errors during logout.
  }
}
