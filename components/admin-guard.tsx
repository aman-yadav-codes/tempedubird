"use client";

// components/admin-guard.tsx
// Wrap any admin page/layout with this to enforce authentication + role check.
// Shows a full-screen skeleton while hydration resolves.
//
// Usage:
//   <AdminGuard>{children}</AdminGuard>

import { useAdminGuard } from "@/hooks/use-admin-guard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";
import { canAccessAdminArea, getFirstAllowedAdminPath } from "@/lib/auth/permissions";
import { AlertTriangle, Home, Loader2, LogIn, ShieldX, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearBrowserSessionData } from "@/lib/auth/clear-browser-session";
import { toRoleRoutePath } from "@/lib/auth/role-routes";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isReady, isForbidden } = useAdminGuard();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signInWithAnotherAccount() {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearAuth();
      clearBrowserSessionData();
      window.location.href = "/";
    }
  }

  if (isForbidden) {
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    const roleName = user?.roles?.join(", ") || "this role";
    const returnPath = getFirstAllowedAdminPath(user);
    const roleReturnPath = returnPath ? toRoleRoutePath(returnPath, user) : null;
    const hasAnyAdminPage = canAccessAdminArea(user) && Boolean(returnPath);
    const returnLabel = returnPath === "/admin" ? "Return to dashboard" : "Return to allowed page";

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07080b] px-4 py-10 text-white">
        <div className="w-full max-w-lg overflow-hidden rounded-lg border border-red-500/25 bg-[#10141b] shadow-2xl shadow-red-950/30">
          <div className="h-1 bg-red-500" />
          <div className="space-y-6 p-8 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400">
              {isOffline ? <WifiOff className="size-8" /> : <ShieldX className="size-8" />}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">
                {isOffline ? "Connection problem" : "No permission"}
              </p>
              <h1 className="text-2xl font-bold">
                {isOffline ? "Internet connection lost" : `No access for ${roleName}`}
              </h1>
              <p className="mx-auto max-w-md text-sm leading-6 text-slate-300">
                {isOffline
                  ? "We could not verify your session because the network is unavailable. Check your connection and try again."
                  : hasAnyAdminPage
                    ? "This role can use the admin panel, but it does not have permission to open this page."
                    : "This role does not have permission to open the admin panel yet. Contact your institute admin or platform admin for more details."}
              </p>
            </div>

            {!isOffline && (
              <div className="flex items-start gap-3 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-left text-sm text-red-100">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
                <span>
                  {hasAnyAdminPage
                    ? "Ask an admin to add permission for this page if you need access."
                    : "Ask an admin to add module permissions like dashboard, users, or institution access to this role."}
                </span>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <Button asChild variant="outline" className="border-slate-700 bg-transparent text-white hover:bg-slate-900">
                <Link href="/">
                  <Home className="size-4" />
                  Home
                </Link>
              </Button>
              {hasAnyAdminPage ? (
                <Button asChild className="bg-red-600 text-white hover:bg-red-700">
                  <Link href={roleReturnPath ?? toRoleRoutePath("/admin", user)}>
                    <Home className="size-4" />
                    {returnLabel}
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={signInWithAnotherAccount}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogIn className="size-4" />
                  )}
                  Sign in with another account
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex min-h-screen flex-col">
        {/* Sidebar skeleton */}
        <div className="fixed left-0 top-0 hidden sm:flex flex-col w-64 h-screen border-r bg-sidebar gap-4 p-4">
          <Skeleton className="h-10 w-12 rounded" />
          <Skeleton className="h-px w-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="mt-auto space-y-2">
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 flex-col sm:ml-64 min-w-0 min-h-screen">
          {/* Header skeleton */}
          <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-background px-4 gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-3 w-px bg-border" />
            <Skeleton className="h-4 w-12" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-4 w-24 hidden sm:block" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </header>

          {/* Content skeleton */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="space-y-6 w-full max-w-full">
              {/* Page title */}
              <div className="space-y-2">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Skeleton className="h-9 w-32 rounded-lg" />
                <Skeleton className="h-9 w-32 rounded-lg" />
              </div>

              {/* Search bar */}
              <Skeleton className="h-9 w-64 rounded-lg" />

              {/* Table skeleton */}
              <div className="border rounded-lg overflow-hidden">
                {/* Table header */}
                <div className="flex items-center gap-2 p-4 border-b bg-muted/50">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>

                {/* Table rows */}
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2 p-4 border-b last:border-b-0">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-6 w-16 rounded" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
