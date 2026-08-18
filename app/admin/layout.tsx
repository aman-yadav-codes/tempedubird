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
            <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-background px-4 gap-2">
              <SidebarTrigger className="-ml-1" />
              <div className="w-px h-4 bg-border" />
              <AdminAcademicSessionSelector />
              <div className="ml-auto flex items-center gap-2">
                <AdminNotificationCenter />
                <AdminThemeToggle theme={theme} onThemeChange={setTheme} />
                <AdminUserProfileMenu />
              </div>
            </header>
            <main className="flex-1 p-6">{children}</main>
          </div>
        </SidebarProvider>
      </div>
    </AdminGuard>
  );
}

