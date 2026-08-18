"use client";

import { useInsertionEffect } from "react";
import { toCanonicalAdminPath } from "@/lib/auth/role-routes";

export function ThemeInit() {
  useInsertionEffect(() => {
    try {
      const isAdminRoute = toCanonicalAdminPath(window.location.pathname).startsWith("/admin");
      const scopedStorageKey = isAdminRoute ? "admin-theme" : "public-theme";
      const fallbackStorageKey = isAdminRoute ? "public-theme" : "admin-theme";
      const storedTheme =
        localStorage.getItem("app-theme") ||
        localStorage.getItem(scopedStorageKey) ||
        localStorage.getItem(fallbackStorageKey);
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme =
        storedTheme === "light" || storedTheme === "dark"
          ? storedTheme
          : systemPrefersDark
            ? "dark"
            : "light";

      document.documentElement.dataset.themeScope = isAdminRoute ? "admin" : "public";
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.style.colorScheme = theme;
      localStorage.setItem("app-theme", theme);
      localStorage.setItem("admin-theme", theme);
      localStorage.setItem("public-theme", theme);
      document.cookie = `app-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Theme boot should never block rendering.
    }
  }, []);

  return null;
}
