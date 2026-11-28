"use client";

import "./admin-globals.css";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useUIStore, useAuthStore, useCartStore } from "@/store";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminGuard } from "@/components/admin-guard";
import { Search, ShoppingCart } from "lucide-react";
import { CartDrawer } from "@/components/checkout/cart-drawer";
import { AdminSearchDialog } from "@/components/admin-search-dialog";
import { AdminUserProfileMenu } from "@/components/admin-user-profile-menu";
import { AdminNotificationCenter } from "@/components/admin-notification-center";
import { AdminAcademicSessionSelector } from "@/components/admin-academic-session-selector";
import { AdminActiveTaskWidget } from "@/components/admin-active-task-widget";
import { AddBusinessProfileButton } from "@/components/business/add-business-profile-button";
import { AdminStorefrontHeaderButton } from "@/components/business/admin-storefront-header-button";
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
  const { user } = useAuthStore();
  const isCustomer = Boolean(
    pathname?.startsWith('/customer') ||
    (
      Array.isArray((user as any)?.role_codes)
        ? (user as any).role_codes.some((r: string) => String(r).toLowerCase() === "customer") && !(user as any).role_codes.some((r: string) => ["platform_admin", "superadmin", "super_admin", "admin", "platformadmin", "institution_admin", "head_of_operations", "staff", "teacher", "faculty"].includes(String(r).toLowerCase()))
        : (user as any)?.role === "customer" || (user as any)?.primary_role === "customer"
    )
  );
  const isBusinessContext = Boolean(
    pathname?.startsWith('/workspace') ||
    pathname?.startsWith('/admin/company') ||
    user?.has_business_profile ||
    user?.has_professional_profile ||
    user?.primary_role === 'business_owner' ||
    user?.primary_role === 'professional' ||
    user?.role_codes?.includes('business_owner') ||
    user?.role_codes?.includes('professional')
  );
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { getTotalCount, toggleCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartCount = mounted ? getTotalCount() : 0;
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
              {!isBusinessContext && !isCustomer && (
                <>
                  <div className="w-px h-5 bg-border/60" />
                  <AdminAcademicSessionSelector />
                </>
              )}
              <AddBusinessProfileButton />

              <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Search Option */}
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  title="Quick Search (Ctrl+K)"
                  aria-label="Quick Search"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  <Search className="size-4" />
                </button>

                {/* Cart Option */}
                <button
                  type="button"
                  onClick={toggleCart}
                  title="Shopping Cart"
                  aria-label="Shopping Cart"
                  className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  <ShoppingCart className="size-4" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold size-4 rounded-full flex items-center justify-center animate-in zoom-in-50">
                      {cartCount}
                    </span>
                  )}
                </button>

                {/* Notification Option */}
                <AdminNotificationCenter />

                {/* User Profile Menu */}
                <AdminUserProfileMenu />
              </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
            <AdminSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
            <CartDrawer />
          </div>
        </SidebarProvider>
      </div>
    </AdminGuard>
  );
}

