"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

type AdminTheme = "light" | "dark";

interface AdminThemeToggleProps {
    theme: AdminTheme;
    onThemeChange: (theme: AdminTheme) => void;
}

export function AdminThemeToggle({
    theme,
    onThemeChange,
}: AdminThemeToggleProps) {
    return (
        <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle admin theme"
            onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
        >
            {theme === "dark" ? (
                <Sun className="size-4" />
            ) : (
                <Moon className="size-4" />
            )}
        </Button>
    );
}
