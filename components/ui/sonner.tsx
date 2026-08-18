// components/ui/sonner.tsx
// Thin wrapper around the sonner <Toaster> so theme is wired automatically.
// Import this once in the root layout — then call toast() anywhere.

"use client";

import { Toaster as SonnerToaster } from "sonner";
import { usePublicTheme } from "@/components/public-theme";

export function Toaster() {
  const theme = usePublicTheme();

  return (
    <SonnerToaster
      theme={theme as "light" | "dark" | "system"}
      position="top-right"
      richColors
      closeButton
      duration={4000}
    />
  );
}
