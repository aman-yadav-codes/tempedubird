"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, LogIn, User, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore, useCartStore } from "@/store";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModalDialog } from "@/components/auth/auth-modal-dialog";
import { CartDrawer } from "@/components/checkout/cart-drawer";

export function PlatformAdminHeader() {
  const { user } = useAuthStore();
  const { getTotalCount, toggleCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogTab, setAuthDialogTab] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    setMounted(true);
  }, []);

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

          {/* Cart Button */}
          <button
            type="button"
            onClick={toggleCart}
            className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title="Shopping Cart"
            aria-label="Shopping Cart"
          >
            <ShoppingCart className="size-4" />
            {mounted && getTotalCount() > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs">
                {getTotalCount()}
              </span>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
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
            <Button
              size="sm"
              onClick={() => {
                setAuthDialogTab("signin");
                setAuthDialogOpen(true);
              }}
              className="gap-1.5 text-xs h-9 cursor-pointer"
            >
              <LogIn className="size-3.5" />
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Login & Create Profile Dialog */}
      <AuthModalDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultTab={authDialogTab}
      />

      {/* Shopping Cart Drawer */}
      <CartDrawer />
    </header>
  );
}
