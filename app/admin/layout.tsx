"use client";

import "./admin-globals.css";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useUIStore } from "@/store";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminGuard } from "@/components/admin-guard";
import { AdminThemeToggle } from "../../components/admin-theme-toggle";
import { AdminUserProfileMenu } from "@/components/admin-user-profile-menu";
import { AdminNotificationCenter } from "@/components/admin-notification-center";
import { AdminAcademicSessionSelector } from "@/components/admin-academic-session-selector";
import { AdminFetchScope } from "@/components/admin-fetch-scope";
import { InstitutionSubscriptionGate } from "@/components/institution-subscription-gate";
import { TenantDeploymentScope } from "@/components/tenant-deployment-scope";
import { toCanonicalAdminPath } from "@/lib/auth/role-routes";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const canonicalPathname = toCanonicalAdminPath(pathname);
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const storedTheme =
      window.localStorage.getItem("app-theme") ||
      window.localStorage.getItem("admin-theme") ||
      window.localStorage.getItem("public-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.themeScope = "admin";
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("app-theme", theme);
    window.localStorage.setItem("admin-theme", theme);
    window.localStorage.setItem("public-theme", theme);
    window.dispatchEvent(new Event("app-theme-change"));
    window.dispatchEvent(new Event("public-theme-change"));
  }, [theme]);

  // ✅ Login page is public — skip AdminGuard and sidebar entirely
  if (canonicalPathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <div
        className={`admin-theme ${theme === "dark" ? "dark" : ""} min-h-screen bg-background text-foreground`}
        style={{ colorScheme: theme }}
      >
        <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <TenantDeploymentScope />
          <AdminFetchScope />
          <InstitutionSubscriptionGate />
          <AppSidebar />
          <div className="flex flex-1 flex-col min-h-screen min-w-0 overflow-hidden">
            <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/80 bg-background/95 backdrop-blur-md px-4 gap-3 shadow-2xs">
              <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
              <div className="w-px h-5 bg-border/60" />
              <AdminAcademicSessionSelector />
              
              <div className="hidden xl:flex items-center gap-2 text-xs font-bold text-muted-foreground border-l border-border/60 pl-3">
                <span className="text-muted-foreground hover:text-primary transition-colors cursor-default">
                  EduBird Admin
                </span>
                <span>/</span>
                <span className="text-foreground capitalize truncate max-w-[200px]">
                  {pathname === "/admin"
                    ? "Dashboard"
                    : pathname.replace("/admin/", "").split("/").map(seg => seg.replace(/-/g, " ")).join(" · ")}
                </span>
              </div>

              <div className="ml-auto flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  title="Reload Session Data"
                  className="hidden sm:inline-flex p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  <span className="sr-only">Reload</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <AdminNotificationCenter />
                <AdminThemeToggle theme={theme} onThemeChange={setTheme} />
                <AdminUserProfileMenu />
              </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
        </SidebarProvider>
      </div>
    </AdminGuard>
  );
}

