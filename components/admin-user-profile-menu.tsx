"use client";

import { useState } from "react";
import { LogOut, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/store";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AdminUserProfileMenu() {
  const { user, clearAuth } = useAuthStore();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  // Determine display properties
  const displayName = user.full_name || user.email?.split("@")[0] || "User";
  const displayEmail = user.email || user.phone || "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .substring(0, 2)
    .toUpperCase() || "U";

  // Role detection
  const isPlatformAdmin = Boolean(user.role_codes?.includes("platform_admin") || user.is_super_admin);
  const isInstitutionAdmin = Boolean(user.role_codes?.includes("institution_admin") && !isPlatformAdmin);
  const isParent = Boolean(user.role_codes?.includes("parent") && !isPlatformAdmin && !isInstitutionAdmin);
  const isStudent = Boolean(user.role_codes?.includes("student") && !isPlatformAdmin && !isInstitutionAdmin && !isParent);

  const formatRoleName = (code: string | null | undefined): string => {
    if (!code) return "Staff";
    return code
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const detectedRole =
    user.primary_role ||
    user.roles?.[0] ||
    user.memberships?.[0]?.role_name ||
    (user.role_codes?.[0] ? formatRoleName(user.role_codes[0]) : null);

  let roleBadgeLabel = detectedRole || "User";
  let roleBadgeVariant: "default" | "secondary" | "outline" | "destructive" = "secondary";

  if (isPlatformAdmin) {
    roleBadgeLabel = "Super Admin";
    roleBadgeVariant = "destructive";
  } else if (isInstitutionAdmin) {
    roleBadgeLabel = detectedRole || "Professional / Admin";
    roleBadgeVariant = "default";
  } else if (isParent) {
    roleBadgeLabel = "Guardian / Parent";
    roleBadgeVariant = "secondary";
  } else if (isStudent) {
    roleBadgeLabel = "Student";
    roleBadgeVariant = "outline";
  } else if (detectedRole) {
    roleBadgeLabel = detectedRole;
    roleBadgeVariant = "default";
  }

  const handleConfirmLogout = async () => {
    setIsSubmitting(true);
    setLogoutOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      clearAuth();
      toast.success("Signed out successfully.");
      window.location.href = "/";
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-9 rounded-full pl-2 pr-2.5 gap-2 hover:bg-accent/80 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="User menu"
          >
            <div className="relative">
              <Avatar className="h-7 w-7 border border-border shadow-xs">
                <AvatarImage src={user.avatar_url || ""} alt={displayName} />
                <AvatarFallback className="text-[11px] font-bold bg-destructive/10 text-destructive">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>

            <div className="hidden md:flex flex-col text-left leading-tight max-w-[120px]">
              <span className="text-xs font-bold truncate">{displayName}</span>
              <span className="text-[10px] text-muted-foreground truncate">{roleBadgeLabel}</span>
            </div>

            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-70" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-64 p-2" align="end" sideOffset={8}>
          {/* User Profile Header Info */}
          <DropdownMenuLabel className="font-normal p-2 bg-muted/40 rounded-lg">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={user.avatar_url || ""} alt={displayName} />
                <AvatarFallback className="font-bold text-sm bg-destructive/15 text-destructive">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-bold truncate leading-snug">{displayName}</span>
                <span className="text-xs text-muted-foreground truncate leading-snug">{displayEmail}</span>

                <div className="mt-1.5 flex items-center">
                  <Badge variant={roleBadgeVariant} className="text-[10px] px-2 py-0 font-semibold h-4">
                    {roleBadgeLabel}
                  </Badge>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>

          {/* Sign Out Item */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setLogoutOpen(true);
            }}
            className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive font-semibold mt-1"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                "Sign Out"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
