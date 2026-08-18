"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { togglePublicTheme, usePublicTheme } from "@/components/public-theme";

export function ThemeToggle() {
  usePublicTheme();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle theme"
      className="relative"
      onClick={togglePublicTheme}
    >
      <Sun className="absolute size-4 opacity-0 transition-opacity dark:opacity-100" />
      <Moon className="absolute size-4 opacity-100 transition-opacity dark:opacity-0" />
    </Button>
  );
}