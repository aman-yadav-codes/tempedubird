// store/slices/ui.store.ts
// Global UI state — sidebar, theme, and any app-wide UI flags.
//
// Usage (any client component):
//   import { useUIStore } from "@/store"
//   const { sidebarOpen, toggleSidebar } = useUIStore()

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

interface UIState {
  sidebarOpen: boolean;
  theme: Theme;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: "system",

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "edubird-ui", // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
