"use client";

import { useSyncExternalStore } from "react";

export type PublicTheme = "light" | "dark";

const STORAGE_KEY = "public-theme";
const ADMIN_STORAGE_KEY = "admin-theme";
const APP_STORAGE_KEY = "app-theme";
const THEME_CHANGE_EVENT = "public-theme-change";
const APP_THEME_CHANGE_EVENT = "app-theme-change";

function getSystemTheme(): PublicTheme {
    if (typeof window === "undefined") {
        return "light";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredPublicTheme(): PublicTheme | null {
    if (typeof window === "undefined") {
        return null;
    }

    const storedTheme =
        window.localStorage.getItem(APP_STORAGE_KEY) ||
        window.localStorage.getItem(STORAGE_KEY) ||
        window.localStorage.getItem(ADMIN_STORAGE_KEY);
    return storedTheme === "light" || storedTheme === "dark" ? storedTheme : null;
}

export function getPublicTheme(): PublicTheme {
    if (typeof document === "undefined") {
        return getStoredPublicTheme() ?? getSystemTheme();
    }

    return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyPublicTheme(theme: PublicTheme) {
    if (typeof document === "undefined") {
        return;
    }

    document.documentElement.dataset.themeScope = "public";
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(APP_STORAGE_KEY, theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
    window.localStorage.setItem(ADMIN_STORAGE_KEY, theme);
    document.cookie = `${APP_STORAGE_KEY}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
    window.dispatchEvent(new Event(APP_THEME_CHANGE_EVENT));
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function togglePublicTheme() {
    applyPublicTheme(getPublicTheme() === "dark" ? "light" : "dark");
}

export function usePublicTheme() {
    return useSyncExternalStore(
        (onStoreChange) => {
            window.addEventListener("storage", onStoreChange);
            window.addEventListener(APP_THEME_CHANGE_EVENT, onStoreChange);
            window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);

            return () => {
                window.removeEventListener("storage", onStoreChange);
                window.removeEventListener(APP_THEME_CHANGE_EVENT, onStoreChange);
                window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
            };
        },
        getPublicTheme,
        () => "light"
    );
}
