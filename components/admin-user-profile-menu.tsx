"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  BadgeCheck,
  Bell,
  Settings,
  LogOut,
  GraduationCap,
  Users,
  Briefcase,
  Loader2,
  Sparkles,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/store";
import { toRoleRoutePath } from "@/lib/auth/role-routes";
import { AccountSwitcherDialog } from "@/components/auth/account-switcher-dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  const router = useRouter();
  const { user, setAuth, clearAuth } = useAuthStore();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [switchAccountOpen, setSwitchAccountOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);

  if (!user) return null;

  const roleHref = (url: string) => toRoleRoutePath(url, user);

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

  let roleBadgeLabel = "User";
  let roleBadgeVariant: "default" | "secondary" | "outline" | "destructive" = "secondary";

  if (isPlatformAdmin) {
    roleBadgeLabel = "Super Admin";
    roleBadgeVariant = "destructive";
  } else if (isInstitutionAdmin) {
    roleBadgeLabel = "Professional / Admin";
    roleBadgeVariant = "default";
  } else if (isParent) {
    roleBadgeLabel = "Guardian / Parent";
    roleBadgeVariant = "secondary";
  } else if (isStudent) {
    roleBadgeLabel = "Student";
    roleBadgeVariant = "outline";
  }

  const handleDemoSwitch = async (role: "student" | "guardian" | "professional" | "platform_admin") => {
    setSwitchingRole(role);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to switch role");
      }

      setAuth(json.user, json.accessToken);
      const roleName =
        role === "student"
          ? "Student"
          : role === "guardian"
          ? "Guardian"
          : role === "professional"
          ? "Professional"
          : "Platform Admin";
      toast.success(`Switched to Demo ${roleName} Account`);
      const redirectPath = json.redirectTo || toRoleRoutePath("/admin", json.user);
      router.push(redirectPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Role switch failed");
    } finally {
      setSwitchingRole(null);
    }
  };

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
          <DropdownMenuLabel className="font-normal p-2 bg-muted/40 rounded-lg mb-1">
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

          <DropdownMenuSeparator />

          {/* Account Navigation Group */}
          <DropdownMenuGroup>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={roleHref("/admin/account")}>
                <BadgeCheck className="mr-2 h-4 w-4 text-emerald-600" />
                <span>My Profile & Account</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={roleHref("/admin/notifications")}>
                <Bell className="mr-2 h-4 w-4 text-amber-600" />
                <span>Notifications</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={roleHref("/admin/settings")}>
                <Settings className="mr-2 h-4 w-4 text-blue-600" />
                <span>System Settings</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Role Portal Quick Switcher Section */}
          <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-destructive" />
            Switch Demo Account
          </DropdownMenuLabel>

          <DropdownMenuGroup className="space-y-0.5">
            <DropdownMenuItem
              disabled={Boolean(switchingRole)}
              onClick={() => handleDemoSwitch("student")}
              className={`cursor-pointer ${isStudent ? "bg-accent/60 font-bold" : ""}`}
            >
              <GraduationCap className="mr-2 h-4 w-4 text-rose-500" />
              <span className="flex-1 text-xs">Student Portal</span>
              {isStudent && <Badge variant="outline" className="text-[9px] h-4">Active</Badge>}
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={Boolean(switchingRole)}
              onClick={() => handleDemoSwitch("guardian")}
              className={`cursor-pointer ${isParent ? "bg-accent/60 font-bold" : ""}`}
            >
              <Users className="mr-2 h-4 w-4 text-amber-500" />
              <span className="flex-1 text-xs">Guardian Portal</span>
              {isParent && <Badge variant="outline" className="text-[9px] h-4">Active</Badge>}
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={Boolean(switchingRole)}
              onClick={() => handleDemoSwitch("professional")}
              className={`cursor-pointer ${isInstitutionAdmin ? "bg-accent/60 font-bold" : ""}`}
            >
              <Briefcase className="mr-2 h-4 w-4 text-blue-500" />
              <span className="flex-1 text-xs">Professional Portal</span>
              {isInstitutionAdmin && <Badge variant="outline" className="text-[9px] h-4">Active</Badge>}
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={Boolean(switchingRole)}
              onClick={() => handleDemoSwitch("platform_admin")}
              className={`cursor-pointer ${isPlatformAdmin ? "bg-accent/60 font-bold" : ""}`}
            >
              <ShieldCheck className="mr-2 h-4 w-4 text-purple-500" />
              <span className="flex-1 text-xs">Super Admin Portal</span>
              {isPlatformAdmin && <Badge variant="outline" className="text-[9px] h-4">Active</Badge>}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setSwitchAccountOpen(true)}
              className="cursor-pointer font-bold text-primary focus:text-primary focus:bg-primary/10"
            >
              <Sparkles className="mr-2 h-4 w-4 text-primary" />
              <span className="flex-1 text-xs">All Switchable Accounts</span>
              <Badge variant="secondary" className="text-[9px] h-4 bg-primary/10 text-primary">Browse All</Badge>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Sign Out Item */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setLogoutOpen(true);
            }}
            className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive font-semibold"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Multi-Role Account Switcher Dialog */}
      <AccountSwitcherDialog
        open={switchAccountOpen}
        onOpenChange={setSwitchAccountOpen}
      />

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
