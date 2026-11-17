"use client";

import { useEffect } from "react";

export function ThemeInit() {
  useEffect(() => {
    try {
      const p = window.location.pathname;
      const isAdmin = p.indexOf("/admin") === 0 || p.indexOf("/workspace") === 0;
      const sKey = isAdmin ? "admin-theme" : "public-theme";
      const fKey = isAdmin ? "public-theme" : "admin-theme";
      const st =
        localStorage.getItem("app-theme") ||
        localStorage.getItem(sKey) ||
        localStorage.getItem(fKey);
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const t = st === "light" || st === "dark" ? st : dark ? "dark" : "light";

      document.documentElement.dataset.themeScope = isAdmin ? "admin" : "public";
      document.documentElement.dataset.theme = t;
      document.documentElement.classList.toggle("dark", t === "dark");
      document.documentElement.style.colorScheme = t;
      document.cookie = "app-theme=" + t + "; path=/; max-age=31536000; SameSite=Lax";
    } catch {}
  }, []);

  return null;
}
