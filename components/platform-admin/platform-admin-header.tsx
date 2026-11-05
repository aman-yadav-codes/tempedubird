"use client";

import Link from "next/link";
import { Shield, LayoutDashboard, LogIn, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";
import { ThemeToggle } from "@/components/theme-toggle";

export function PlatformAdminHeader() {
  const { user } = useAuthStore();
  const isPlatformUser = Boolean(
    user?.is_super_admin || user?.role_codes?.includes("platform_admin")
  );

  return (
    <header className="w-full border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Minimal Platform Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-foreground hover:opacity-90 transition-opacity"
        >
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Shield className="size-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold tracking-tight text-sm leading-tight">
              EduBird Platform
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
              Platform Admin
            </span>
          </div>
        </Link>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/platformadmin">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9">
                  <LayoutDashboard className="size-3.5" />
                  <span className="hidden sm:inline">Platform Console</span>
                </Button>
              </Link>
              <Link href="/platformadmin/my-profile">
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-9 px-2.5">
                  <User className="size-3.5 text-muted-foreground" />
                  <span className="max-w-[120px] truncate hidden md:inline">
                    {user.full_name || user.email}
                  </span>
                </Button>
              </Link>
            </div>
          ) : (
            <Link href="/admin/login">
              <Button size="sm" className="gap-1.5 text-xs h-9">
                <LogIn className="size-3.5" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
